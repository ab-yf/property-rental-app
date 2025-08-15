import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import healthRouter from "./routes/health";
import reviewsRouter from "./routes/reviews";
import publicRouter from "./routes/public";


export function createApp() {
    const app = express();

    // Parse JSON bodies
    app.use(express.json());

    // Dev CORS (tighten in production)
    app.use(cors({ origin: true, credentials: true }));


// Optional health check
    app.get("/api/healthz", (_req, res) => {
        res.json({ service: "flex-reviews-backend", status: "ok", time: new Date().toISOString() });
    });

    // Tiny request logger
    app.use((req: Request, _res: Response, next: NextFunction) => {
        console.log(`${req.method} ${req.url}`);
        next();
    });

    // Routes
    app.use("/api/public", publicRouter);
    app.use("/api/health", healthRouter);
    app.use("/api/reviews", reviewsRouter);

    // 404 for unmatched routes
    app.use((req: Request, res: Response) => {
        res.status(404).json({ error: "Not Found" });
    });

    // Central error handler
    app.use(
        (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
            console.error(err);
            res.status(500).json({ error: "Internal Server Error" });
        }
    );

    return app;
}

// Export a default app for manual use (non-test)
const app = createApp();
export default app;
