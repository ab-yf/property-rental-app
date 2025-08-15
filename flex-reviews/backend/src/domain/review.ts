/**
 * Canonical Review domain model + Zod schema.
 *
 * This is the single source of truth for the structure that our frontend
 * and all API routes will rely on. We keep it minimal, explicit, and
 * source-agnostic so we can ingest Hostaway, Google, or other sources
 * uniformly.
 */

import { z } from "zod";

/** Where did this review originate? Extendable for future sources. */
export const ReviewSource = z.enum(["hostaway", "google"]);
export type ReviewSource = z.infer<typeof ReviewSource>;

/** Direction of the review (who reviewed whom). */
export const ReviewType = z.enum(["guest_to_host", "host_to_guest"]);
export type ReviewType = z.infer<typeof ReviewType>;

/** Channel/platform of the stay (best-effort mapping). */
export const ReviewChannel = z.enum(["airbnb", "booking", "vrbo", "direct", "unknown"]);
export type ReviewChannel = z.infer<typeof ReviewChannel>;

/** Lifecycle status (loosely mapped from upstream). */
export const ReviewStatus = z.enum(["awaiting", "published", "pending", "scheduled", "expired"]).optional();
export type ReviewStatus = z.infer<typeof ReviewStatus>;

/** Author metadata (only what's safe and useful to display). */
export const ReviewAuthor = z
    .object({
        name: z.string().min(1).optional(),
        url: z.string().url().optional()
    })
    .nullable()
    .optional();

/** Canonical review schema that the app consumes everywhere. */
export const ReviewSchema = z.object({
    id: z.string().min(1),
    source: ReviewSource,
    listingId: z.string().min(1),
    listingName: z.string().optional(),
    type: ReviewType,
    channel: ReviewChannel,
    status: ReviewStatus,
    rating: z.number().min(0).max(5).nullable(),
    categories: z.record(z.string(), z.number()).default({}),
    text: z.string().nullable(),
    privateFeedback: z.string().nullable().optional(),
    submittedAt: z.string().refine((s) => !Number.isNaN(Date.parse(s)), {
        message: "submittedAt must be ISO date string"
    }),
    author: ReviewAuthor,
    approved: z.boolean().default(false),
    externalIds: z
        .object({
            reviewId: z.string().optional(),
            reservationId: z.string().optional(),
            placeId: z.string().optional()
        })
        .partial()
        .optional()
});


export type Review = z.infer<typeof ReviewSchema>;
