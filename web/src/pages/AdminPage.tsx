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

  // Upload Transcript State
  const [transcript, setTranscript] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setLoading(true);
    apiFetch<AdminDashboardData>("/api/admin/dashboard")
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transcript.trim()) return;

    setIsUploading(true);
    setUploadStatus("Uploading...");

    try {
      // 1. Create entry
      const entryResponse = await apiFetch<any>("/api/entries", {
        method: "POST",
        body: JSON.stringify({
          source: "text",
          transcript: transcript,
          created_at: new Date(date).toISOString(),
        }),
      });

      setUploadStatus("Analyzing...");

      // 2. Trigger analysis
      await apiFetch(`/api/entries/${entryResponse.id}/analyze`, {
        method: "POST",
        body: JSON.stringify({ preserve_locked_fields: false }),
      });

      setUploadStatus("Success!");
      setTranscript("");
      refreshData();
    } catch (err: any) {
      setUploadStatus(`Error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  if (loading && !data) return <p>Loading dashboard...</p>;
  if (error) return <p style={{ color: "red" }}>Error: {error}</p>;
  if (!data) return <p>No data available.</p>;

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginBottom: "2rem" }}>
        {/* Upload Section */}
        <div style={{ padding: "1.5rem", border: "1px solid #ddd", borderRadius: "8px", background: "#fff" }}>
          <h3 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>Upload Transcript</h3>
          <form onSubmit={handleUpload}>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>Date</label>
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                required
              />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>Transcript</label>
              <textarea 
                value={transcript} 
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste transcript here..."
                rows={10}
                style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc", fontFamily: "inherit" }}
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={isUploading || !transcript.trim()}
              style={{ 
                width: "100%", 
                padding: "0.75rem", 
                borderRadius: "4px", 
                border: "none", 
                background: isUploading ? "#ccc" : "#007bff", 
                color: "#fff", 
                fontWeight: "bold",
                cursor: isUploading ? "not-allowed" : "pointer"
              }}
            >
              {isUploading ? "Processing..." : "Upload & Analyze"}
            </button>
            {uploadStatus && (
              <p style={{ marginTop: "1rem", color: uploadStatus.includes("Error") ? "red" : "green", fontWeight: "bold" }}>
                {uploadStatus}
              </p>
            )}
          </form>
        </div>

        {/* Recent Users Section */}
        <div>
          <h3 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>Recent Users</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "2px solid #eee" }}>
                <th style={{ padding: "0.75rem 0" }}>Email</th>
                <th style={{ padding: "0.75rem 0" }}>Role</th>
              </tr>
            </thead>
            <tbody>
              {data.users.recent.map((u) => (
                <tr key={u.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "0.75rem 0" }}>{u.email}</td>
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
      </div>

      <div style={{ padding: "1rem", background: "#f9fafb", borderRadius: "8px" }}>
        <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>System Info</h3>
        <p style={{ fontSize: "0.85rem", margin: 0, color: "#666" }}>Storage Path: <code>{data.storage.path}</code></p>
      </div>
    </div>
  );
}
