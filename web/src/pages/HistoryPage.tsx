import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, getMe, listEntries } from "../api/client";
import type { JournalEntry } from "../api/types";
import { ArchiveHeader } from "../components/archive/ArchiveHeader";
import { ArchiveMonthSection } from "../components/archive/ArchiveMonthSection";
import { ArchiveSearchFilterBar } from "../components/archive/ArchiveSearchFilterBar";
import {
  buildArchiveMonthSections,
  entryCreatedYmd,
  firstOfCurrentMonthYmd,
  inclusiveDayCountBetweenYmd,
  shiftYmdInTimeZone,
  todayYmdInTimeZone,
} from "../utils/archiveGroups";

async function fetchAllEntries(): Promise<JournalEntry[]> {
  const limit = 100;
  const out: JournalEntry[] = [];
  let offset = 0;
  while (true) {
    const r = await listEntries(limit, offset);
    out.push(...r.items);
    if (r.items.length < limit) break;
    offset += limit;
    if (r.total != null && out.length >= r.total) break;
  }
  return out;
}

function entryMatchesQuery(entry: JournalEntry, q: string): boolean {
  if (!q) return true;
  const parts: string[] = [entry.id, entry.summary, entry.cleaned_text, entry.transcript].filter(
    (x): x is string => Boolean(x && String(x).trim()),
  );
  const ins = entry.insights;
  if (ins) {
    for (const kp of ins.key_points ?? []) if (kp?.trim()) parts.push(kp);
    for (const g of ins.goals ?? []) if (g?.trim()) parts.push(g);
    for (const b of ins.blockers ?? []) if (b?.trim()) parts.push(b);
    for (const p of ins.people ?? []) if (p?.trim()) parts.push(p);
    for (const pr of ins.priorities ?? []) if (pr?.trim()) parts.push(pr);
    for (const t of ins.themes ?? []) if (t?.trim()) parts.push(t);
    for (const proj of ins.projects ?? []) {
      if (proj.name?.trim()) parts.push(proj.name);
      if (proj.notes?.trim()) parts.push(proj.notes);
    }
  }
  const hay = parts.join("\n").toLowerCase();
  const tokens = q.split(/\s+/).filter((t) => t.length > 0);
  if (tokens.length === 0) return true;
  return tokens.every((t) => hay.includes(t));
}

/** Summary, transcript, or cleaned text (matches list preview “has text”). */
function entryHasDisplayText(entry: JournalEntry): boolean {
  return Boolean(
    entry.summary?.trim() || entry.cleaned_text?.trim() || entry.transcript?.trim(),
  );
}

/** Matches dashboard / card preview: no summary, cleaned text, or transcript. */
function entryHasNoDisplayText(entry: JournalEntry): boolean {
  return (
    !entry.summary?.trim() && !entry.cleaned_text?.trim() && !entry.transcript?.trim()
  );
}

export function HistoryPage() {
  const [allEntries, setAllEntries] = useState<JournalEntry[]>([]);
  const [timeZone, setTimeZone] = useState("UTC");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDayKeys, setOpenDayKeys] = useState<Set<string>>(() => new Set());

  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [requireHasText, setRequireHasText] = useState(false);
  const [requireSummary, setRequireSummary] = useState(false);
  const [requireWithoutText, setRequireWithoutText] = useState(false);

  const searchNorm = searchQuery.trim().toLowerCase();

  const { rangeFrom, rangeTo } = useMemo(() => {
    const a = dateFrom.trim() || null;
    const b = dateTo.trim() || null;
    if (a && b && a > b) {
      return { rangeFrom: b, rangeTo: a };
    }
    return { rangeFrom: a, rangeTo: b };
  }, [dateFrom, dateTo]);

  const filteredEntries = useMemo(() => {
    let list = allEntries;
    if (searchNorm) {
      list = list.filter((e) => entryMatchesQuery(e, searchNorm));
    }
    if (rangeFrom) {
      list = list.filter((e) => entryCreatedYmd(e.created_at, timeZone) >= rangeFrom);
    }
    if (rangeTo) {
      list = list.filter((e) => entryCreatedYmd(e.created_at, timeZone) <= rangeTo);
    }
    if (requireHasText) {
      list = list.filter(entryHasDisplayText);
    }
    if (requireSummary) {
      list = list.filter((e) => Boolean(e.summary?.trim()));
    }
    if (requireWithoutText) {
      list = list.filter(entryHasNoDisplayText);
    }
    return list;
  }, [
    allEntries,
    searchNorm,
    rangeFrom,
    rangeTo,
    timeZone,
    requireHasText,
    requireSummary,
    requireWithoutText,
  ]);

  const sections = useMemo(
    () => buildArchiveMonthSections(filteredEntries, timeZone),
    [filteredEntries, timeZone],
  );

  const modalFiltersActive =
    Boolean(rangeFrom || rangeTo) || requireHasText || requireSummary || requireWithoutText;

  const filtersActive = searchNorm.length > 0 || modalFiltersActive;

  const contentModalFiltersActive = requireHasText || requireSummary || requireWithoutText;

  /** One-sided date → treat like an open range; keep days packed. */
  const partialDateRange = Boolean((rangeFrom && !rangeTo) || (!rangeFrom && rangeTo));

  const dateRangeInclusiveDays = useMemo(() => {
    if (!rangeFrom || !rangeTo) return null;
    return inclusiveDayCountBetweenYmd(rangeFrom, rangeTo, timeZone);
  }, [rangeFrom, rangeTo, timeZone]);

  /**
   * Open day panels when: keyword search (optional short date window), or date-only with inclusive range ≤ 7 days.
   * Content filters (audio, transcript, …), partial dates, or a range longer than 7 days → stay packed.
   */
  const shouldAutoExpandFilteredDays = useMemo(() => {
    if (filteredEntries.length === 0) return false;
    if (contentModalFiltersActive) return false;
    if (partialDateRange) return false;
    if (dateRangeInclusiveDays != null && dateRangeInclusiveDays > 7) return false;

    if (searchNorm.length > 0) return true;

    if (rangeFrom && rangeTo && dateRangeInclusiveDays != null && dateRangeInclusiveDays <= 7) {
      return true;
    }

    return false;
  }, [
    filteredEntries.length,
    searchNorm,
    contentModalFiltersActive,
    partialDateRange,
    dateRangeInclusiveDays,
    rangeFrom,
    rangeTo,
  ]);

  const [filterModalOpen, setFilterModalOpen] = useState(false);

  useEffect(() => {
    if (!filterModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFilterModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filterModalOpen]);

  const toggleDay = useCallback((key: string) => {
    setOpenDayKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const removeEntry = useCallback((id: string) => {
    setAllEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const me = await getMe();
        const tz = me.settings.timezone?.trim() || "UTC";
        const entries = await fetchAllEntries();
        if (cancelled) return;
        setTimeZone(tz);
        setAllEntries(entries);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : "Failed to load entries");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
    setRequireHasText(false);
    setRequireSummary(false);
    setRequireWithoutText(false);
    setOpenDayKeys(new Set());
  }, []);

  const prevSearchNormRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevSearchNormRef.current;
    prevSearchNormRef.current = searchNorm;
    if (prev === null) return;
    if (prev.length > 0 && searchNorm.length === 0) {
      clearFilters();
      setFilterModalOpen(false);
    }
  }, [searchNorm, clearFilters]);

  const applyPresetLastDays = useCallback(
    (days: number) => {
      const to = todayYmdInTimeZone(timeZone);
      const from = shiftYmdInTimeZone(to, -(days - 1), timeZone);
      setDateFrom(from);
      setDateTo(to);
    },
    [timeZone],
  );

  const applyPresetThisMonth = useCallback(() => {
    const to = todayYmdInTimeZone(timeZone);
    const from = firstOfCurrentMonthYmd(timeZone);
    setDateFrom(from);
    setDateTo(to);
  }, [timeZone]);

  const clearDateRange = useCallback(() => {
    setDateFrom("");
    setDateTo("");
  }, []);

  const totalShown = filteredEntries.length;

  /**
   * Expand matching days for keyword search and for date ranges of at most 7 days; otherwise keep days collapsed.
   */
  useEffect(() => {
    if (!filtersActive || filteredEntries.length === 0) return;

    if (!shouldAutoExpandFilteredDays) {
      setOpenDayKeys(new Set());
      return;
    }

    const keys: string[] = [];
    for (const section of sections) {
      for (const day of section.days) {
        keys.push(`${section.key}|${day.dateYmd}`);
      }
    }
    setOpenDayKeys((prev) => {
      const next = new Set(prev);
      for (const k of keys) next.add(k);
      return next;
    });
  }, [filtersActive, filteredEntries.length, sections, shouldAutoExpandFilteredDays]);

  if (loading) {
    return (
      <div className="page-shell">
        <h2 className="page-title">History</h2>
        <p className="muted">Loading entries…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-shell">
        <h2 className="page-title">History</h2>
        <p role="alert" className="text-error">
          {error}
        </p>
      </div>
    );
  }

  if (allEntries.length === 0) {
    return (
      <div className="page-shell">
        <h2 className="page-title">History</h2>
        <div className="empty-state">
          <p style={{ margin: 0 }}>No journal entries yet.</p>
          <div className="empty-state__cta">
            <Link to="/record" className="btn-gold">
              Capture a thought
            </Link>
          </div>
          <p className="muted" style={{ marginTop: "0.75rem", marginBottom: 0, textAlign: "center" }}>
            Or add one via the API.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell page-shell--archive">
      <ArchiveHeader timeZone={timeZone} />

      <ArchiveSearchFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filtersActive={filtersActive}
        filterModalOpen={filterModalOpen}
        onOpenFilter={() => setFilterModalOpen(true)}
        onRestart={() => {
          clearFilters();
          setFilterModalOpen(false);
        }}
      />

      {filterModalOpen ? (
        <div className="history-filter-backdrop" onClick={() => setFilterModalOpen(false)} role="presentation">
          <div
            id="history-filter-dialog"
            className="history-filter-modal ui-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-filter-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="history-filter-modal__head">
              <h3 id="history-filter-dialog-title" className="history-filter-modal__title">
                Filter recordings
              </h3>
              <button
                type="button"
                className="btn-ghost history-filter-modal__close"
                aria-label="Close"
                onClick={() => setFilterModalOpen(false)}
              >
                ×
              </button>
            </div>
            <p className="history-filter-modal__hint muted">
              Dates use your account timezone ({timeZone}). Use keywords in the search field above.
            </p>
            <div className="history-filters history-filters--modal">
              <div className="history-filters__section-label">Date range</div>
              <div className="history-filters__row history-filters__row--split">
                <div className="history-filters__field">
                  <label className="history-filters__label" htmlFor="history-date-from">
                    From
                  </label>
                  <input
                    id="history-date-from"
                    type="date"
                    className="history-filters__input"
                    value={dateFrom}
                    onChange={(ev) => setDateFrom(ev.target.value)}
                  />
                </div>
                <div className="history-filters__field">
                  <label className="history-filters__label" htmlFor="history-date-to">
                    To
                  </label>
                  <input
                    id="history-date-to"
                    type="date"
                    className="history-filters__input"
                    value={dateTo}
                    onChange={(ev) => setDateTo(ev.target.value)}
                  />
                </div>
              </div>
              <div className="history-filters__preset-row" role="group" aria-label="Quick date ranges">
                <button type="button" className="history-filters__preset" onClick={() => applyPresetLastDays(7)}>
                  Last 7 days
                </button>
                <button type="button" className="history-filters__preset" onClick={() => applyPresetLastDays(30)}>
                  Last 30 days
                </button>
                <button type="button" className="history-filters__preset" onClick={applyPresetThisMonth}>
                  This month
                </button>
                <button type="button" className="history-filters__preset history-filters__preset--ghost" onClick={clearDateRange}>
                  Clear dates
                </button>
              </div>

              <div className="history-filters__section-label history-filters__section-label--spaced">Content</div>
              <div className="history-filters__checks">
                <label
                  className="history-filters__check"
                  title="Has summary, transcript, or cleaned text"
                >
                  <input
                    type="checkbox"
                    checked={requireHasText}
                    onChange={(ev) => setRequireHasText(ev.target.checked)}
                  />
                  <span>Has text</span>
                </label>
                <label className="history-filters__check">
                  <input
                    type="checkbox"
                    checked={requireSummary}
                    onChange={(ev) => setRequireSummary(ev.target.checked)}
                  />
                  <span>Has summary</span>
                </label>
                <label
                  className="history-filters__check"
                  title="No summary, transcript, or cleaned text"
                >
                  <input
                    type="checkbox"
                    checked={requireWithoutText}
                    onChange={(ev) => setRequireWithoutText(ev.target.checked)}
                  />
                  <span>Without text</span>
                </label>
              </div>

              {filtersActive ? (
                <div className="history-filters__actions">
                  <button type="button" className="btn-ghost history-filters__clear" onClick={clearFilters}>
                    Clear all
                  </button>
                </div>
              ) : null}
            </div>
            <div className="history-filter-modal__footer">
              <button type="button" className="btn-gold" onClick={() => setFilterModalOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {searchNorm.length > 0 && totalShown === 0 ? (
        <p className="muted archive-empty" role="status">
          No recordings match your search.
        </p>
      ) : null}

      {searchNorm.length === 0 && totalShown === 0 && filtersActive ? (
        <p className="muted archive-empty" role="status">
          No recordings match these filters.
        </p>
      ) : null}

      {sections.length > 0 ? (
        <>
          <p className="archive-summary muted" role="status">
            {filtersActive ? (
              <>
                Showing <strong className="archive-summary__n">{totalShown}</strong> of {allEntries.length} recordings
              </>
            ) : (
              <>
                <strong className="archive-summary__n">{totalShown}</strong>{" "}
                {totalShown === 1 ? "recording" : "recordings"}
              </>
            )}
          </p>
          <div className="archive-feed">
            {sections.map((section) => (
              <ArchiveMonthSection
                key={section.key}
                section={section}
                openDayKeys={openDayKeys}
                toggleDay={toggleDay}
                onRemoveEntry={removeEntry}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
