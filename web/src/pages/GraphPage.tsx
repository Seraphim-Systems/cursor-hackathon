import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";

type ImpactfulFactor = {
  name: string;
  impact: number;
  type: string;
};

type EntrySummary = {
  id: string;
  created_at: string;
  sentiment_score: number | null;
  insights?: {
    themes?: string[];
    key_points?: string[];
    impactful_factors?: ImpactfulFactor[];
  } | null;
};

type TrendsSummary = {
  summary: string;
  findings: string[];
  beneficial_actions: string[];
};

export default function GraphPage() {
  const [entries, setEntries] = useState<EntrySummary[]>([]);
  const [trendsSummary, setTrendsSummary] = useState<TrendsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingTrends, setLoadingTrends] = useState(true);

  useEffect(() => {
    apiFetch<{ items: EntrySummary[] }>("/api/entries?limit=100")
      .then((data) => {
        const sorted = data.items.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        setEntries(sorted);
      })
      .finally(() => setLoading(false));

    apiFetch<TrendsSummary>("/api/entries/trends/summary")
      .then((data) => setTrendsSummary(data))
      .finally(() => setLoadingTrends(false));
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
    <div className="page-shell stack-lg" style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <header className="stack-sm">
        <h2 className="page-title">Emotional Trends & AI Insights</h2>
        <p className="muted">Visualize your mood over time and discover what influences your happiness.</p>
      </header>

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "1fr",
        gap: "2rem",
        alignItems: "start"
      }} className="graph-layout">
        <style>{`
          @media (min-width: 1000px) {
            .graph-layout {
              grid-template-columns: 1fr 320px !important;
            }
          }
          .impact-bubble {
            transition: transform 0.2s ease-in-out;
            cursor: help;
          }
          .impact-bubble:hover {
            transform: scale(1.5);
            z-index: 10;
          }
        `}</style>

        <div className="stack-lg">
          {/* Sentiment Graph */}
          <section className="ui-card stack-lg" style={{ 
            padding: "2rem",
            background: "linear-gradient(165deg, var(--color-complement-muted) 0%, var(--color-bg-elevated) 100%)",
            border: "1px solid var(--color-border-strong)",
            boxShadow: "var(--shadow-md)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, color: "var(--color-accent)", fontSize: "1.25rem" }}>Sentiment Journey</h3>
              <div style={{ display: "flex", gap: "1rem", fontSize: "0.75rem" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--color-accent)" }}></div> Sentiment
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--color-success)" }}></div> Positive Impact
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--color-error)" }}></div> Negative Impact
                </span>
              </div>
            </div>

            <div style={{ 
              height: "500px", 
              width: "100%", 
              position: "relative", 
              borderLeft: "2px solid var(--color-border-strong)", 
              borderBottom: "2px solid var(--color-border-strong)",
              marginTop: "2rem",
              marginBottom: "3rem",
              padding: "0 20px"
            }}>
              {/* SVG Graph */}
              <svg width="100%" height="100%" viewBox="0 0 1000 500" preserveAspectRatio="none" style={{ overflow: "visible" }}>
                {/* Zero line */}
                <line x1="0" y1="250" x2="1000" y2="250" stroke="var(--color-border)" strokeWidth="1" strokeDasharray="4 4" />
                
                {/* Grid lines */}
                <line x1="0" y1="125" x2="1000" y2="125" stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="2 2" />
                <line x1="0" y1="375" x2="1000" y2="375" stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="2 2" />

                {/* Main Trend Line */}
                {trendData.length > 1 && (
                  <path
                    d={trendData.map((e, i) => {
                      const x = (i / (trendData.length - 1)) * 1000;
                      const y = 250 - (e.sentiment_score! * 200);
                      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                    }).join(' ')}
                    fill="none"
                    stroke="var(--color-accent)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.1))" }}
                  />
                )}
                
                {/* Points and Impact Highlights */}
                {trendData.map((e, i) => {
                  const x = (i / (trendData.length - 1)) * 1000;
                  const y = 250 - (e.sentiment_score! * 200);
                  
                  const factors = e.insights?.impactful_factors || [];
                  
                  return (
                    <g key={e.id}>
                      {/* Sentiment Point */}
                      <circle 
                        cx={x} cy={y} r="8" 
                        fill="var(--color-accent)" 
                        stroke="var(--color-bg-elevated)" 
                        strokeWidth="3"
                        className="impact-bubble"
                      >
                        <title>{new Date(e.created_at).toLocaleDateString()}: {e.sentiment_score?.toFixed(2)}</title>
                      </circle>

                      {/* Impactful Factors Highlights */}
                      {factors.map((f, fi) => {
                        const isPositive = f.impact > 0;
                        const offset = (fi + 1) * 25;
                        const fy = isPositive ? y - offset : y + offset;
                        const color = isPositive ? "var(--color-success)" : "var(--color-error)";
                        
                        return (
                          <g key={fi} className="impact-bubble">
                            <line x1={x} y1={y} x2={x} y2={fy} stroke={color} strokeWidth="1" strokeDasharray="2 2" />
                            <circle 
                              cx={x} cy={fy} r="10" 
                              fill={color} 
                              stroke="var(--color-bg-elevated)" 
                              strokeWidth="2" 
                              opacity="0.8"
                            />
                            <text 
                              x={x + 15} y={fy + 5} 
                              fill="var(--color-text)" 
                              fontSize="12" 
                              fontWeight="bold"
                              style={{ pointerEvents: "none" }}
                            >
                              {f.name}
                            </text>
                            <title>{f.type}: {f.name} (Impact: {f.impact > 0 ? '+' : ''}{f.impact})</title>
                          </g>
                        );
                      })}
                    </g>
                  );
                })}
              </svg>
              
              {/* Labels */}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem", color: "var(--color-text-faint)", fontSize: "0.85rem", fontWeight: "700" }}>
                <span>{trendData.length > 0 ? new Date(trendData[0].created_at).toLocaleDateString() : ""}</span>
                <span style={{ letterSpacing: "0.2em" }}>TIMELINE</span>
                <span>{trendData.length > 0 ? new Date(trendData[trendData.length - 1].created_at).toLocaleDateString() : ""}</span>
              </div>
              <div style={{ position: "absolute", left: "-55px", top: "0", bottom: "0", display: "flex", flexDirection: "column", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--color-text-faint)", fontWeight: "700", textAlign: "right", width: "40px" }}>
                <span>1.0</span>
                <span>0.5</span>
                <span>0.0</span>
                <span>-0.5</span>
                <span>-1.0</span>
              </div>
            </div>
          </section>

          {/* AI Trends Summary & Findings */}
          <section className="ui-card stack-lg" style={{ padding: "2rem", border: "1px solid var(--color-border-strong)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ background: "var(--color-accent-muted)", padding: "0.5rem", borderRadius: "50%" }}>
                ✨
              </div>
              <h3 style={{ margin: 0, fontSize: "1.25rem" }}>AI Findings & Recommendations</h3>
            </div>

            {loadingTrends ? (
              <p className="muted">Analyzing your recent entries for patterns...</p>
            ) : trendsSummary ? (
              <div className="stack-xl">
                <div className="stack-sm">
                  <h4 style={{ margin: 0, fontSize: "0.9rem", textTransform: "uppercase", color: "var(--color-text-faint)", letterSpacing: "0.05em" }}>Period Overview</h4>
                  <p style={{ fontSize: "1.1rem", lineHeight: "1.6" }}>{trendsSummary.summary}</p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem" }}>
                  <div className="stack-md">
                    <h4 style={{ margin: 0, fontSize: "0.9rem", textTransform: "uppercase", color: "var(--color-text-faint)", letterSpacing: "0.05em" }}>Key Findings</h4>
                    <ul className="stack-sm" style={{ paddingLeft: "1.25rem", margin: 0 }}>
                      {trendsSummary.findings.map((f, i) => (
                        <li key={i} style={{ color: "var(--color-text)" }}>{f}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="stack-md">
                    <h4 style={{ margin: 0, fontSize: "0.9rem", textTransform: "uppercase", color: "var(--color-text-faint)", letterSpacing: "0.05em" }}>Beneficial Actions</h4>
                    <ul className="stack-sm" style={{ paddingLeft: "1.25rem", margin: 0 }}>
                      {trendsSummary.beneficial_actions.map((a, i) => (
                        <li key={i} style={{ color: "var(--color-accent)", fontWeight: "600" }}>{a}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <p className="muted">Could not generate trends summary at this time.</p>
            )}
          </section>
        </div>

        {/* Sidebar: Topics */}
        <section className="ui-card stack-lg" style={{ 
          padding: "1.5rem",
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border-strong)",
          position: "sticky",
          top: "2rem"
        }}>
          <h3 style={{ margin: 0, fontSize: "1rem", color: "var(--color-accent)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Top Themes</h3>
          <div className="stack-lg" style={{ gap: "0.75rem" }}>
            {topThemes.map(([theme, count]) => (
              <div key={theme} style={{ 
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.5rem",
                padding: "0.6rem 0.8rem",
                background: "var(--color-surface)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                boxShadow: "var(--shadow-sm)"
              }}>
                <span style={{ fontSize: "0.9rem", fontWeight: "600", color: "var(--color-text)" }}>{theme}</span>
                <span className="calendar-tree-row__meta" style={{ 
                  fontSize: "0.75rem", 
                  background: "var(--color-accent-muted)", 
                  padding: "0.1rem 0.4rem",
                  borderRadius: "10px",
                  color: "var(--color-accent)"
                }}>{count}</span>
              </div>
            ))}
            {topThemes.length === 0 && <p className="muted" style={{ margin: 0 }}>No topics identified yet.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
