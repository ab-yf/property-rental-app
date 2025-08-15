/**
 * Maps Hostaway channelId to human-friendly channel names.
 * This is best-effort; unknown IDs map to 'unknown'.
 *
 * You can extend this map as you learn more ids from real data.
 */
import { ReviewChannel } from "../../domain/review";

const mapping: Record<string, ReviewChannel> = {
    "1": "airbnb",
    "2": "booking",
    "3": "vrbo"
    // Add more if needed; leave unmapped as 'unknown'
};

export function mapChannelId(channelId: unknown): ReviewChannel {
    if (channelId == null) return "unknown";
    const key = String(channelId);
    return mapping[key] ?? "unknown";
}
