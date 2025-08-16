import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import healthRouter from "./routes/health";
import reviewsRouter from "./routes/reviews";
import publicRouter from "./routes/public";
import authRouter from "./routes/auth";


export function createApp() {
    const app = express();

    app.use(helmet());
    app.use(express.json());
    app.use(cookieParser());


    // CORS with credentials
    const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
    app.use(
        cors({
            origin: FRONTEND_ORIGIN,
            credentials: true,
            allowedHeaders: ["Content-Type", "X-Requested-With"],
            methods: ["GET", "POST", "PATCH", "OPTIONS"]
        })
    );

    // A small CSRF mitigation for state-changing requests
    app.use((req, res, next) => {
        if (["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) {
            if (req.get("X-Requested-With") !== "fetch") {
                return res.status(400).json({ error: "Bad request" });
            }
        }
        next();
    });

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
    app.use("/api/auth", authRouter);
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
