import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listEntries } from "../api/client";
import type { JournalEntry } from "../api/types";
import { useAuth } from "../auth/AuthContext";

function previewText(entry: JournalEntry): string {
  const s = entry.summary?.trim();
  if (s) return s.length > 160 ? `${s.slice(0, 157)}…` : s;
  const c = entry.cleaned_text?.trim();
  if (c) return c.length > 160 ? `${c.slice(0, 157)}…` : c;
  const t = entry.transcript?.trim();
  if (t) return t.length > 160 ? `${t.slice(0, 157)}…` : t;
  return "(No text yet)";
}

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

const styles = {
  wrap: { marginTop: "1rem" } as const,
  list: { listStyle: "none", padding: 0, margin: 0 } as const,
  item: {
    border: "1px solid #e5e5e5",
    borderRadius: 8,
    padding: "0.75rem 1rem",
    marginBottom: "0.5rem",
  } as const,
  meta: { fontSize: "0.8rem", color: "#666", marginTop: "0.35rem" } as const,
  empty: { padding: "2rem 1rem", textAlign: "center" as const, color: "#555" },
  err: { color: "#b42318", marginTop: "0.5rem" },
};

export function Dashboard() {
  const { token } = useAuth();
  const [items, setItems] = useState<JournalEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setItems(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    listEntries(10, 0)
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

  if (!token) {
    return (
      <section style={styles.empty} aria-live="polite">
        <p style={{ margin: 0 }}>Sign in to see your recent journal entries.</p>
        <p style={{ marginTop: "1rem" }}>
          <Link to="/login">Sign in</Link>
        </p>
      </section>
    );
  }

  if (loading && items === null) {
    return (
      <section style={styles.wrap} aria-busy="true">
        <p>Loading entries…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section style={styles.wrap}>
        <p>Could not load entries.</p>
        <p style={styles.err}>{error}</p>
        <p style={{ marginTop: "0.75rem" }}>
          <Link to="/login">Sign in again</Link>
        </p>
      </section>
    );
  }

  const list = items ?? [];
  if (list.length === 0) {
    return (
      <section style={styles.empty} aria-live="polite">
        <p style={{ margin: 0 }}>No journal entries yet.</p>
        <p style={{ marginTop: "0.75rem" }}>
          <Link to="/record">Start with a recording</Link> (full flow in P3.2), or add entries via the API.
        </p>
      </section>
    );
  }

  return (
    <section style={styles.wrap}>
      <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Recent entries</h2>
      <ul style={styles.list}>
        {list.map((entry) => (
          <li key={entry.id} style={styles.item}>
            <Link to={`/entries/${entry.id}`} style={{ fontWeight: 500, color: "inherit", textDecoration: "none" }}>
              {previewText(entry)}
            </Link>
            <div style={styles.meta}>
              {formatWhen(entry.created_at)} · {entry.source}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
