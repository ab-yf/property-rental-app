import "dotenv/config"; // 1) Load .env early
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";

// Import routers (health exists now; reviews will come in Step 3)
import healthRouter from "./routes/health";

const app = express();

// ---- Global middleware ----

// Parse JSON bodies (req.body) for application/json
app.use(express.json());

// Allow local dev frontends to call this API.
// Tighten this for prod (specific origin, methods, headers).
app.use(cors({ origin: true, credentials: true }));

// Tiny request logger for developer visibility
app.use((req: Request, _res: Response, next: NextFunction) => {
    // Example: "GET /api/health"
    console.log(`${req.method} ${req.url}`);
    next();
});

// ---- Routes ----
// All API endpoints live under /api/*
app.use("/api/health", healthRouter);

// ---- 404 handler (for any unmatched /api/* route) ----
app.use((req: Request, res: Response) => {
    res.status(404).json({ error: "Not Found" });
});

// ---- Central error handler ----
app.use(
    (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
        // In prod, avoid leaking stack traces.
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
);

// ---- Boot the server ----
const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
});
