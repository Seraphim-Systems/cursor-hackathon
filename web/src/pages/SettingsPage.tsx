import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getSettings, patchSettings } from "../api/client";
import { TimezoneCombobox } from "../components/TimezoneCombobox";
import type { AudioQuality, Theme, UserSettings, WeekStartsOn } from "../types/userSettings";
import { getSortedTimeZoneIds } from "../utils/timezoneOptions";

const empty: UserSettings = {
  timezone: "UTC",
  week_starts_on: "monday",
  default_audio_quality: "medium",
  theme: "system",
  notifications_enabled: true,
};

/** Renders under `ProtectedRoute` — token is present. */
export function SettingsPage() {
  const { refreshSession } = useAuth();
  const [values, setValues] = useState<UserSettings>(empty);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [pending, setPending] = useState(false);

  const timezoneIds = useMemo(() => getSortedTimeZoneIds(), []);
  const timezoneOptions = useMemo(() => {
    const tz = (values.timezone ?? "").trim() || "UTC";
    if (timezoneIds.includes(tz)) return timezoneIds;
    return [tz, ...timezoneIds];
  }, [timezoneIds, values.timezone]);

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
        duck_name: values.duck_name,
      });
      setValues(next);
      setSaveOk(true);
      void refreshSession();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setPending(false);
    }
  }

  if (!loaded) {
    return (
      <div className="page-shell">
        <p className="muted">Loading settings…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="page-shell">
        <p role="alert" className="text-error">
          {loadError}
        </p>
        <p style={{ marginTop: "0.75rem" }}>
          <Link to="/login" className="btn-gold">
            Log in again
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="page-shell page-shell--narrow">
      <section className="ui-card">
        <h2 className="page-title">Settings</h2>
        <form onSubmit={onSubmit} className="stack-lg" style={{ marginTop: "0.5rem" }}>
          <label className="form-field">
            <span className="muted">Duck Name</span>
            <input
              type="text"
              value={values.duck_name || ""}
              onChange={(ev) => setValues((v) => ({ ...v, duck_name: ev.target.value }))}
              placeholder="e.g. Ducky"
            />
          </label>
          <label className="form-field">
            <span className="muted">Timezone</span>
            <TimezoneCombobox
              value={(values.timezone ?? "").trim() || "UTC"}
              onChange={(tz) => setValues((v) => ({ ...v, timezone: tz }))}
              options={timezoneOptions}
            />
          </label>
          <label className="form-field">
            <span className="muted">Week starts on</span>
            <select
              value={values.week_starts_on}
              onChange={(ev) =>
                setValues((v) => ({ ...v, week_starts_on: ev.target.value as WeekStartsOn }))
              }
            >
              <option value="monday">Monday</option>
              <option value="sunday">Sunday</option>
            </select>
          </label>
          <label className="form-field">
            <span className="muted">Default audio quality</span>
            <select
              value={values.default_audio_quality}
              onChange={(ev) =>
                setValues((v) => ({ ...v, default_audio_quality: ev.target.value as AudioQuality }))
              }
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <label className="form-field">
            <span className="muted">Theme</span>
            <select
              value={values.theme}
              onChange={(ev) => setValues((v) => ({ ...v, theme: ev.target.value as Theme }))}
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
            <p role="alert" className="text-error" style={{ fontSize: "0.9rem", margin: 0 }}>
              {saveError}
            </p>
          ) : null}
          {saveOk ? (
            <p className="text-success" style={{ fontSize: "0.9rem", margin: 0 }} role="status">
              Saved.
            </p>
          ) : null}
          <button type="submit" className="btn-gold" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </button>
        </form>
      </section>
    </div>
  );
}
