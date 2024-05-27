/**
 * @fileoverview This file contains the Micropub route handlers for uploading and retrieving images.
 * @module routes/micropub
 */

import express from "express";
import multer from "multer";
import { promises as fs } from "fs";
import { saveImage } from "../utils/fileHandler.mjs";
import { processImage } from "../utils/imageProcessor.mjs";
import { getImageData, saveImageData } from "../utils/imageList.mjs";
import { uploadToAzureBlobStorage } from "../utils/azureStorage.mjs";

const router = express.Router();
const upload = multer({
  dest: process.env.TEMP_PATH || "temp/",
  limits: {
    fileSize: 150 * 1024 * 1024, // 150MB in bytes
  },
});

/**
 * Handles the upload of an image file.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Object} The response object.
 */
const handleUpload = async (req, res) => {
  // Check if the request is authenticated
  if (!req.authenticated) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // multer adds a 'file' object to 'req' when 'upload.single('file')' middleware is used
  const imageFile = req.file;

  if (!imageFile) {
    return res.status(400).json({ message: "Invalid request" });
  }

  const baseUrl = process.env.BASE_URL || "http://localhost:3000/saved";

  const imagePath = await saveImage(imageFile, imageFile.originalname);
  // delete the temporary file after saving it
  await fs.unlink(imageFile.path);

  const metadata = await processImage(
    imagePath,
    [320, 570, 820],
    ["avif", "webp", "jpeg"],
    baseUrl
  );

  //get the filename from imagePath
  const path = imagePath.split("/");
  const filename = path.pop();
  const imageUrl = `${baseUrl}/${filename}`;

  const uploadPath = process.env.UPLOAD_PATH || "images/";

  // upload to Azure Blob Storage
  await uploadToAzureBlobStorage(imagePath, `${uploadPath}/${filename}`);
  await fs.unlink(imagePath);

  for (const format in metadata) {
    for (const size of metadata[format]) {
      await uploadToAzureBlobStorage(size.outputPath, `${uploadPath}/resized/${size.filename}`);
      await fs.unlink(size.outputPath);
    }
  }

  // save our image data to the master JSON file
  await saveImageData({ original: imageUrl, metadata });

  res.setHeader("Location", imageUrl);
  return res.status(201).end();
};

/**
 * Retrieves the last uploaded image data.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Object} The response object.
 */
const getLastUploadedImage = async (req, res) => {
  // Check if the request is authenticated
  if (!req.authenticated) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const { q } = req.query;

  if (q === "last") {
    const images = await getImageData();
    // get the newest entry from the images array (should be the first one)
    const lastEntry = images[0];
    if (lastEntry) {
      return res.json(lastEntry);
    } else {
      return res.status(404).json({ message: "No entries found" });
    }
  } else {
    return res.status(400).json({ message: "Invalid request" });
  }
};

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
