import React from "react";

export default function AppShell({ children }: { children: React.ReactNode }) {
    return (
        <>
            <header className="shell__header">
                <div className="brand">
                    <span className="brand__mark" aria-hidden />
                    <span>FlexLiving</span>
                </div>
                <div className="row">
                    <a href="/" className="badge badge--accent">Dashboard</a>
                    <a href="/public" className="badge">Listings</a>
                </div>
            </header>
            <div className="container">{children}</div>
        </>
    );
}
