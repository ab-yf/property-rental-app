// frontend/src/api/reviews.ts
const API = import.meta.env.VITE_API_URL;

export async function fetchReviews(q: URLSearchParams | Record<string, unknown>) {
    const url = new URL(`${API}/api/reviews/hostaway`);
    Object.entries(q as Record<string, unknown>).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    });

    const res = await fetch(url.toString(), {
        credentials: "include",                    // ✅ send cookie
        headers: { "X-Requested-With": "fetch" }   // ✅ passes your CSRF guard
    });
    if (res.status === 401) throw new Error("Unauthorized");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

export async function approveReview(id: string, approved: boolean) {
    const res = await fetch(`${API}/api/reviews/${encodeURIComponent(id)}/approve`, {
        method: "PATCH",
        credentials: "include",                    // ✅ send cookie
        headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "fetch"              // ✅ passes your CSRF guard
        },
        body: JSON.stringify({ approved })
    });
    if (res.status === 401) throw new Error("Unauthorized");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}
