import { useEffect, useState } from "react";

/**
 * Minimal App that verifies the end-to-end wiring:
 * - When mounted, it fetches /api/health.
 * - Thanks to Vite proxy, that goes to http://localhost:4000/api/health.
 * - The response is displayed, proving that frontend <-> backend works.
 */


export default function App() {
    const [status, setStatus] = useState<string>("Checking backend…");

    useEffect(() => {
        (async () => {
            try {
                const resp = await fetch("/api/health");
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                const json = await resp.json();
                setStatus(
                    `${json.service} • ${json.status} • ${new Date(json.time).toLocaleString()}`
                );
            } catch (err: any) {
                setStatus(`Error: ${err?.message ?? "Unknown error"}`);
            }
        })();
    }, []);

    return (
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
            <div style={{ maxWidth: 600, width: "100%", padding: 24 }}>
                <h1 style={{ marginBottom: 12 }}>Flex Reviews — Dev Check</h1>
                <div
                    style={{
                        border: "1px solid #ddd",
                        borderRadius: 8,
                        padding: 16,
                        fontFamily: "ui-sans-serif, system-ui, Segoe UI, Roboto, Helvetica, Arial"
                    }}
                >
                    <strong>Backend health:</strong>
                    <div style={{ marginTop: 8 }}>{status}</div>
                    <p style={{ color: "#666", marginTop: 8, fontSize: 12 }}>
                        If you see “ok” here, both servers are wired correctly.
                    </p>
                </div>
            </div>
        </main>
    );
}
