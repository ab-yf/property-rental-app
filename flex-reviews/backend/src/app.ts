// backend/src/app.ts
import express, { Request, Response, NextFunction } from "express";
import cors, { CorsOptionsDelegate } from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import healthRouter from "./routes/health";
import reviewsRouter from "./routes/reviews";
import publicRouter from "./routes/public";
import authRouter from "./routes/auth";

export function createApp() {
    const app = express();

    // running behind Render's proxy
    app.set("trust proxy", 1);

    app.use(helmet());
    app.use(express.json());
    app.use(cookieParser());

    const raw = process.env.FRONTEND_ORIGINS ?? process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
    const allowList = raw
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);

    const corsOptions: CorsOptionsDelegate = (req, cb) => {
        // NOTE: CorsRequest has only { method?, headers }, no .header()/.get()
        const originHeader = (req.headers?.origin as string | undefined) ?? "";
        let allowed = false;

        if (!originHeader) {
            // server-to-server, curl, health checks
            allowed = true;
        } else if (allowList.includes(originHeader)) {
            allowed = true;
        } else {
            // (optional) auto-allow Vercel previews
            try {
                const host = new URL(originHeader).hostname;
                if (host.endsWith(".vercel.app")) allowed = true;
            } catch {
                /* ignore bad Origin */
            }
        }

        cb(null, {
            origin: allowed ? originHeader : false,
            credentials: true,
            methods: ["GET", "POST", "PATCH", "OPTIONS"],
            allowedHeaders: ["Content-Type", "X-Requested-With"],
        });
    };

    app.use(cors(corsOptions));
    app.options("*", cors(corsOptions)); // preflight

    // CSRF guard for state-changing requests
    app.use((req, res, next) => {
        if (["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) {
            if (req.get("X-Requested-With") !== "fetch") {
                return res.status(400).json({ error: "Bad request" });
            }
        }
        next();
    });

    // Health check
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
    app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    });

    return app;
}

const app = createApp();
export default app;
