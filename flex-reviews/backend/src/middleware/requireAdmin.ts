import type { Request, Response, NextFunction } from "express";
import { verifyAdminToken } from "../utils/jwt";

const COOKIE_NAME = process.env.COOKIE_NAME || "flex_admin";
const SECRET = process.env.SESSION_SECRET || "";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    try {
        const token = req.cookies?.[COOKIE_NAME];
        if (!token) return res.status(401).json({ error: "Unauthorized" });
        verifyAdminToken(token, SECRET);
        return next();
    } catch {
        return res.status(401).json({ error: "Unauthorized" });
    }
}
