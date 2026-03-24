import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";

type AdminDashboardData = {
  users: {
    total: number;
    recent: Array<{ id: string; email: string; is_admin: boolean }>;
  };
  entries: {
    total: number;
  };
  storage: {
    path: string;
    file_count: number;
    total_bytes: number;
    total_mb: number;
  };
};

export default function AdminPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<AdminDashboardData>("/api/admin/dashboard")
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading dashboard...</p>;
  if (error) return <p style={{ color: "red" }}>Error: {error}</p>;
  if (!data) return <p>No data available.</p>;

  return (
    <div>
      <h2 style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}>Admin Dashboard</h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
        <div style={{ padding: "1rem", border: "1px solid #ddd", borderRadius: "8px" }}>
          <h3 style={{ fontSize: "1rem", margin: "0 0 0.5rem 0", color: "#666" }}>Total Users</h3>
          <p style={{ fontSize: "2rem", fontWeight: "bold", margin: 0 }}>{data.users.total}</p>
        </div>
        <div style={{ padding: "1rem", border: "1px solid #ddd", borderRadius: "8px" }}>
          <h3 style={{ fontSize: "1rem", margin: "0 0 0.5rem 0", color: "#666" }}>Total Entries</h3>
          <p style={{ fontSize: "2rem", fontWeight: "bold", margin: 0 }}>{data.entries.total}</p>
        </div>
        <div style={{ padding: "1rem", border: "1px solid #ddd", borderRadius: "8px" }}>
          <h3 style={{ fontSize: "1rem", margin: "0 0 0.5rem 0", color: "#666" }}>Storage Usage</h3>
          <p style={{ fontSize: "2rem", fontWeight: "bold", margin: 0 }}>{data.storage.total_mb} MB</p>
          <p style={{ fontSize: "0.85rem", color: "#666", margin: "0.25rem 0 0 0" }}>{data.storage.file_count} files</p>
        </div>
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <h3 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>Recent Users</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #eee" }}>
              <th style={{ padding: "0.75rem 0" }}>Email</th>
              <th style={{ padding: "0.75rem 0" }}>ID</th>
              <th style={{ padding: "0.75rem 0" }}>Role</th>
            </tr>
          </thead>
          <tbody>
            {data.users.recent.map((u) => (
              <tr key={u.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "0.75rem 0" }}>{u.email}</td>
                <td style={{ padding: "0.75rem 0", fontFamily: "monospace", fontSize: "0.85rem" }}>{u.id}</td>
                <td style={{ padding: "0.75rem 0" }}>
                  {u.is_admin ? (
                    <span style={{ background: "#eef2ff", color: "#4338ca", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem" }}>Admin</span>
                  ) : (
                    <span style={{ background: "#f3f4f6", color: "#374151", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem" }}>User</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ padding: "1rem", background: "#f9fafb", borderRadius: "8px" }}>
        <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>System Info</h3>
        <p style={{ fontSize: "0.85rem", margin: 0, color: "#666" }}>Storage Path: <code>{data.storage.path}</code></p>
      </div>
    </div>
  );
}
