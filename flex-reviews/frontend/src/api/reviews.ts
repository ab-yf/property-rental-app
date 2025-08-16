const API = import.meta.env.VITE_API_URL || "";

export async function fetchReviews(q: URLSearchParams | Record<string, unknown>) {
    const url = new URL("/api/reviews/hostaway", API);
    if (q && !(q instanceof URLSearchParams)) {
        Object.entries(q).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
        });
    } else if (q instanceof URLSearchParams) {
        q.forEach((v, k) => url.searchParams.set(k, v));
    }

    const res = await fetch(url, {
        credentials: "include",
        headers: { "X-Requested-With": "fetch" }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

export async function approveReview(id: string, approved: boolean) {
    const res = await fetch(`${API}/api/reviews/${encodeURIComponent(id)}/approve`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-Requested-With": "fetch" },
        body: JSON.stringify({ approved })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}
