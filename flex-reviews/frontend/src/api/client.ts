/**
 * Very small fetch wrapper for our API.
 * - Adds querystring for GET
 * - Throws on non-2xx
 * - JSON in/out
 */
export async function apiGet<T>(path: string, query?: Record<string, unknown>): Promise<T> {
    const qs = query
        ? "?" + new URLSearchParams(
        Object.entries(query).reduce((acc, [k, v]) => {
            if (v === undefined || v === null || v === "") return acc;
            acc[k] = String(v);
            return acc;
        }, {} as Record<string, string>)
    ).toString()
        : "";
    const resp = await fetch(`/api${path}${qs}`);
    if (!resp.ok) throw new Error(`GET ${path} failed: HTTP ${resp.status}`);
    return resp.json() as Promise<T>;
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
    const resp = await fetch(`/api${path}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
    if (!resp.ok) throw new Error(`PATCH ${path} failed: HTTP ${resp.status}`);
    return resp.json() as Promise<T>;
}
