import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { ApiError, deleteEntry } from "../api/client";

function TrashIcon() {
  return (
    <svg
      className="entry-remove-btn__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

type Props = {
  entryId: string;
  onRemoved: () => void;
  className?: string;
  /** Text label instead of icon (e.g. archive overflow menu). */
  label?: string;
};

export function EntryRemoveButton({ entryId, onRemoved, className = "", label }: Props) {
  const uid = useId();
  const dialogElId = `${uid}-dialog`;
  const titleId = `${uid}-title`;
  const descId = `${uid}-desc`;

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy]);

  async function confirmDelete() {
    setErr(null);
    setBusy(true);
    try {
      await deleteEntry(entryId);
      setOpen(false);
      onRemoved();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Could not remove entry");
    } finally {
      setBusy(false);
    }
  }

  const modal =
    open &&
    createPortal(
      <div
        className="entry-remove-confirm-backdrop"
        onClick={() => !busy && setOpen(false)}
        role="presentation"
      >
        <div
          id={dialogElId}
          className="entry-remove-confirm-bubble ui-card"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 id={titleId} className="entry-remove-confirm-bubble__title">
            Remove this entry?
          </h3>
          <p id={descId} className="entry-remove-confirm-bubble__text muted">
            Are you sure you want to remove this entry? This cannot be undone.
          </p>
          {err ? (
            <p className="entry-remove-confirm-bubble__err text-error" role="alert">
              {err}
            </p>
          ) : null}
          <div className="entry-remove-confirm-bubble__actions">
            <button
              type="button"
              className="btn-ghost"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-danger"
              disabled={busy}
              onClick={() => void confirmDelete()}
            >
              {busy ? "Removing…" : "Remove"}
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );

  return (
    <>
      <button
        type="button"
        className={`entry-remove-btn ${className}`.trim()}
        disabled={open}
        aria-label={label ? undefined : "Remove entry"}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogElId : undefined}
        onClick={() => {
          setErr(null);
          setOpen(true);
        }}
      >
        {label ? <span className="entry-remove-btn__label">{label}</span> : <TrashIcon />}
      </button>
      {modal}
    </>
  );
}
