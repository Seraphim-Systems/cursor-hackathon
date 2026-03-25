import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { claimJournalPlayback, releaseJournalPlayback } from "../audio/activeJournalPlayback";
import { probeBlobDurationSeconds } from "../audio/blobDuration";
import { ApiError, fetchEntryAudio } from "../api/client";

type Props = {
  entryId: string;
  /** Narrow inline layout for list rows */
  compact?: boolean;
  /** Archive / history: larger play control, clearer scrub bar */
  variant?: "default" | "compact" | "archive";
  /** Called when total duration becomes known (e.g. for list metadata). */
  onDurationKnown?: (seconds: number) => void;
};

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function isValidDuration(d: number): boolean {
  return Number.isFinite(d) && d > 0 && d !== Infinity;
}

function IconPlayArrow({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="24" height="24" aria-hidden>
      <path
        fill="currentColor"
        d="M5 4.5v15c0 .65.7 1.05 1.25.72L20 12.72c.52-.32.52-1.12 0-1.44L6.25 3.78C5.7 3.45 5 3.85 5 4.5z"
      />
    </svg>
  );
}

function IconPause({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="24" height="24" aria-hidden>
      <path fill="currentColor" d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
    </svg>
  );
}

function IconVolumeHigh({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="24" height="24" aria-hidden>
      <path
        fill="currentColor"
        d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
      />
    </svg>
  );
}

function IconVolumeMute({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="24" height="24" aria-hidden>
      <path
        fill="currentColor"
        d="M3.63 3.63L2.22 5.04 7 9.82V14h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81l2.04 2.04 1.41-1.41L5.04 2.22 3.63 3.63zM16 11.26L18 13.26V5.04l-2 2v4.22zm0 6.12L18 19.38v-3.23l-2 2v1.23zM12 4L9.91 6.09 12 8.18V4z"
      />
    </svg>
  );
}

export function EntryAudioPlayer({ entryId, compact, variant, onDurationKnown }: Props) {
  const layoutVariant = variant ?? (compact ? "compact" : "default");
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  /** Duration from Web Audio decode — works for blob WebM before `<audio>` reports length. */
  const probedDurationRef = useRef<number | null>(null);
  const fixingDurationRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const seekingRef = useRef(false);

  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const volumeBeforeMuteRef = useRef(1);

  /** Must match real element state — avoids white progress bar sticking after pause/end. */
  const syncPlayingFromElement = useCallback(() => {
    const a = audioRef.current;
    if (!a) {
      setPlaying(false);
      return;
    }
    setPlaying(!a.paused && !a.ended);
  }, []);

  const onTimeUpdate = useCallback(() => {
    const a = audioRef.current;
    if (!a || seekingRef.current || fixingDurationRef.current) return;
    setCurrent(a.currentTime);
    syncPlayingFromElement();
  }, [syncPlayingFromElement]);

  const onSeek = useCallback((value: number) => {
    const a = audioRef.current;
    if (!a) return;
    seekingRef.current = true;
    a.currentTime = value;
    setCurrent(value);
    requestAnimationFrame(() => {
      seekingRef.current = false;
    });
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (a) {
      a.pause();
      releaseJournalPlayback(a);
    }
    setPlaying(false);
  }, [entryId]);

  useEffect(() => {
    let cancelled = false;
    let blobUrl: string | null = null;
    probedDurationRef.current = null;
    setLoading(true);
    setErr(null);
    setUrl(null);
    setPlaying(false);
    setDuration(0);
    setCurrent(0);
    fetchEntryAudio(entryId)
      .then(async (blob) => {
        if (cancelled) return;
        const probed = await probeBlobDurationSeconds(blob);
        if (cancelled) return;
        if (probed != null && isValidDuration(probed)) {
          probedDurationRef.current = probed;
          setDuration(probed);
        }
        blobUrl = URL.createObjectURL(blob);
        setUrl(blobUrl);
      })
      .catch((e) => {
        if (!cancelled) {
          const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Could not load audio";
          setErr(msg);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [entryId]);

  useEffect(
    () => () => {
      const el = audioRef.current;
      if (el) {
        el.pause();
        releaseJournalPlayback(el);
      }
    },
    [],
  );

  /** Blob / WebM: duration often unknown until seek — run after ref + src exist (`useLayoutEffect` + `load()`). */
  useLayoutEffect(() => {
    if (!url) return;
    const a = audioRef.current;
    if (!a) return;

    const readAndSetDuration = () => {
      const d = a.duration;
      if (isValidDuration(d)) {
        setDuration(d);
        return true;
      }
      const p = probedDurationRef.current;
      if (p != null && isValidDuration(p)) {
        setDuration(p);
        return true;
      }
      return false;
    };

    const seekToResolveDuration = () => {
      if (readAndSetDuration()) return;

      fixingDurationRef.current = true;
      const onSeeked = () => {
        a.removeEventListener("seeked", onSeeked);
        readAndSetDuration();
        try {
          a.currentTime = 0;
        } catch {
          /* ignore */
        }
        fixingDurationRef.current = false;
      };
      a.addEventListener("seeked", onSeeked, { once: true });
      try {
        if (a.seekable && a.seekable.length > 0) {
          a.currentTime = Math.max(0, a.seekable.end(a.seekable.length - 1));
        } else {
          a.currentTime = 1e10;
        }
      } catch {
        a.removeEventListener("seeked", onSeeked);
        fixingDurationRef.current = false;
      }
    };

    const onLoadedMetadata = () => {
      if (readAndSetDuration()) return;
      if (a.duration === Infinity || !Number.isFinite(a.duration)) {
        seekToResolveDuration();
      }
    };

    const onDurationChange = () => {
      readAndSetDuration();
    };

    const onProgress = () => {
      if (readAndSetDuration()) return;
      if (a.seekable && a.seekable.length > 0 && (a.duration === Infinity || !Number.isFinite(a.duration))) {
        seekToResolveDuration();
      }
    };

    const onCanPlay = () => {
      if (!readAndSetDuration() && (a.duration === Infinity || !Number.isFinite(a.duration))) {
        seekToResolveDuration();
      }
    };

    const onLoadedData = () => {
      readAndSetDuration();
    };

    a.addEventListener("loadedmetadata", onLoadedMetadata);
    a.addEventListener("loadeddata", onLoadedData);
    a.addEventListener("durationchange", onDurationChange);
    a.addEventListener("progress", onProgress);
    a.addEventListener("canplay", onCanPlay);

    if (a.readyState >= 1) {
      onLoadedMetadata();
    }
    readAndSetDuration();

    return () => {
      a.removeEventListener("loadedmetadata", onLoadedMetadata);
      a.removeEventListener("loadeddata", onLoadedData);
      a.removeEventListener("durationchange", onDurationChange);
      a.removeEventListener("progress", onProgress);
      a.removeEventListener("canplay", onCanPlay);
    };
  }, [url]);

  useEffect(() => {
    if (!onDurationKnown) return;
    if (isValidDuration(duration)) {
      onDurationKnown(duration);
    }
  }, [duration, onDurationKnown]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = volume;
    a.muted = muted;
  }, [volume, muted, url]);

  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  }, []);

  const toggleMute = useCallback(() => {
    if (muted) {
      const restore = volumeBeforeMuteRef.current > 0 ? volumeBeforeMuteRef.current : 0.6;
      setVolume(restore);
      setMuted(false);
      return;
    }
    if (volume > 0) volumeBeforeMuteRef.current = volume;
    setMuted(true);
  }, [muted, volume]);

  const onVolumeSlider = useCallback((v: number) => {
    setVolume(v);
    if (v > 0) {
      setMuted(false);
      volumeBeforeMuteRef.current = v;
    } else {
      setMuted(true);
    }
  }, []);

  if (loading) {
    return (
      <span
        className={
          layoutVariant === "compact" ? "entry-audio-inline muted" : layoutVariant === "archive" ? "archive-audio__loading muted" : "muted"
        }
      >
        Loading audio…
      </span>
    );
  }
  if (err) {
    return (
      <span
        className={
          layoutVariant === "compact"
            ? "entry-audio-inline text-error"
            : layoutVariant === "archive"
              ? "archive-audio__loading text-error"
              : "text-error"
        }
      >
        {err}
      </span>
    );
  }
  if (!url) return null;

  const max = isValidDuration(duration) ? duration : 0;
  const safeCurrent = max > 0 ? Math.min(current, max) : current;

  const audioClass =
    layoutVariant === "archive"
      ? "journal-audio journal-audio--archive"
      : layoutVariant === "compact"
        ? "journal-audio journal-audio--compact"
        : "journal-audio";

  return (
    <div className={audioClass}>
      <audio
        ref={audioRef}
        src={url}
        preload="auto"
        onPlay={(ev) => {
          claimJournalPlayback(ev.currentTarget);
          syncPlayingFromElement();
        }}
        onPause={(ev) => {
          releaseJournalPlayback(ev.currentTarget);
          syncPlayingFromElement();
        }}
        onEnded={(ev) => {
          releaseJournalPlayback(ev.currentTarget);
          setCurrent(0);
          syncPlayingFromElement();
        }}
        onSeeked={syncPlayingFromElement}
        onEmptied={() => {
          syncPlayingFromElement();
        }}
        onTimeUpdate={onTimeUpdate}
      />
      <button
        type="button"
        className="journal-audio__play"
        onClick={togglePlay}
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? (
          <IconPause className="journal-audio__icon" />
        ) : (
          <IconPlayArrow className="journal-audio__icon journal-audio__icon--play-arrow" />
        )}
      </button>
      <div className="journal-audio__main">
        <div className="journal-audio__scrub-row">
          <div className="journal-audio__scrub-visual" aria-hidden>
            {max > 0 && playing ? (
              <div
                className="journal-audio__scrub-played"
                style={{ width: `${Math.min(100, (safeCurrent / max) * 100)}%` }}
              />
            ) : null}
          </div>
          <input
            type="range"
            className="journal-audio__scrub journal-audio__scrub--overlay"
            min={0}
            max={max > 0 ? max : 1}
            step="any"
            value={max > 0 ? safeCurrent : 0}
            disabled={max <= 0}
            aria-label="Playback position"
            onChange={(ev) => onSeek(Number(ev.target.value))}
          />
        </div>
        <div className="journal-audio__times">
          <span>{formatTime(safeCurrent)}</span>
          <span className="journal-audio__times-sep" aria-hidden>
            /
          </span>
          <span>{max > 0 ? formatTime(max) : "…"}</span>
        </div>
      </div>
      <div className="journal-audio__vol">
        <button
          type="button"
          className="journal-audio__vol-btn"
          onClick={toggleMute}
          aria-label={muted || volume === 0 ? "Unmute" : "Mute"}
        >
          {muted || volume === 0 ? (
            <IconVolumeMute className="journal-audio__vol-icon" />
          ) : (
            <IconVolumeHigh className="journal-audio__vol-icon" />
          )}
        </button>
        <input
          type="range"
          className="journal-audio__vol-range"
          min={0}
          max={1}
          step={0.05}
          value={muted ? 0 : volume}
          aria-label="Volume"
          onChange={(ev) => onVolumeSlider(Number(ev.target.value))}
        />
      </div>
    </div>
  );
}
