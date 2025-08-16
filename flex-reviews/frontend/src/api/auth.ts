const API = import.meta.env.VITE_API_URL || "";

export async function me() {
    const res = await fetch(`${API}/api/auth/me`, { credentials: "include" });
    if (!res.ok) throw new Error("unauthorized");
    return res.json() as Promise<{ user: string; role: "admin" }>;
}

export async function login(username: string, password: string) {
    const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-Requested-With": "fetch" },
        body: JSON.stringify({ username, password })
    });
    if (!res.ok) throw new Error("invalid");
    return res.json();
}

export async function logout() {
    const res = await fetch(`${API}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: { "X-Requested-With": "fetch" }
    });
    if (!res.ok) throw new Error("failed");
    return res.json();
}
