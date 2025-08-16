import jwt from "jsonwebtoken";

export type AdminClaims = { sub: string; role: "admin" };

const WEEK = 7 * 24 * 60 * 60; // seconds

export function signAdminToken(sub: string, secret: string, ttlSec = WEEK) {
    return jwt.sign({ sub, role: "admin" } satisfies AdminClaims, secret, { expiresIn: ttlSec });
}

export function verifyAdminToken(token: string, secret: string) {
    const payload = jwt.verify(token, secret) as AdminClaims & { iat: number; exp: number };
    if (payload.role !== "admin") throw new Error("invalid role");
    return payload;
}
