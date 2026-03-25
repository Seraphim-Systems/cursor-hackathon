import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getPeriodSummary, listEntries } from "../api/client";
import type { JournalEntry } from "../api/types";
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
  return clean.slice(0, max - 1).trimEnd() + "…";
}

function isoDateYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function monthRange(year: number, month1to12: number): { from: string; to: string } {
  const from = new Date(Date.UTC(year, month1to12 - 1, 1));
  const to = new Date(Date.UTC(year, month1to12, 0)); // last day of month
  return { from: isoDateYmd(from), to: isoDateYmd(to) };
}

export function Dashboard() {
  const { token } = useAuth();
  const [items, setItems] = useState<JournalEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const now = useMemo(() => new Date(), []);
  const [selectedYear, setSelectedYear] = useState<number>(() => now.getUTCFullYear());
  const years = useMemo(() => [2024, 2025, 2026], []);

  const [yearSummary, setYearSummary] = useState<string>("");
  const [monthSummaries, setMonthSummaries] = useState<Record<number, { full: string; preview: string }>>({});
  const [calendarLoading, setCalendarLoading] = useState(false);

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
    setMonthSummaries({});

    (async () => {
      try {
        // Year summary
        const yearFrom = `${selectedYear}-01-01`;
        const yearTo = `${selectedYear}-12-31`;
        const y = await getPeriodSummary(yearFrom, yearTo, "year");
        if (cancelled) return;
        const yFull = (y.summary || "").trim();
        setYearSummary(yFull);

        // Month previews (12 calls; server caches)
        const promises = MONTHS.map(async (_m, idx) => {
          const month = idx + 1;
          const { from, to } = monthRange(selectedYear, month);
          const s = await getPeriodSummary(from, to, "month");
          const full = (s.summary || "").trim();
          return [month, { full, preview: oneLinePreview(full) }] as const;
        });

        const pairs = await Promise.all(promises);
        if (cancelled) return;
        const next: Record<number, { full: string; preview: string }> = {};
        for (const [m, v] of pairs) next[m] = v;
        setMonthSummaries(next);
      } finally {
        if (!cancelled) setCalendarLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, selectedYear]);

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
              <Link to="/history" className="dashboard-calendar__link">
                Open all entries →
              </Link>
            </div>
          </div>

          <div className="calendar-tree-root" style={{ padding: "0.85rem" }}>
            <div className="calendar-tree-summary">
              {calendarLoading ? (
                <span className="muted">Loading year summary…</span>
              ) : (
                <span title={yearSummary || ""}>
                  {oneLinePreview(yearSummary || "No entries for this year yet.", 160)}
                </span>
              )}
            </div>

            <div className="dashboard-month-grid" role="list" aria-label="Months">
              {MONTHS.map((m, idx) => {
                const month = idx + 1;
                const s = monthSummaries[month];
                const preview = s?.preview ?? (calendarLoading ? "Loading…" : "No entries yet.");
                const full = s?.full ?? "";
                return (
                  <button
                    key={m}
                    type="button"
                    className="dashboard-month-tile"
                    title={full || preview}
                    onClick={() => {
                      const { from, to } = monthRange(selectedYear, month);
                      // jump to archive filter via History page; keeps minimal dashboard
                      window.location.href = `/history?from=${from}&to=${to}`;
                    }}
                    role="listitem"
                  >
                    <span className="dashboard-month-tile__name">{m}</span>
                    <span className="dashboard-month-tile__preview">{preview}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
