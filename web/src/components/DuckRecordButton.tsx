import { Link } from "react-router-dom";
import duckImg from "../assets/duck.png";

type FaceProps = {
  /** Shifts ring colors + image tone when mic is hot */
  recording?: boolean;
  /** Softer look while uploading */
  uploading?: boolean;
};

function DuckRecordFace({ recording, uploading }: FaceProps) {
  return (
    <span
      className={
        "duck-record-btn__ring" +
        (recording ? " duck-record-btn__ring--hot" : "") +
        (uploading ? " duck-record-btn__ring--busy" : "")
      }
      aria-hidden
    >
      <span className="duck-record-btn__disc">
        <img
          src={duckImg}
          alt=""
          className={"duck-record-btn__img" + (recording ? " duck-record-btn__img--hot" : "")}
          width={112}
          height={112}
          draggable={false}
        />
      </span>
    </span>
  );
}

type NavProps = {
  /** When false, links to login with return path to record. */
  authenticated: boolean;
};

/** Dashboard / marketing CTA — navigates to record flow. */
export function DuckRecordButton({ authenticated }: NavProps) {
  const cls = authenticated ? "duck-record-btn" : "duck-record-btn duck-record-btn--guest";

  const inner = (
    <>
      <span className="duck-record-btn__duck-hit">
        <DuckRecordFace />
      </span>
      <span className="duck-record-btn__label">
        {authenticated ? "Capture a thought" : "Thoughts by voice"}
      </span>
      <span className="duck-record-btn__hint">
        {authenticated
          ? "Tell the duck what you’re thinking — we’ll save it"
          : "Sign in once so we can keep those thoughts safe for you"}
      </span>
    </>
  );

  if (authenticated) {
    return (
      <Link to="/record" className={cls} aria-label="Open recorder — speak your thoughts to the duck">
        {inner}
      </Link>
    );
  }

  return (
    <Link
      to="/login"
      className={cls}
      state={{ from: "/record" }}
      aria-label="Sign in to save thoughts you record with the duck"
    >
      {inner}
    </Link>
  );
}

type MicProps = {
  recording: boolean;
  uploading: boolean;
  disabled?: boolean;
  /** Idle → start mic; recording → stop & upload */
  onPress: () => void;
};

/** Record page — same duck; tap to start, tap again to stop & upload. */
export function DuckMicButton({ recording, uploading, disabled, onPress }: MicProps) {
  const label = uploading
    ? "Saving your thought…"
    : recording
      ? "Recording your thought…"
      : "Speak a thought";

  const hint = uploading
    ? "Hold on — we’re tucking this away for you"
    : recording
      ? "Say what’s on your mind — then tap to finish"
      : "We’ll use the mic so you can think out loud";

  const cls =
    "duck-record-btn duck-record-btn--mic" +
    (recording ? " duck-record-btn--recording" : "") +
    (uploading ? " duck-record-btn--uploading" : "");

  return (
    <button
      type="button"
      className={cls}
      disabled={disabled || uploading}
      onClick={onPress}
      aria-pressed={recording}
      aria-label={
        uploading
          ? "Saving your thought"
          : recording
            ? "Stop and save this thought"
            : "Start recording a thought"
      }
    >
      <span className="duck-record-btn__duck-hit">
        <DuckRecordFace recording={recording} uploading={uploading} />
      </span>
      <span className="duck-record-btn__label">{label}</span>
      <span className="duck-record-btn__hint">{hint}</span>
    </button>
  );
}
