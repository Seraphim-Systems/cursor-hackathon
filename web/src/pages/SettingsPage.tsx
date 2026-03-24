import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSettings, patchSettings } from "../api/client";
import type { AudioQuality, Theme, UserSettings, WeekStartsOn } from "../types/userSettings";

const empty: UserSettings = {
  timezone: "UTC",
  week_starts_on: "monday",
  default_audio_quality: "medium",
  theme: "system",
  notifications_enabled: true,
};

/** Renders under `ProtectedRoute` — token is present. */
export function SettingsPage() {
  const [values, setValues] = useState<UserSettings>(empty);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadError(null);
      try {
        const s = await getSettings();
        if (!cancelled) {
          setValues(s);
          setLoaded(true);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Failed to load settings");
          setLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    setSaveError(null);
    setSaveOk(false);
    setPending(true);
    try {
      const next = await patchSettings({
        timezone: values.timezone,
        week_starts_on: values.week_starts_on,
        default_audio_quality: values.default_audio_quality,
        theme: values.theme,
        notifications_enabled: values.notifications_enabled,
      });
      setValues(next);
      setSaveOk(true);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setPending(false);
    }
  }

  if (!loaded) {
    return <p>Loading settings…</p>;
  }

  if (loadError) {
    return (
      <div>
        <p role="alert" style={{ color: "#b00020" }}>
          {loadError}
        </p>
        <p>
          <Link to="/login">Log in again</Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>Settings</h2>
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.85rem", maxWidth: 420 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ fontSize: "0.85rem" }}>Timezone (IANA)</span>
          <input
            type="text"
            value={values.timezone}
            onChange={(ev) => setValues((v) => ({ ...v, timezone: ev.target.value }))}
            placeholder="e.g. Europe/Berlin"
            autoComplete="off"
            style={{ padding: "0.5rem 0.6rem", fontSize: "1rem" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ fontSize: "0.85rem" }}>Week starts on</span>
          <select
            value={values.week_starts_on}
            onChange={(ev) =>
              setValues((v) => ({ ...v, week_starts_on: ev.target.value as WeekStartsOn }))
            }
            style={{ padding: "0.5rem 0.6rem", fontSize: "1rem" }}
          >
            <option value="monday">Monday</option>
            <option value="sunday">Sunday</option>
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ fontSize: "0.85rem" }}>Default audio quality</span>
          <select
            value={values.default_audio_quality}
            onChange={(ev) =>
              setValues((v) => ({ ...v, default_audio_quality: ev.target.value as AudioQuality }))
            }
            style={{ padding: "0.5rem 0.6rem", fontSize: "1rem" }}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span style={{ fontSize: "0.85rem" }}>Theme</span>
          <select
            value={values.theme}
            onChange={(ev) => setValues((v) => ({ ...v, theme: ev.target.value as Theme }))}
            style={{ padding: "0.5rem 0.6rem", fontSize: "1rem" }}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={values.notifications_enabled}
            onChange={(ev) =>
              setValues((v) => ({ ...v, notifications_enabled: ev.target.checked }))
            }
          />
          <span>Notifications enabled</span>
        </label>
        {saveError ? (
          <p role="alert" style={{ color: "#b00020", fontSize: "0.9rem", margin: 0 }}>
            {saveError}
          </p>
        ) : null}
        {saveOk ? (
          <p style={{ color: "#1b5e20", fontSize: "0.9rem", margin: 0 }}>Saved.</p>
        ) : null}
        <button type="submit" disabled={pending} style={{ padding: "0.55rem 1rem", cursor: pending ? "wait" : "pointer" }}>
          {pending ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
