import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listEntries } from "../api/client";
import type { JournalEntry } from "../api/types";
import { DuckMicButton, DuckRecordButton } from "../components/DuckRecordButton";
import { EntryAudioPlayer } from "../components/EntryAudioPlayer";
import { EntryRemoveButton } from "../components/EntryRemoveButton";
import { useAuth } from "../auth/AuthContext";
import { useJournalRecording } from "../hooks/useJournalRecording";

function previewText(entry: JournalEntry): string {
  const pick = (): string => {
    const s = entry.summary?.trim();
    if (s) return s;
    const c = entry.cleaned_text?.trim();
    if (c) return c;
    const t = entry.transcript?.trim();
    if (t) return t;
    return "(No text)";
  };
  return pick().replace(/\s+/g, " ").trim();
}

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

/** Dashboard list: only this many newest entries (full archive is on History). */
const DASHBOARD_RECENT_LIMIT = 6;

function newestFirst(entries: JournalEntry[]): JournalEntry[] {
  return [...entries].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function Dashboard() {
  const { token, duckName: authDuckName } = useAuth();
  const duckName = authDuckName || "the duck";
  const [items, setItems] = useState<JournalEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshEntries = useCallback(() => {
    if (!token) return;
    listEntries(DASHBOARD_RECENT_LIMIT, 0)
      .then((data) => setItems(newestFirst(data.items).slice(0, DASHBOARD_RECENT_LIMIT)))
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

  const recentEntries = useMemo(() => {
    if (!items?.length) return [];
    return newestFirst(items).slice(0, DASHBOARD_RECENT_LIMIT);
  }, [items]);

  return (
    <div className="page-shell">
      <section className="dashboard-hero" aria-labelledby="dashboard-hero-title">
        <h2 id="dashboard-hero-title" className="dashboard-hero__title">
          Talk to {duckName}
        </h2>
        <p className="dashboard-hero__subtitle">{duckName === "the duck" ? "The duck" : duckName} helps you capture what you’re thinking.</p>
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
            Use {duckName} above to speak your first thought and save it here.
          </p>
        </section>
      ) : null}

      {token && recentEntries.length > 0 ? (
        <section className="dashboard-recent">
          <div className="dashboard-recent__head">
            <h3 className="section-label dashboard-recent__title">Recent entries</h3>
            <p className="dashboard-recent__hint muted">
              Your {recentEntries.length} most recent {recentEntries.length === 1 ? "entry" : "entries"}.{" "}
              <Link to="/history" className="dashboard-recent__history-link">
                See all entries in History
              </Link>
              .
            </p>
          </div>
          <ul className="entry-list">
            {recentEntries.map((entry) => (
              <li key={entry.id} className="entry-list-item">
                <div className="entry-list-item__bubble-wrap">
                  <time className="entry-list-item__recorded" dateTime={entry.created_at}>
                    Recorded {formatWhen(entry.created_at)}
                  </time>
                  <div className="entry-list-item__card-row">
                    <EntryRemoveButton
                      entryId={entry.id}
                      onRemoved={() =>
                        setItems((prev) => (prev ? prev.filter((x) => x.id !== entry.id) : prev))
                      }
                    />
                    <Link
                      to={`/entries/${entry.id}`}
                      state={{ from: "/" }}
                      className="entry-card-link entry-card-link--oneline"
                    >
                      <span className="entry-card-oneline">
                        <strong className="entry-card-oneline__title">{previewText(entry)}</strong>
                      </span>
                    </Link>
                  </div>
                  {entry.audio_storage_key ? (
                    <div className="entry-list-item__audio">
                      <EntryAudioPlayer entryId={entry.id} compact />
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
