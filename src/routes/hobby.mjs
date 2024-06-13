import express from "express";
import dotenv from "dotenv";
import { getHobbyData } from "../utils/hobbyData.mjs";
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

export default router;
