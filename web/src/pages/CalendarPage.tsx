import { useEffect, useState, useCallback } from "react";
import { getCalendar, getPeriodSummary, refreshPeriodSummary } from "../api/client";
import { Link } from "react-router-dom";
import type { CalendarDay, PeriodSummary } from "../api/types";

export default function CalendarPage() {
  const [view, setView] = useState<"year" | "month" | "week" | "day">("year");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selectedWeekStart] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const [summary, setSummary] = useState<PeriodSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);

  const getPeriodParams = useCallback(() => {
    let from: string, to: string, type: string;

    if (view === "year") {
      from = `${selectedYear}-01-01`;
      to = `${selectedYear}-12-31`;
      type = "year";
    } else if (view === "month") {
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      from = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
      to = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${lastDay}`;
      type = "month";
    } else if (view === "week" && selectedWeekStart) {
      from = selectedWeekStart;
      const toDate = new Date(selectedWeekStart);
      toDate.setDate(toDate.getDate() + 6);
      to = toDate.toISOString().split("T")[0];
      type = "week";
    } else if (view === "day" && selectedDay) {
      from = selectedDay;
      to = selectedDay;
      type = "day";
    } else {
      return null;
    }
    return { from, to, type };
  }, [view, selectedYear, selectedMonth, selectedWeekStart, selectedDay]);

  const fetchData = useCallback(async () => {
    const params = getPeriodParams();
    if (!params) return;

    setLoading(true);
    // Don't clear summary/calendar immediately to avoid layout jump if possible, 
    // but the user wants to ensure calendar days are correctly displayed.

    try {
      const promises: [Promise<PeriodSummary>, Promise<any>?] = [
        getPeriodSummary(params.from, params.to, params.type)
      ];
      
      if (view === "year" || view === "month") {
        promises.push(getCalendar(params.from, params.to));
      }

      const [summaryData, calendarRes] = await Promise.all(promises);
      
      setSummary(summaryData);
      if (calendarRes) {
        setCalendarData(calendarRes.days);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [getPeriodParams, view]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    const params = getPeriodParams();
    if (!params) return;

    setRefreshing(true);
    try {
      const data = await refreshPeriodSummary(params.from, params.to, params.type);
      setSummary(data);
    } catch (err) {
      console.error(err);
      alert("Failed to refresh summary. Please try again later.");
    } finally {
      setRefreshing(false);
    }
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="page-shell stack-lg">
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <h2 className="page-title" style={{ margin: 0 }}>Calendar Insights</h2>
        <div style={{ flex: 1 }} />
        <nav style={{ display: "flex", gap: "0.5rem" }}>
          <button 
            onClick={() => setView("year")}
            className={view === "year" ? "btn-gold" : "btn-ghost"}
            style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
          >
            Year
          </button>
          <button 
            disabled={view === "year"}
            onClick={() => setView("month")}
            className={view === "month" ? "btn-gold" : "btn-ghost"}
            style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
          >
            Month
          </button>
        </nav>
      </div>

      {/* Selectors */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <div className="form-field">
          <select 
            value={selectedYear} 
            onChange={(e) => { setSelectedYear(Number(e.target.value)); setView("year"); }}
            className="field-narrow"
          >
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {(view === "month" || view === "week" || view === "day") && (
          <div className="form-field">
            <select 
              value={selectedMonth} 
              onChange={(e) => { setSelectedMonth(Number(e.target.value)); setView("month"); }}
              className="field-narrow"
            >
              {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Grid View */}
      {view === "year" && (
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", 
          gap: "1rem" 
        }}>
          {months.map((m, i) => (
            <div 
              key={m} 
              onClick={() => { setSelectedMonth(i + 1); setView("month"); }}
              className="calendar-tree-row"
              style={{ 
                padding: "1.25rem",
                justifyContent: "center",
                background: selectedMonth === i + 1 && view !== "year" ? "var(--color-complement-muted)" : undefined
              }}
            >
              <h4 style={{ margin: 0, color: "var(--color-accent)" }}>{m}</h4>
            </div>
          ))}
        </div>
      )}

      {view === "month" && (
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(7, 1fr)", 
          gap: "0.5rem"
        }}>
          {calendarData.map((d) => (
            <div 
              key={d.date} 
              onClick={() => { setSelectedDay(d.date); setView("day"); }}
              className="ui-card"
              style={{ 
                padding: "0.5rem", 
                height: "64px",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                borderColor: d.count > 0 ? "var(--color-accent)" : undefined,
                background: d.date === selectedDay ? "var(--color-complement-muted)" : undefined
              }}
            >
              <span style={{ fontSize: "0.85rem", fontWeight: "600" }}>{new Date(d.date).getUTCDate()}</span>
              {d.count > 0 && (
                <div style={{ 
                  width: "6px", 
                  height: "6px", 
                  borderRadius: "50%", 
                  background: "var(--color-complement-bright)", 
                  marginTop: "4px",
                  boxShadow: "0 0 8px var(--color-complement-bright)"
                }} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Summary Section */}
      <section className="ui-card stack-lg" style={{ 
        border: "1px solid var(--color-border-strong)",
        background: "linear-gradient(165deg, var(--color-complement-muted) 0%, transparent 100%)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
          <h3 style={{ margin: 0, color: "var(--color-accent)" }}>
            {loading ? "Generating AI Insights..." : (
              view === "year" ? `${selectedYear} Yearly Summary` :
              view === "month" ? `${months[selectedMonth-1]} ${selectedYear} Summary` :
              view === "day" ? `${selectedDay} Daily Summary` : "Summary"
            )}
          </h3>
          {summary && !loading && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn-ghost"
              style={{ fontSize: "0.8rem", padding: "0.35rem 0.7rem" }}
            >
              {refreshing ? "Refreshing..." : "↻ Refresh AI Summary"}
            </button>
          )}
        </div>

        {summary ? (
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", 
            gap: "2rem" 
          }}>
            <div className="stack-lg">
              <p style={{ fontSize: "1.05rem", lineHeight: "1.6" }}>{summary.summary}</p>
              
              <div>
                <h4 className="section-label" style={{ fontSize: "0.75rem", marginBottom: "0.5rem" }}>Top themes</h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {summary.top_themes.map((t) => (
                    <span
                      key={t}
                      className="calendar-tree-row__meta"
                      style={{ background: "var(--color-accent-glow)", color: "var(--color-accent)" }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="ui-card stack-lg" style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--color-border)" }}>
              <div>
                <h4 className="section-label" style={{ fontSize: "0.75rem", marginBottom: "0.5rem" }}>About these summaries</h4>
                <p style={{ margin: 0, fontSize: "0.92rem", color: "var(--color-text-muted)" }}>
                  This app doesn’t interpret your feelings — it only organizes recordings.
                </p>
              </div>

              <div>
                <h4 className="section-label" style={{ fontSize: "0.75rem", marginBottom: "0.5rem" }}>Significant People</h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {summary.significant_people.map(p => (
                    <span key={p} className="calendar-tree-row__meta">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : !loading && (
          <div className="empty-state" style={{ padding: "2rem" }}>
            <p style={{ margin: 0 }}>No data available for this period.</p>
          </div>
        )}
      </section>

      {view === "day" && selectedDay && (
         <div style={{ textAlign: "center", marginTop: "1rem" }}>
            <Link 
              to={`/history?from=${selectedDay}&to=${selectedDay}`}
              className="btn-gold btn-gold--outline"
              style={{ fontSize: "0.9rem" }}
            >
              View all recordings for this day →
            </Link>
         </div>
      )}
    </div>
  );
}
