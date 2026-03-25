import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getCalendar, getEntry, getPeriodSummary, listEntries } from "../api/client";
import type { CalendarDay, JournalEntry } from "../api/types";
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

function fmtWeekLabel(fromYmd: string, toYmd: string): string {
  const a = parseYmd(fromYmd);
  const b = parseYmd(toYmd);
  return `${fmtMonthDay(a)} – ${fmtMonthDay(b)}`;
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

type WeekNode = {
  key: string; // from..to
  from: string;
  to: string;
  count: number;
  days: CalendarDay[];
};

export function Dashboard() {
  const { token } = useAuth();
  const [items, setItems] = useState<JournalEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const now = useMemo(() => new Date(), []);
  const [selectedYear, setSelectedYear] = useState<number>(() => now.getUTCFullYear());
  const years = useMemo(() => [2024, 2025, 2026], []);

  const [yearSummary, setYearSummary] = useState<string>("");
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);

  const [openMonth, setOpenMonth] = useState<number | null>(null);
  const [openWeekKey, setOpenWeekKey] = useState<string | null>(null);
  const [openDayYmd, setOpenDayYmd] = useState<string | null>(null);

  const [weekSummary, setWeekSummary] = useState<Record<string, string>>({});
  const [daySummary, setDaySummary] = useState<Record<string, string>>({});
  const [dayEntries, setDayEntries] = useState<Record<string, JournalEntry[]>>({});

  const refreshEntries = useCallback(() => {
    if (!token) return;
    listEntries(1, 0)
      .then((data) => setItems(data.items))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load entries"));
  }, [token]);

  const { supported, phase, error: recordError, uploadPct, savedToast, onDuckPress } =
    useJournalRecording(refreshEntries);

  useEffect(() => {
    if (!token) {
      setItems(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    listEntries(1, 0)
      .then((data) => {
        if (!cancelled) setItems(data.items);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load entries");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setCalendarLoading(true);
    setYearSummary("");
    setCalendarDays([]);
    setOpenMonth(null);
    setOpenWeekKey(null);
    setOpenDayYmd(null);
    setWeekSummary({});
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

  const monthCounts = useMemo(() => {
    const m: Record<number, number> = {};
    for (let i = 1; i <= 12; i++) m[i] = 0;
    for (const d of calendarDays) {
      const mm = Number(d.date.slice(5, 7));
      if (mm >= 1 && mm <= 12) m[mm] = (m[mm] || 0) + (d.count || 0);
    }
    return m;
  }, [calendarDays]);

  const monthWeeks = useMemo(() => {
    if (openMonth == null) return [] as WeekNode[];
    const mm = String(openMonth).padStart(2, "0");
    const monthDays = calendarDays
      .filter((d) => d.date.startsWith(`${selectedYear}-${mm}-`))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    const byWeek: Record<string, WeekNode> = {};
    for (const day of monthDays) {
      const ws = weekStartMonday(day.date);
      const we = addDays(ws, 6);
      const key = `${ws}..${we}`;
      if (!byWeek[key]) {
        byWeek[key] = { key, from: ws, to: we, count: 0, days: [] };
      }
      byWeek[key].count += day.count || 0;
      byWeek[key].days.push(day);
    }

    return Object.values(byWeek).sort((a, b) => (a.from < b.from ? -1 : 1));
  }, [calendarDays, openMonth, selectedYear]);

  const ensureWeekSummary = useCallback(
    async (week: WeekNode) => {
      if (weekSummary[week.key]) return;
      try {
        const s = await getPeriodSummary(week.from, week.to, "week");
        const full = (s.summary || "").trim();
        setWeekSummary((prev) => ({ ...prev, [week.key]: full }));
      } catch {
        setWeekSummary((prev) => ({ ...prev, [week.key]: "" }));
      }
    },
    [weekSummary],
  );

  const ensureDayDetail = useCallback(
    async (d: CalendarDay) => {
      const ymd = d.date;
      if (!daySummary[ymd]) {
        try {
          const s = await getPeriodSummary(ymd, ymd, "day");
          const full = (s.summary || "").trim();
          setDaySummary((prev) => ({ ...prev, [ymd]: full }));
        } catch {
          setDaySummary((prev) => ({ ...prev, [ymd]: "" }));
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
              <p className="dashboard-counter" aria-label="Saved recordings count">
                {loading && items === null ? "Loading…" : `${items?.length ?? 0} recordings saved`}
              </p>
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

      {token && loading && items === null ? (
        <section aria-busy="true">
          <p className="muted">Loading entries…</p>
        </section>
      ) : null}

      {token && error ? (
        <section>
          <p>Could not load entries.</p>
          <p className="text-error" style={{ marginTop: "0.5rem" }}>
            {error}
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            <Link to="/login" className="btn-gold">
              Sign in again
            </Link>
          </p>
        </section>
      ) : null}

      {token && !loading && !error && (items?.length ?? 0) === 0 ? (
        <section className="empty-state" aria-live="polite">
          <p style={{ margin: 0 }}>No journal entries yet.</p>
        </section>
      ) : null}

      {token ? (
        <section className="dashboard-calendar" aria-label="Calendar">
          <div className="dashboard-calendar__head">
            <h3 className="section-label" style={{ marginBottom: 0 }}>
              Calendar
            </h3>
            <div className="dashboard-calendar__controls">
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
          </div>

          <div className="calendar-tree-root" style={{ padding: "0.85rem" }}>
            <div className="calendar-tree-summary">
              {calendarLoading ? (
                <span className="muted">Loading year summary…</span>
              ) : (
                <span className="dashboard-year-summary" title={yearSummary || ""}>
                  {yearSummary || "No entries for this year yet."}
                </span>
              )}
            </div>

            <div className="dashboard-month-grid" role="list" aria-label="Months">
              {MONTHS.map((m, idx) => {
                const month = idx + 1;
                const count = monthCounts[month] || 0;
                const isOpen = openMonth === month;
                return (
                  <div key={m} role="listitem" className="dashboard-month-node">
                    <button
                      type="button"
                      className="dashboard-month-tile"
                      onClick={() => {
                        setOpenDayYmd(null);
                        setOpenWeekKey(null);
                        setOpenMonth((prev) => (prev === month ? null : month));
                      }}
                      aria-expanded={isOpen}
                    >
                      <span className="dashboard-month-tile__name">{m}</span>
                      <span className="dashboard-month-tile__count">{count} recordings</span>
                    </button>

                    {isOpen ? (
                      <div className="dashboard-month-expand" role="region" aria-label={`${m} weeks`}>
                        {monthWeeks.map((week) => {
                          const open = openWeekKey === week.key;
                          const ws = weekSummary[week.key];
                          return (
                            <div key={week.key} className="dashboard-week-node">
                              <button
                                type="button"
                                className="dashboard-tree-row"
                                onClick={() => {
                                  setOpenDayYmd(null);
                                  setOpenWeekKey((prev) => (prev === week.key ? null : week.key));
                                  void ensureWeekSummary(week);
                                }}
                                aria-expanded={open}
                                title={ws || ""}
                              >
                                <span className="dashboard-tree-row__label">{fmtWeekLabel(week.from, week.to)}</span>
                                <span className="dashboard-tree-row__meta">{week.count} recordings</span>
                              </button>

                              {open ? (
                                <div className="dashboard-tree-children" role="region" aria-label="Days">
                                  {week.days.map((d) => {
                                    const isDayOpen = openDayYmd === d.date;
                                    const ds = daySummary[d.date];
                                    const dsPreview = ds ? oneLinePreview(ds, 96) : "";
                                    return (
                                      <div key={d.date} className="dashboard-day-node">
                                        <button
                                          type="button"
                                          className="dashboard-tree-row dashboard-tree-row--day"
                                          onClick={() => {
                                            setOpenDayYmd((prev) => (prev === d.date ? null : d.date));
                                            void ensureDayDetail(d);
                                          }}
                                          aria-expanded={isDayOpen}
                                        >
                                          <span className="dashboard-tree-row__label">
                                            {fmtMonthDay(parseYmd(d.date))}{" "}
                                            <span className="dashboard-tree-row__subtle">
                                              ({d.count} recordings)
                                            </span>
                                          </span>
                                          <span className="dashboard-tree-row__meta">
                                            {ds ? dsPreview : d.count > 0 ? "Loading summary…" : "No entries"}
                                          </span>
                                        </button>

                                        {isDayOpen ? (
                                          <div className="dashboard-day-detail ui-card">
                                            <h4 className="dashboard-day-detail__title">
                                              {d.date}
                                            </h4>
                                            <p className="dashboard-day-detail__summary" title={daySummary[d.date] || ""}>
                                              {daySummary[d.date] || "No summary for this day."}
                                            </p>

                                            {dayEntries[d.date] && dayEntries[d.date].length > 0 ? (
                                              <div className="dashboard-day-entries">
                                                {dayEntries[d.date].map((e) => (
                                                  <div key={e.id} className="dashboard-entry-card">
                                                    <div className="dashboard-entry-card__head">
                                                      <Link to={`/entries/${e.id}`} className="dashboard-entry-card__link">
                                                        {e.summary || "(Entry)"}
                                                      </Link>
                                                      <span className="dashboard-entry-card__meta">
                                                        {new Date(e.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                      </span>
                                                    </div>
                                                    <p className="dashboard-entry-card__transcript">
                                                      {e.transcript || e.cleaned_text || "(No transcript)"}
                                                    </p>
                                                  </div>
                                                ))}
                                              </div>
                                            ) : (
                                              <p className="muted" style={{ margin: 0 }}>
                                                {d.count > 0 ? "Loading entries…" : "No entries for this day."}
                                              </p>
                                            )}
                                          </div>
                                        ) : null}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
