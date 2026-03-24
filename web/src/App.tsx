import { Link, Navigate, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { CalendarPage } from "./pages/CalendarPage";
import { Dashboard } from "./pages/Dashboard";
import { EntryDetailPage } from "./pages/EntryDetailPage";
import { HistoryPage } from "./pages/HistoryPage";
import { LoginPage } from "./pages/Login";
import { RecordPage } from "./pages/RecordPage";
import { SettingsPage } from "./pages/SettingsPage";
import { RegisterPage } from "./pages/RegisterPage";

export function App() {
  const navigate = useNavigate();
  const { token, logout } = useAuth();

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
            <button
              type="button"
              className="nav-logout"
              onClick={() => {
                logout();
                navigate("/", { replace: true });
              }}
            >
              Log out
            </button>
          ) : (
            <Link to="/login" className="nav-link">
              Sign in
            </Link>
          )}
        </nav>
      </header>
      <main className="app-main">
      <Routes>
        <Route path="/" element={<Dashboard />} />
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
