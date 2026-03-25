import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { buildTimezoneHaystack } from "../utils/timezoneOptions";

type Props = {
  value: string;
  onChange: (ianaId: string) => void;
  options: readonly string[];
};

function currentId(value: string): string {
  return value.trim() || "UTC";
}

function optionElementId(listboxId: string, iana: string): string {
  const safe = iana.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${listboxId}-opt-${safe}`;
}

function computeFiltered(
  queryRaw: string,
  options: readonly string[],
  haystackById: Map<string, string>,
): string[] {
  const q = queryRaw.trim().toLowerCase().replace(/\s+/g, " ");
  if (!q) return [...options];
  return options.filter((id) => (haystackById.get(id) ?? "").includes(q));
}

export function TimezoneCombobox({ value, onChange, options }: Props) {
  const selectedTimezone = currentId(value);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  /** Which surface owns `aria-activedescendant` (must match the focused element). */
  const [focusSurface, setFocusSurface] = useState<"list" | "search">("search");

  const listboxId = `${useId()}-tz-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const highlightedIndexRef = useRef(0);
  const filteredRef = useRef<string[]>([]);

  const haystackById = useMemo(() => {
    const m = new Map<string, string>();
    for (const id of options) m.set(id, buildTimezoneHaystack(id));
    return m;
  }, [options]);

  const filtered = useMemo(
    () => computeFiltered(query, options, haystackById),
    [options, query, haystackById],
  );

  highlightedIndexRef.current = highlightedIndex;
  filteredRef.current = filtered;

  useEffect(() => {
    if (filtered.length === 0) {
      if (highlightedIndex !== 0) {
        highlightedIndexRef.current = 0;
        setHighlightedIndex(0);
      }
      return;
    }
    if (highlightedIndex >= filtered.length) {
      const next = filtered.length - 1;
      highlightedIndexRef.current = next;
      setHighlightedIndex(next);
    }
  }, [filtered.length, highlightedIndex]);

  useEffect(() => {
    if (!isOpen) setFocusSurface("search");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setIsOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [isOpen]);

  const commitSelection = useCallback(
    (ianaId: string) => {
      onChange(ianaId);
      setIsOpen(false);
      setQuery("");
    },
    [onChange],
  );

  const handlePopoverKeys = useCallback(
    (e: KeyboardEvent<Element>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
        return;
      }
      const list = filteredRef.current;
      const len = list.length;

      if (e.key === "ArrowDown") {
        if (len === 0) return;
        e.preventDefault();
        const cur = highlightedIndexRef.current;
        const next = Math.min(cur + 1, len - 1);
        highlightedIndexRef.current = next;
        setHighlightedIndex(next);
        return;
      }
      if (e.key === "ArrowUp") {
        if (len === 0) return;
        e.preventDefault();
        const cur = highlightedIndexRef.current;
        const next = Math.max(cur - 1, 0);
        highlightedIndexRef.current = next;
        setHighlightedIndex(next);
        return;
      }
      if (e.key === "Home") {
        if (len === 0) return;
        e.preventDefault();
        highlightedIndexRef.current = 0;
        setHighlightedIndex(0);
        return;
      }
      if (e.key === "End") {
        if (len === 0) return;
        e.preventDefault();
        const last = len - 1;
        highlightedIndexRef.current = last;
        setHighlightedIndex(last);
        return;
      }
      if (e.key === "Enter") {
        if (len === 0) return;
        e.preventDefault();
        e.stopPropagation();
        const id = list[highlightedIndexRef.current];
        if (id) commitSelection(id);
      }
    },
    [commitSelection],
  );

  const openPanel = useCallback(() => {
    setQuery("");
    const ids = [...options];
    const idx = ids.indexOf(selectedTimezone);
    const start = idx >= 0 ? idx : 0;
    highlightedIndexRef.current = start;
    setHighlightedIndex(start);
    setIsOpen(true);
  }, [options, selectedTimezone]);

  useLayoutEffect(() => {
    if (isOpen) {
      setFocusSurface("search");
      searchRef.current?.focus();
    }
  }, [isOpen]);

  const onTriggerKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!isOpen) openPanel();
    }
  };

  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-index="${highlightedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex, isOpen, filtered]);

  const activeOptionId =
    isOpen &&
    filtered.length > 0 &&
    highlightedIndex >= 0 &&
    highlightedIndex < filtered.length
      ? optionElementId(listboxId, filtered[highlightedIndex]!)
      : undefined;

  const displayValue = selectedTimezone;

  return (
    <div className="timezone-combobox" ref={rootRef}>
      <button
        type="button"
        className="timezone-combobox__trigger"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        onClick={() => {
          if (isOpen) setIsOpen(false);
          else openPanel();
        }}
        onKeyDown={onTriggerKeyDown}
      >
        <span className="timezone-combobox__trigger-value">{displayValue}</span>
        <span className="timezone-combobox__trigger-chevron" aria-hidden>
          ▾
        </span>
      </button>
      {isOpen ? (
        <div className="timezone-combobox__popover">
          <input
            ref={searchRef}
            type="text"
            className="timezone-combobox__search"
            aria-label="Filter timezones"
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={focusSurface === "search" ? activeOptionId : undefined}
            value={query}
            onChange={(e) => {
              const nextQ = e.target.value;
              setQuery(nextQ);
              const nextFiltered = computeFiltered(nextQ, options, haystackById);
              let hi = nextFiltered.indexOf(selectedTimezone);
              if (hi < 0) hi = 0;
              if (nextFiltered.length === 0) hi = 0;
              highlightedIndexRef.current = hi;
              setHighlightedIndex(hi);
            }}
            onFocus={() => setFocusSurface("search")}
            onKeyDown={handlePopoverKeys}
            placeholder="Search city, country, or region…"
            autoComplete="off"
            spellCheck={false}
          />
          <ul
            ref={listRef}
            id={listboxId}
            className="timezone-combobox__list"
            role="listbox"
            aria-label="Timezones"
            aria-multiselectable={false}
            tabIndex={-1}
            aria-activedescendant={focusSurface === "list" ? activeOptionId : undefined}
            onFocus={() => setFocusSurface("list")}
            onKeyDown={handlePopoverKeys}
          >
            {filtered.length === 0 ? (
              <li className="timezone-combobox__empty muted">No matching timezones</li>
            ) : (
              filtered.map((id, index) => {
                const isHighlighted = index === highlightedIndex;
                const isSelected = id === selectedTimezone;
                return (
                  <li key={id} role="presentation">
                    <button
                      type="button"
                      role="option"
                      id={optionElementId(listboxId, id)}
                      tabIndex={-1}
                      data-index={index}
                      aria-selected={isSelected}
                      className={[
                        "timezone-combobox__option",
                        isHighlighted ? "timezone-combobox__option--highlighted" : "",
                        isSelected ? "timezone-combobox__option--selected" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onMouseEnter={() => {
                        highlightedIndexRef.current = index;
                        setHighlightedIndex(index);
                      }}
                      onMouseDown={(ev) => {
                        ev.preventDefault();
                        listRef.current?.focus();
                        setFocusSurface("list");
                      }}
                      onClick={() => commitSelection(id)}
                    >
                      {id}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
