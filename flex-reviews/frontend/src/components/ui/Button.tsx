// components/ui/Button.tsx
import React from "react";

type Variant = "primary" | "ghost" | "danger" | "accent";
export function Button({
                           children,
                           variant = "primary",
                           ...rest
                       }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
    const cls =
        "btn " +
        (variant === "ghost" ? "btn--ghost" :
            variant === "danger" ? "btn--danger" :
                variant === "accent" ? "btn--accent" : "");
    return <button className={cls} {...rest}>{children}</button>;
}
