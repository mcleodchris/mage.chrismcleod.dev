import express from "express";
import OpenAI from "openai";
import log from "../utils/logger.mjs";
import { imagePrompts } from "../utils/prompts.mjs";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

const router = express.Router();

const openaiConfig = { apiKey: process.env.OPENAI_API_KEY };
if (process.env.OPENAI_BASE_URL) {
    openaiConfig.baseURL = process.env.OPENAI_BASE_URL;
}
const openai = new OpenAI(openaiConfig);

const MODEL = process.env.OPENAI_MODEL ?? "gpt-5.4-mini";

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
 */
router.post("/generate-alt-text", async (req, res) => {
    const { imageUrl } = req.body;

    if (!imageUrl) {
        return res.status(400).json({ error: "Image URL is required" });
    }

    try {
        const parsed = new URL(imageUrl);
        if (parsed.protocol !== "https:") {
            return res.status(400).json({ error: "Image URL must use HTTPS" });
        }
    } catch {
        return res.status(400).json({ error: "Image URL is invalid" });
    }

    let dataUri;
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        let imageResponse;
        try {
            imageResponse = await fetch(imageUrl, { signal: controller.signal });
        } finally {
            clearTimeout(timeout);
        }
        if (!imageResponse.ok) {
            return res.status(502).json({ error: "Failed to fetch image from remote host" });
        }
        const contentLength = imageResponse.headers.get("content-length");
        if (contentLength && parseInt(contentLength, 10) > MAX_IMAGE_BYTES) {
            return res.status(400).json({ error: "Image exceeds maximum allowed size" });
        }
        const mimeType = imageResponse.headers.get("content-type") ?? "image/jpeg";
        const buffer = await imageResponse.arrayBuffer();
        if (buffer.byteLength > MAX_IMAGE_BYTES) {
            return res.status(400).json({ error: "Image exceeds maximum allowed size" });
        }
        const base64 = Buffer.from(buffer).toString("base64");
        dataUri = `data:${mimeType};base64,${base64}`;
    } catch (error) {
        log.error("Error fetching image:", error);
        return res.status(400).json({ error: "Failed to fetch image" });
    }

    try {
        const response = await openai.chat.completions.create({
            model: MODEL,
            messages: [
                {
                    role: "developer",
                    content: [
                        {
                            type: "text",
                            text: imagePrompts.altText,
                        },
                    ],
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: "describe this image" },
                        {
                            type: "image_url",
                            image_url: { url: dataUri },
                        },
                    ],
                },
            ],
            store: false,
        });

        const altText = response.choices?.[0]?.message?.content;
        if (!altText) {
            log.error("OpenAI returned no content in choices");
            return res.status(500).json({ error: "Failed to generate alt text" });
        }
        res.json({ altText });
    } catch (error) {
        log.error("Error generating alt text:", error);
        res.status(500).json({ error: "Failed to generate alt text" });
    }
});

export default router;
