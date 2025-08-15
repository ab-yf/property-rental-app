import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../db/prisma";

const app = createApp();

describe("PATCH /api/reviews/:id/approve", () => {
    it("returns 400 if body is missing approved boolean", async () => {
        const res = await request(app).patch("/api/reviews/hostaway:missing/approve").send({});
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/approved/);
    });

    it("returns 404 if the review does not exist", async () => {
        const res = await request(app)
            .patch("/api/reviews/hostaway:does-not-exist/approve")
            .send({ approved: true });
        expect(res.status).toBe(404);
    });

    it("updates approved flag for existing review", async () => {
        // Ensure a row exists
        const id = "hostaway:7453";
        await prisma.review.upsert({
            where: { id },
            create: {
                id,
                source: "hostaway",
                listingId: "70985",
                type: "host_to_guest",
                channel: "airbnb",
                categories: {},
                submittedAt: new Date()
            } as any, // minimal create; for SQLite we can omit nullable fields
            update: {}
        });

        const res = await request(app)
            .patch(`/api/reviews/${id}/approve`)
            .send({ approved: true });

        expect(res.status).toBe(200);
        expect(res.body.approved).toBe(true);
    });
});
