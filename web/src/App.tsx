import { Link, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./contexts/AuthContext";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";

const apiBase = import.meta.env.VITE_API_URL ?? "";

export function App() {
  const { user } = useAuth();

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "1.5rem", maxWidth: 720 }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Journal</h1>
        <nav style={{ display: "flex", gap: "1rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
          <Link to="/">Home</Link>
          {user ? (
            <Link to="/dashboard">Dashboard</Link>
          ) : (
            <Link to="/login">Sign in</Link>
          )}
        </nav>
        {apiBase ? (
          <p style={{ fontSize: "0.85rem", color: "#555", marginTop: "0.5rem" }}>
            API: {apiBase}
          </p>
        ) : (
          <p style={{ fontSize: "0.85rem", color: "#555", marginTop: "0.5rem" }}>
            API: same origin (use Vite dev proxy <code>/api</code> → app)
          </p>
        )}
      </header>
      <Routes>
        <Route
          path="/"
          element={
            <p>
              Shell ready. See <code>WORK_PLAN.md</code> Part 3 for full pages (record, history, calendar,
              entry detail, settings).
            </p>
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}
