import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ApiError,
  analyzeEntry,
  getEntry,
  patchEntry,
  type InsightsPayload,
  type PatchEntryBody,
} from "../api/client";
import type { Insights, JournalEntry, ProjectInsightItem } from "../api/types";

/** Paths accepted by server re-analyze (`insight_apply` + tests). */
const LOCK_OPTIONS: { path: string; label: string }[] = [
  { path: "summary", label: "Summary" },
  { path: "sentiment_score", label: "Sentiment score" },
  { path: "insights", label: "Entire insights object" },
  { path: "insights.key_points", label: "Key points" },
  { path: "insights.projects", label: "Projects" },
  { path: "insights.goals", label: "Goals" },
  { path: "insights.blockers", label: "Blockers" },
  { path: "insights.people", label: "People" },
  { path: "insights.priorities", label: "Priorities" },
  { path: "insights.themes", label: "Themes" },
];

function linesToList(s: string): string[] {
  return s
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

function listToLines(items: string[]): string {
  return items.join("\n");
}

function emptyInsights(): Insights {
  return {
    key_points: [],
    projects: [],
    goals: [],
    blockers: [],
    people: [],
    priorities: [],
    themes: [],
  };
}

function applyServerEntry(e: JournalEntry): {
  summary: string;
  sentiment: string;
  cleanedText: string;
  transcript: string;
  keyPoints: string;
  goals: string;
  blockers: string;
  people: string;
  priorities: string;
  themes: string;
  projects: ProjectInsightItem[];
  locks: string[];
} {
  const ins = e.insights ?? emptyInsights();
  return {
    summary: e.summary ?? "",
    sentiment: e.sentiment_score != null ? String(e.sentiment_score) : "",
    cleanedText: e.cleaned_text ?? "",
    transcript: e.transcript ?? "",
    keyPoints: listToLines(ins.key_points),
    goals: listToLines(ins.goals),
    blockers: listToLines(ins.blockers),
    people: listToLines(ins.people),
    priorities: listToLines(ins.priorities),
    themes: listToLines(ins.themes),
    projects: ins.projects?.length ? ins.projects.map((p) => ({ ...p })) : [{ name: "", notes: "" }],
    locks: [...(e.insights_field_locks ?? [])],
  };
}

export function EntryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<Pick<JournalEntry, "id" | "created_at" | "updated_at" | "source"> | null>(
    null,
  );

  const [summary, setSummary] = useState("");
  const [sentiment, setSentiment] = useState("");
  const [cleanedText, setCleanedText] = useState("");
  const [transcript, setTranscript] = useState("");
  const [keyPoints, setKeyPoints] = useState("");
  const [goals, setGoals] = useState("");
  const [blockers, setBlockers] = useState("");
  const [people, setPeople] = useState("");
  const [priorities, setPriorities] = useState("");
  const [themes, setThemes] = useState("");
  const [projects, setProjects] = useState<ProjectInsightItem[]>([{ name: "", notes: "" }]);
  const [locks, setLocks] = useState<string[]>([]);

  const [saveError, setSaveError] = useState<string | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [saveOk, setSaveOk] = useState(false);

  const hydrate = useCallback((e: JournalEntry) => {
    const f = applyServerEntry(e);
    setMeta({
      id: e.id,
      created_at: e.created_at,
      updated_at: e.updated_at,
      source: e.source,
    });
    setSummary(f.summary);
    setSentiment(f.sentiment);
    setCleanedText(f.cleanedText);
    setTranscript(f.transcript);
    setKeyPoints(f.keyPoints);
    setGoals(f.goals);
    setBlockers(f.blockers);
    setPeople(f.people);
    setPriorities(f.priorities);
    setThemes(f.themes);
    setProjects(f.projects);
    setLocks(f.locks);
  }, []);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const e = await getEntry(id);
        if (!cancelled) hydrate(e);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : "Failed to load entry");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, hydrate]);

  function buildInsights(): InsightsPayload {
    const proj = projects
      .map((p) => ({ name: p.name.trim(), notes: (p.notes || "").trim() }))
      .filter((p) => p.name.length >= 2);
    return {
      key_points: linesToList(keyPoints),
      projects: proj,
      goals: linesToList(goals),
      blockers: linesToList(blockers),
      people: linesToList(people),
      priorities: linesToList(priorities),
      themes: linesToList(themes),
    };
  }

  function parseSentiment(): number | null {
    const t = sentiment.trim();
    if (t === "") return null;
    const n = Number(t);
    if (Number.isNaN(n) || n < -1 || n > 1) {
      throw new Error("Sentiment must be a number between -1 and 1, or empty.");
    }
    return n;
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSaveError(null);
    setSaveOk(false);
    setSaving(true);
    try {
      const insights = buildInsights();
      const body: PatchEntryBody = {
        summary: summary.trim() || null,
        cleaned_text: cleanedText.trim() || null,
        transcript: transcript.trim() || null,
        insights,
        insights_field_locks: locks,
      };
      if (sentiment.trim() !== "") {
        body.sentiment_score = parseSentiment();
      }
      await patchEntry(id, body);
      const fresh = await getEntry(id);
      hydrate(fresh);
      setSaveOk(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onReanalyze() {
    if (!id) return;
    setAnalyzeError(null);
    setSaveOk(false);
    setAnalyzing(true);
    try {
      const fresh = await analyzeEntry(id, true);
      hydrate(fresh);
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Re-analyze failed");
    } finally {
      setAnalyzing(false);
    }
  }

  function toggleLock(path: string) {
    setLocks((prev) => (prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]));
  }

  function updateProject(i: number, field: keyof ProjectInsightItem, value: string) {
    setProjects((rows) => {
      const next = rows.map((r, j) => (j === i ? { ...r, [field]: value } : r));
      return next;
    });
  }

  function addProjectRow() {
    setProjects((rows) => [...rows, { name: "", notes: "" }]);
  }

  function removeProjectRow(i: number) {
    setProjects((rows) => rows.filter((_, j) => j !== i));
  }

  if (!id) {
    return <p className="muted">Missing entry id.</p>;
  }

  if (loading) {
    return <p className="muted">Loading entry…</p>;
  }

  if (error) {
    return (
      <div className="page-shell stack-lg">
        <p role="alert" className="text-error">
          {error}
        </p>
        <p style={{ margin: 0 }}>
          <Link to="/history" className="link-back">
            ← Back to history
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="page-shell stack-lg">
      <p style={{ margin: 0 }}>
        <Link to="/history" className="link-back">
          ← History
        </Link>
      </p>

      {meta ? (
        <div className="ui-card meta-panel">
          <div>
            <strong>Source:</strong> {meta.source}
          </div>
          <div>
            <strong>Created:</strong> {new Date(meta.created_at).toLocaleString()}
          </div>
          <div>
            <strong>Updated:</strong> {new Date(meta.updated_at).toLocaleString()}
          </div>
        </div>
      ) : null}

      <form onSubmit={onSave} style={{ display: "grid", gap: "1.25rem" }}>
        <section>
          <h3>Summary & sentiment</h3>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span>Summary</span>
            <textarea
              className="field-textarea"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
            />
          </label>
          <label style={{ display: "grid", gap: "0.35rem", marginTop: "0.75rem" }}>
            <span>Sentiment score (-1 … 1)</span>
            <input
              type="text"
              inputMode="decimal"
              className="field-narrow"
              value={sentiment}
              onChange={(e) => setSentiment(e.target.value)}
              placeholder="e.g. 0.2"
            />
          </label>
        </section>

        <section>
          <h3>Text</h3>
          <label style={{ display: "grid", gap: "0.35rem" }}>
            <span>Cleaned text</span>
            <textarea
              className="field-textarea"
              value={cleanedText}
              onChange={(e) => setCleanedText(e.target.value)}
            />
          </label>
          <label style={{ display: "grid", gap: "0.35rem", marginTop: "0.75rem" }}>
            <span>Transcript</span>
            <textarea
              className="field-textarea"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
            />
          </label>
        </section>

        <section>
          <h3>Insights</h3>
          <p className="muted" style={{ fontSize: "0.85rem", marginTop: 0 }}>
            List fields: one item per line (matches <code>insights.schema.json</code> string arrays).
          </p>

          {(
            [
              ["Key points", keyPoints, setKeyPoints],
              ["Goals", goals, setGoals],
              ["Blockers", blockers, setBlockers],
              ["People", people, setPeople],
              ["Priorities", priorities, setPriorities],
              ["Themes", themes, setThemes],
            ] as const
          ).map(([label, val, setVal]) => (
            <label key={label} style={{ display: "grid", gap: "0.35rem", marginBottom: "0.75rem" }}>
              <span>{label}</span>
              <textarea className="field-textarea" value={val} onChange={(e) => setVal(e.target.value)} />
            </label>
          ))}

          <div style={{ marginTop: "0.5rem" }}>
            <div style={{ fontWeight: 650, marginBottom: "0.5rem" }}>Projects (name + notes)</div>
            <p className="muted" style={{ fontSize: "0.85rem", marginTop: 0 }}>
              Names must be at least 2 characters to persist (server rule).
            </p>
            {projects.map((p, i) => (
              <div
                key={i}
                className="ui-card"
                style={{
                  display: "grid",
                  gap: "0.35rem",
                  marginBottom: "0.65rem",
                  padding: "0.75rem 0.9rem",
                }}
              >
                <input
                  placeholder="Name"
                  value={p.name}
                  onChange={(e) => updateProject(i, "name", e.target.value)}
                />
                <input
                  placeholder="Notes"
                  value={p.notes}
                  onChange={(e) => updateProject(i, "notes", e.target.value)}
                />
                <button type="button" onClick={() => removeProjectRow(i)} style={{ justifySelf: "start" }}>
                  Remove row
                </button>
              </div>
            ))}
            <button type="button" onClick={addProjectRow}>
              Add project row
            </button>
          </div>
        </section>

        <section>
          <h3>AI re-analyze locks</h3>
          <p className="muted" style={{ fontSize: "0.85rem", marginTop: 0 }}>
            Checked paths are preserved when you run <strong>Re-analyze</strong> with{" "}
            <code>preserve_locked_fields: true</code> (see <code>docs/DATA_CONTRACTS.md</code> §Insights).
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "0.35rem 1rem",
            }}
          >
            {LOCK_OPTIONS.map((o) => (
              <label key={o.path} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <input
                  type="checkbox"
                  checked={locks.includes(o.path)}
                  onChange={() => toggleLock(o.path)}
                />
                <span style={{ fontSize: "0.9rem" }}>{o.label}</span>
              </label>
            ))}
          </div>
        </section>

        {saveError ? (
          <p role="alert" className="text-error" style={{ margin: 0 }}>
            {saveError}
          </p>
        ) : null}
        {saveOk ? (
          <p className="text-success" style={{ margin: 0 }} role="status">
            Saved.
          </p>
        ) : null}

        <div className="form-actions">
          <button type="submit" className="btn-gold" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => void onReanalyze()}
            disabled={analyzing}
          >
            {analyzing ? "Re-analyzing…" : "Re-analyze"}
          </button>
        </div>
        {analyzeError ? (
          <p role="alert" className="text-error" style={{ margin: 0 }}>
            {analyzeError}
          </p>
        ) : null}
      </form>
    </div>
  );
}
