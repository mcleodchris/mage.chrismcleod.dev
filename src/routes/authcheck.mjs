import express from "express";

const router = express.Router();

/**
 * Validates the shared secret provided by remote clients.
 * Accepts the secret via Authorization header (Bearer token) or POST body.
 * @route POST /authcheck
 * @returns {{ valid: boolean }}
 */
router.post("/", (req, res) => {
  const authHeader = req.headers.authorization;
  const bodySecret = req.body?.secret;

  let providedSecret = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    providedSecret = authHeader.split(" ")[1];
  } else if (bodySecret) {
    providedSecret = bodySecret;
  }

  const isValid = providedSecret === process.env.SHARED_SECRET;

  res.json({ valid: isValid });
});

export default router;
