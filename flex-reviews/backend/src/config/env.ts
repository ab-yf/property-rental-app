import { z } from "zod";

const Env = z.object({
    SESSION_SECRET: z.string().min(16, "SESSION_SECRET must be set"),
    ADMIN_USER: z.string().min(1, "ADMIN_USER must be set"),
    ADMIN_PASS_HASH: z.string().min(20, "ADMIN_PASS_HASH must be a bcrypt hash"),
    COOKIE_NAME: z.string().default("flex_admin"),
    FRONTEND_ORIGIN: z
        .string()
        .url()
        .or(z.string().startsWith("http://localhost"))
        .default("http://localhost:5173"),
});

export function validateEnv() {
    const parsed = Env.safeParse(process.env);
    if (!parsed.success) {
        console.error("[env] Invalid configuration:", parsed.error.flatten().fieldErrors);
        process.exit(1);
    }
    return parsed.data;
}
