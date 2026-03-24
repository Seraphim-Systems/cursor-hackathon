import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/** Placeholder for Part 3 dashboard; requires auth per WORK_PLAN P1.6. */
export function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div>
      <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem" }}>Dashboard</h2>
      <p style={{ color: "#444", marginBottom: "1rem" }}>
        Signed in as <strong>{user?.email}</strong>. Full dashboard (recent entries, navigation) ships in Part 3.
      </p>
      <button type="button" onClick={() => logout()} style={{ padding: "0.4rem 0.8rem" }}>
        Sign out
      </button>
      <p style={{ marginTop: "1.5rem", fontSize: "0.875rem" }}>
        <Link to="/">Home</Link>
      </p>
    </div>
  );
}
