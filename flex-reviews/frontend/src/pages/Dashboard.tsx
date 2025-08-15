// frontend/src/pages/Dashboard.tsx
import React, { useMemo, useState } from "react";
import {
    useMutation,
    useQuery,
    useQueryClient,
    keepPreviousData
} from "@tanstack/react-query";
import type {
    Review,
    ReviewChannel,
    ReviewQuery,
    ReviewsResponse,
    ReviewType
} from "../types/review";
import { fetchReviews, approveReview } from "../api/reviews";

// ---------- helpers ----------
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

// ---------- page ----------
export default function Dashboard() {
    const [filters, setFilters] = useState<ReviewQuery>({ limit: 50, offset: 0 });
    const queryClient = useQueryClient();

    // v5: use placeholderData: keepPreviousData, and give all generics so data is typed
    const { data, isLoading, isError, error, refetch } =
        useQuery<
            ReviewsResponse,                   // TQueryFnData (what queryFn returns)
            Error,                             // TError
            ReviewsResponse,                   // TData (what the hook returns after select)
            ReturnType<typeof queryKeyFrom>    // TQueryKey
        >({
            queryKey: queryKeyFrom(filters),
            queryFn: () => fetchReviews(filters),
            placeholderData: keepPreviousData
        });

    // optimistic approve toggle
    const approveMut = useMutation<
        Review,
        Error,
        { id: string; approved: boolean },
        { prev?: ReviewsResponse }
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
            return { prev };
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.prev) queryClient.setQueryData(queryKeyFrom(filters), ctx.prev);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: queryKeyFrom(filters) });
        }
    });

    // KPIs
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

    return (
        <main style={{ padding: 24, maxWidth: 1200, margin: "0 auto", fontFamily: "system-ui, Arial" }}>
            <h1 style={{ marginBottom: 16 }}>Manager Dashboard — Reviews</h1>

            <Filters
                filters={filters}
                onChange={(f) => setFilters((prev) => ({ ...prev, ...f, offset: 0 }))}
                onRefresh={refetch}
            />

            <Kpis
                loading={isLoading}
                count={kpis.count}
                approved={kpis.approved}
                approvedPct={kpis.approvedPct}
                avgRating={kpis.avgRating}
            />

            {isError && (
                <div style={{ color: "crimson", marginTop: 12 }}>
                    Error: {String((error as Error)?.message ?? "Unknown error")}
                </div>
            )}

            <ReviewsTable
                loading={isLoading}
                rows={data?.reviews ?? []}
                onToggle={(id: string, nextApproved: boolean) => approveMut.mutate({ id, approved: nextApproved })}
            />

            <div style={{ marginTop: 12, color: "#666", fontSize: 12 }}>
                Total matches: {data?.meta.count ?? 0} • Page size: {filters.limit ?? 50} • Updated:{" "}
                {data ? new Date(data.meta.generatedAt).toLocaleString() : "-"}
            </div>
        </main>
    );
}

// ---------- filters ----------
function Filters({
                     filters,
                     onChange,
                     onRefresh
                 }: {
    filters: ReviewQuery;
    onChange: (patch: ReviewQuery) => void;
    onRefresh: () => void;
}) {
    return (
        <section
            style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                border: "1px solid #eee",
                borderRadius: 8,
                padding: 12,
                marginBottom: 16
            }}
        >
            <TextInput
                label="Review ID (exact)"
                value={filters.id ?? ""}
                onChange={(v: string) => onChange({ id: v || undefined })}
                placeholder="e.g. hostaway:7453"
            />

            <TextInput
                label="Listing ID (exact)"
                value={filters.listingId ?? ""}
                onChange={(v: string) => onChange({ listingId: v || undefined })}
                placeholder="e.g. 70985"
            />

            <TextInput
                label="Search (keyword)"
                value={filters.q ?? ""}
                onChange={(v: string) => onChange({ q: v || undefined })}
                placeholder="id, listing, name, text, author"
            />

            <Select
                label="Channel"
                value={filters.channel ?? ""}
                options={[
                    ["", "Any"],
                    ["airbnb", "Airbnb"],
                    ["booking", "Booking.com"],
                    ["vrbo", "Vrbo"],
                    ["direct", "Direct"],
                    ["unknown", "Unknown"]
                ]}
                onChange={(v: string) => onChange({ channel: (v || undefined) as ReviewChannel | undefined })}
            />

            <Select
                label="Type"
                value={filters.type ?? ""}
                options={[
                    ["", "Any"],
                    ["host_to_guest", "Host → Guest"],
                    ["guest_to_host", "Guest → Host"]
                ]}
                onChange={(v: string) => onChange({ type: (v || undefined) as ReviewType | undefined })}
            />

            <Select
                label="Status"
                value={filters.status ?? ""}
                options={[
                    ["", "Any"],
                    ["awaiting", "Awaiting"],
                    ["published", "Published"],
                    ["pending", "Pending"],
                    ["scheduled", "Scheduled"],
                    ["expired", "Expired"]
                ]}
                onChange={(v: string) =>
                    onChange({ status: (v || undefined) as NonNullable<ReviewQuery["status"]> | undefined })
                }
            />

            <TextInput
                label="Min Rating"
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={filters.minRating?.toString() ?? ""}
                onChange={(v: string) => onChange({ minRating: v ? Number(v) : undefined })}
            />

            <TextInput
                label="Max Rating"
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={filters.maxRating?.toString() ?? ""}
                onChange={(v: string) => onChange({ maxRating: v ? Number(v) : undefined })}
            />

            <TextInput
                label="From"
                type="date"
                value={toISODateInput(filters.from)}
                onChange={(v: string) => onChange({ from: fromDateInput(v) })}
            />

            <TextInput
                label="To"
                type="date"
                value={toISODateInput(filters.to)}
                onChange={(v: string) => onChange({ to: fromDateInput(v) })}
            />

            <div style={{ display: "flex", alignItems: "end", gap: 8 }}>
                <button
                    onClick={() => onRefresh()}
                    style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", background: "#fafafa", cursor: "pointer" }}
                >
                    Refresh
                </button>
                <button
                    onClick={() =>
                        onChange({
                            id: undefined,
                            listingId: undefined,
                            q: undefined,
                            channel: undefined,
                            type: undefined,
                            status: undefined,
                            minRating: undefined,
                            maxRating: undefined,
                            from: undefined,
                            to: undefined
                        })
                    }
                    style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}
                >
                    Clear
                </button>
            </div>
        </section>
    );
}


type TextInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: string;
};

function TextInput({ label, value, onChange, type = "text", ...rest }: TextInputProps) {
    return (
        <label style={{ display: "grid", gap: 4, fontSize: 14 }}>
            <span style={{ color: "#444" }}>{label}</span>
            <input
                value={value}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
                type={type}
                {...rest}
                style={{ padding: 8, borderRadius: 6, border: "1px solid #ddd" }}
            />
        </label>
    );
}

type SelectProps = {
    label: string;
    value: string;
    options: [string, string][];
    onChange: (v: string) => void;
};

function Select({ label, value, options, onChange }: SelectProps) {
    return (
        <label style={{ display: "grid", gap: 4, fontSize: 14 }}>
            <span style={{ color: "#444" }}>{label}</span>
            <select
                value={value}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
                style={{ padding: 8, borderRadius: 6, border: "1px solid #ddd" }}
            >
                {options.map(([val, text]: [string, string]) => (
                    <option key={val || "any"} value={val}>
                        {text}
                    </option>
                ))}
            </select>
        </label>
    );
}

// ---------- KPIs ----------
function Kpis({
                  loading,
                  count,
                  approved,
                  approvedPct,
                  avgRating
              }: {
    loading: boolean;
    count: number;
    approved: number;
    approvedPct: number;
    avgRating: number | null;
}) {
    const boxStyle: React.CSSProperties = {
        border: "1px solid #eee",
        padding: 12,
        borderRadius: 8,
        background: "#fff"
    };

    return (
        <section
            style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                marginBottom: 16
            }}
        >
            <div style={boxStyle}>
                <div style={{ color: "#666", fontSize: 12 }}>Total</div>
                <div style={{ fontSize: 20 }}>{loading ? "…" : count}</div>
            </div>
            <div style={boxStyle}>
                <div style={{ color: "#666", fontSize: 12 }}>Approved</div>
                <div style={{ fontSize: 20 }}>{loading ? "…" : approved}</div>
            </div>
            <div style={boxStyle}>
                <div style={{ color: "#666", fontSize: 12 }}>Approved %</div>
                <div style={{ fontSize: 20 }}>{loading ? "…" : `${approvedPct}%`}</div>
            </div>
            <div style={boxStyle}>
                <div style={{ color: "#666", fontSize: 12 }}>Avg Rating</div>
                <div style={{ fontSize: 20 }}>{loading ? "…" : avgRating ?? "–"}</div>
            </div>
        </section>
    );
}

// ---------- table ----------
function ReviewsTable({
                          loading,
                          rows,
                          onToggle
                      }: {
    loading: boolean;
    rows: Review[];
    onToggle: (id: string, next: boolean) => void;
}) {
    if (loading) return <div>Loading reviews…</div>;
    if (!rows.length) return <div>No reviews match your filters.</div>;

    return (
        <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                    <Th>ID</Th>
                    <Th>Listing</Th>
                    <Th>Type</Th>
                    <Th>Channel</Th>
                    <Th>Status</Th>
                    <Th>Rating</Th>
                    <Th>Submitted</Th>
                    <Th>Text</Th>
                    <Th>Approved</Th>
                </tr>
                </thead>
                <tbody>
                {rows.map((r: Review) => (
                    <tr key={r.id} style={{ borderBottom: "1px solid #f4f4f4" }}>
                        <Td><code>{r.id}</code></Td>
                        <Td>{r.listingName || r.listingId}</Td>
                        <Td>{r.type.replace(/_/g, " ")}</Td>
                        <Td>{r.channel}</Td>
                        <Td>{r.status ?? "—"}</Td>
                        <Td>{r.rating ?? "—"}</Td>
                        <Td>{new Date(r.submittedAt).toLocaleDateString()}</Td>
                        <Td
                            title={r.text ?? ""}
                            style={{ maxWidth: 320, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                        >
                            {r.text ?? "—"}
                        </Td>
                        <Td>
                            <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                <input
                                    type="checkbox"
                                    checked={r.approved}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onToggle(r.id, e.target.checked)}
                                />
                                <span style={{ fontSize: 12, color: "#666" }}>{r.approved ? "Yes" : "No"}</span>
                            </label>
                        </Td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}

function Th({
                children,
                style,
                ...rest
            }: React.ThHTMLAttributes<HTMLTableCellElement> & { children: React.ReactNode }) {
    return (
        <th
            {...rest}
            style={{ padding: "10px 8px", fontSize: 12, color: "#666", ...(style ?? {}) }}
        >
            {children}
        </th>
    );
}

function Td({
                children,
                style,
                ...rest
            }: React.TdHTMLAttributes<HTMLTableCellElement> & { children: React.ReactNode }) {
    return (
        <td
            {...rest}
            style={{ padding: "10px 8px", fontSize: 14, ...(style ?? {}) }}
        >
            {children}
        </td>
    );
}
