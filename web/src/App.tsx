import { Link, Navigate, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { CalendarPage } from "./pages/CalendarPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EntryDetailPage } from "./pages/EntryDetailPage";
import { HistoryPage } from "./pages/HistoryPage";
import { LoginPage } from "./pages/LoginPage";
import { RecordPage } from "./pages/RecordPage";
import { SettingsPage } from "./pages/SettingsPage";
import { RegisterPage } from "./pages/RegisterPage";
import AdminPage from "./pages/AdminPage";

const apiBase = import.meta.env.VITE_API_URL ?? "";

export default function App() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "nav-link nav-link--active" : "nav-link";

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="app-brand">
          <h1 className="app-brand__title">Journal</h1>
          <span className="app-brand__tag">voice notes</span>
        </div>
        <nav className="app-nav">
          <NavLink to="/" end className={navCls}>
            Dashboard
          </NavLink>
          {token ? (
            <>
              <NavLink to="/record" className={navCls}>
                Record
              </NavLink>
              <NavLink to="/history" className={navCls}>
                History
              </NavLink>
              <NavLink to="/calendar" className={navCls}>
                Calendar
              </NavLink>
              <NavLink to="/settings" className={navCls}>
                Settings
              </NavLink>
            </>
          ) : null}
          <span className="nav-spacer" />
          {token ? (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "1.5rem", maxWidth: 880 }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Journal</h1>
        <nav style={{ display: "flex", gap: "1rem", marginTop: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <Link to="/">Dashboard</Link>
          <Link to="/record">Record</Link>
          <Link to="/history">History</Link>
          <Link to="/calendar">Calendar</Link>
          <Link to="/settings">Settings</Link>
          {user?.is_admin && <Link to="/admin" style={{ color: "#4338ca", fontWeight: 600 }}>Admin</Link>}
          {user ? (
            <button
              type="button"
              className="nav-logout"
              onClick={() => {
                logout();
                navigate("/login", { replace: true });
              }}
            >
              Log out {user.email ? `(${user.email})` : ""}
            </button>
          ) : (
            <Link to="/login" className="nav-link">
              Sign in
            </Link>
          )}
        </nav>
        {apiBase && (
          <p style={{ fontSize: "0.85rem", color: "#555", marginTop: "0.5rem" }}>API: {apiBase}</p>
        )}
      </header>
      <main className="app-main">
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/record"
          element={
            <ProtectedRoute>
              <RecordPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <HistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/calendar"
          element={
            <ProtectedRoute>
              <CalendarPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/entries/:id"
          element={
            <ProtectedRoute>
              <EntryDetailPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </main>
    </div>
  );
}
