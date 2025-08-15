// components/ui/Card.tsx
import React from "react";

export function Card({
                         title,
                         actions,
                         children,
                         className = ""
                     }: {
    title?: React.ReactNode;
    actions?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <section className={`card card--p ${className}`}>
            {(title || actions) && (
                <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
                    <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
                    {actions}
                </div>
            )}
            {children}
        </section>
    );
}
