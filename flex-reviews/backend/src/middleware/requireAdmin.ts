import type { Request, Response, NextFunction } from "express";
import { verifyAdminToken } from "../utils/jwt";

const COOKIE_NAME = process.env.COOKIE_NAME || "flex_admin";
const SECRET = process.env.SESSION_SECRET || "";

/**
 * Minimal gate for manager endpoints.
 * Expects a signed cookie set by POST /api/auth/login
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    try {
        const token = req.cookies?.[COOKIE_NAME];
        if (!token) return res.status(401).json({ error: "Unauthorized" });
        const claims = verifyAdminToken(token, SECRET);
        // If you want, you can expose the username:
        // (req as any).admin = claims.sub;
        return next();
    } catch {
        return res.status(401).json({ error: "Unauthorized" });
    }
}

export default requireAdmin;
