import React, {JSX, useEffect, useMemo, useState} from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

import AppShell from "../components/ui/AppShell";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { TextInput, Select } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";

import { fetchPublicReviews } from "../api/public";
import type { Review, ReviewsResponse } from "../types/review";

type SortOpt = "newest" | "oldest" | "rating_desc" | "rating_asc";

export default function PublicListing(): JSX.Element {
    // URL state (so links are shareable)
    const [sp, setSp] = useSearchParams();
    const [listingId, setListingId] = useState<string>(sp.get("listingId") ?? "");
    const [sort, setSort] = useState<SortOpt>((sp.get("sort") as SortOpt) ?? "newest");
    const [offset, setOffset] = useState<number>(Number(sp.get("offset") ?? 0));
    const limit = 12;

    // keep URL in sync with state
    useEffect(() => {
        const next = new URLSearchParams(sp);
        if (listingId) next.set("listingId", listingId); else next.delete("listingId");
        if (sort) next.set("sort", sort);
        if (offset) next.set("offset", String(offset)); else next.delete("offset");
        setSp(next, { replace: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [listingId, sort, offset]);

    // Query public reviews (approved only)
    const { data, isLoading, isError, error, isFetching, refetch } =
        useQuery<ReviewsResponse, Error, ReviewsResponse, readonly [string, string, SortOpt, number, number]>({
            queryKey: ["public-reviews", listingId, sort, limit, offset] as const,
            queryFn: () => fetchPublicReviews({ listingId: listingId || undefined, sort, limit, offset }),
            placeholderData: keepPreviousData
        });

    const rows: Review[] = (data?.reviews ?? []) as Review[];

    // Page summary: avg rating & total approved (on server count)
    const kpis = useMemo(() => {
        const nums = rows
            .map((r: Review) => r.rating)
            .filter((n): n is number => typeof n === "number");
        const avg = nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : null;
        return { avg, count: data?.meta.count ?? 0 };
    }, [data, rows]);

    // Derive a display title (prefer listingName from first card)
    const title = useMemo(() => {
        const name = rows.find((r) => r.listingName)?.listingName;
        return name || (listingId ? `Listing ${listingId}` : "Guest Reviews");
    }, [rows, listingId]);

    return (
        <AppShell>
            <div className="stack">
                {/* Hero */}
                <section
                    className="card card--p"
                    style={{ background: "linear-gradient(180deg, #fff, var(--surface-2))" }}
                    aria-label="Property header"
                >
                    <div className="row" style={{ justifyContent: "space-between", alignItems: "start" }}>
                        <div>
                            <h1 style={{ margin: 0 }}>{title}</h1>
                            <p style={{ margin: "6px 0 0", color: "var(--text-3)" }}>
                                Verified, manager-approved guest reviews.
                            </p>
                        </div>
                        <Badge variant="accent">Public</Badge>
                    </div>
                </section>

                {/* Controls */}
                <Card
                    title="Find a listing"
                    actions={
                        <Button onClick={() => { setOffset(0); refetch(); }}>
                            Refresh
                        </Button>
                    }
                >
                    <div className="row" style={{ flexWrap: "wrap", gap: 12 }}>
                        <TextInput
                            label="Listing ID (exact)"
                            placeholder="e.g. 70985"
                            value={listingId}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                setListingId(e.target.value);
                                setOffset(0);
                            }}
                        />
                        <Select
                            label="Sort"
                            value={sort}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                setSort(e.target.value as SortOpt);
                                setOffset(0);
                            }}
                        >
                            <option value="newest">Newest</option>
                            <option value="oldest">Oldest</option>
                            <option value="rating_desc">Rating: High → Low</option>
                            <option value="rating_asc">Rating: Low → High</option>
                        </Select>
                        <Button
                            variant="ghost"
                            onClick={() => { setListingId(""); setSort("newest"); setOffset(0); }}
                            title="Clear all filters"
                        >
                            Clear
                        </Button>
                    </div>
                </Card>

                {/* KPIs */}
                <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
                    <section className="card card--p" style={{ flex: 1, minWidth: 220 }}>
                        <div className="badge">Average Rating</div>
                        <div style={{ fontSize: 28, marginTop: 6 }}>{isLoading ? "…" : (kpis.avg ?? "–")}</div>
                    </section>
                    <section className="card card--p" style={{ flex: 1, minWidth: 220 }}>
                        <div className="badge">Total Approved</div>
                        <div style={{ fontSize: 28, marginTop: 6 }}>{isLoading ? "…" : kpis.count}</div>
                    </section>
                </div>

                {/* Reviews grid */}
                <Card title="What guests are saying">
                    {isError ? (
                        <div style={{ color: "crimson" }}>
                            Error: {String((error as Error)?.message ?? "Unknown error")}
                        </div>
                    ) : isLoading ? (
                        <div>Loading…</div>
                    ) : rows.length === 0 ? (
                        <div>
                            {listingId
                                ? "No approved reviews for this listing yet."
                                : "Enter a listing id to see approved guest reviews."}
                        </div>
                    ) : (
                        <div
                            style={{
                                display: "grid",
                                gap: 12,
                                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))"
                            }}
                            aria-live="polite"
                        >
                            {rows.map((r: Review) => (
                                <ReviewCard key={r.id} review={r} />
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    <div className="row" style={{ justifyContent: "space-between", marginTop: 12 }}>
                        <div style={{ fontSize: 12, color: "var(--text-3)" }}>
                            Showing {rows.length} of {data?.meta.count ?? 0} {isFetching && " • Updating…"}
                        </div>
                        <div className="row">
                            <Button
                                variant="ghost"
                                onClick={() => setOffset(Math.max(0, offset - limit))}
                                disabled={offset === 0}
                            >
                                Prev
                            </Button>
                            <Button
                                onClick={() => {
                                    if ((data?.meta.count ?? 0) > offset + limit) setOffset(offset + limit);
                                }}
                                disabled={(data?.meta.count ?? 0) <= offset + limit}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        </AppShell>
    );
}

/** Single review card (Airbnb-like) */
function ReviewCard({ review: r }: { review: Review }) {
    return (
        <article className="card card--p">
            <header className="row" style={{ justifyContent: "space-between", alignItems: "start" }}>
                <div>
                    <div style={{ fontWeight: 700 }}>{r.author?.name ?? "Guest"}</div>
                    <div style={{ fontSize: 12, color: "var(--text-3)" }}>
                        {new Date(r.submittedAt).toLocaleDateString()} • {r.channel}
                    </div>
                </div>
                {typeof r.rating === "number" ? <Stars value={r.rating} /> : <Badge>Unrated</Badge>}
            </header>

            {r.text && <p style={{ marginTop: 10, marginBottom: 8 }}>{r.text}</p>}

            {!!Object.keys(r.categories || {}).length && (
                <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
                    {Object.entries(r.categories).map(([k, v]) => (
                        <Badge key={k}>{k.replace(/_/g, " ")}: {v}</Badge>
                    ))}
                </div>
            )}
        </article>
    );
}

/** Simple star renderer (0–5), colored with theme primary */
function Stars({ value }: { value: number }) {
    const full = Math.round(value);
    return (
        <div aria-label={`Rating ${value} out of 5`} title={`${value}/5`} style={{ display: "inline-flex", gap: 2 }}>
            {Array.from({ length: 5 }).map((_, i) => (
                <svg
                    key={i}
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill={i < full ? "currentColor" : "none"}
                    stroke="currentColor"
                    style={{ color: "var(--green-600)" }}
                >
                    <path d="M12 17.3l6.18 3.7-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
            ))}
        </div>
    );
}
