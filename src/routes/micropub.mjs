import express from "express";
import multer from "multer";
import fs from "fs";
import { saveImage } from "../utils/fileHandler.mjs";
import { process } from "../utils/imageProcessor.mjs";
import { getImageData } from "../utils/imageList.mjs";

const router = express.Router();
const upload = multer({
  dest: process.env.TEMP_DIR || "temp/",
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

  const imagePath = saveImage(imageFile, imageFile.originalname);
  // delete the temporary file after saving it
  fs.unlinkSync(imageFile.path);

  const metadata = await process(
    imagePath,
    [320, 570, 820],
    ["avif", "webp", "jpeg"]
  );

  for (const format in metadata) {
    metadata[format].forEach((item) => {
      item.url = `${baseUrl}/resized/${item.filename}`;
      item.srcset = `${baseUrl}/resized/${item.filename} ${item.width}w`;
      item.outputPath = `${baseUrl}/resized/${item.filename}`;
    });
  }


  //get the filename from imagePath
  const path = imagePath.split("/");
  const filename = path.pop();
  const imageUrl = `${baseUrl}/${filename}`;

  // load the file images.json. If it doesn't exist, initialise an empty array
  let images = [];
  const imageJsonFile = process.env.IMAGE_JSON_FILE || "saved/images.json";
  if (fs.existsSync(imageJsonFile)) {
    images = JSON.parse(fs.readFileSync(imageJsonFile, "utf8"));
  }

  // add the imageUrl and metadata to the images array
  images.push({ original: imageUrl, metadata });

  // save the images array to images.json
  fs.writeFileSync(imageJsonFile, JSON.stringify(images, null, 2));  


  res.setHeader('Location', imageUrl);
  return res.status(201).end();
};

// Use multer middleware for this route
router.post("/media", upload.single("file"), handleUpload);

router.get("/media", async (req, res) => {
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
});

// Error handling middleware
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File too large' });
  }
  // handle other errors
});

export default router;
