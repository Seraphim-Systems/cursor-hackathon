import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";

type EntrySummary = {
  id: string;
  created_at: string;
  sentiment_score: number | null;
  insights?: {
    themes?: string[];
    key_points?: string[];
  } | null;
};

export default function GraphPage() {
  const [entries, setEntries] = useState<EntrySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ items: EntrySummary[] }>("/api/entries?limit=100")
      .then((data) => {
        const sorted = data.items.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        setEntries(sorted);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading trends...</p>;

  // Filter entries with sentiment score
  const trendData = entries.filter(e => e.sentiment_score !== null);
  
  // Aggregate themes
  const themeCounts: Record<string, number> = {};
  entries.forEach(e => {
    e.insights?.themes?.forEach(t => {
      themeCounts[t] = (themeCounts[t] || 0) + 1;
    });
  });
  const topThemes = Object.entries(themeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <div style={{ padding: "2rem", maxWidth: "1000px", margin: "0 auto" }}>
      <h2 style={{ marginBottom: "2rem" }}>Emotional Trends & Key Topics</h2>

      {/* Sentiment Graph */}
      <section style={{ marginBottom: "4rem", padding: "1.5rem", border: "1px solid #ddd", borderRadius: "12px", background: "#fff" }}>
        <h3 style={{ marginBottom: "1.5rem" }}>Sentiment Trend</h3>
        <div style={{ height: "300px", width: "100%", position: "relative", borderLeft: "2px solid #ccc", borderBottom: "2px solid #ccc" }}>
          {/* SVG Graph */}
          <svg width="100%" height="100%" viewBox="0 0 1000 300" preserveAspectRatio="none">
            {/* Zero line */}
            <line x1="0" y1="150" x2="1000" y2="150" stroke="#eee" strokeWidth="1" />
            
            {/* Points and Lines */}
            {trendData.length > 1 && trendData.map((e, i) => {
              if (i === 0) return null;
              const prev = trendData[i-1];
              const x1 = ((i - 1) / (trendData.length - 1)) * 1000;
              const y1 = 150 - (prev.sentiment_score! * 150);
              const x2 = (i / (trendData.length - 1)) * 1000;
              const y2 = 150 - (e.sentiment_score! * 150);
              return (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#007bff" strokeWidth="3" />
              );
            })}
            
            {trendData.map((e, i) => {
              const x = (i / (trendData.length - 1)) * 1000;
              const y = 150 - (e.sentiment_score! * 150);
              return (
                <circle key={i} cx={x} cy={y} r="5" fill="#007bff" />
              );
            })}
          </svg>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.5rem", color: "#666", fontSize: "0.8rem" }}>
            <span>{trendData.length > 0 ? new Date(trendData[0].created_at).toLocaleDateString() : ""}</span>
            <span>Time</span>
            <span>{trendData.length > 0 ? new Date(trendData[trendData.length - 1].created_at).toLocaleDateString() : ""}</span>
          </div>
          <div style={{ position: "absolute", left: "-40px", top: "0", bottom: "0", display: "flex", flexDirection: "column", justifyContent: "space-between", fontSize: "0.8rem", color: "#666" }}>
            <span>1.0</span>
            <span>0.0</span>
            <span>-1.0</span>
          </div>
        </div>
      </section>

      {/* Topics / Themes */}
      <section style={{ padding: "1.5rem", border: "1px solid #ddd", borderRadius: "12px", background: "#fff" }}>
        <h3 style={{ marginBottom: "1.5rem" }}>Key Topics (Top 10)</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
          {topThemes.map(([theme, count]) => (
            <div key={theme} style={{ 
              background: "#f0f7ff", 
              border: "1px solid #007bff", 
              color: "#007bff", 
              padding: "0.5rem 1rem", 
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}>
              <span style={{ fontWeight: "bold" }}>{theme}</span>
              <span style={{ fontSize: "0.8rem", background: "#007bff", color: "#fff", padding: "0.1rem 0.4rem", borderRadius: "10px" }}>{count}</span>
            </div>
          ))}
          {topThemes.length === 0 && <p style={{ color: "#666" }}>No topics identified yet.</p>}
        </div>
      </section>
    </div>
  );
}
