import { Router, Request, Response} from "express";

const router = Router();

/**
 * GET /api/health
 *
 * Purpose:
 * - Quick, zero-dependency endpoint to confirm the server is alive.
 * - Useful for CI, local sanity checks, and uptime monitors.
 *
 * Returns:
 * - A tiny JSON payload with a service identifier, status, and current time.
 */
router.get("/", (_req: Request, res: Response) => {
    res.json({
        service: "flex-reviews-backend",
        status: "ok",
        time: new Date().toISOString()
    });
});

export default router;