import express from "express";
import { getImageData } from "../utils/imageList.mjs";

const router = express.Router();

router.use((req, _, next) => {
  req.container = req.database.container(
    process.env.COSMOS_CONTAINER || "images"
  );
  next();
});

/**
 * @openapi
 * /images/list:
 *   get:
 *     summary: Retrieve a list of images
 *     tags: [Images]
 *     responses:
 *       200:
 *         description: A list of images
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: The image ID
 *                     example: "12345"
 *                   url:
 *                     type: string
 *                     description: The image URL
 *                     example: "https://example.com/image.jpg"
 */
router.get("/list", async (req, res) => {
  const images = await getImageData(req.container);
  res.json(images);
});

/**
 * @openapi
 * /images/image/{index}:
 *   get:
 *     summary: Retrieve a specific image by index
 *     tags: [Images]
 *     parameters:
 *       - in: path
 *         name: index
 *         required: true
 *         schema:
 *           type: integer
 *         description: The index of the image
 *     responses:
 *       200:
 *         description: The image data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: The image ID
 *                   example: "12345"
 *                 url:
 *                   type: string
 *                   description: The image URL
 *                   example: "https://example.com/image.jpg"
 *       404:
 *         description: Image not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Image not found"
 */
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
