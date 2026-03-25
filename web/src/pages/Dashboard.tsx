import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getCalendar, getEntry, getPeriodSummary } from "../api/client";
import type { CalendarDay, PeriodSummary } from "../api/types";
import { DuckMicButton, DuckRecordButton } from "../components/DuckRecordButton";
import { useAuth } from "../auth/AuthContext";
import { useJournalRecording } from "../hooks/useJournalRecording";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function oneLinePreview(text: string, max = 84): string {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "No entries yet.";
  if (clean.length <= max) return clean;
  // Avoid appending "…" — we rely on CSS clamping/ellipsis for a cleaner look.
  return clean.slice(0, max).trimEnd();
}

function isoDateYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function monthRange(year: number, month1to12: number): { from: string; to: string } {
  const from = new Date(Date.UTC(year, month1to12 - 1, 1));
  const to = new Date(Date.UTC(year, month1to12, 0)); // last day of month
  return { from: isoDateYmd(from), to: isoDateYmd(to) };
}

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map((x) => Number(x));
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

function fmtMonthDay(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

function weekStartMonday(ymd: string): string {
  const d = parseYmd(ymd);
  // JS: 0=Sun..6=Sat. Convert to Monday start.
  const dow = d.getUTCDay();
  const delta = (dow + 6) % 7; // Mon=0, Sun=6
  d.setUTCDate(d.getUTCDate() - delta);
  return isoDateYmd(d);
}

function addDays(ymd: string, n: number): string {
  const d = parseYmd(ymd);
  d.setUTCDate(d.getUTCDate() + n);
  return isoDateYmd(d);
}

function monthStartYmd(year: number, month1to12: number): string {
  return `${year}-${String(month1to12).padStart(2, "0")}-01`;
}

function monthLabel(year: number, month1to12: number): string {
  return new Date(Date.UTC(year, month1to12 - 1, 1)).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function dayOfWeekMon0(d: Date): number {
  // Monday=0 ... Sunday=6
  return (d.getUTCDay() + 6) % 7;
}

function buildMonthGrid(year: number, month1to12: number): Array<{ ymd: string | null; day: number | null }> {
  const first = new Date(Date.UTC(year, month1to12 - 1, 1));
  const last = new Date(Date.UTC(year, month1to12, 0));
  const daysInMonth = last.getUTCDate();
  const lead = dayOfWeekMon0(first);

  const cells: Array<{ ymd: string | null; day: number | null }> = [];
  for (let i = 0; i < lead; i++) cells.push({ ymd: null, day: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const ymd = isoDateYmd(new Date(Date.UTC(year, month1to12 - 1, d)));
    cells.push({ ymd, day: d });
  }
  while (cells.length % 7 !== 0) cells.push({ ymd: null, day: null });
  // Cap at 6 weeks like most month views
  while (cells.length < 42) cells.push({ ymd: null, day: null });
  return cells.slice(0, 42);
}

type ViewMode = "day" | "month" | "year";

export function Dashboard() {
  const { token } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const now = useMemo(() => new Date(), []);
  const [selectedYear, setSelectedYear] = useState<number>(() => now.getUTCFullYear());
  const years = useMemo(() => [2024, 2025, 2026], []);

  const [yearSummary, setYearSummary] = useState<string>("");
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);

  const [daySummary, setDaySummary] = useState<Record<string, PeriodSummary>>({});
  const [dayEntries, setDayEntries] = useState<Record<string, JournalEntry[]>>({});
  const [viewMode, setViewMode] = useState<ViewMode>("year");
  const [focusedMonth, setFocusedMonth] = useState<number>(() => now.getUTCMonth() + 1);
  const [focusedDay, setFocusedDay] = useState<string>(() => isoDateYmd(now));
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

  const refreshEntries = useCallback(() => {
    // No-op for now as we removed the counter
  }, []);

  const { supported, phase, error: recordError, uploadPct, savedToast, onDuckPress } =
    useJournalRecording(refreshEntries);

  useEffect(() => {
    if (!token) {
      setError(null);
      return;
    }
    // No longer fetching the first item for counter
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setCalendarLoading(true);
    setYearSummary("");
    setCalendarDays([]);
    setDaySummary({});
    setDayEntries({});

    (async () => {
      try {
        // Year summary
        const yearFrom = `${selectedYear}-01-01`;
        const yearTo = `${selectedYear}-12-31`;
        const y = await getPeriodSummary(yearFrom, yearTo, "year");
        if (cancelled) return;
        const yFull = (y.summary || "").trim();
        setYearSummary(yFull);

        // Full year calendar for counts + tree expansion
        const cal = await getCalendar(yearFrom, yearTo);
        if (cancelled) return;
        setCalendarDays(cal.days);
      } finally {
        if (!cancelled) setCalendarLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, selectedYear]);

  const dayByYmd = useMemo(() => {
    const map = new Map<string, CalendarDay>();
    for (const d of calendarDays) map.set(d.date, d);
    return map;
  }, [calendarDays]);

  const monthCounts = useMemo(() => {
    const m: Record<number, number> = {};
    for (let i = 1; i <= 12; i++) m[i] = 0;
    for (const d of calendarDays) {
      const mm = Number(d.date.slice(5, 7));
      if (mm >= 1 && mm <= 12) m[mm] = (m[mm] || 0) + (d.count || 0);
    }
    return m;
  }, [calendarDays]);

  const focusedMonthGrid = useMemo(() => buildMonthGrid(selectedYear, focusedMonth), [focusedMonth, selectedYear]);

  const navigateMonth = useCallback(
    (delta: number) => {
      const idx = focusedMonth - 1 + delta;
      const yDelta = idx < 0 ? -1 : idx > 11 ? 1 : 0;
      const nextMonth = ((idx % 12) + 12) % 12 + 1;
      const nextYear = selectedYear + yDelta;
      if (years.includes(nextYear)) setSelectedYear(nextYear);
      setFocusedMonth(nextMonth);
      setViewMode("month");
      setFocusedDay(monthStartYmd(nextYear, nextMonth));
    },
    [focusedMonth, selectedYear, years],
  );

  const ensureDayDetail = useCallback(
    async (d: CalendarDay) => {
      const ymd = d.date;
      if (!daySummary[ymd]) {
        try {
          const s = await getPeriodSummary(ymd, ymd, "day");
          setDaySummary((prev) => ({ ...prev, [ymd]: s }));
        } catch {
          setDaySummary((prev) => ({
            ...prev,
            [ymd]: { summary: "", key_achievements: [], top_themes: [], key_people: [] },
          }));
        }
      }
      if (!dayEntries[ymd]) {
        try {
          const entries = await Promise.all(d.entry_ids.map((id) => getEntry(id)));
          setDayEntries((prev) => ({ ...prev, [ymd]: entries }));
        } catch {
          setDayEntries((prev) => ({ ...prev, [ymd]: [] }));
        }
      }
    },
    [dayEntries, daySummary],
  );

  return (
    <div className="page-shell">
      <section className="dashboard-hero" aria-labelledby="dashboard-hero-title">
        <h2 id="dashboard-hero-title" className="dashboard-hero__title">
          Talk to the Duck
        </h2>
        <div className="dashboard-duck-wrap">
          {token ? (
            <div className="dashboard-duck-inline">
              {savedToast ? (
                <div className="toast-alert toast-alert--dashboard" role="status">
                  Thought saved
                </div>
              ) : null}
              {!supported ? (
                <p role="alert" className="text-error dashboard-duck-inline__msg">
                  Recording is not supported in this browser.
                </p>
              ) : null}
              {recordError ? (
                <p role="alert" className="text-error dashboard-duck-inline__msg">
                  {recordError}
                </p>
              ) : null}
              <DuckMicButton
                recording={phase === "recording"}
                uploading={phase === "uploading"}
                disabled={!supported || !token}
                onPress={onDuckPress}
                showText={false}
              />
              {phase === "uploading" && uploadPct !== null ? (
                <div className="dashboard-upload-progress">
                  <div
                    className="progress-track"
                    role="progressbar"
                    aria-valuenow={uploadPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div className="progress-fill" style={{ width: `${uploadPct}%` }} />
                  </div>
                  <p className="muted" style={{ marginTop: "0.35rem", marginBottom: 0, fontSize: "0.88rem" }}>
                    {uploadPct}%
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <DuckRecordButton authenticated={false} />
          )}
        </div>
      </section>

      {!token ? (
        <section className="dashboard-auth-actions" aria-label="Sign in or sign up">
          <Link to="/login" className="btn-gold btn-gold--dashboard">
            Sign in
          </Link>
          <Link to="/register" className="btn-gold btn-gold--outline btn-gold--dashboard">
            Sign up
          </Link>
        </section>
      ) : null}

      {token && error && (
        <section>
          <p className="text-error" style={{ textAlign: "center", marginTop: "1rem" }}>{error}</p>
        </section>
      )}

      {token ? (
        <section className="dashboard-calendar" aria-label="Calendar">
          <div className="dashboard-calendar__head">
            <h3 className="section-label" style={{ marginBottom: 0 }}>
              Calendar
            </h3>
            <div className="dashboard-calendar__controls">
              {/* Controls live inside the calendar card (below summary). */}
            </div>
          </div>

          <div className="calendar-tree-root" style={{ padding: "0.85rem" }}>
            <div className="calendar-tree-summary">
              {calendarLoading ? (
                <span className="muted">Loading year summary…</span>
              ) : (
                <span className="dashboard-year-summary" data-full={yearSummary || ""}>
                  {yearSummary || "No entries for this year yet."}
                </span>
              )}
            </div>

            <div className="calendar-tree-controls" aria-label="Calendar controls">
              <div className="segmented" role="tablist" aria-label="Calendar view">
                {(["day", "month", "year"] as ViewMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={viewMode === m}
                    className={`segmented__btn ${viewMode === m ? "segmented__btn--active" : ""}`}
                    onClick={() => setViewMode(m)}
                  >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="field-narrow"
                aria-label="Select year"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="calendar-stage" aria-label="Calendar content">
              {viewMode === "year" ? (
                <div className="calendar-year" role="list" aria-label="Months">
                  {MONTHS.map((m, idx) => {
                    const month = idx + 1;
                    const count = monthCounts[month] || 0;
                    const active = focusedMonth === month;
                    return (
                      <button
                        key={m}
                        type="button"
                        role="listitem"
                        className={`calendar-month-card ${active ? "calendar-month-card--active" : ""}`}
                        onClick={() => {
                          setFocusedMonth(month);
                          setFocusedDay(monthStartYmd(selectedYear, month));
                          setViewMode("month");
                        }}
                      >
                        <div className="calendar-month-card__title">{m}</div>
                        <div className="calendar-month-card__meta">{count} recordings</div>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {viewMode !== "year" ? (
                <div className="calendar-panel ui-card" role="region" aria-label="Calendar panel">
                  <div className="calendar-panel__head">
                    <div className="calendar-panel__title">
                      {viewMode === "month" ? monthLabel(selectedYear, focusedMonth) : null}
                      {viewMode === "day" ? focusedDay : null}
                    </div>
                    <div className="calendar-panel__nav" aria-label="Calendar navigation">
                      <button type="button" className="icon-btn" onClick={() => navigateMonth(-1)} aria-label="Previous month">
                        ←
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => {
                          const today = new Date();
                          const y = today.getUTCFullYear();
                          const m = today.getUTCMonth() + 1;
                          if (years.includes(y)) setSelectedYear(y);
                          setFocusedMonth(m);
                          setFocusedDay(isoDateYmd(today));
                          setViewMode("day");
                        }}
                      >
                        Today
                      </button>
                      <button type="button" className="icon-btn" onClick={() => navigateMonth(1)} aria-label="Next month">
                        →
                      </button>
                    </div>
                  </div>

                  {viewMode === "month" ? (
                    <div className="calendar-grid" role="grid" aria-label="Month view">
                      {focusedMonthGrid.map((c, i) => {
                        const cal = c.ymd ? dayByYmd.get(c.ymd) ?? null : null;
                        const count = cal?.count ?? 0;
                        const isToday = c.ymd === isoDateYmd(new Date());
                        const isFocused = c.ymd === focusedDay;
                        return (
                          <button
                            key={`${c.ymd ?? "x"}-${i}`}
                            type="button"
                            className={`calendar-cell ${count > 0 ? "calendar-cell--has" : ""} ${isToday ? "calendar-cell--today" : ""} ${isFocused ? "calendar-cell--focused" : ""}`}
                            disabled={!c.ymd}
                            onClick={() => {
                              if (!c.ymd) return;
                              setFocusedDay(c.ymd);
                              setViewMode("day");
                              const d = dayByYmd.get(c.ymd);
                              if (d) void ensureDayDetail(d);
                            }}
                            role="gridcell"
                            aria-label={c.ymd ?? "Empty"}
                          >
                            <div className="calendar-cell__day">{c.day ?? ""}</div>
                            <div className="calendar-cell__count">{count > 0 ? `${count}` : ""}</div>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  {viewMode === "day" ? (
                    <div className="calendar-day" role="region" aria-label="Day view">
                      <div className="calendar-day__top">
                        <button
                          type="button"
                          className="calendar-day__to-month"
                          onClick={() => setViewMode("month")}
                        >
                          View month
                        </button>
                      </div>

                      <div className="calendar-day__row">
                        <div className="calendar-day__main">
                          <p className="calendar-day__summary" title={daySummary[focusedDay]?.summary || ""}>
                            {daySummary[focusedDay]?.summary
                              ? daySummary[focusedDay]?.summary
                              : (() => {
                                  const cal = dayByYmd.get(focusedDay);
                                  return cal && cal.count > 0 ? "Loading summary…" : "No entries for this day.";
                                })()}
                          </p>
                        </div>

                        <aside className="calendar-day__aside" aria-label="Key people and themes">
                          <div className="calendar-aside-block">
                            <div className="calendar-aside-block__label">Key people</div>
                            {daySummary[focusedDay]?.key_people?.length ? (
                              <div className="entry-tags entry-tags--gold">
                                {daySummary[focusedDay].key_people.map((p) => (
                                  <span key={p} className="entry-tag entry-tag--gold">
                                    {p}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <div className="muted">(None)</div>
                            )}
                          </div>

                          <div className="calendar-aside-block">
                            <div className="calendar-aside-block__label">Top themes</div>
                            {daySummary[focusedDay]?.top_themes?.length ? (
                              <div className="entry-tags entry-tags--gold">
                                {daySummary[focusedDay].top_themes.map((t) => (
                                  <span key={t} className="entry-tag entry-tag--gold">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <div className="muted">(None)</div>
                            )}
                          </div>
                        </aside>
                      </div>

                      {dayEntries[focusedDay] && dayEntries[focusedDay].length > 0 ? (
                        <div className="dashboard-day-entries">
                          {dayEntries[focusedDay].map((e) => (
                            <div key={e.id} className="dashboard-entry-card">
                              <div className="dashboard-entry-card__head">
                                <div className="dashboard-entry-card__title">
                                  {e.summary || "(Entry)"}
                                </div>
                                <span className="dashboard-entry-card__meta">
                                  {new Date(e.created_at).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <p className="dashboard-entry-card__transcript">
                                {e.transcript || e.cleaned_text || "(No transcript)"}
                              </p>
                              <div className="dashboard-entry-card__actions">
                                <Link to={`/entries/${e.id}`} className="btn-purple btn-purple--sm">
                                  Open full summary
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="muted" style={{ margin: 0 }}>
                          {dayByYmd.get(focusedDay)?.count ? "Loading entries…" : ""}
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {selectedEntry ? (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Entry summary"
          onClick={() => setSelectedEntry(null)}
        >
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-sheet__head">
              <div className="modal-sheet__title">Entry</div>
              <button type="button" className="icon-btn" onClick={() => setSelectedEntry(null)} aria-label="Close">
                ✕
              </button>
            </div>

            <div className="modal-sheet__meta">
              {new Date(selectedEntry.created_at).toLocaleString()}
            </div>

            <div className="modal-sheet__section">
              <div className="modal-sheet__label">Key people</div>
              {(selectedEntry.insights?.people?.length ?? 0) > 0 ? (
                <div className="entry-tags">
                  {selectedEntry.insights.people.map((p) => (
                    <span key={p} className="entry-tag">
                      {p}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="muted">(None)</div>
              )}
            </div>

            <div className="modal-sheet__section">
              <div className="modal-sheet__label">Top themes</div>
              {(selectedEntry.insights?.themes?.length ?? 0) > 0 ? (
                <div className="entry-tags">
                  {selectedEntry.insights.themes.map((t) => (
                    <span key={t} className="entry-tag">
                      {t}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="muted">(None)</div>
              )}
            </div>

            <div className="modal-sheet__section">
              <div className="modal-sheet__label">Summary</div>
              <div className="modal-sheet__text">{selectedEntry.summary || "No summary yet."}</div>
            </div>

            <div className="modal-sheet__section">
              <div className="modal-sheet__label">Transcript</div>
              <div className="modal-sheet__text modal-sheet__text--mono">
                {selectedEntry.transcript || selectedEntry.cleaned_text || "No transcript."}
              </div>
            </div>

            <div className="modal-sheet__footer">
              <Link to={`/entries/${selectedEntry.id}`} className="btn-gold btn-gold--outline">
                Open full page →
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
