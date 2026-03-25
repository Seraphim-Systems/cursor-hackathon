import { useEffect, useState, useRef, useCallback } from "react";
import { apiFetch, createEntryWithAudioProgress } from "../api/client";

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

  // Upload State
  const [mode, setMode] = useState<"text" | "audio">("text");
  const [transcript, setTranscript] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    refreshData();
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const refreshData = () => {
    setLoading(true);
    apiFetch<AdminDashboardData>("/api/admin/dashboard")
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      setIsRecording(true);
      setAudioBlob(null);
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Failed to start recording", err);
      alert("Microphone access denied or not supported.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === "text" && !transcript.trim()) return;
    if (mode === "audio" && !audioBlob) return;

    setIsUploading(true);
    setUploadStatus("Uploading...");
    setUploadPct(0);

    try {
      const created_at = new Date(date).toISOString();
      
      if (mode === "text") {
        // 1. Create entry
        const entryResponse = await apiFetch<any>("/api/entries", {
          method: "POST",
          body: JSON.stringify({
            source: "text",
            transcript: transcript,
            created_at,
          }),
        });

        setUploadStatus("Analyzing...");

        // 2. Trigger analysis
        await apiFetch(`/api/entries/${entryResponse.id}/analyze`, {
          method: "POST",
          body: JSON.stringify({ preserve_locked_fields: false }),
        });
      } else {
        // Audio mode
        const formData = new FormData();
        formData.append("audio", audioBlob!, `backdate-${Date.now()}.webm`);
        formData.append("run_analysis", "true");
        formData.append("metadata", JSON.stringify({
          source: "audio",
          created_at,
        }));

        await createEntryWithAudioProgress(formData, (loaded, total) => {
          setUploadPct(total > 0 ? Math.round((100 * loaded) / total) : null);
        });
      }

      setUploadStatus("Success!");
      setTranscript("");
      setAudioBlob(null);
      setRecordingTime(0);
      refreshData();
      
      setTimeout(() => setUploadStatus(null), 3000);
    } catch (err: any) {
      setUploadStatus(`Error: ${err.message}`);
    } finally {
      setIsUploading(false);
      setUploadPct(null);
    }
  };

  if (loading && !data) return <div className="page-shell"><p>Loading dashboard...</p></div>;
  if (error) return <div className="page-shell"><p className="text-error">Error: {error}</p></div>;
  if (!data) return <div className="page-shell"><p>No data available.</p></div>;

  return (
    <div className="page-shell stack-lg" style={{ maxWidth: "1200px" }}>
      <h2 className="page-title">Admin Dashboard</h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem" }}>
        <div className="ui-card">
          <h3 className="section-label" style={{ fontSize: "0.75rem", marginBottom: "0.25rem" }}>Total Users</h3>
          <p style={{ fontSize: "2rem", fontWeight: "750", margin: 0, color: "var(--color-accent)" }}>{data.users.total}</p>
        </div>
        <div className="ui-card">
          <h3 className="section-label" style={{ fontSize: "0.75rem", marginBottom: "0.25rem" }}>Total Entries</h3>
          <p style={{ fontSize: "2rem", fontWeight: "750", margin: 0, color: "var(--color-accent)" }}>{data.entries.total}</p>
        </div>
        <div className="ui-card">
          <h3 className="section-label" style={{ fontSize: "0.75rem", marginBottom: "0.25rem" }}>Storage Usage</h3>
          <p style={{ fontSize: "2rem", fontWeight: "750", margin: 0, color: "var(--color-accent)" }}>{data.storage.total_mb} MB</p>
          <p className="muted" style={{ margin: "0.25rem 0 0 0" }}>{data.storage.file_count} files</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "2rem" }}>
        {/* Upload Section */}
        <div className="ui-card stack-lg" style={{ 
          background: "linear-gradient(165deg, var(--color-complement-muted) 0%, transparent 100%)",
          border: "1px solid var(--color-border-strong)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, color: "var(--color-accent)" }}>Backdate Entry</h3>
            <div style={{ display: "flex", gap: "0.25rem", background: "var(--color-bg)", padding: "0.25rem", borderRadius: "var(--radius-sm)" }}>
              <button 
                onClick={() => setMode("text")}
                className={mode === "text" ? "btn-gold" : "btn-ghost"}
                style={{ padding: "0.25rem 0.75rem", fontSize: "0.8rem", border: "none" }}
              >
                Text
              </button>
              <button 
                onClick={() => setMode("audio")}
                className={mode === "audio" ? "btn-gold" : "btn-ghost"}
                style={{ padding: "0.25rem 0.75rem", fontSize: "0.8rem", border: "none" }}
              >
                Audio
              </button>
            </div>
          </div>

          <form onSubmit={handleUpload} className="stack-lg">
            <div className="form-field">
              <label className="section-label" style={{ fontSize: "0.65rem" }}>Date for Entry</label>
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            {mode === "text" ? (
              <div className="form-field">
                <label className="section-label" style={{ fontSize: "0.65rem" }}>Transcript Content</label>
                <textarea 
                  value={transcript} 
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Paste transcript here..."
                  rows={8}
                  className="field-textarea"
                  required
                />
              </div>
            ) : (
              <div className="stack-lg" style={{ 
                padding: "1.5rem", 
                background: "var(--color-bg)", 
                borderRadius: "var(--radius-md)",
                border: "1px dashed var(--color-border)",
                textAlign: "center"
              }}>
                {isRecording ? (
                  <div className="stack-lg">
                    <div style={{ fontSize: "2rem", fontWeight: "750", color: "var(--color-danger)" }}>
                      {formatTime(recordingTime)}
                    </div>
                    <button type="button" onClick={stopRecording} className="btn-danger">
                      Stop Recording
                    </button>
                  </div>
                ) : audioBlob ? (
                  <div className="stack-lg">
                    <div className="text-success">Audio Captured ({formatTime(recordingTime)})</div>
                    <audio src={URL.createObjectURL(audioBlob)} controls style={{ width: "100%" }} />
                    <button type="button" onClick={startRecording} className="btn-ghost">
                      Record Again
                    </button>
                  </div>
                ) : (
                  <div className="stack-lg">
                    <p className="muted">Record audio to backdate an entry</p>
                    <button type="button" onClick={startRecording} className="btn-gold">
                      Start Microphone
                    </button>
                  </div>
                )}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isUploading || (mode === "text" ? !transcript.trim() : !audioBlob) || isRecording}
              className="btn-gold"
              style={{ width: "100%" }}
            >
              {isUploading ? (uploadPct !== null ? `Uploading ${uploadPct}%...` : "Processing...") : "Save Backdated Entry"}
            </button>
            
            {uploadStatus && (
              <div style={{ 
                textAlign: "center", 
                fontSize: "0.9rem", 
                fontWeight: "600",
                color: uploadStatus.includes("Error") ? "var(--color-danger)" : "var(--color-success)"
              }}>
                {uploadStatus}
              </div>
            )}
          </form>
        </div>

        {/* Recent Users Section */}
        <div className="stack-lg">
          <h3 style={{ margin: 0, color: "var(--color-accent)" }}>Recent Users</h3>
          <div className="ui-card" style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", background: "var(--color-surface)" }}>
                  <th style={{ padding: "0.85rem 1rem", fontSize: "0.8rem" }}>Email</th>
                  <th style={{ padding: "0.85rem 1rem", fontSize: "0.8rem" }}>Role</th>
                </tr>
              </thead>
              <tbody>
                {data.users.recent.map((u) => (
                  <tr key={u.id} style={{ borderTop: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "0.85rem 1rem", fontSize: "0.9rem" }}>{u.email}</td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      {u.is_admin ? (
                        <span className="calendar-tree-row__meta" style={{ background: "var(--color-accent-glow)", color: "var(--color-accent)" }}>Admin</span>
                      ) : (
                        <span className="calendar-tree-row__meta">User</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="ui-card muted" style={{ fontSize: "0.75rem" }}>
        <strong>System Storage Path:</strong> <code>{data.storage.path}</code>
      </div>
    </div>
  );
}
