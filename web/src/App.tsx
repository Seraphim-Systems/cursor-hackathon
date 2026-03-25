import { Link, Navigate, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { AdminRoute } from "./components/AdminRoute";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Dashboard } from "./pages/Dashboard";
import { EntryDetailPage } from "./pages/EntryDetailPage";
import { HistoryPage } from "./pages/HistoryPage";
import { LoginPage } from "./pages/Login";
import { RegisterPage } from "./pages/RegisterPage";
import { RecordPage } from "./pages/RecordPage";
import { SettingsPage } from "./pages/SettingsPage";
import AdminPage from "./pages/AdminPage";

export function App() {
  const navigate = useNavigate();
  const { token, logout, isAdmin, meReady } = useAuth();

  const navCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "nav-link nav-link--active" : "nav-link";

  const showAdminNav = token && meReady && isAdmin;

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="app-header__inner">
          <div className="app-brand">
            <h1 className="app-brand__title">Talk to the Duck</h1>
            <span className="app-brand__tag">voice notes</span>
          </div>
          <nav className="app-nav">
            <NavLink to="/" end className={navCls}>
              Dashboard
            </NavLink>
            {token ? (
              <>
                <NavLink to="/history" className={navCls}>
                  History
                </NavLink>
                <NavLink to="/settings" className={navCls}>
                  Settings
                </NavLink>
                {showAdminNav ? (
                  <NavLink to="/admin" className={navCls}>
                    Admin
                  </NavLink>
                ) : null}
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
                <svg
                  className="nav-logout__icon"
                  width={16}
                  height={16}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>Sign out</span>
              </button>
            ) : (
              <Link to="/login" className="nav-link">
                Sign in
              </Link>
            )}
          </nav>
        </div>
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
          <Route path="/calendar" element={<Navigate to="/history" replace />} />
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
                <AdminRoute>
                  <AdminPage />
                </AdminRoute>
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
