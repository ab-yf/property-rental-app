// backend/src/index.ts
import "dotenv/config";
import app from "./app";
import publicRouter from "./routes/public";
import authRouter from "./routes/auth";


app.use("/api/auth", authRouter);
app.use("/api/public", publicRouter);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
});
