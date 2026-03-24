import { Link, Route, Routes } from "react-router-dom";

const apiBase = import.meta.env.VITE_API_URL || "";

export function App() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "1.5rem", maxWidth: 720 }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Journal</h1>
        <nav style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
          <Link to="/">Home</Link>
          <Link to="/login">Login</Link>
        </nav>
        {apiBase ? (
          <p style={{ fontSize: "0.85rem", color: "#555", marginTop: "0.5rem" }}>
            API: {apiBase}
          </p>
        ) : null}
      </header>
      <Routes>
        <Route
          path="/"
          element={
            <p>
              Shell ready. See <code>WORK_PLAN.md</code> Part 3 for pages (dashboard, record,
              history, calendar, entry detail, settings).
            </p>
          }
        />
        <Route path="/login" element={<p>Login — implement in Part 1 (P1.6).</p>} />
      </Routes>
    </div>
  );
}
