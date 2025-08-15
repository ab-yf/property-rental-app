// Typed client-side mirror of the backend "ReviewSchema".
export type ReviewSource = "hostaway" | "google";
export type ReviewType = "guest_to_host" | "host_to_guest";
export type ReviewChannel = "airbnb" | "booking" | "vrbo" | "direct" | "unknown";
export type ReviewStatus = "awaiting" | "published" | "pending" | "scheduled" | "expired" | undefined;

export type Review = {
    id: string;
    source: ReviewSource;
    listingId: string;
    listingName?: string;
    type: ReviewType;
    channel: ReviewChannel;
    status?: ReviewStatus;
    rating: number | null;
    categories: Record<string, number>;
    text: string | null;
    privateFeedback?: string | null;
    submittedAt: string; // ISO
    author?: { name?: string; url?: string } | null;
    approved: boolean;
    externalIds?: {
        reviewId?: string;
        reservationId?: string;
        placeId?: string;
    };
};

export type ReviewsResponse = {
    meta: { count: number; generatedAt: string; limit: number; offset: number };
    reviews: Review[];
};

export type ReviewQuery = {
    id?: string;
    listingId?: string;
    type?: ReviewType;
    status?: Exclude<ReviewStatus, undefined>;
    channel?: ReviewChannel;
    minRating?: number;
    maxRating?: number;
    from?: string;
    to?: string;
    q?: string;
    limit?: number;
    offset?: number;
};