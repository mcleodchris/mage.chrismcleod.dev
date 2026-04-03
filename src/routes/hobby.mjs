import express from "express";
import dotenv from "dotenv";
import { Octokit } from "octokit";
import {
    getHobbyData,
    createHobbyEntry,
    updateHobbyEntry,
    deleteHobbyEntry,
    triggerWorkflowDispatch,
} from "../utils/hobbyData.mjs";
import log from "../utils/logger.mjs";
dotenv.config();

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const router = express.Router();

router.use((req, _, next) => {
    req.container = req.database.container(process.env.HOBBY_CONTAINER || "Entries");
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

router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { item, game, modelCount, completedDate } = req.body;

        const entry = await updateHobbyEntry(req.container, id, {
            item,
            game,
            modelCount,
            completedDate,
        });

        log.info(`Updated hobby entry: ${entry.id} - ${entry.item}`);

        res.json(entry);
    } catch (error) {
        if (error.message === "Entry not found" || error.code === 404) {
            return res.status(404).json({ error: "Entry not found" });
        }
        log.error("Error updating hobby entry:", error);
        res.status(500).json({ error: "Failed to update hobby entry" });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        await deleteHobbyEntry(req.container, id);

        log.info(`Deleted hobby entry: ${id}`);

        // Trigger GitHub workflow dispatch (matching Azure Function behavior)
        try {
            await triggerWorkflowDispatch(octokit, {
                owner: process.env.GITHUB_OWNER,
                repo: process.env.MICROPUB_REPO,
                eventType: "function_trigger",
                clientPayload: {
                    action: "delete",
                    entryId: id,
                },
            });
            log.info(`Triggered GitHub workflow dispatch for deleted entry: ${id}`);
        } catch (dispatchError) {
            log.warn(`Failed to trigger workflow dispatch: ${dispatchError.message}`);
        }

        res.status(204).end();
    } catch (error) {
        if (error.code === 404 || error.statusCode === 404) {
            return res.status(404).json({ error: "Entry not found" });
        }
        log.error("Error deleting hobby entry:", error);
        res.status(500).json({
            error: "Failed to delete hobby entry",
            details: error.message,
        });
    }
});

export default router;
