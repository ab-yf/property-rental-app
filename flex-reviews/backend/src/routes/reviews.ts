import { Router, Request, Response } from "express";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { normalizeManyHostaway } from "../services/hostaway/normalize";
import { prisma } from "../db/prisma";
import { requireAdmin} from "../middleware/requireAdmin";

// -------------- Query schema & types --------------
// New: id (exact review id) and q (free-text search)
const QuerySchema = z.object({
    id: z.string().optional(),             // NEW: exact review id (e.g., "hostaway:7453")
    listingId: z.string().optional(),      // exact listing id (e.g., "70985")
    type: z.enum(["guest_to_host", "host_to_guest"]).optional(),
    status: z.enum(["awaiting", "published", "pending", "scheduled", "expired"]).optional(),
    channel: z.enum(["airbnb", "booking", "vrbo", "direct", "unknown"]).optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    maxRating: z.coerce.number().min(0).max(5).optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    q: z.string().optional(),              // NEW: keyword search across id/listing/text/author/name
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
    if (Array.isArray((raw as any)?.result)) return (raw as any).result;
    return [];
}

// -------------- Route --------------
const router = Router();

// protect all manager review routes
router.use(requireAdmin);

/**
 * GET /api/reviews/hostaway
 * Query supports:
 *  - id (exact review id), listingId (exact)
 *  - q (free-text across id, listingId, listingName, text, author name)
 *  - type, status, channel, minRating, maxRating, from, to
 *  - limit, offset
 */
router.get("/hostaway", requireAdmin, async (req: Request, res: Response) => {
    const q = QuerySchema.parse(req.query);

    const useMock = String(process.env.USE_MOCK ?? "true").toLowerCase() !== "false";
    const rawItems = useMock ? await loadMock() : []; // TODO live fetch
    const normalized = normalizeManyHostaway(rawItems);

    // Merge DB approvals into normalized items
    const ids = normalized.map((r) => r.id);
    const rows = await prisma.review.findMany({
        where: { id: { in: ids } },
        select: { id: true, approved: true }
    });
    const approvedMap = new Map(rows.map((r) => [r.id, r.approved]));
    for (const r of normalized) {
        (r as any).approved = approvedMap.get(r.id) ?? false;
    }

    // Filters
    const fromTs = parseDate(q.from);
    const toTs = parseDate(q.to);
    const needle = (q.q ?? "").trim().toLowerCase();

    const filtered = normalized.filter((r) => {
        if (q.id && r.id !== q.id) return false;                     // NEW: review id exact
        if (q.listingId && r.listingId !== q.listingId) return false;

        if (needle) {
            const hay = [
                r.id,
                r.listingId,
                r.listingName ?? "",
                r.text ?? "",
                r.author?.name ?? ""
            ]
                .join(" ")
                .toLowerCase();
            if (!hay.includes(needle)) return false;                    // NEW: free-text search
        }

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

    // Pagination
    const start = q.offset;
    const end = q.offset + q.limit;
    const page = filtered.slice(start, end);

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

/**
 * PATCH /api/reviews/:id/approve
 * Body: { approved: boolean }
 * If row is missing and USE_MOCK=true, auto-upsert from mock so PATCH never 404s for mock data.
 */
router.patch("/:id/approve", requireAdmin, async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const approved = typeof req.body?.approved === "boolean" ? req.body.approved : null;

    if (approved == null) {
        return res.status(400).json({ error: "approved (boolean) is required" });
    }

    try {
        const updated = await prisma.review.update({ where: { id }, data: { approved } });
        return res.json(updated);
    } catch (e: any) {
        // Record not found → for mock mode, auto-create from normalized mock
        if (e?.code === "P2025") {
            const useMock = String(process.env.USE_MOCK ?? "true").toLowerCase() !== "false";
            if (!useMock) {
                return res.status(404).json({ error: `Review ${id} not found` });
            }

            // Try to find the review in the mock, normalize and create it
            const rawItems = await loadMock();
            const normalized = normalizeManyHostaway(rawItems);
            const match = normalized.find((r) => r.id === id);
            if (!match) {
                return res.status(404).json({ error: `Review ${id} not found` });
            }

            // Create with the normalized fields and approved flag
            await prisma.review.create({
                data: {
                    id: match.id,
                    source: match.source,
                    listingId: match.listingId,
                    listingName: match.listingName ?? null,
                    type: match.type,
                    channel: match.channel,
                    status: match.status ?? null,
                    rating: match.rating,
                    categories: match.categories ?? {},
                    text: match.text,
                    privateFeedback: match.privateFeedback ?? null,
                    submittedAt: new Date(match.submittedAt),
                    authorName: match.author?.name ?? null,
                    authorUrl: match.author?.url ?? null,
                    approved
                }
            });

            const created = await prisma.review.findUnique({ where: { id } });
            return res.json(created);
        }

        return res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;
