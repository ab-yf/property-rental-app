/**
 * Hostaway often returns date strings like "2020-08-21 22:45:14"
 * We convert to ISO 8601 consistently.
 */
export function toIsoDate(input: unknown, fallbackNow = true): string {
    if (typeof input === "string" && input.trim().length > 0) {
        // If it already looks ISO-ish, let Date parse it
        const normalized =
            input.includes("T") || input.endsWith("Z")
                ? input
                : input.replace(" ", "T") + "Z"; // naive UTC assumption for demo purposes
        const t = Date.parse(normalized);
        if (!Number.isNaN(t)) return new Date(t).toISOString();
    }
    // Optional fallback for missing/invalid dates (so schema validation still passes)
    return fallbackNow ? new Date().toISOString() : "";
}
