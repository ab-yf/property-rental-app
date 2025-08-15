// components/ui/Input.tsx
import React from "react";

export function TextInput({
                              label,
                              ...rest
                          }: { label: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "className">) {
    return (
        <label className="label">
            <span>{label}</span>
            <input className="input" {...rest} />
        </label>
    );
}

export function Select({
                           label,
                           children,
                           ...rest
                       }: { label: string } & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "className"> & { children: React.ReactNode }) {
    return (
        <label className="label">
            <span>{label}</span>
            <select className="select" {...rest}>{children}</select>
        </label>
    );
}
