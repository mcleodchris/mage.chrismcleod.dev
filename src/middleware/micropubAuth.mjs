import log from "../utils/logger.mjs";

/**
 * Micropub authentication middleware for OAuth 2.0 Bearer tokens.
 * Sets req.authenticated = true if valid, else sends 401/403.
 */
export function micropubAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    log.warn("Missing or invalid Authorization header");
    return res.status(401).json({
      error: "unauthorized",
      error_description: "Missing or invalid Authorization header",
    });
  }
  const token = authHeader.split(" ")[1];
  // TODO: Replace with real token validation (e.g., introspect, DB, etc.)
  if (!token || token !== process.env.SHARED_SECRET) {
    log.warn("Invalid or insufficient token");
    return res.status(403).json({
      error: "forbidden",
      error_description: "Invalid or insufficient token",
    });
  }
  req.authenticated = true;
  next();
}
