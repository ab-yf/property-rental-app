// frontend/src/api/public.ts
import type { ReviewsResponse } from "../types/review";
const API = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

export async function fetchPublicReviews(q: {
    listingId?: string; sort: string; limit: number; offset: number;
}): Promise<ReviewsResponse> {
    const params = new URLSearchParams({
        ...(q.listingId ? { listingId: q.listingId } : {}),
        sort: q.sort,
        limit: String(q.limit),
        offset: String(q.offset),
    });
    const res = await fetch(`${API}/api/public/reviews?${params}`, { credentials: "include" });
    if (!res.ok) throw new Error(`Public reviews ${res.status}: ${await res.text()}`);
    return res.json();
}
