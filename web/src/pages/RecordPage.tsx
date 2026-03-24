import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, createEntryWithAudioProgress } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { DuckMicButton } from "../components/DuckRecordButton";

function pickRecorderMime(): string | undefined {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) {
      return c;
    }
  }
  return undefined;
}

function extensionForMime(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4") || mime.includes("m4a")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}

export function RecordPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [supported] = useState(() => typeof MediaRecorder !== "undefined");

  const [phase, setPhase] = useState<"idle" | "recording" | "uploading">("idle");
  const [error, setError] = useState<string | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const mimeRef = useRef<string>("audio/webm");

  const cleanupStream = useCallback(() => {
    const s = mediaStreamRef.current;
    if (s) {
      s.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  useEffect(() => () => cleanupStream(), [cleanupStream]);

  const startRecording = async () => {
    setError(null);
    if (!token) return;
    if (!supported) {
      setError("Recording is not supported in this browser.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone permission denied or unavailable.");
      return;
    }
    mediaStreamRef.current = stream;
    chunksRef.current = [];
    const mime = pickRecorderMime();
    mimeRef.current = mime ?? "audio/webm";
    const rec = mime
      ? new MediaRecorder(stream, { mimeType: mime })
      : new MediaRecorder(stream);
    recorderRef.current = rec;

    rec.ondataavailable = (ev) => {
      if (ev.data.size > 0) chunksRef.current.push(ev.data);
    };
    rec.onerror = () => setError("Recorder error.");
    rec.start(200);
    setPhase("recording");
  };

  const stopAndUpload = async () => {
    const rec = recorderRef.current;
    if (!rec || rec.state === "inactive") return;
    setError(null);

    const done = new Promise<Blob>((resolve, reject) => {
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeRef.current });
        if (blob.size === 0) {
          reject(new Error("No audio captured."));
          return;
        }
        resolve(blob);
      };
      rec.onerror = () => reject(new Error("Recorder error."));
    });

    rec.stop();
    cleanupStream();
    recorderRef.current = null;
    setPhase("idle");

    let blob: Blob;
    try {
      blob = await done;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recording failed");
      return;
    }

    const ext = extensionForMime(blob.type || mimeRef.current);
    const file = new File([blob], `journal-${Date.now()}.${ext}`, {
      type: blob.type || mimeRef.current,
    });
    const formData = new FormData();
    formData.append("audio", file);
    formData.append("run_analysis", "true");

    setPhase("uploading");
    setUploadPct(0);
    try {
      const entry = await createEntryWithAudioProgress(formData, (loaded: number, total: number) => {
        setUploadPct(total > 0 ? Math.round((100 * loaded) / total) : null);
      });
      navigate(`/entries/${entry.id}`, { replace: true });
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Upload failed";
      setError(msg);
    } finally {
      setPhase("idle");
      setUploadPct(null);
    }
  };

  return (
    <div className="page-shell stack-lg">
      <div className="ui-card">
        <h2 className="page-title" style={{ marginBottom: "0.5rem" }}>
          Your thought, out loud
        </h2>
        <p className="muted" style={{ margin: 0 }}>
          Think it through with the duck listening — we turn what you say into text you can read and keep. When
          you’re done, we save it for you.
        </p>
      </div>

      {!supported ? (
        <p role="alert" className="text-error">
          MediaRecorder is not available. Use a recent desktop or mobile browser.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-error" style={{ margin: 0 }}>
          {error}
        </p>
      ) : null}

      <div style={{ display: "flex", justifyContent: "center", marginTop: "0.5rem" }}>
        <DuckMicButton
          recording={phase === "recording"}
          uploading={phase === "uploading"}
          disabled={!supported || !token}
          onPress={() => {
            if (phase === "recording") void stopAndUpload();
            else if (phase === "idle") void startRecording();
          }}
        />
      </div>

      {phase === "uploading" && uploadPct !== null ? (
        <div>
          <div
            className="progress-track"
            role="progressbar"
            aria-valuenow={uploadPct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="progress-fill" style={{ width: `${uploadPct}%` }} />
          </div>
          <p className="muted" style={{ marginTop: "0.4rem", marginBottom: 0 }}>
            {uploadPct}%
          </p>
        </div>
      ) : null}

      <p style={{ margin: 0 }}>
        <Link to="/" className="link-back">
          ← Dashboard
        </Link>
      </p>
    </div>
  );
}
