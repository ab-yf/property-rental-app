import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Dev server config:
 * - Runs on http://localhost:5173
 * - Proxies any /api/* request to backend at http://localhost:4000
 *   This means fetch('/api/health') in the browser hits the Express server
 *   without CORS headaches.
 */

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            "/api": {
                target: "http://localhost:4000",
                changeOrigin: true
            }
        }
    }
});
