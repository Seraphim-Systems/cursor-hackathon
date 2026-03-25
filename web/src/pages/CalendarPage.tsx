import { useEffect, useState } from "react";
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
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);

  useEffect(() => {
    fetchSummary();
  }, [view, selectedYear, selectedMonth, selectedWeekStart, selectedDay]);

  const getPeriodParams = () => {
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
  };

  const fetchSummary = async () => {
    const params = getPeriodParams();
    if (!params) return;

    setLoadingSummary(true);
    setSummary(null);

    try {
      const data = await getPeriodSummary(params.from, params.to, params.type);
      setSummary(data);
      
      // Also fetch calendar dots if in year/month view
      if (view === "year" || view === "month") {
        const cal = await getCalendar(params.from, params.to);
        setCalendarData(cal.days);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSummary(false);
    }
  };

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

  const colors = {
    purple: "#6b46c1",
    purpleLight: "#f3f0ff",
    gold: "#ecc94b",
    goldLight: "#fefcbf",
    goldDark: "#b7791f",
    white: "#ffffff",
    gray: "#718096"
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "1000px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
        <h2 style={{ margin: 0, color: colors.purple }}>Calendar Insights</h2>
        <div style={{ flex: 1 }} />
        <nav style={{ display: "flex", gap: "0.5rem" }}>
          <button 
            onClick={() => setView("year")}
            style={{ 
              padding: "0.5rem 1rem", 
              borderRadius: "4px", 
              border: `1px solid ${colors.purple}`, 
              background: view === "year" ? colors.purple : colors.white, 
              color: view === "year" ? colors.white : colors.purple,
              fontWeight: "bold",
              cursor: "pointer"
            }}
          >
            Year
          </button>
          <button 
            disabled={view === "year"}
            onClick={() => setView("month")}
            style={{ 
              padding: "0.5rem 1rem", 
              borderRadius: "4px", 
              border: `1px solid ${colors.purple}`, 
              background: view === "month" ? colors.purple : colors.white, 
              color: view === "month" ? colors.white : colors.purple,
              fontWeight: "bold",
              cursor: view === "year" ? "not-allowed" : "pointer",
              opacity: view === "year" ? 0.5 : 1
            }}
          >
            Month
          </button>
        </nav>
      </div>

      {/* Selectors */}
      <div style={{ marginBottom: "2rem", display: "flex", gap: "1rem" }}>
        <select 
          value={selectedYear} 
          onChange={(e) => { setSelectedYear(Number(e.target.value)); setView("year"); }}
          style={{ padding: "0.5rem", borderRadius: "4px", border: `1px solid ${colors.gold}`, background: colors.goldLight }}
        >
          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        {(view === "month" || view === "week" || view === "day") && (
          <select 
            value={selectedMonth} 
            onChange={(e) => { setSelectedMonth(Number(e.target.value)); setView("month"); }}
            style={{ padding: "0.5rem", borderRadius: "4px", border: `1px solid ${colors.gold}`, background: colors.goldLight }}
          >
            {months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        )}
      </div>

      {/* Grid View */}
      {view === "year" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "3rem" }}>
          {months.map((m, i) => (
            <div 
              key={m} 
              onClick={() => { setSelectedMonth(i + 1); setView("month"); }}
              style={{ 
                padding: "1.5rem", 
                border: `1px solid ${colors.gold}`, 
                borderRadius: "8px", 
                textAlign: "center", 
                cursor: "pointer",
                background: selectedMonth === i + 1 && view !== "year" ? colors.goldLight : colors.white,
                transition: "all 0.2s"
              }}
              onMouseOver={(e) => e.currentTarget.style.boxShadow = `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)`}
              onMouseOut={(e) => e.currentTarget.style.boxShadow = "none"}
            >
              <h4 style={{ margin: 0, color: colors.purple }}>{m}</h4>
            </div>
          ))}
        </div>
      )}

      {view === "month" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.5rem", marginBottom: "3rem" }}>
          {/* Simple Day Grid */}
          {calendarData.map((d) => (
            <div 
              key={d.date} 
              onClick={() => { setSelectedDay(d.date); setView("day"); }}
              style={{ 
                padding: "0.5rem", 
                border: `1px solid ${colors.goldLight}`, 
                borderRadius: "4px", 
                height: "60px",
                cursor: "pointer",
                background: d.count > 0 ? colors.goldLight : colors.white,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s"
              }}
              onMouseOver={(e) => e.currentTarget.style.borderColor = colors.gold}
              onMouseOut={(e) => e.currentTarget.style.borderColor = colors.goldLight}
            >
              <span style={{ fontSize: "0.8rem", color: colors.gray }}>{new Date(d.date).getDate()}</span>
              {d.count > 0 && <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: colors.purple, marginTop: "4px" }} />}
            </div>
          ))}
        </div>
      )}

      {/* Summary Section */}
      <section style={{ padding: "2rem", border: `2px solid ${colors.gold}`, borderRadius: "12px", background: colors.purpleLight }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
          <h3 style={{ marginTop: 0, color: colors.purple }}>
            {loadingSummary ? "Generating AI Insights..." : (
              view === "year" ? `${selectedYear} Yearly Summary` :
              view === "month" ? `${months[selectedMonth-1]} ${selectedYear} Summary` :
              view === "day" ? `${selectedDay} Daily Summary` : "Summary"
            )}
          </h3>
          {summary && !loadingSummary && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              style={{
                padding: "0.4rem 0.8rem",
                borderRadius: "4px",
                border: `1px solid ${colors.purple}`,
                background: colors.white,
                color: colors.purple,
                fontSize: "0.85rem",
                fontWeight: "bold",
                cursor: refreshing ? "not-allowed" : "pointer",
                opacity: refreshing ? 0.7 : 1,
                display: "flex",
                alignItems: "center",
                gap: "0.4rem"
              }}
            >
              {refreshing ? "Refreshing..." : "↻ Refresh AI Summary"}
            </button>
          )}
        </div>

        {summary ? (
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "2rem" }}>
            <div>
              <p style={{ fontSize: "1.1rem", lineHeight: "1.6", color: "#2d3748" }}>{summary.summary}</p>
              
              <h4 style={{ color: colors.purple, borderBottom: `2px solid ${colors.gold}`, paddingBottom: "0.5rem" }}>Key Achievements</h4>
              <ul style={{ paddingLeft: "1.5rem" }}>
                {summary.key_achievements.map((a, i) => <li key={i} style={{ marginBottom: "0.5rem" }}>{a}</li>)}
              </ul>
            </div>
            <div style={{ background: colors.white, padding: "1.5rem", borderRadius: "8px", border: `1px solid ${colors.goldLight}` }}>
              <h4 style={{ color: colors.purple, marginTop: 0 }}>Mood & Trends</h4>
              <p style={{ color: "#4a5568" }}>{summary.sentiment_trend}</p>

              <h4 style={{ color: colors.purple }}>Top Themes</h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {summary.top_themes.map(t => (
                  <span key={t} style={{ background: colors.goldLight, color: colors.goldDark, padding: "0.2rem 0.6rem", borderRadius: "12px", fontSize: "0.85rem", fontWeight: "bold" }}>{t}</span>
                ))}
              </div>

              <h4 style={{ color: colors.purple }}>People</h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {summary.significant_people.map(p => (
                  <span key={p} style={{ background: colors.purpleLight, color: colors.purple, padding: "0.2rem 0.6rem", borderRadius: "12px", fontSize: "0.85rem", fontWeight: "bold" }}>{p}</span>
                ))}
              </div>
            </div>
          </div>
        ) : !loadingSummary && (
          <p style={{ color: colors.gray }}>No data available for this period. Try selecting a different timeframe or adding more entries.</p>
        )}
      </section>

      {view === "day" && selectedDay && (
         <div style={{ marginTop: "2rem", textAlign: "center" }}>
            <Link 
              to={`/history?from=${selectedDay}&to=${selectedDay}`}
              style={{ color: colors.purple, fontWeight: "bold", textDecoration: "none", borderBottom: `2px solid ${colors.gold}` }}
            >
              View all recordings for this day →
            </Link>
         </div>
      )}
    </div>
  );
}
