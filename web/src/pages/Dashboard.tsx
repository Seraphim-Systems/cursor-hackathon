import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listEntries } from "../api/client";
import type { JournalEntry } from "../api/types";
import { DuckRecordButton } from "../components/DuckRecordButton";
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

  return (
    <>
      <section className="dashboard-hero" aria-labelledby="dashboard-hero-title">
        <h2 id="dashboard-hero-title" className="dashboard-hero__title">
          Talk to the duck
        </h2>
        {token ? (
          <p className="dashboard-hero__subtitle">
            The duck is how you speak your thoughts and save them. Tap when something’s on your mind — no
            typing required.
          </p>
        ) : (
          <p className="dashboard-hero__subtitle">The duck helps you capture what you’re thinking.</p>
        )}
        <div className="dashboard-duck-wrap">
          <DuckRecordButton authenticated={Boolean(token)} />
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
          <p className="muted" style={{ marginTop: "0.75rem", marginBottom: 0 }}>
            Use the duck above to speak your first thought and save it here.
          </p>
        </section>
      ) : null}

      {token && items && items.length > 0 ? (
        <section>
          <h3 className="section-label">Recent entries</h3>
          <ul className="entry-list">
            {items.map((entry) => (
              <li key={entry.id}>
                <Link
                  to={`/entries/${entry.id}`}
                  className="entry-card-link"
                >
                  <strong style={{ fontWeight: 600 }}>{previewText(entry)}</strong>
                  <div className="entry-card-meta">
                    {formatWhen(entry.created_at)} · {entry.source}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
