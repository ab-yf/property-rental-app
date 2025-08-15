import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import PublicListing from "./pages/PublicListing";

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/public" element={<PublicListing />} />
            </Routes>
        </BrowserRouter>
    );
}
