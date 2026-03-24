import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, createEntryWithAudioProgress } from "../api/client";
import { useAuth } from "../auth/AuthContext";

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
    <div style={{ maxWidth: 480 }}>
      <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Record</h2>
      <p style={{ fontSize: "0.9rem", color: "#444", marginBottom: "1rem" }}>
        Capture audio with the microphone, then upload. The API runs transcription and analysis (stub or
        configured adapters).
      </p>

      {!supported ? (
        <p role="alert" style={{ color: "#b00020" }}>
          MediaRecorder is not available. Use a recent desktop or mobile browser.
        </p>
      ) : null}

      {error ? (
        <p role="alert" style={{ color: "#b00020", marginBottom: "0.75rem" }}>
          {error}
        </p>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
        {phase !== "recording" && phase !== "uploading" ? (
          <button
            type="button"
            onClick={startRecording}
            disabled={!supported || !token}
            style={buttonStyle}
          >
            Start recording
          </button>
        ) : null}
        {phase === "recording" ? (
          <button type="button" onClick={stopAndUpload} style={{ ...buttonStyle, background: "#8b0000" }}>
            Stop & upload
          </button>
        ) : null}
        {phase === "uploading" ? (
          <span style={{ fontSize: "0.95rem", color: "#333" }}>Uploading…</span>
        ) : null}
      </div>

      {phase === "uploading" && uploadPct !== null ? (
        <div style={{ marginTop: "1rem" }}>
          <div
            style={{
              height: 8,
              borderRadius: 4,
              background: "#e8e8e8",
              overflow: "hidden",
            }}
            role="progressbar"
            aria-valuenow={uploadPct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              style={{
                height: "100%",
                width: `${uploadPct}%`,
                background: "#1a6bb3",
                transition: "width 0.1s ease-out",
              }}
            />
          </div>
          <p style={{ fontSize: "0.85rem", color: "#555", marginTop: "0.35rem" }}>{uploadPct}%</p>
        </div>
      ) : null}

      <p style={{ marginTop: "1.25rem", fontSize: "0.85rem", color: "#555" }}>
        <Link to="/">← Home</Link>
      </p>
    </div>
  );
}

const buttonStyle: CSSProperties = {
  padding: "0.55rem 1rem",
  borderRadius: 6,
  border: "none",
  background: "#1a1a1a",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 500,
};
