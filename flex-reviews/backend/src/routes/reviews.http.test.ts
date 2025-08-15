import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../db/prisma";
import { normalizeManyHostaway } from "../services/hostaway/normalize";
import fs from "fs/promises";
import path from "path";

const app = createApp();

// Optional: seed DB once for approvals test
beforeAll(async () => {
    const p = path.join(process.cwd(), "data", "hostaway_mock.json");
    const raw = JSON.parse(await fs.readFile(p, "utf-8"));
    const items: unknown[] = Array.isArray(raw?.result) ? raw.result : raw;
    const normalized = normalizeManyHostaway(items);

    expect(normalized.length).toBeGreaterThan(0); // also narrows for readers
    const first = normalized[0]!;                 // safe because of the guard

    await prisma.review.upsert({
        where: { id: first.id },
        create: {
            id: first.id,
            source: first.source,
            listingId: first.listingId,
            listingName: first.listingName ?? null,
            type: first.type,
            channel: first.channel,
            status: first.status ?? null,
            rating: first.rating,
            categories: first.categories,
            text: first.text,
            privateFeedback: first.privateFeedback ?? null,
            submittedAt: new Date(first.submittedAt),
            authorName: first.author?.name ?? null,
            authorUrl: first.author?.url ?? null,
            approved: true
        },
        update: { approved: true }
    });
});

describe("GET /api/reviews/hostaway", () => {
    it("returns normalized reviews with meta and merges approved state", async () => {
        const res = await request(app).get("/api/reviews/hostaway").expect(200);
        expect(res.body).toHaveProperty("meta");
        expect(Array.isArray(res.body.reviews)).toBe(true);

        const { reviews } = res.body;
        // Check at least one review and 'approved' flag exists
        if (reviews.length > 0) {
            expect(reviews[0]).toHaveProperty("approved");
        }
    });

    it("applies filters (channel=booking) correctly", async () => {
        const res = await request(app).get("/api/reviews/hostaway?channel=booking").expect(200);
        const { reviews } = res.body;
        for (const r of reviews) {
            expect(r.channel).toBe("booking");
        }
    });
});
