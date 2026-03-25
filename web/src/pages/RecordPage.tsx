import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { DuckMicButton } from "../components/DuckRecordButton";
import { useJournalRecording } from "../hooks/useJournalRecording";

export function RecordPage() {
  const { token, duckName: authDuckName } = useAuth();
  const duckName = authDuckName || "the duck";
  const { supported, phase, error, uploadPct, savedToast, onDuckPress } = useJournalRecording();

  return (
    <div className="page-shell stack-lg">
      {savedToast ? (
        <div className="toast-alert" role="status">
          Thought saved
        </div>
      ) : null}
      <div className="ui-card">
        <h2 className="page-title" style={{ marginBottom: "0.5rem" }}>
          Your thought, out loud
        </h2>
        <p className="muted" style={{ margin: 0 }}>
          Think it through with {duckName} listening — we turn what you say into text you can read and keep. When
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
          onPress={onDuckPress}
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
