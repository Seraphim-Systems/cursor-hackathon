import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, getCalendar } from "../api/client";
import type { CalendarDay } from "../api/types";

function monthRange(year: number, monthIndex: number): { from: string; to: string } {
  const from = new Date(Date.UTC(year, monthIndex, 1));
  const to = new Date(Date.UTC(year, monthIndex + 1, 0));
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    from: `${from.getUTCFullYear()}-${pad(from.getUTCMonth() + 1)}-${pad(from.getUTCDate())}`,
    to: `${to.getUTCFullYear()}-${pad(to.getUTCMonth() + 1)}-${pad(to.getUTCDate())}`,
  };
}

export function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [monthIndex, setMonthIndex] = useState(now.getMonth());
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { from, to } = useMemo(() => monthRange(year, monthIndex), [year, monthIndex]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getCalendar(from, to);
        if (!cancelled) setDays(res.days);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : "Failed to load calendar");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  function prevMonth() {
    if (monthIndex === 0) {
      setMonthIndex(11);
      setYear((y) => y - 1);
    } else {
      setMonthIndex((m) => m - 1);
    }
  }

  function nextMonth() {
    if (monthIndex === 11) {
      setMonthIndex(0);
      setYear((y) => y + 1);
    } else {
      setMonthIndex((m) => m + 1);
    }
  }

  const label = new Date(year, monthIndex, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>Calendar</h2>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
        <button type="button" onClick={prevMonth} style={{ padding: "0.35rem 0.65rem" }}>
          ←
        </button>
        <span style={{ fontWeight: 600, minWidth: 180, textAlign: "center" }}>{label}</span>
        <button type="button" onClick={nextMonth} style={{ padding: "0.35rem 0.65rem" }}>
          →
        </button>
      </div>
      <p style={{ fontSize: "0.85rem", color: "#555", marginTop: 0 }}>
        Range sent to API: <code>{from}</code> … <code>{to}</code> (UTC day boundaries for listing)
      </p>

      {loading ? <p>Loading…</p> : null}
      {error ? (
        <p role="alert" style={{ color: "#b00020" }}>
          {error}
        </p>
      ) : null}

      {!loading && !error && days.length === 0 ? (
        <p>No entries with activity in this month.</p>
      ) : null}

      {!loading && !error && days.length > 0 ? (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "1rem" }}>
          {days.map((d) => (
            <li
              key={d.date}
              style={{
                border: "1px solid #ddd",
                borderRadius: 6,
                padding: "0.75rem 1rem",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                {d.date}{" "}
                <span style={{ fontWeight: 400, color: "#666", fontSize: "0.9rem" }}>
                  ({d.count} {d.count === 1 ? "entry" : "entries"})
                </span>
              </div>
              <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
                {d.entry_ids.map((id) => (
                  <li key={id}>
                    <Link to={`/entries/${id}`}>{id}</Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
