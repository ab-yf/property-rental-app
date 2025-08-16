import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import PublicListing from "./pages/PublicListing";
import Login from "./pages/Login";
import ProtectedRoute from "./routes/ProtectedRoute";

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/public" element={<PublicListing />} />
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
}
