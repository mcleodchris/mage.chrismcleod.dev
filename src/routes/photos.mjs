import express from "express";
import { processPhotoFeed } from "../utils/photoFeedHandler.mjs";
import log from "../utils/logger.mjs";

const router = express.Router();

router.use((req, _, next) => {
  req.container = req.database.container(
    process.env.CROSSPOST_CONTAINER || "crosspost"
  );
  next();
});

/**
 * @openapi
 * /photos/webhook:
 *   post:
 *     summary: Handle Netlify webhook for photo feed updates
 *     tags: [Photos]
 *     responses:
 *       200:
 *         description: Feed processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Feed processed successfully"
 *                 processedItems:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       datePublished:
 *                         type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to process feed"
 */
router.post("/webhook", async (req, res) => {
  try {
    const processedItems = await processPhotoFeed(req.container);
    res.json({
      message: "Feed processed successfully",
      processedItems
    });
  } catch (error) {
    log.error("Error in photo webhook handler:", error);
    res.status(500).json({ error: "Failed to process feed" });
  }
});

export default router; 