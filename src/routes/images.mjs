import express from "express";
import { getImageData } from "../utils/imageList.mjs";

const router = express.Router();

router.use((req, _, next) => {
  req.container = req.database.container(
    process.env.COSMOS_CONTAINER || "images"
  );
  next();
});

router.get("/list", async (req, res) => {
  const images = await getImageData(req.container);
  res.json(images);
});

router.get("/image/:index", async (req, res) => {
  const index = parseInt(req.params.index, 10);

  try {
    const images = await getImageData(req.container);

    if (index >= 0 && index < images.length) {
      res.json(images[index]);
    } else {
      throw new Error();
    }
  } catch {
    res.status(404).json({ error: "Image not found" });
  }
});

export default router;
