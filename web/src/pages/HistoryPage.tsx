import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, listEntries } from "../api/client";
import type { JournalEntry } from "../api/types";

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function preview(entry: JournalEntry): string {
  const s = entry.summary?.trim() || entry.cleaned_text?.trim() || entry.transcript?.trim();
  if (!s) return "(No text yet)";
  return s.length > 120 ? `${s.slice(0, 117)}…` : s;
}

export function HistoryPage() {
  const [items, setItems] = useState<JournalEntry[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await listEntries(100, 0);
        if (!cancelled) {
          setItems(res.items);
          setTotal(res.total ?? null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : "Failed to load entries");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="page-shell">
        <p className="muted">Loading entries…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-shell">
        <p role="alert" className="text-error">
          {error}
        </p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="page-shell">
        <h2 className="page-title">History</h2>
        <div className="empty-state">
          <p style={{ margin: 0 }}>No journal entries yet.</p>
          <div className="empty-state__cta">
            <Link to="/record" className="btn-gold">
              Capture a thought
            </Link>
          </div>
          <p className="muted" style={{ marginTop: "0.75rem", marginBottom: 0, textAlign: "center" }}>
            Or add one via the API.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <h2 className="page-title">History</h2>
      {total != null ? (
        <p className="muted" style={{ marginTop: "-0.5rem" }}>
          {total} total
        </p>
      ) : null}
      <ul className="entry-list" style={{ marginTop: "1rem" }}>
        {items.map((e) => (
          <li key={e.id} className="ui-card" style={{ padding: "1rem 1.15rem" }}>
            <div className="muted" style={{ fontSize: "0.8rem", marginBottom: "0.35rem" }}>
              {formatWhen(e.created_at)}
            </div>
            <Link to={`/entries/${e.id}`} className="history-preview-link">
              {preview(e)}
            </Link>
            <div className="muted" style={{ fontSize: "0.8rem", marginTop: "0.45rem", opacity: 0.85 }}>
              {e.source} · {e.id}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
