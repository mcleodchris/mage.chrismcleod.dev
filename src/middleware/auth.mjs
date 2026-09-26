// auth.mjs
import log from "../utils/logger.mjs";

export function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
        log.warn(`401 ${req.method} ${req.url}: missing or malformed Authorization header`);
        return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    if (token !== process.env.SHARED_SECRET) {
        log.warn(`401 ${req.method} ${req.url}: bearer token did not match SHARED_SECRET`);
        return res.status(401).json({ message: "Unauthorized" });
    }
    req.authenticated = true;

    next();
}
