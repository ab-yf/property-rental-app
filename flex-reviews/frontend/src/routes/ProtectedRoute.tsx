import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { me } from "../api/auth";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { data, isLoading, isError } = useQuery({ queryKey: ["me"], queryFn: me, retry: false });

    if (isLoading) return <div style={{ padding: 24 }}>Checking session…</div>;
    if (isError) return <Navigate to="/login" replace />;
    return <>{children}</>;
}
