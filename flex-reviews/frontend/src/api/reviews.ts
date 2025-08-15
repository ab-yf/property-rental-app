
import { z } from "zod";
import { apiGet, apiPatch } from "./client";
import type { Review, ReviewsResponse, ReviewQuery } from "../types/review";

// Optional: guard the response at runtime (helps catch backend drift during dev)
const ReviewZ = z.object({
    id: z.string(),
    source: z.enum(["hostaway", "google"]),
    listingId: z.string(),
    listingName: z.string().optional(),
    type: z.enum(["guest_to_host", "host_to_guest"]),
    channel: z.enum(["airbnb", "booking", "vrbo", "direct", "unknown"]),
    status: z.enum(["awaiting", "published", "pending", "scheduled", "expired"]).optional(),
    rating: z.number().nullable(),
    categories: z.record(z.string(), z.number()),
    text: z.string().nullable(),
    privateFeedback: z.string().nullable().optional(),
    submittedAt: z.string(),
    author: z.object({ name: z.string().optional(), url: z.string().url().optional() }).nullable().optional(),
    approved: z.boolean()
});
const ReviewsResponseZ = z.object({
    meta: z.object({
        count: z.number(),
        generatedAt: z.string(),
        limit: z.number(),
        offset: z.number()
    }),
    reviews: z.array(ReviewZ)
});

export async function fetchReviews(q: ReviewQuery): Promise<ReviewsResponse> {
    const res = await apiGet<ReviewsResponse>("/reviews/hostaway", q);
    // Validate in dev; skip for perf in prod if you like
    return ReviewsResponseZ.parse(res);
}

export async function approveReview(id: string, approved: boolean): Promise<Review> {
    return apiPatch<Review>(`/reviews/${encodeURIComponent(id)}/approve`, { approved });
}
