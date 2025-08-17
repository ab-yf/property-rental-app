import {CookieOptions, Router} from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signAdminToken, verifyAdminToken } from "../utils/jwt";

const r = Router();
const IS_PROD = process.env.NODE_ENV === "production";
const COOKIE_NAME = process.env.COOKIE_NAME || "flex_admin";
const SECRET = process.env.SESSION_SECRET || "";
const ADMIN_USER = process.env.ADMIN_USER || "";
const ADMIN_PASS_HASH = process.env.ADMIN_PASS_HASH || "";

const cookieOpts: CookieOptions = {
    httpOnly: true,
    sameSite: IS_PROD ? "none" : "lax", // <- now inferred as "none" | "lax"
    secure: IS_PROD,                    // required when sameSite = "none"
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
};

r.post("/login", async (req, res) => {
    const schema = z.object({ username: z.string().min(1), password: z.string().min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

    const { username, password } = parsed.data;
    // Generic error to avoid user enumeration
    const invalid = () => res.status(401).json({ error: "Invalid credentials" });

    if (username !== ADMIN_USER) return invalid();
    const ok = await bcrypt.compare(password, ADMIN_PASS_HASH);
    if (!ok) return invalid();

    const token = signAdminToken(username, SECRET);
    res.cookie(COOKIE_NAME, token, cookieOpts);
    return res.json({ ok: true });
});

r.post("/logout", (req, res) => {
    res.clearCookie(COOKIE_NAME, { ...cookieOpts, maxAge: 0 });
    res.json({ ok: true });
});

r.get("/me", (req, res) => {
    try {
        const token = req.cookies?.[COOKIE_NAME];
        if (!token) return res.status(401).json({ error: "Unauthorized" });
        const claims = verifyAdminToken(token, SECRET);
        return res.json({ user: claims.sub, role: "admin" });
    } catch {
        return res.status(401).json({ error: "Unauthorized" });
    }
});

export default r;
