import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ApiError, getEntry } from "../api/client";
import type { JournalEntry } from "../api/types";
import { EntryAudioPlayer } from "../components/EntryAudioPlayer";
import {
  entryBackLinkLabel,
  safeEntryBackPath,
  type EntryDetailNavState,
} from "../utils/entryNavigation";

function formatRecordedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

/** Prefer raw transcript; fall back to cleaned text when transcript is empty. */
function transcriptionText(entry: JournalEntry): string {
  const t = entry.transcript?.trim();
  if (t) return t;
  return entry.cleaned_text?.trim() ?? "";
}

/**
 * STT and pipelines often inject hard line breaks every segment; `pre-wrap` then looks choppy.
 * Collapse single newlines into spaces; keep blank-line gaps as paragraphs.
 */
function normalizeProseForDisplay(raw: string): string {
  const normalized = raw.replace(/\r\n/g, "\n").trim();
  if (!normalized) return "";
  return normalized
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\n/g, " ").replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
}

export function EntryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const backPath = useMemo(
    () => safeEntryBackPath((location.state as EntryDetailNavState | null)?.from),
    [location.state],
  );
  const backLabel = useMemo(() => entryBackLinkLabel(backPath), [backPath]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entry, setEntry] = useState<JournalEntry | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const e = await getEntry(id);
        if (!cancelled) setEntry(e);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : "Failed to load entry");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!id) {
    return <p className="muted">Missing entry id.</p>;
  }

  if (loading) {
    return <p className="muted">Loading entry…</p>;
  }

  if (error) {
    return (
      <div className="page-shell stack-lg">
        <p role="alert" className="text-error">
          {error}
        </p>
        <p style={{ margin: 0 }}>
          <Link to={backPath} className="link-back">
            ← {backLabel}
          </Link>
        </p>
      </div>
    );
  }

  if (!entry) {
    return null;
  }

  const transcription = normalizeProseForDisplay(transcriptionText(entry));
  const summaryText = normalizeProseForDisplay(entry.summary?.trim() ?? "");

  return (
    <div className="page-shell entry-detail-page">
      <header className="entry-detail-topbar">
        <Link to={backPath} className="link-back entry-detail-topbar__back">
          ← {backLabel}
        </Link>
        <time className="entry-detail-topbar__date" dateTime={entry.created_at}>
          {formatRecordedAt(entry.created_at)}
        </time>
      </header>

      <section className="entry-detail-block" aria-label="Recording">
        <span className="entry-detail-block__label">Recording</span>
        {entry.audio_storage_key ? (
          <EntryAudioPlayer entryId={entry.id} />
        ) : (
          <p className="entry-detail-block__empty">No recording</p>
        )}
      </section>

      <section className="entry-detail-block" aria-label="Transcription">
        <span className="entry-detail-block__label">Transcription</span>
        {transcription ? (
          <p className="entry-detail-block__body">{transcription}</p>
        ) : (
          <p className="entry-detail-block__empty">(No text)</p>
        )}
      </section>

      <section className="entry-detail-block" aria-label="Summary">
        <span className="entry-detail-block__label">Summary</span>
        {summaryText ? (
          <p className="entry-detail-block__body">{summaryText}</p>
        ) : (
          <p className="entry-detail-block__empty">(No text)</p>
        )}
      </section>
    </div>
  );
}
