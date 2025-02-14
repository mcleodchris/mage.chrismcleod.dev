/**
 * @fileoverview This file contains the Micropub route handlers for uploading and retrieving images.
 * @module routes/micropub
 */

import express from "express";
import multer from "multer";
import log from "../utils/logger.mjs";
import { handleUpload, getLastUploadedImage } from "../utils/micropubHandlers.mjs";

const router = express.Router();
const upload = multer({
  dest: process.env.TEMP_PATH || "temp/",
  limits: {
    fileSize: 150 * 1024 * 1024, // 150MB in bytes
  },
});

router.use((req, _, next) => {
  req.container = req.database.container(
    process.env.COSMOS_CONTAINER || "images"
  );
  next();
});

// Use multer middleware for this route
router.post("/media", upload.single("file"), handleUpload);

router.get("/media", getLastUploadedImage);

// Error handling middleware
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ message: "File too large" });
  }
  // handle other errors
});

export default router;
