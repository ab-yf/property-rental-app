// components/ui/Switch.tsx
import React from "react";

export function Switch({
                           checked,
                           onChange,
                           label
                       }: {
    checked: boolean;
    onChange: (next: boolean) => void;
    label?: string;
}) {
    return (
        <label className="row" style={{ gap: 10 }}>
      <span
          role="switch"
          aria-checked={checked}
          tabIndex={0}
          className={`switch ${checked ? "switch--on" : ""}`}
          onClick={() => onChange(!checked)}
          onKeyDown={(e) => (e.key === " " || e.key === "Enter") && onChange(!checked)}
      >
        <span className="switch__thumb" />
      </span>
            {label && <span style={{ fontSize: 12, color: "var(--text-3)" }}>{label}</span>}
        </label>
    );
}
