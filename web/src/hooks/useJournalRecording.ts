import { useCallback, useEffect, useRef, useState } from "react";
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

export function useJournalRecording(onSaved?: () => void) {
  const { token } = useAuth();
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  const [supported] = useState(() => typeof MediaRecorder !== "undefined");

  const [phase, setPhase] = useState<"idle" | "recording" | "uploading">("idle");
  const [error, setError] = useState<string | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [savedToast, setSavedToast] = useState(false);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const mimeRef = useRef<string>("audio/webm");
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanupStream = useCallback(() => {
    const s = mediaStreamRef.current;
    if (s) {
      s.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  useEffect(() => () => cleanupStream(), [cleanupStream]);

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    [],
  );

  const startRecording = useCallback(async () => {
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
    const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    recorderRef.current = rec;

    rec.ondataavailable = (ev) => {
      if (ev.data.size > 0) chunksRef.current.push(ev.data);
    };
    rec.onerror = () => setError("Recorder error.");
    rec.start(200);
    setPhase("recording");
  }, [token, supported]);

  const stopAndUpload = useCallback(async () => {
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
      await createEntryWithAudioProgress(formData, (loaded: number, total: number) => {
        setUploadPct(total > 0 ? Math.round((100 * loaded) / total) : null);
      });
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setSavedToast(true);
      toastTimerRef.current = setTimeout(() => {
        setSavedToast(false);
        toastTimerRef.current = null;
      }, 3200);
      onSavedRef.current?.();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Upload failed";
      setError(msg);
    } finally {
      setPhase("idle");
      setUploadPct(null);
    }
  }, [cleanupStream]);

  const onDuckPress = useCallback(() => {
    if (phase === "recording") void stopAndUpload();
    else if (phase === "idle") void startRecording();
  }, [phase, startRecording, stopAndUpload]);

  return {
    supported,
    phase,
    error,
    uploadPct,
    savedToast,
    startRecording,
    stopAndUpload,
    onDuckPress,
  };
}
