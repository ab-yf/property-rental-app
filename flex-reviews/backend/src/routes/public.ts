import { Router, Request, Response } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";

// Quick ping so you can test the mount fast:
const router = Router();
router.get("/ping", (_req: Request, res: Response) => {
    res.json({ service: "public-reviews", ok: true, time: new Date().toISOString() });
});

const Sort = z.enum(["newest", "oldest", "rating_desc", "rating_asc"]);
const QuerySchema = z.object({
    listingId: z.string().optional(),
    channel: z.enum(["airbnb", "booking", "vrbo", "direct", "unknown"]).optional(),
    type: z.enum(["guest_to_host", "host_to_guest"]).optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    maxRating: z.coerce.number().min(0).max(5).optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(200).default(20),
    offset: z.coerce.number().int().min(0).default(0),
    sort: Sort.default("newest")
});

router.get("/reviews", async (req: Request, res: Response) => {
    const q = QuerySchema.parse(req.query);

    // Where (fully typed)
    const where: Prisma.ReviewWhereInput = { approved: true };
    if (q.listingId) where.listingId = q.listingId;
    if (q.channel) where.channel = q.channel as any;
    if (q.type) where.type = q.type as any;

    if (q.minRating != null || q.maxRating != null) {
        where.rating = {};
        if (q.minRating != null) (where.rating as Prisma.FloatNullableFilter).gte = q.minRating;
        if (q.maxRating != null) (where.rating as Prisma.FloatNullableFilter).lte = q.maxRating;
    }

    if (q.from || q.to) {
        where.submittedAt = {};
        if (q.from) (where.submittedAt as Prisma.DateTimeFilter).gte = new Date(q.from);
        if (q.to) (where.submittedAt as Prisma.DateTimeFilter).lte = new Date(q.to);
    }

    // OrderBy (safe under exactOptionalPropertyTypes)
    const orderBy: Prisma.ReviewOrderByWithRelationInput[] = [];
    const ASC = "asc" as const;
    const DESC = "desc" as const;

    switch (q.sort) {
        case "rating_desc":
            orderBy.push({ rating: DESC }, { submittedAt: DESC });
            break;
        case "rating_asc":
            orderBy.push({ rating: ASC }, { submittedAt: DESC });
            break;
        case "oldest":
            orderBy.push({ submittedAt: ASC });
            break;
        default:
            orderBy.push({ submittedAt: DESC });
            break;
    }

    const [count, rows] = await Promise.all([
        prisma.review.count({ where }),
        prisma.review.findMany({ where, orderBy, skip: q.offset, take: q.limit })
    ]);

    const reviews = rows.map((r) => ({
        id: r.id,
        source: r.source as "hostaway" | "google",
        listingId: r.listingId,
        listingName: r.listingName ?? undefined,
        type: r.type as "guest_to_host" | "host_to_guest",
        channel: r.channel as "airbnb" | "booking" | "vrbo" | "direct" | "unknown",
        status: r.status ?? undefined,
        rating: r.rating ?? null,
        categories: (r.categories as Record<string, number>) ?? {},
        text: r.text ?? null,
        submittedAt: r.submittedAt.toISOString(),
        author: { name: r.authorName ?? undefined, url: r.authorUrl ?? undefined },
        approved: r.approved
    }));

    // lightweight caching; frontend still gets fresh on interaction
    res.setHeader("Cache-Control", "public, max-age=60");

    res.json({
        meta: { count, limit: q.limit, offset: q.offset, generatedAt: new Date().toISOString() },
        reviews
    });
});

export default router;
