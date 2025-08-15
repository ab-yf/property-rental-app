// components/ui/Badge.tsx
import React from "react";

type Variant = "default" | "accent" | "danger";
export function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: Variant }) {
    const cls = "badge " + (variant === "accent" ? "badge--accent" : variant === "danger" ? "badge--danger" : "");
    return <span className={cls}>{children}</span>;
}
