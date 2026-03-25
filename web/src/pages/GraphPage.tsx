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

  if (loading) return <div className="page-shell"><p>Loading trends...</p></div>;

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
    .slice(0, 15);

  return (
    <div className="page-shell stack-lg">
      <h2 className="page-title">Emotional Trends & Key Topics</h2>

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "1fr",
        gap: "2rem",
        alignItems: "start"
      }} className="graph-layout">
        <style>{`
          @media (min-width: 900px) {
            .graph-layout {
              grid-template-columns: 1fr 280px !important;
            }
          }
        `}</style>

        {/* Sentiment Graph */}
        <section className="ui-card stack-lg" style={{ 
          padding: "1.5rem",
          background: "linear-gradient(165deg, var(--color-complement-muted) 0%, transparent 100%)"
        }}>
          <h3 style={{ margin: 0, color: "var(--color-accent)" }}>Sentiment Trend</h3>
          <div style={{ 
            height: "300px", 
            width: "100%", 
            position: "relative", 
            borderLeft: "2px solid var(--color-border)", 
            borderBottom: "2px solid var(--color-border)",
            marginTop: "1.5rem",
            marginBottom: "2rem"
          }}>
            {/* SVG Graph */}
            <svg width="100%" height="100%" viewBox="0 0 1000 300" preserveAspectRatio="none">
              {/* Zero line */}
              <line x1="0" y1="150" x2="1000" y2="150" stroke="var(--color-border)" strokeWidth="1" strokeDasharray="4 4" />
              
              {/* Points and Lines */}
              {trendData.length > 1 && trendData.map((e, i) => {
                if (i === 0) return null;
                const prev = trendData[i-1];
                const x1 = ((i - 1) / (trendData.length - 1)) * 1000;
                const y1 = 150 - (prev.sentiment_score! * 130);
                const x2 = (i / (trendData.length - 1)) * 1000;
                const y2 = 150 - (e.sentiment_score! * 130);
                return (
                  <line 
                    key={i} 
                    x1={x1} y1={y1} x2={x2} y2={y2} 
                    stroke="var(--color-accent)" 
                    strokeWidth="3" 
                    strokeLinecap="round"
                  />
                );
              })}
              
              {trendData.map((e, i) => {
                const x = (i / (trendData.length - 1)) * 1000;
                const y = 150 - (e.sentiment_score! * 130);
                return (
                  <circle 
                    key={i} 
                    cx={x} cy={y} r="6" 
                    fill="var(--color-accent)" 
                    stroke="var(--color-bg-elevated)" 
                    strokeWidth="2" 
                  />
                );
              })}
            </svg>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.5rem", color: "var(--color-text-faint)", fontSize: "0.75rem", fontWeight: "600" }}>
              <span>{trendData.length > 0 ? new Date(trendData[0].created_at).toLocaleDateString() : ""}</span>
              <span>TIME</span>
              <span>{trendData.length > 0 ? new Date(trendData[trendData.length - 1].created_at).toLocaleDateString() : ""}</span>
            </div>
            <div style={{ position: "absolute", left: "-45px", top: "0", bottom: "0", display: "flex", flexDirection: "column", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--color-text-faint)", fontWeight: "600" }}>
              <span>1.0</span>
              <span>0.0</span>
              <span>-1.0</span>
            </div>
          </div>
        </section>

        {/* Topics / Themes */}
        <section className="ui-card stack-lg" style={{ 
          padding: "1.5rem",
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border-strong)"
        }}>
          <h3 style={{ margin: 0, fontSize: "1rem", color: "var(--color-accent)" }}>Key Topics</h3>
          <div className="stack-lg" style={{ gap: "0.75rem" }}>
            {topThemes.map(([theme, count]) => (
              <div key={theme} style={{ 
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.5rem",
                padding: "0.5rem 0.75rem",
                background: "var(--color-surface)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--color-border)"
              }}>
                <span style={{ fontSize: "0.88rem", fontWeight: "600", color: "var(--color-text)" }}>{theme}</span>
                <span className="calendar-tree-row__meta" style={{ fontSize: "0.75rem" }}>{count}</span>
              </div>
            ))}
            {topThemes.length === 0 && <p className="muted" style={{ margin: 0 }}>No topics identified yet.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
