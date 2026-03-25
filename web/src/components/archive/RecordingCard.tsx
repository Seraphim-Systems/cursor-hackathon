import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { JournalEntry } from "../../api/types";
import { EntryAudioPlayer } from "../EntryAudioPlayer";
import { EntryRemoveButton } from "../EntryRemoveButton";

function firstLine(text: string | null | undefined, max = 80): string {
  if (!text?.trim()) return "";
  const line = text.trim().split(/\r?\n/)[0]?.trim() ?? "";
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}

function recordingTitle(entry: JournalEntry): string {
  const s = entry.summary?.trim();
  if (s) return firstLine(s, 100) || "Note";
  const t = entry.transcript?.trim() || entry.cleaned_text?.trim();
  if (t) return firstLine(t, 100) || "Voice note";
  return "Voice note";
}

function recordingPreview(entry: JournalEntry): string | null {
  const body = entry.cleaned_text?.trim() || entry.transcript?.trim();
  if (!body) return null;
  const title = recordingTitle(entry);
  const first = firstLine(body, 200);
  if (first === title || body.startsWith(title)) return null;
  return first.length > 140 ? `${first.slice(0, 137)}…` : first;
}

function formatTimeOnly(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function formatDurationLabel(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type Props = {
  entry: JournalEntry;
  onRemoved: () => void;
};

export function RecordingCard({ entry, onRemoved }: Props) {
  const title = recordingTitle(entry);
  const preview = recordingPreview(entry);
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const onDurationKnown = useCallback((sec: number) => {
    setDurationSec(sec);
  }, []);

  useEffect(() => {
    setDurationSec(null);
  }, [entry.id]);

  return (
    <article className="archive-recording-card">
      <div className="archive-recording-card__main">
        <div className="archive-recording-card__text">
          <Link
            to={`/entries/${entry.id}`}
            state={{ from: "/history" }}
            className="archive-recording-card__title-link"
          >
            {title}
          </Link>
          {preview ? <p className="archive-recording-card__preview muted">{preview}</p> : null}
          <div className="archive-recording-card__meta">
            <time dateTime={entry.created_at} className="archive-recording-card__time">
              Recorded {formatTimeOnly(entry.created_at)}
            </time>
            {durationSec != null && entry.audio_storage_key ? (
              <>
                <span className="archive-recording-card__dot" aria-hidden>
                  ·
                </span>
                <span className="archive-recording-card__duration">{formatDurationLabel(durationSec)}</span>
              </>
            ) : null}
            <span className="archive-recording-card__dot" aria-hidden>
              ·
            </span>
            <span className="archive-recording-card__source">{entry.source}</span>
          </div>
        </div>
        <details className="archive-recording-card__menu">
          <summary className="archive-recording-card__menu-trigger" aria-label="More actions">
            <span aria-hidden>⋯</span>
          </summary>
          <div className="archive-recording-card__menu-panel" role="menu">
            <Link
              to={`/entries/${entry.id}`}
              state={{ from: "/history" }}
              className="archive-recording-card__menu-item"
              role="menuitem"
            >
              Open details
            </Link>
            <EntryRemoveButton
              entryId={entry.id}
              onRemoved={onRemoved}
              label="Remove…"
              className="entry-remove-btn--menu-item"
            />
          </div>
        </details>
      </div>
      {entry.audio_storage_key ? (
        <div className="archive-recording-card__audio">
          <EntryAudioPlayer entryId={entry.id} variant="archive" onDurationKnown={onDurationKnown} />
        </div>
      ) : (
        <p className="archive-recording-card__no-audio muted">No recording attached</p>
      )}
    </article>
  );
}
