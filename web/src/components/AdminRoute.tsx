import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

/** Use inside `ProtectedRoute` — redirects home if the signed-in user is not an admin. */
export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, meReady } = useAuth();

  if (!meReady) {
    return <p className="muted">Loading…</p>;
  }
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
