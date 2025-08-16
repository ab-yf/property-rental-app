import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login } from "../api/auth";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { TextInput } from "../components/ui/Input";
import AppShell from "../components/ui/AppShell";

export default function Login() {
    const [username, setU] = useState("");
    const [password, setP] = useState("");
    const [err, setErr] = useState<string | null>(null);
    const nav = useNavigate();
    const qc = useQueryClient();

    const mut = useMutation({
        mutationFn: () => login(username, password),
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ["me"] });
            nav("/", { replace: true });
        },
        onError: () => setErr("Invalid credentials")
    });

    return (
        <AppShell>
            <div style={{ maxWidth: 420, margin: "48px auto" }}>
                <Card title="Admin Login" className="card--p">
                    <div style={{ display: "grid", gap: 12 }}>
                        <TextInput label="Username" value={username} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setU(e.target.value)} />
                        <TextInput label="Password" type="password" value={password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setP(e.target.value)} />
                        {err && <div style={{ color: "crimson", fontSize: 14 }}>{err}</div>}
                        <Button onClick={() => mut.mutate()} disabled={!username || !password || mut.isPending}>
                            {mut.isPending ? "Signing in…" : "Sign In"}
                        </Button>
                    </div>
                </Card>
            </div>
        </AppShell>
    );
}
