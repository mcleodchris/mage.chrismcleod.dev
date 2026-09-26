import { randomUUID } from "node:crypto";
import express from "express";
import OpenAI from "openai";
import { findImageByUrl } from "../utils/imageList.mjs";
import log, { describeError } from "../utils/logger.mjs";
import { imagePrompts } from "../utils/prompts.mjs";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

const router = express.Router();

router.use((req, _, next) => {
    req.container = req.database.container(process.env.COSMOS_CONTAINER || "images");
    next();
});

const openaiConfig = { apiKey: process.env.OPENAI_API_KEY };
if (process.env.OPENAI_BASE_URL) {
    openaiConfig.baseURL = process.env.OPENAI_BASE_URL;
}
const openai = new OpenAI(openaiConfig);

const MODEL = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";

/**
 * Pulls the fields that actually explain an OpenAI failure. The SDK's APIError
 * puts them on the instance, where JSON.stringify and `error.message` miss them.
 */
function describeOpenAIError(error) {
    return JSON.stringify({
        name: error?.name,
        message: error?.message,
        status: error?.status,
        code: error?.code,
        type: error?.type,
        requestID: error?.requestID,
        body: error?.error ?? error?.response?.data,
    });
}

// AVIF is deliberately absent: the vision API does not accept it.
const VISION_FORMATS = ["jpeg", "webp"];

/**
 * Picks the largest vision-API-compatible derivative from a stored image record.
 * The original upload is often tens of megabytes, which blows the request limit,
 * so the resized copies are what we actually send to OpenAI.
 * @param {import("../utils/imageList.mjs").ImageObject} record
 * @returns {{url: string, format: string, width: number}|null}
 */
function largestVisionDerivative(record) {
    for (const format of VISION_FORMATS) {
        const candidates = (record?.metadata?.[format] ?? [])
            .filter((entry) => entry?.url)
            .sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
        if (candidates.length > 0) {
            const best = candidates[0];
            return { url: best.url, format, width: best.width };
        }
    }
    return null;
}

/**
 * Collects any refusal text the model returned. Refusals arrive as content parts
 * inside output messages rather than as a top-level field, so an empty
 * `output_text` plus a refusal here is a deliberate decline, not a failure.
 * @param {import("openai/resources/responses/responses.mjs").Response} response
 * @returns {string[]}
 */
function collectRefusals(response) {
    return (response?.output ?? [])
        .flatMap((item) => item?.content ?? [])
        .filter((part) => part?.type === "refusal")
        .map((part) => part.refusal);
}

/** Renders log detail into the message itself, avoiding winston's meta merge. */
function detailOf(detail) {
    if (detail === undefined || detail === null) return "";
    if (detail instanceof Error) return ` ${describeError(detail)}`;
    return ` ${JSON.stringify(detail)}`;
}

/**
 * @openapi
 * /openai/generate-alt-text:
 *   post:
 *     summary: Generate alt text for an image
 *     tags: [OpenAI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - imageUrl
 *             properties:
 *               imageUrl:
 *                 type: string
 *                 description: URL of the image to generate alt text for
 *                 example: "https://example.com/image.jpg"
 *     responses:
 *       200:
 *         description: Alt text generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 altText:
 *                   type: string
 *                   description: Generated alt text
 *                   example: "A cat sitting on a windowsill looking outside."
 *                 traceId:
 *                   type: string
 *                   description: Correlation id matching the server log lines for this request
 *                   example: "a1b2c3d4"
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Image URL is required"
 *                 traceId:
 *                   type: string
 *                   example: "a1b2c3d4"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to generate alt text"
 *                 traceId:
 *                   type: string
 *                   example: "a1b2c3d4"
 */
router.post("/generate-alt-text", async (req, res) => {
    // Surfaced in the response so a failure reported from a phone can be tied
    // back to a log line without access to the browser console.
    const traceId = randomUUID().slice(0, 8);
    const startedAt = Date.now();
    const fail = (status, message, detail) => {
        log.error(`[alt-text ${traceId}] ${status} ${message}${detailOf(detail)}`);
        return res.status(status).json({ error: message, traceId });
    };

    const { imageUrl } = req.body ?? {};
    log.info(
        `[alt-text ${traceId}] request received${detailOf({ imageUrl: imageUrl ?? null, model: MODEL })}`,
    );

    if (!process.env.OPENAI_API_KEY) {
        return fail(500, "OpenAI is not configured", { missing: "OPENAI_API_KEY" });
    }

    if (!imageUrl) {
        return fail(400, "Image URL is required", { bodyKeys: Object.keys(req.body ?? {}) });
    }

    try {
        const parsed = new URL(imageUrl);
        if (parsed.protocol !== "https:") {
            return fail(400, "Image URL must use HTTPS", { protocol: parsed.protocol });
        }
    } catch (error) {
        return fail(400, "Image URL is invalid", { imageUrl, reason: error.message });
    }

    // Prefer a stored derivative over the (potentially huge) original.
    let fetchUrl = imageUrl;
    try {
        const record = await findImageByUrl(req.container, imageUrl);
        if (!record) {
            log.warn(
                `[alt-text ${traceId}] no image record found, falling back to the supplied URL${detailOf({ imageUrl })}`,
            );
        } else {
            const derivative = largestVisionDerivative(record);
            if (derivative) {
                fetchUrl = derivative.url;
                log.info(
                    `[alt-text ${traceId}] using stored derivative${detailOf({ recordId: record.id, ...derivative })}`,
                );
            } else {
                log.warn(
                    `[alt-text ${traceId}] record has no jpeg/webp derivative, falling back to the supplied URL${detailOf({ recordId: record.id })}`,
                );
            }
        }
    } catch (error) {
        // A lookup failure should not sink the request; the original may still fit.
        log.warn(`[alt-text ${traceId}] derivative lookup failed${detailOf(error)}`);
    }

    let dataUri;
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        let imageResponse;
        try {
            imageResponse = await fetch(fetchUrl, { signal: controller.signal });
        } finally {
            clearTimeout(timeout);
        }
        if (!imageResponse.ok) {
            return fail(502, "Failed to fetch image from remote host", {
                status: imageResponse.status,
                statusText: imageResponse.statusText,
                fetchUrl,
            });
        }
        const contentLength = imageResponse.headers.get("content-length");
        if (contentLength && parseInt(contentLength, 10) > MAX_IMAGE_BYTES) {
            return fail(400, "Image exceeds maximum allowed size", {
                contentLength,
                limit: MAX_IMAGE_BYTES,
                fetchUrl,
                usedDerivative: fetchUrl !== imageUrl,
            });
        }
        const mimeType = imageResponse.headers.get("content-type") ?? "image/jpeg";
        const buffer = await imageResponse.arrayBuffer();
        if (buffer.byteLength > MAX_IMAGE_BYTES) {
            return fail(400, "Image exceeds maximum allowed size", {
                bytes: buffer.byteLength,
                limit: MAX_IMAGE_BYTES,
                fetchUrl,
                usedDerivative: fetchUrl !== imageUrl,
            });
        }
        const base64 = Buffer.from(buffer).toString("base64");
        dataUri = `data:${mimeType};base64,${base64}`;
        log.debug(
            `[alt-text ${traceId}] image fetched${detailOf({ fetchUrl, mimeType, bytes: buffer.byteLength, ms: Date.now() - startedAt })}`,
        );
    } catch (error) {
        const timedOut = error?.name === "AbortError";
        return fail(
            timedOut ? 504 : 400,
            timedOut ? "Timed out fetching image" : "Failed to fetch image",
            error,
        );
    }

    try {
        const response = await openai.responses.create({
            model: MODEL,
            instructions: imagePrompts.altText,
            input: [
                {
                    role: "user",
                    content: [
                        { type: "input_text", text: "describe this image" },
                        // `auto` detail: the prompt asks the model to transcribe any
                        // text in the image, which `low` downsamples too far to read.
                        { type: "input_image", image_url: dataUri, detail: "auto" },
                    ],
                },
            ],
            store: false,
        });

        const altText = response.output_text?.trim();
        if (!altText) {
            return fail(502, "OpenAI returned no alt text", {
                status: response.status,
                incompleteReason: response.incomplete_details?.reason,
                refusals: collectRefusals(response),
                responseError: response.error,
                usage: response.usage,
            });
        }
        log.info(
            `[alt-text ${traceId}] generated${detailOf({ chars: altText.length, ms: Date.now() - startedAt, usage: response.usage })}`,
        );
        res.json({ altText, traceId });
    } catch (error) {
        const status = error?.status >= 400 && error?.status < 600 ? 502 : 500;
        log.error(
            `[alt-text ${traceId}] OpenAI request failed ${describeOpenAIError(error)}\n${error?.stack ?? ""}`,
        );
        res.status(status).json({ error: "Failed to generate alt text", traceId });
    }
});

export default router;
