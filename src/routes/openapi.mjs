import express from "express";
import swaggerSpec from "../utils/swaggerSpec.mjs";

const router = express.Router();

router.get("/openapi.json", (_, res) => {
    res.json(swaggerSpec);
});

export default router;
