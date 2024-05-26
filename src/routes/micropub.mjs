import express from "express";
import multer from "multer";
import { promises as fs } from "fs";
import { saveImage } from "../utils/fileHandler.mjs";
import { processImage } from "../utils/imageProcessor.mjs";
import { getImageData, saveImageData } from "../utils/imageList.mjs";

const router = express.Router();
const upload = multer({
  dest: process.env.TEMP_PATH || "temp/",
  limits: {
    fileSize: 150 * 1024 * 1024, // 150MB in bytes
  },
});

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

  // save our image data to the master JSON file
  await saveImageData({ original: imageUrl, metadata });

  res.setHeader("Location", imageUrl);
  return res.status(201).end();
};

const getLastUploadedImage = async (req, res) => {
  // Check if the request is authenticated
  if (!req.authenticated) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const { q } = req.query;

  if (q === "last") {
    const images = await getImageData();
    // get the last entry from the images array
    const lastEntry = images[images.length - 1];
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
