/**
 * Hostaway → Canonical Review normalizer (pure functions).
 *
 * Responsibilities:
 * - Validate the minimal shape we need from Hostaway with a permissive Zod schema
 * - Map fields into our canonical Review model
 * - Normalize channel, type, status, and submittedAt
 * - Convert reviewCategory[] into a dictionary { [category]: number }
 * - Provide a safe "many" normalizer that skips invalid records instead of throwing
 */

import { z } from "zod";
import {
    ReviewSchema,
    type Review,
    ReviewType,
    type ReviewStatus
} from "../../domain/review";
import { mapChannelId } from "./channelMap";
import { toIsoDate } from "../../utils/date";

/** Narrow the Hostaway review to just the fields we care about (all optional to be robust). */
const HostawayReviewLike = z
    .object({
        id: z.union([z.string(), z.number()]).optional(),
        listingMapId: z.union([z.string(), z.number()]).optional(),
        listingId: z.union([z.string(), z.number()]).optional(), // fallback
        listingName: z.string().optional(),
        type: z.string().optional(), // "host-to-guest" | "guest-to-host"
        channelId: z.union([z.string(), z.number()]).optional(),
        status: z.string().optional(),
        rating: z.number().nullable().optional(),
        publicReview: z.string().nullable().optional(),
        privateFeedback: z.string().nullable().optional(),
        submittedAt: z.string().optional(), // e.g., "2020-08-21 22:45:14"
        departureDate: z.string().optional(), // sometimes present
        guestName: z.string().optional(),
        reservationId: z.union([z.string(), z.number()]).optional(),
        // reviewCategory is often: [{ category: "cleanliness", rating: 10 }, ...]
        reviewCategory: z
            .array(
                z.object({
                    category: z.string().optional(),
                    rating: z.number().optional()
                })
            )
            .optional()
    })
    .passthrough();

export type HostawayReviewLike = z.infer<typeof HostawayReviewLike>;

/** Normalize Hostaway "type" → our enum. Defaults to host_to_guest when unknown. */
function mapType(input?: string): z.infer<typeof ReviewType> {
    const t = (input ?? "").toLowerCase();
    return t === "guest-to-host" ? "guest_to_host" : "host_to_guest";
}

/** Return our narrowed union type (or undefined) instead of a generic string. */
function mapStatus(status?: string): ReviewStatus {
    if (!status) return undefined;
    const s = status.toLowerCase();
    const allowed: ReviewStatus[] = ["awaiting", "published", "pending", "scheduled", "expired"];
    return (allowed as string[]).includes(s) ? (s as ReviewStatus) : undefined;
}

/** Build a stable canonical ID using source + external review id (or a local random). */
function makeCanonicalId(prefix: string, externalId?: string | number): string {
    if (externalId != null) return `${prefix}:${externalId}`;
    return `${prefix}:local_${Math.random().toString(36).slice(2)}`;
}

/**
 * Convert ONE Hostaway review object into our canonical Review shape.
 * Pure function: no I/O; throws if the final Review fails schema validation.
 */
export function normalizeHostawayReview(input: unknown): Review {
    // 1) Loosely validate the incoming payload
    const raw = HostawayReviewLike.parse(input);

    // 2) Basic field mappings
    const id = makeCanonicalId("hostaway", raw.id);
    const listingId = String(raw.listingMapId ?? raw.listingId ?? "unknown");
    const type = mapType(raw.type);
    const channel = mapChannelId(raw.channelId);
    const status = mapStatus(raw.status);
    const submittedAt = toIsoDate(raw.submittedAt ?? raw.departureDate);

    // 3) Convert reviewCategory[] → categories dictionary
    const categories: Record<string, number> = {};
    for (const item of raw.reviewCategory ?? []) {
        const key =
            typeof item?.category === "string" && item.category.trim().length > 0
                ? item.category.trim()
                : null;
        const val = typeof item?.rating === "number" ? item.rating : null;
        if (key && val != null) categories[key] = val;
    }

    // 4) Assemble candidate and validate against our canonical schema
    const candidate = {
        id,
        source: "hostaway" as const,
        listingId,
        listingName: raw.listingName,
        type,
        channel,
        status, // <- correctly typed as ReviewStatus | undefined
        rating: raw.rating ?? null,
        categories,
        text: raw.publicReview ?? null,
        privateFeedback: raw.privateFeedback ?? null,
        submittedAt,
        author: raw.guestName ? { name: raw.guestName } : null,
        approved: false, // default; toggled later in manager dashboard
        externalIds: {
            reviewId: raw.id != null ? String(raw.id) : undefined,
            reservationId: raw.reservationId != null ? String(raw.reservationId) : undefined
        }
    };

    // Throws on failure (good: we don't want invalid data to leak through)
    return ReviewSchema.parse(candidate);
}

/** Normalize a list; skip invalid entries (log in real systems). */
export function normalizeManyHostaway(inputs: unknown[]): Review[] {
    const out: Review[] = [];
    for (const item of inputs) {
        try {
            out.push(normalizeHostawayReview(item));
        } catch {
            // For the assessment, silently ignore invalid records.
            // In production, you'd log the error and the offending payload.
        }
    }
    return out;
}
