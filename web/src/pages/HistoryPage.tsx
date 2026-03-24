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
    return <p>Loading entries…</p>;
  }

  if (error) {
    return (
      <p role="alert" style={{ color: "#b00020" }}>
        {error}
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <div>
        <p>No journal entries yet.</p>
        <p style={{ fontSize: "0.9rem", color: "#555" }}>
          Create one from the record flow (Part 3.2) or via the API.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: "1.1rem", marginBottom: "0.75rem" }}>History</h2>
      {total != null ? (
        <p style={{ fontSize: "0.85rem", color: "#555", marginTop: 0 }}>{total} total</p>
      ) : null}
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.75rem" }}>
        {items.map((e) => (
          <li
            key={e.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 6,
              padding: "0.75rem 1rem",
            }}
          >
            <div style={{ fontSize: "0.8rem", color: "#666" }}>{formatWhen(e.created_at)}</div>
            <Link to={`/entries/${e.id}`} style={{ fontWeight: 600, textDecoration: "none" }}>
              {preview(e)}
            </Link>
            <div style={{ fontSize: "0.8rem", color: "#888", marginTop: "0.25rem" }}>
              {e.source} · {e.id}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
