// frontend/src/pages/Dashboard.tsx
import React, {JSX, useMemo, useState} from "react";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";

import type {
    Review,
    ReviewChannel,
    ReviewQuery,
    ReviewsResponse,
    ReviewType
} from "../types/review";
import { fetchReviews, approveReview } from "../api/reviews";

// Themed UI (your components)
import AppShell from "../components/ui/AppShell";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { TextInput, Select } from "../components/ui/Input";
import { Switch } from "../components/ui/Switch";
import { Badge } from "../components/ui/Badge";

// ---------------- helpers ----------------
function queryKeyFrom(q: ReviewQuery) {
    return ["reviews", q] as const;
}
function toISODateInput(s?: string) {
    if (!s) return "";
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}
function fromDateInput(v?: string) {
    return v && v.length ? v : undefined;
}

// ---------------- page ----------------
export default function Dashboard(): JSX.Element {
    const [filters, setFilters] = useState<ReviewQuery>({ limit: 50, offset: 0 });
    const queryClient = useQueryClient();

    const { data, isLoading, isError, error, refetch } =
        useQuery<ReviewsResponse, Error, ReviewsResponse, ReturnType<typeof queryKeyFrom>>({
            queryKey: queryKeyFrom(filters),
            queryFn: () => fetchReviews(filters),
            placeholderData: keepPreviousData
        });

    const approveMut = useMutation<
        Review,
        Error,
        { id: string; approved: boolean },
        { prev?: ReviewsResponse; key: ReturnType<typeof queryKeyFrom> }
    >({
        mutationFn: ({ id, approved }) => approveReview(id, approved),
        onMutate: async (vars) => {
            const key = queryKeyFrom(filters);
            await queryClient.cancelQueries({ queryKey: key });
            const prev = queryClient.getQueryData<ReviewsResponse>(key);

            if (prev) {
                const next: ReviewsResponse = {
                    ...prev,
                    reviews: prev.reviews.map((r: Review) =>
                        r.id === vars.id ? { ...r, approved: vars.approved } : r
                    )
                };
                queryClient.setQueryData(key, next);
            }
            return { prev, key };
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.prev) queryClient.setQueryData(ctx.key, ctx.prev);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: queryKeyFrom(filters) });
        },
        onSuccess: () => {
            // 🔽 NEW: also nudge the public queries
            queryClient.invalidateQueries({ queryKey: ["public-reviews"], exact: false });
            queryClient.invalidateQueries({ queryKey: ["public-reviews-grouped"], exact: false });
        }
    });

    const kpis = useMemo(() => {
        const list: Review[] = data?.reviews ?? [];
        const count = list.length;
        const approved = list.filter((r: Review) => r.approved).length;
        const avgRating = (() => {
            const nums: number[] = list
                .map((r: Review) => r.rating)
                .filter((n): n is number => typeof n === "number");
            if (!nums.length) return null;
            const total = nums.reduce((a: number, b: number) => a + b, 0);
            return Math.round((total / nums.length) * 10) / 10;
        })();
        return { count, approved, approvedPct: count ? Math.round((approved / count) * 100) : 0, avgRating };
    }, [data]);

    const rows: Review[] = (data?.reviews ?? []) as Review[];

    return (
        <AppShell>
            <div className="stack">
                {/* Filters */}
                <Card
                    title="Filters"
                    actions={
                        <div className="row">
                            <Button onClick={() => refetch()}>Refresh</Button>
                            <Button
                                variant="ghost"
                                onClick={() => setFilters({ limit: 50, offset: 0 })}
                                title="Clear all filters"
                            >
                                Clear
                            </Button>
                        </div>
                    }
                >
                    <div className="row" style={{ flexWrap: "wrap", gap: 12 }}>
                        <TextInput
                            label="Review ID (exact)"
                            placeholder="e.g. hostaway:7453"
                            value={filters.id ?? ""}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setFilters((p) => ({ ...p, id: e.target.value || undefined, offset: 0 }))
                            }
                        />
                        <TextInput
                            label="Listing ID (exact)"
                            placeholder="e.g. 70985"
                            value={filters.listingId ?? ""}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setFilters((p) => ({ ...p, listingId: e.target.value || undefined, offset: 0 }))
                            }
                        />
                        <TextInput
                            label="Search (keyword)"
                            placeholder="id, listing, name, text, author"
                            value={filters.q ?? ""}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setFilters((p) => ({ ...p, q: e.target.value || undefined, offset: 0 }))
                            }
                        />
                        <Select
                            label="Channel"
                            value={filters.channel ?? ""}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                setFilters((p) => ({
                                    ...p,
                                    channel: (e.target.value || undefined) as ReviewChannel | undefined,
                                    offset: 0
                                }))
                            }
                        >
                            <option value="">Any</option>
                            <option value="airbnb">Airbnb</option>
                            <option value="booking">Booking.com</option>
                            <option value="vrbo">Vrbo</option>
                            <option value="direct">Direct</option>
                            <option value="unknown">Unknown</option>
                        </Select>

                        <Select
                            label="Type"
                            value={filters.type ?? ""}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                setFilters((p) => ({
                                    ...p,
                                    type: (e.target.value || undefined) as ReviewType | undefined,
                                    offset: 0
                                }))
                            }
                        >
                            <option value="">Any</option>
                            <option value="host_to_guest">Host → Guest</option>
                            <option value="guest_to_host">Guest → Host</option>
                        </Select>

                        <Select
                            label="Status"
                            value={filters.status ?? ""}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                setFilters((p) => ({
                                    ...p,
                                    status: (e.target.value || undefined) as NonNullable<ReviewQuery["status"]> | undefined,
                                    offset: 0
                                }))
                            }
                        >
                            <option value="">Any</option>
                            <option value="awaiting">Awaiting</option>
                            <option value="published">Published</option>
                            <option value="pending">Pending</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="expired">Expired</option>
                        </Select>

                        <TextInput
                            label="Min Rating"
                            type="number"
                            min={0}
                            max={5}
                            step={0.1}
                            value={filters.minRating?.toString() ?? ""}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setFilters((p) => ({
                                    ...p,
                                    minRating: e.target.value ? Number(e.target.value) : undefined,
                                    offset: 0
                                }))
                            }
                        />
                        <TextInput
                            label="Max Rating"
                            type="number"
                            min={0}
                            max={5}
                            step={0.1}
                            value={filters.maxRating?.toString() ?? ""}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setFilters((p) => ({
                                    ...p,
                                    maxRating: e.target.value ? Number(e.target.value) : undefined,
                                    offset: 0
                                }))
                            }
                        />
                        <TextInput
                            label="From"
                            type="date"
                            value={toISODateInput(filters.from)}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setFilters((p) => ({ ...p, from: fromDateInput(e.target.value), offset: 0 }))
                            }
                        />
                        <TextInput
                            label="To"
                            type="date"
                            value={toISODateInput(filters.to)}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setFilters((p) => ({ ...p, to: fromDateInput(e.target.value), offset: 0 }))
                            }
                        />
                    </div>
                </Card>

                {/* KPIs */}
                <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
                    <section className="card card--p" style={{ flex: 1, minWidth: 180 }}>
                        <div className="badge">Total</div>
                        <div style={{ fontSize: 24, marginTop: 6 }}>{isLoading ? "…" : kpis.count}</div>
                    </section>
                    <section className="card card--p" style={{ flex: 1, minWidth: 180 }}>
                        <div className="badge">Approved</div>
                        <div style={{ fontSize: 24, marginTop: 6 }}>{isLoading ? "…" : kpis.approved}</div>
                    </section>
                    <section className="card card--p" style={{ flex: 1, minWidth: 180 }}>
                        <div className="badge badge--accent">Approved %</div>
                        <div style={{ fontSize: 24, marginTop: 6 }}>{isLoading ? "…" : `${kpis.approvedPct}%`}</div>
                    </section>
                    <section className="card card--p" style={{ flex: 1, minWidth: 180 }}>
                        <div className="badge">Avg Rating</div>
                        <div style={{ fontSize: 24, marginTop: 6 }}>{isLoading ? "…" : kpis.avgRating ?? "–"}</div>
                    </section>
                </div>

                {/* Table */}
                <Card title="Reviews">
                    {isError ? (
                        <div style={{ color: "crimson" }}>Error: {String((error as Error)?.message ?? "Unknown error")}</div>
                    ) : isLoading ? (
                        <div>Loading reviews…</div>
                    ) : rows.length === 0 ? (
                        <div>No reviews match your filters.</div>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table className="table">
                                <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Listing</th>
                                    <th>Type</th>
                                    <th>Channel</th>
                                    <th>Status</th>
                                    <th>Rating</th>
                                    <th>Submitted</th>
                                    <th>Text</th>
                                    <th>Approved</th>
                                </tr>
                                </thead>
                                <tbody>
                                {rows.map((r: Review) => (
                                    <tr key={r.id}>
                                        <td data-label="ID"><code>{r.id}</code></td>
                                        <td data-label="Listing">{r.listingName || r.listingId}</td>
                                        <td data-label="Type">{r.type.replace(/_/g, " ")}</td>
                                        <td data-label="Channel">{r.channel}</td>
                                        <td data-label="Status">{r.status ?? <Badge variant="accent">—</Badge>}</td>
                                        <td data-label="Rating">{r.rating ?? "—"}</td>
                                        <td data-label="Submitted">{new Date(r.submittedAt).toLocaleDateString()}</td>
                                        <td
                                            data-label="Text"
                                            title={r.text ?? ""}
                                        >
                                            {r.text ?? "—"}
                                        </td>
                                        <td data-label="Approved">
                                            <Switch
                                                checked={r.approved}
                                                onChange={(next: boolean) => approveMut.mutate({ id: r.id, approved: next })}
                                                label={r.approved ? "Yes" : "No"}
                                            />
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div style={{ marginTop: 12, color: "var(--text-3)", fontSize: 12 }}>
                        Total matches: {data?.meta.count ?? 0} • Page size: {filters.limit ?? 50} • Updated:{" "}
                        {data ? new Date(data.meta.generatedAt).toLocaleString() : "-"}
                    </div>
                </Card>
            </div>
        </AppShell>
    );
}
