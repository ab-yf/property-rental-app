import { describe, it, expect } from "vitest";
import { normalizeHostawayReview, normalizeManyHostaway } from "./normalize";
import {Review} from "../../domain/review";

describe("normalizeHostawayReview", () => {
    it("maps a typical Hostaway review to canonical shape", () => {
        const raw = {
            id: 7453,
            listingMapId: 70985,
            listingName: "2B N1 A - 29 Shoreditch Heights",
            type: "host-to-guest",
            channelId: 1,
            status: "published",
            rating: null,
            reviewCategory: [
                { category: "cleanliness", rating: 10 },
                { category: "communication", rating: 10 },
                { category: "respect_house_rules", rating: 10 }
            ],
            publicReview: "Shane and family are wonderful! Would definitely host again :)",
            privateFeedback: null,
            submittedAt: "2020-08-21 22:45:14",
            guestName: "Shane Finkelstein",
            reservationId: 555
        };

        const out = normalizeHostawayReview(raw);
        expect(out.id).toBe("hostaway:7453");
        expect(out.source).toBe("hostaway");
        expect(out.listingId).toBe("70985");
        expect(out.listingName).toMatch(/Shoreditch/);
        expect(out.type).toBe("host_to_guest");
        expect(out.channel).toBe("airbnb");
        expect(out.status).toBe("published");
        expect(out.rating).toBeNull();
        expect(out.categories.cleanliness).toBe(10);
        expect(out.text).toMatch(/wonderful/);
        expect(out.author?.name).toBe("Shane Finkelstein");
        expect(new Date(out.submittedAt).toString()).not.toBe("Invalid Date");
        expect(out.approved).toBe(false);
        expect(out.externalIds?.reviewId).toBe("7453");
        expect(out.externalIds?.reservationId).toBe("555");
    });

    it("handles missing/unknown fields gracefully", () => {
        const raw = {
            // missing id → local id will be generated, but we don't assert exact value
            type: "guest-to-host",
            channelId: 999, // unknown channel
            submittedAt: "", // invalid → falls back to now (still ISO)
            reviewCategory: [{ category: "cleanliness", rating: 8 }]
        };

        const out = normalizeHostawayReview(raw);
        expect(out.id.startsWith("hostaway:")).toBe(true);
        expect(out.type).toBe("guest_to_host");
        expect(out.channel).toBe("unknown");
        expect(new Date(out.submittedAt).toString()).not.toBe("Invalid Date");
        expect(out.categories.cleanliness).toBe(8);
    });

    it("normalizeManyHostaway filters out invalid entries instead of throwing", () => {
        const arr = [
            { id: 1, type: "host-to-guest", listingMapId: 42 },
            "totally invalid payload",
            null,
            { id: 2, type: "guest-to-host", listingMapId: 43 }
        ];

        const out = normalizeManyHostaway(arr as any);

        // Assert we got exactly two items (narrowing for TS)
        expect(out).toHaveLength(2);

        // Now destructure with default fallbacks to satisfy TS
        const [r1, r2] = out as [Review, Review];

        expect(r1.id).toBe("hostaway:1");
        expect(r2.id).toBe("hostaway:2");
    });
});
