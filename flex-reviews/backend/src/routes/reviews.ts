import { Router, Request, Response } from "express";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { normalizeManyHostaway } from "../services/hostaway/normalize";

// -------------- Query schema & types --------------
const QuerySchema = z.object({
    listingId: z.string().optional(),     // exact match
    type: z.enum(["guest_to_host", "host_to_guest"]).optional(),
    status: z.enum(["awaiting", "published", "pending", "scheduled", "expired"]).optional(),
    channel: z.enum(["airbnb", "booking", "vrbo", "direct", "unknown"]).optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    maxRating: z.coerce.number().min(0).max(5).optional(),
    from: z.string().optional(),          // ISO date (we'll parse)
    to: z.string().optional(),            // ISO date (we'll parse)
    limit: z.coerce.number().min(1).max(200).default(50),
    offset: z.coerce.number().min(0).default(0)
});

type Query = z.infer<typeof QuerySchema>;

// -------------- Helpers --------------
function parseDate(s?: string): number | null {
    if (!s) return null;
    const t = Date.parse(s);
    return Number.isNaN(t) ? null : t;
}

async function loadMock(): Promise<unknown[]> {
    const p = path.join(process.cwd(), "data", "hostaway_mock.json");
    const raw = JSON.parse(await fs.readFile(p, "utf-8"));
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.result)) return raw.result;
    return [];
}

// Placeholder for live Hostaway call (Step 6 if you flip USE_MOCK=false)
// async function loadLive(filters: Record<string, string>): Promise<unknown[]> {
//   // TODO: Implement Hostaway JWT + /v1/reviews call
//   return [];
// }

// -------------- Route --------------
const router = Router();

/**
 * GET /api/reviews/hostaway
 *
 * Returns normalized, filterable Hostaway reviews.
 * Behavior:
 *  - If USE_MOCK=true: read local data/hostaway_mock.json
 *  - Else: (future) call Hostaway API, then normalize
 *
 * Query params:
 *  - listingId, type, status, channel
 *  - minRating, maxRating
 *  - from, to (ISO)
 *  - limit, offset
 */
router.get("/hostaway", async (req: Request, res: Response) => {
    // 1) Validate query
    const q = QuerySchema.parse(req.query);

    // 2) Load data (mock vs live)
    const useMock = String(process.env.USE_MOCK ?? "true").toLowerCase() !== "false";
    const rawItems = useMock ? await loadMock() : []; // await loadLive(mappedFilters)

    // 3) Normalize
    const normalized = normalizeManyHostaway(rawItems);

    // 4) Apply filters (server-side)
    const fromTs = parseDate(q.from ?? undefined);
    const toTs = parseDate(q.to ?? undefined);

    const filtered = normalized.filter((r) => {
        if (q.listingId && r.listingId !== q.listingId) return false;
        if (q.type && r.type !== q.type) return false;
        if (q.status && r.status !== q.status) return false;
        if (q.channel && r.channel !== q.channel) return false;

        if (q.minRating != null && (r.rating ?? 0) < q.minRating) return false;
        if (q.maxRating != null && (r.rating ?? 5) > q.maxRating) return false;

        const t = Date.parse(r.submittedAt);
        if (!Number.isNaN(t)) {
            if (fromTs != null && t < fromTs) return false;
            if (toTs != null && t > toTs) return false;
        }

        return true;
    });

    // 5) Paginate
    const start = q.offset;
    const end = q.offset + q.limit;
    const page = filtered.slice(start, end);

    // 6) Respond
    res.json({
        meta: {
            count: filtered.length,
            generatedAt: new Date().toISOString(),
            limit: q.limit,
            offset: q.offset
        },
        reviews: page
    });
});

export default router;
