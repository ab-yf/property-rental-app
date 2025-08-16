// frontend/src/components/ui/AppShell.tsx
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { me, logout } from "../../api/auth";

type AppShellProps = { children: React.ReactNode };

export default function AppShell({ children }: AppShellProps) {
    const qc = useQueryClient();
    const nav = useNavigate();

    // Session check (no retries on 401)
    const { isLoading, isSuccess } = useQuery({
        queryKey: ["me"],
        queryFn: me,
        retry: false,
    });

    // Logout action
    const logoutMut = useMutation({
        mutationFn: logout,
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: ["me"] });
            nav("/login", { replace: true });
        },
    });

    return (
        <>
            <header className="shell__header">
                <div className="brand">
                    <span className="brand__mark" aria-hidden />
                    <span>FlexLiving</span>
                </div>

                <div className="row">
                    {/* Primary nav */}
                    <Link to="/" className="badge badge--accent">Dashboard</Link>
                    <Link to="/public" className="badge">Listings</Link>

                    {/* Auth action styled exactly like the other badges */}
                    {isLoading ? null : isSuccess ? (
                        <a
                            href="#logout"
                            className="badge"
                            onClick={(e) => {
                                e.preventDefault();
                                if (!logoutMut.isPending) logoutMut.mutate();
                            }}
                            aria-label="Logout"
                            title="Logout"
                            role="button"
                        >
                            {logoutMut.isPending ? "Logging out…" : "Logout"}
                        </a>
                    ) : (
                        <Link to="/login" className="badge">Login</Link>
                    )}
                </div>
            </header>

            <div className="container">{children}</div>
        </>
    );
}
