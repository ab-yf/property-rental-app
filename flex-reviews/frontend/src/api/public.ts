import { apiGet } from "./client";
import type { ReviewsResponse } from "../types/review";

/** Query params accepted by the backend public endpoint */
export type PublicQuery = {
    listingId?: string;
    sort?: "newest" | "oldest" | "rating_desc" | "rating_asc";
    limit?: number;
    offset?: number;
};

/** Fetch only manager-approved reviews (DB-only) */
export function fetchPublicReviews(q: PublicQuery) {
    // Assumes your apiGet prefixes '/api' internally (as in earlier steps).
    // If not, change to apiGet<ReviewsResponse>("/api/public/reviews", q).
    return apiGet<ReviewsResponse>("/public/reviews", q);
}
