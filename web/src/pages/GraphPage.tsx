import { useEffect, useMemo, useState } from "react";
import { apiFetch, listEntries } from "../api/client";
import type { JournalEntry } from "../api/types";

type ImpactfulFactor = {
  name: string;
  impact: number;
  type: string;
};

type TrendsSummary = {
  summary: string;
  findings: string[];
  beneficial_actions: string[];
};

type InsightNode = {
  id: string;
  label: string;
  kind: "center" | "category" | "theme" | "person" | "project" | "goal" | "blocker" | "priority";
  count?: number;
  x: number;
  y: number;
};

type InsightEdge = {
  from: string;
  to: string;
};

function normToken(s: string): string {
  return (s || "").replace(/\s+/g, " ").trim();
}

function tallyTokens(items: Array<string | null | undefined>): Map<string, number> {
  const m = new Map<string, number>();
  for (const raw of items) {
    const t = normToken(String(raw ?? ""));
    if (!t) continue;
    m.set(t, (m.get(t) ?? 0) + 1);
  }
  return m;
}

function topN(m: Map<string, number>, n: number): Array<{ label: string; count: number }> {
  return Array.from(m.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, n);
}

function buildInsightsGraph(entries: JournalEntry[]): { nodes: InsightNode[]; edges: InsightEdge[] } {
  const themes = tallyTokens(entries.flatMap((e) => e.insights?.themes ?? []));
  const people = tallyTokens(entries.flatMap((e) => e.insights?.people ?? []));
  const goals = tallyTokens(entries.flatMap((e) => e.insights?.goals ?? []));
  const blockers = tallyTokens(entries.flatMap((e) => e.insights?.blockers ?? []));
  const priorities = tallyTokens(entries.flatMap((e) => e.insights?.priorities ?? []));
  const projects = tallyTokens(
    entries.flatMap((e) => (e.insights?.projects ?? []).map((p) => p?.name).filter(Boolean)),
  );

  const topThemes = topN(themes, 12);
  const topPeople = topN(people, 10);
  const topProjects = topN(projects, 8);
  const topGoals = topN(goals, 8);
  const topBlockers = topN(blockers, 8);
  const topPriorities = topN(priorities, 8);

  const cx = 500;
  const cy = 300;

  const categories: Array<{
    id: InsightNode["kind"];
    label: string;
    angleDeg: number;
    items: Array<{ label: string; count: number; kind: InsightNode["kind"] }>;
  }> = [
    { id: "theme", label: "Themes", angleDeg: -90, items: topThemes.map((x) => ({ ...x, kind: "theme" })) },
    { id: "person", label: "People", angleDeg: -30, items: topPeople.map((x) => ({ ...x, kind: "person" })) },
    { id: "project", label: "Projects", angleDeg: 30, items: topProjects.map((x) => ({ ...x, kind: "project" })) },
    { id: "goal", label: "Goals", angleDeg: 90, items: topGoals.map((x) => ({ ...x, kind: "goal" })) },
    { id: "priority", label: "Priorities", angleDeg: 150, items: topPriorities.map((x) => ({ ...x, kind: "priority" })) },
    { id: "blocker", label: "Blockers", angleDeg: 210, items: topBlockers.map((x) => ({ ...x, kind: "blocker" })) },
  ];

  const nodes: InsightNode[] = [{ id: "center:you", label: "You", kind: "center", x: cx, y: cy }];
  const edges: InsightEdge[] = [];

  const hubRadius = 170;
  const itemRadius = 110;

  for (const cat of categories) {
    const a = (cat.angleDeg * Math.PI) / 180;
    const hx = cx + Math.cos(a) * hubRadius;
    const hy = cy + Math.sin(a) * hubRadius;
    const hubId = `cat:${cat.id}`;
    nodes.push({ id: hubId, label: cat.label, kind: "category", x: hx, y: hy });
    edges.push({ from: "center:you", to: hubId });

    const count = cat.items.length;
    for (let i = 0; i < count; i++) {
      const item = cat.items[i];
      const spread = Math.min(Math.PI * 0.9, Math.PI * 0.25 + count * 0.06);
      const offset = count === 1 ? 0 : (i / (count - 1) - 0.5) * spread;
      const ia = a + offset;
      const ix = hx + Math.cos(ia) * itemRadius;
      const iy = hy + Math.sin(ia) * itemRadius;
      const id = `${item.kind}:${item.label}`;
      nodes.push({ id, label: item.label, kind: item.kind, count: item.count, x: ix, y: iy });
      edges.push({ from: hubId, to: id });
    }
  }

  return { nodes, edges };
}

export default function GraphPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [trendsSummary, setTrendsSummary] = useState<TrendsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingTrends, setLoadingTrends] = useState(true);
  const [tab, setTab] = useState<"trends" | "insights_graph">("trends");
  const [error, setError] = useState<string | null>(null);

  const insightGraph = useMemo(() => buildInsightsGraph(entries), [entries]);

  useEffect(() => {
    listEntries(200, 0)
      .then((data) => {
        const sorted = data.items.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        setEntries(sorted);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Failed to load entries");
      })
      .finally(() => setLoading(false));

    apiFetch<TrendsSummary>("/api/entries/trends/summary")
      .then((data) => setTrendsSummary(data))
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Failed to load trends");
      })
      .finally(() => setLoadingTrends(false));
  }, []);

  if (loading) return <div className="page-shell"><p>Loading insights…</p></div>;

  if (error) {
    return (
      <div className="page-shell stack-lg" style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <h2 className="page-title">Insights</h2>
        <p className="text-error" role="alert" style={{ margin: 0 }}>
          {error}
        </p>
      </div>
    );
  }

  // Filter entries with sentiment score
  const trendData = entries.filter(e => e.sentiment_score !== null);
  
  // Aggregate themes
  const themeCounts: Record<string, number> = {};
  entries.forEach(e => {
    (e.insights?.themes ?? []).forEach(t => {
      themeCounts[t] = (themeCounts[t] || 0) + 1;
    });
  });
  const topThemes = Object.entries(themeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  return (
    <div className="page-shell stack-lg" style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <header className="stack-sm">
        <h2 className="page-title">Insights</h2>
        <p className="muted">Explore your emotional trends and the themes, people, and projects you talk about most.</p>
      </header>

      <nav
        aria-label="Insights tabs"
        style={{
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <button
          type="button"
          className={tab === "trends" ? "btn-gold" : "btn-ghost"}
          style={{ padding: "0.4rem 0.9rem", fontSize: "0.9rem" }}
          onClick={() => setTab("trends")}
          aria-current={tab === "trends" ? "page" : undefined}
        >
          Trends
        </button>
        <button
          type="button"
          className={tab === "insights_graph" ? "btn-gold" : "btn-ghost"}
          style={{ padding: "0.4rem 0.9rem", fontSize: "0.9rem" }}
          onClick={() => setTab("insights_graph")}
          aria-current={tab === "insights_graph" ? "page" : undefined}
        >
          Insights graph
        </button>
      </nav>

      {tab === "insights_graph" ? (
        <section className="ui-card stack-lg" style={{ padding: "1.5rem", border: "1px solid var(--color-border-strong)" }}>
          <div className="stack-sm">
            <h3 style={{ margin: 0, color: "var(--color-accent)" }}>Insights Graph</h3>
            <p className="muted" style={{ margin: 0 }}>
              A quick “map” of your most common insights. Hover nodes to see counts.
            </p>
          </div>

          {entries.length === 0 ? (
            <div className="empty-state" style={{ padding: "2rem" }}>
              <p style={{ margin: 0 }}>No entries yet.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.25rem" }} className="graph-layout">
              <style>{`
                @media (min-width: 980px) {
                  .graph-layout {
                    grid-template-columns: 1fr 320px !important;
                  }
                }
              `}</style>

              <div style={{ overflowX: "auto" }}>
                <svg
                  width="100%"
                  height="560"
                  viewBox="0 0 1000 600"
                  role="img"
                  aria-label="Insights graph"
                  style={{
                    minWidth: "760px",
                    background: "linear-gradient(165deg, var(--color-complement-muted) 0%, var(--color-bg-elevated) 100%)",
                    borderRadius: "var(--radius-lg)",
                    border: "1px solid var(--color-border-strong)",
                  }}
                >
                  {/* edges */}
                  {insightGraph.edges.map((e, i) => {
                    const a = insightGraph.nodes.find((n) => n.id === e.from);
                    const b = insightGraph.nodes.find((n) => n.id === e.to);
                    if (!a || !b) return null;
                    return (
                      <line
                        key={i}
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        stroke="var(--color-border)"
                        strokeWidth={2}
                        opacity={0.7}
                      />
                    );
                  })}

                  {/* nodes */}
                  {insightGraph.nodes.map((n) => {
                    const isCenter = n.kind === "center";
                    const isCategory = n.kind === "category";
                    const r = isCenter ? 26 : isCategory ? 18 : 12 + Math.min(10, Math.floor((n.count ?? 1) / 2));
                    const fill =
                      isCenter ? "var(--color-accent)" :
                      isCategory ? "var(--color-accent-muted)" :
                      "var(--color-surface)";
                    const stroke =
                      isCenter ? "var(--color-bg-elevated)" :
                      isCategory ? "var(--color-accent)" :
                      "var(--color-border-strong)";
                    const textColor = isCenter ? "var(--color-bg)" : "var(--color-text)";
                    const label = n.label.length > 18 ? `${n.label.slice(0, 17)}…` : n.label;

                    return (
                      <g key={n.id}>
                        <circle cx={n.x} cy={n.y} r={r} fill={fill} stroke={stroke} strokeWidth={3} opacity={0.95}>
                          <title>
                            {n.kind === "category"
                              ? n.label
                              : n.count != null
                                ? `${n.label} (${n.count})`
                                : n.label}
                          </title>
                        </circle>
                        <text
                          x={n.x}
                          y={n.y + 4}
                          textAnchor="middle"
                          fontSize={isCenter ? 13 : isCategory ? 12 : 10}
                          fontWeight={isCenter || isCategory ? 800 : 600}
                          fill={textColor}
                          style={{ pointerEvents: "none" }}
                        >
                          {isCenter || isCategory ? label : ""}
                        </text>
                        {!isCenter && !isCategory ? (
                          <text
                            x={n.x}
                            y={n.y + r + 14}
                            textAnchor="middle"
                            fontSize={11}
                            fontWeight={650}
                            fill="var(--color-text)"
                            style={{ pointerEvents: "none" }}
                          >
                            {label}
                          </text>
                        ) : null}
                      </g>
                    );
                  })}
                </svg>
              </div>

              <aside className="ui-card stack-lg" style={{ padding: "1.25rem", border: "1px solid var(--color-border)" }}>
                <h4 style={{ margin: 0, fontSize: "0.95rem" }}>What’s included</h4>
                <ul style={{ margin: 0, paddingLeft: "1.2rem" }} className="stack-sm">
                  <li><span className="muted">Themes, people, projects, goals, blockers, priorities</span></li>
                  <li><span className="muted">Counts are based on your last {Math.min(200, entries.length)} entries loaded</span></li>
                </ul>
                <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "0.9rem" }} className="stack-md">
                  <p className="muted" style={{ margin: 0 }}>
                    Tip: If something looks off, re-run analysis on entries from the entry detail page.
                  </p>
                </div>
              </aside>
            </div>
          )}
        </section>
      ) : null}

      {tab === "trends" ? (
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
            boxShadow: "var(--shadow-md)",
            overflow: "hidden"
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
                <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "var(--color-text)" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--color-danger)" }}></div> Negative Impact
                </span>
              </div>
            </div>

            <div style={{ 
              position: "relative",
              marginTop: "2rem",
              marginBottom: "1rem",
              paddingLeft: "60px"
            }}>
              {/* Y-Axis Labels (Fixed) */}
              <div style={{ 
                position: "absolute", 
                left: "0", 
                top: "0", 
                bottom: "40px", 
                display: "flex", 
                flexDirection: "column", 
                justifyContent: "space-between", 
                fontSize: "0.85rem", 
                color: "var(--color-text-faint)", 
                fontWeight: "700", 
                textAlign: "right", 
                width: "40px",
                paddingBottom: "20px" // Align with graph area
              }}>
                <span>1.0</span>
                <span>0.5</span>
                <span>0.0</span>
                <span>-0.5</span>
                <span>-1.0</span>
              </div>

              {/* Scrollable Graph Area */}
              <div style={{ 
                overflowX: "auto", 
                width: "100%",
                paddingBottom: "1rem",
                cursor: "grab"
              }}>
                <div style={{ 
                  height: "440px", 
                  width: `${Math.max(100, trendData.length * 50)}px`,
                  minWidth: "100%",
                  position: "relative",
                  borderLeft: "2px solid var(--color-border-strong)", 
                  borderBottom: "2px solid var(--color-border-strong)",
                }}>
                  {/* SVG Graph */}
                  <svg 
                    width="100%" 
                    height="100%" 
                    style={{ overflow: "visible" }}
                  >
                    {/* Grid lines */}
                    <line x1="0" y1="220" x2="100%" y2="220" stroke="var(--color-border)" strokeWidth="1" strokeDasharray="4 4" />
                    <line x1="0" y1="110" x2="100%" y2="110" stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="2 2" />
                    <line x1="0" y1="330" x2="100%" y2="330" stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="2 2" />

                    {/* Main Trend Line */}
                    {trendData.length > 1 && (
                      <path
                        d={trendData.map((e, i) => {
                          const x = (i / (trendData.length - 1)) * (Math.max(100, trendData.length * 50));
                          const y = 220 - (e.sentiment_score! * 180);
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
                      const totalWidth = Math.max(100, trendData.length * 50);
                      const x = trendData.length > 1 ? (i / (trendData.length - 1)) * totalWidth : totalWidth / 2;
                      const y = 220 - (e.sentiment_score! * 180);
                      
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
                            const offset = (fi + 1) * 30;
                            const fy = isPositive ? y - offset : y + offset;
                            const color = isPositive ? "var(--color-success)" : "var(--color-danger)" ;
                            
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
                                  x={x + 12} y={fy + 4} 
                                  fill="var(--color-text)" 
                                  fontSize="11" 
                                  fontWeight="600"
                                  style={{ pointerEvents: "none", whiteSpace: "nowrap" }}
                                >
                                  {f.name}
                                </text>
                                <title>{f.type}: {f.name} (Impact: {f.impact > 0 ? '+' : ''}{f.impact})</title>
                              </g>
                            );
                          })}

                          {/* Date Label on X-Axis */}
                          <text 
                            x={x} y="430" 
                            textAnchor="middle" 
                            fill="var(--color-text-faint)" 
                            fontSize="10" 
                            fontWeight="600"
                          >
                            {new Date(e.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            </div>
            
            <div style={{ textAlign: "center", color: "var(--color-text-faint)", fontSize: "0.75rem", letterSpacing: "0.1em", marginTop: "0.5rem" }}>
              SCROLL HORIZONTALLY TO VIEW MORE ENTRIES
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
      ) : null}
    </div>
  );
}
