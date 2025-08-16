// backend/src/routes/public.ts
import { Router } from "express";
import { Prisma } from "@prisma/client";
import {prisma} from "../db/prisma";
import { z } from "zod";

const router = Router();

/**
 * Public, approved reviews with strong query validation.
 * Supports: listingId (optional), sort, limit, offset
 * Returns: only { approved: true } reviews.
 */
const Q = z.object({
    listingId: z.string().trim().min(1).optional(),
    sort: z
        .enum(["newest", "oldest", "rating_desc", "rating_asc"])
        .default("newest"),
    limit: z.coerce.number().int().min(1).max(200).default(12),
    offset: z.coerce.number().int().min(0).default(0),
});

router.get("/reviews", async (req, res, next) => {
    try {
        const q = Q.parse(req.query);

        // WHERE: only approved, optional listing filter
        const where: Prisma.ReviewWhereInput = {
            approved: true,
            ...(q.listingId ? { listingId: q.listingId } : {}),
        };

        // ORDER BY: single primary field + stable secondary by id
        let primary: Prisma.ReviewOrderByWithRelationInput;
        switch (q.sort) {
            case "oldest":
                primary = { submittedAt: "asc" };
                break;
            case "rating_desc":
                primary = { rating: "desc" };
                break;
            case "rating_asc":
                primary = { rating: "asc" };
                break;
            case "newest":
            default:
                primary = { submittedAt: "desc" };
                break;
        }

        const publicSelect = {
            id: true, source: true, listingId: true, listingName: true,
            type: true, channel: true, status: true, rating: true,
            categories: true, text: true, submittedAt: true, authorName: true,
            approved: true, createdAt: true, updatedAt: true
        };

        const [reviews, count] = await Promise.all([
            prisma.review.findMany({
                where,
                orderBy: [primary, { id: "asc" }],
                skip: q.offset,
                take: q.limit,
                select: publicSelect  // only public, safe fields
            }),
            prisma.review.count({ where })
        ]);

        res.json({
            reviews,
            meta: {
                count,
                limit: q.limit,
                offset: q.offset,
                generatedAt: new Date().toISOString(),
            },
        });
    } catch (err) {
        // Zod errors → 400; others bubble to 500
        if (err instanceof z.ZodError) {
            return res.status(400).json({ error: "Invalid query", details: err.flatten() });
        }
        next(err);
    }
});

export default router;
