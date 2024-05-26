import express from "express";
import { getImageData } from "../utils/imageList.mjs";

const router = express.Router();

router.get("/list", async (req, res) => {
  const images = await getImageData();
  res.json(images.reverse());
});

router.get("/image/:index", async (req, res) => {
  const index = parseInt(req.params.index, 10);

  try {
    const images = await getImageData();

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
