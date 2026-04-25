/**
 * @fileoverview This file contains the Micropub route handlers for uploading and retrieving images.
 * @module routes/micropub
 */

import dotenv from "dotenv";
import express from "express";
import multer from "multer";
import { Octokit } from "octokit";
import { micropubAuth } from "../middleware/micropubAuth.mjs";
import log from "../utils/logger.mjs";
import { getLastUploadedImage, handleUpload } from "../utils/micropubHandlers.mjs";
import { generateMicropubMarkdown } from "../utils/micropubMarkdown.mjs";

dotenv.config();
// Create Octokit instance for GitHub commits

const github = new Octokit({ auth: process.env.GITHUB_TOKEN });

const router = express.Router();
const upload = multer({
    dest: process.env.TEMP_PATH || "temp/",
    limits: {
        fileSize: 150 * 1024 * 1024, // 150MB in bytes
    },
});

router.use((req, _res, next) => {
    req.container = req.database?.container?.(process.env.COSMOS_CONTAINER || "images");
    next();
});

// Media endpoints (existing)
router.post("/media", upload.single("file"), handleUpload);
router.get("/media", getLastUploadedImage);

// Micropub config query
router.get("/", (req, res) => {
    if (req.query.q === "config") {
        return res.json({
            "media-endpoint": `${
                process.env.SITE_BASE_URL || "http://localhost:3000"
            }/micropub/media`,
            "syndicate-to": [],
        });
    }
    return res.status(400).json({ error: "invalid_request", error_description: "Unknown query" });
});

// Core Micropub POST endpoint
router.post(
    "/",
    micropubAuth,
    express.json(),
    express.urlencoded({ extended: true }),
    async (req, res) => {
        log.debug("[Micropub] Incoming POST /micropub request");
        // Accept JSON or x-www-form-urlencoded
        let payload = req.body;
        log.debug(`[Micropub] Raw payload: ${JSON.stringify(payload)}`);
        if (typeof payload === "string") {
            try {
                payload = JSON.parse(payload);
                log.debug("[Micropub] Parsed string payload as JSON");
            } catch (err) {
                log.warn("Malformed JSON", err);
                return res.status(400).json({
                    error: "invalid_request",
                    error_description: "Malformed JSON",
                });
            }
        }
        // Validate Micropub structure
        if (!payload || typeof payload !== "object" || !payload.type || !payload.properties) {
            log.warn(`[Micropub] Invalid Micropub structure: ${JSON.stringify(payload)}`);
            return res.status(400).json({
                error: "invalid_request",
                error_description: "Missing required Micropub fields",
            });
        }
        // Ensure all property values are arrays
        for (const key of Object.keys(payload.properties)) {
            if (!Array.isArray(payload.properties[key])) {
                log.debug(`[Micropub] Wrapping property '${key}' as array`);
                payload.properties[key] = [payload.properties[key]];
            }
        }
        // Post type detection
        let postType = "note";
        if (payload.properties["bookmark-of"]) postType = "bookmark";
        else if (payload.properties["like-of"]) postType = "like";
        log.debug(`[Micropub] Detected postType: ${postType}`);
        // Required property validation
        if (postType === "note" && !payload.properties.content) {
            log.warn("[Micropub] Missing 'content' for note");
            return res.status(400).json({
                error: "invalid_request",
                error_description: "Missing 'content' for note",
            });
        }
        if (postType === "bookmark" && !payload.properties["bookmark-of"]) {
            log.warn("[Micropub] Missing 'bookmark-of' for bookmark");
            return res.status(400).json({
                error: "invalid_request",
                error_description: "Missing 'bookmark-of' for bookmark",
            });
        }
        if (postType === "like" && !payload.properties["like-of"]) {
            log.warn("[Micropub] Missing 'like-of' for like");
            return res.status(400).json({
                error: "invalid_request",
                error_description: "Missing 'like-of' for like",
            });
        }
        // Date
        const published = payload.properties.published?.[0] || new Date().toISOString();
        // Title
        const title = payload.properties.name ? payload.properties.name[0] : undefined;
        log.debug(`[Micropub] Published: ${published}, Title: ${title}`);
        // Markdown generation
        let markdown, path, slug;
        try {
            ({
                markdown,
                filePath: path,
                slug,
            } = generateMicropubMarkdown(payload, postType, {
                date: published,
                title,
            }));
            log.debug(`[Micropub] Markdown generated. filePath: ${path}`);
            log.debug(`[Micropub] Markdown content:\n${markdown}`);
        } catch (err) {
            log.error("Markdown generation failed", err);
            return res.status(500).json({
                error: "server_error",
                error_description: "Failed to generate markdown",
            });
        }

        const commitData = {
            owner: process.env.GITHUB_OWNER,
            repo: process.env.MICROPUB_REPO,
            path,
            message: `Micropub ${postType} post ${slug}`,
            content: Buffer.from(markdown).toString("base64"),
            branch: "develop",
        };

        log.debug(`[Micropub] Commit data: ${JSON.stringify(commitData)}`);

        if (!commitData.owner || !commitData.repo || !process.env.GITHUB_TOKEN) {
            log.error("Missing GitHub configuration");
            return res.status(500).json({
                error: "server_error",
                error_description: "GitHub configuration missing",
            });
        }
        try {
            const authTest = await github.rest.users.getAuthenticated();
            log.debug("Authenticated as:", authTest.data.login);
        } catch (authErr) {
            log.error("Authentication test failed:", authErr);
            return res.status(500).json({
                error: "server_error",
                error_description: "GitHub authentication failed",
            });
        }
        try {
            await github.rest.repos.createOrUpdateFileContents(commitData);
            // log.debug(`[Micropub] GitHub commit successful for file: ${path}`);
            // await github.request(
            //   "PUT /repos/{owner}/{repo}/contents/{path}",
            //   commitData
            // );
            log.debug(`[Micropub] GitHub commit successful for file: ${path}`);
        } catch (err) {
            log.error("GitHub commit failed", err);
            log.error("GitHub error status:", err.status);
            log.error("GitHub error response:", err.response?.data);
            log.error(`GitHub error : ${JSON.stringify(err)}`);
            return res.status(502).json({
                error: "server_error",
                error_description: "GitHub commit failed",
            });
        }
        // Generate post URL
        // Format published date as YYYYMMDDHHmm for URL
        const dateObj = new Date(published);
        const pad = (n) => n.toString().padStart(2, "0");
        const dateTime = `${dateObj.getFullYear()}${pad(
            dateObj.getMonth() + 1,
        )}${pad(dateObj.getDate())}${pad(dateObj.getHours())}${pad(dateObj.getMinutes())}`;
        const postUrl = `${
            process.env.SITE_BASE_URL || `https://chrismcleod.dev`
        }/${postType}s/${dateTime}/`;
        log.debug(`[Micropub] Returning post URL: ${postUrl}`);
        res.setHeader("Location", postUrl);
        return res.status(202).json({ url: postUrl });
    },
);

// Error handling middleware
router.use((err, _req, res, _next) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res
            .status(400)
            .json({ error: "invalid_request", error_description: "File too large" });
    }
    log.error("Micropub route error", err);
    res.status(500).json({
        error: "server_error",
        error_description: "Internal server error",
    });
});

export default router;
