import "dotenv/config";
import * as fs from "fs/promises";
import * as path from "path";
import { prisma } from "../db/prisma";
import { normalizeManyHostaway } from "../services/hostaway/normalize";

/**
 * Reads data/hostaway_mock.json, normalizes, and upserts into DB.
 * Safe to run multiple times.
 */
async function main() {
    const p = path.join(process.cwd(), "data", "hostaway_mock.json");
    const raw = JSON.parse(await fs.readFile(p, "utf-8"));
    const items: unknown[] = Array.isArray(raw?.result) ? raw.result : Array.isArray(raw) ? raw : [];

    const normalized = normalizeManyHostaway(items);

    for (const r of normalized) {
        await prisma.review.upsert({
            where: { id: r.id },
            create: {
                id: r.id,
                source: r.source,
                listingId: r.listingId,
                listingName: r.listingName ?? null,
                type: r.type,
                channel: r.channel,
                status: r.status ?? null,
                rating: r.rating,
                categories: r.categories,
                text: r.text,
                privateFeedback: r.privateFeedback ?? null,
                submittedAt: new Date(r.submittedAt),
                authorName: r.author?.name ?? null,
                authorUrl: r.author?.url ?? null,
                approved: false
            },
            update: {
                // keep approved as-is; refresh mutable fields if your mock changes
                listingName: r.listingName ?? null,
                status: r.status ?? null,
                rating: r.rating,
                categories: r.categories,
                text: r.text,
                privateFeedback: r.privateFeedback ?? null,
                submittedAt: new Date(r.submittedAt),
                authorName: r.author?.name ?? null,
                authorUrl: r.author?.url ?? null
            }
        });
    }

    console.log(`Seeded ${normalized.length} reviews.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
