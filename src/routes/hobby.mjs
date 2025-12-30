import express from "express";
import dotenv from "dotenv";
import { getHobbyData, createHobbyEntry } from "../utils/hobbyData.mjs";
import log from "../utils/logger.mjs";
dotenv.config();

const router = express.Router();

router.use((req, _, next) => {
  req.container = req.database.container(
    process.env.HOBBY_CONTAINER || "Entries"
  );
  next();
});

router.get("/", async (req, res) => {
  const entries = await getHobbyData(req.container);
  res.json(entries);
});

router.post("/", async (req, res) => {
  try {
    const { item, game, modelCount, completedDate } = req.body;

    if (!item || !game || !modelCount) {
      return res.status(400).json({
        error: "Missing required fields: item, game, and modelCount are required",
      });
    }

    const entry = await createHobbyEntry(req.container, {
      item,
      game,
      modelCount,
      completedDate,
    });

    log.info(`Created hobby entry: ${entry.id} - ${entry.item}`);

    res.status(201).json(entry);
  } catch (error) {
    log.error("Error creating hobby entry:", error);
    res.status(500).json({ error: "Failed to create hobby entry" });
  }
});

export default router;
