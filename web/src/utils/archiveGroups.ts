import type { JournalEntry } from "../api/types";

export type ArchiveDayGroup = {
  dateYmd: string;
  /** e.g. "Tuesday, Mar 24" */
  dayLabel: string;
  entries: JournalEntry[];
};

export type ArchiveMonthSection = {
  key: string;
  /** e.g. "March 2026" */
  heading: string;
  days: ArchiveDayGroup[];
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function instantOnLocalCalendarDate(y: number, mo: number, d: number, timeZone: string): Date {
  const target = `${String(y).padStart(4, "0")}-${pad2(mo)}-${pad2(d)}`;
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  const base = Date.UTC(y, mo - 1, d, 12, 0, 0);
  for (let delta = -48; delta <= 48; delta++) {
    const t = base + delta * 3_600_000;
    if (fmt.format(new Date(t)) === target) return new Date(t);
  }
  for (let day = -10; day <= 10; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const t = Date.UTC(y, mo - 1, d + day, hour, 0, 0);
      if (fmt.format(new Date(t)) === target) return new Date(t);
    }
  }
  return new Date(base);
}

function formatDayLabel(ymd: string, timeZone: string): string {
  const [y, mo, d] = ymd.split("-").map(Number);
  const instant = instantOnLocalCalendarDate(y, mo, d, timeZone);
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(instant);
}

function formatMonthHeading(year: number, month: number, timeZone: string): string {
  const instant = instantOnLocalCalendarDate(year, month, 15, timeZone);
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    month: "long",
    year: "numeric",
  }).format(instant);
}

const ymdFmtCache = new Map<string, Intl.DateTimeFormat>();

function ymdFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = ymdFmtCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    ymdFmtCache.set(timeZone, f);
  }
  return f;
}

/** Calendar date (YYYY-MM-DD) of `created_at` in `timeZone` — same basis as archive grouping. */
export function entryCreatedYmd(iso: string, timeZone: string): string {
  return ymdFormatter(timeZone).format(new Date(iso));
}

export function todayYmdInTimeZone(timeZone: string): string {
  return ymdFormatter(timeZone).format(new Date());
}

/**
 * Shift a calendar day by `deltaDays` in `timeZone`.
 * Uses the same local-noon anchor as grouping (adequate for presets and range UI).
 */
export function shiftYmdInTimeZone(ymd: string, deltaDays: number, timeZone: string): string {
  const [y, mo, d] = ymd.split("-").map(Number);
  const inst = instantOnLocalCalendarDate(y, mo, d, timeZone);
  const shifted = new Date(inst.getTime() + deltaDays * 86_400_000);
  return ymdFormatter(timeZone).format(shifted);
}

/** First day of the current month in `timeZone` (YYYY-MM-DD). */
export function firstOfCurrentMonthYmd(timeZone: string): string {
  const t = todayYmdInTimeZone(timeZone);
  const [y, m] = t.split("-");
  return `${y}-${m}-01`;
}

/** Inclusive calendar-day count from `fromYmd` through `toYmd` in `timeZone` (both ends count). */
export function inclusiveDayCountBetweenYmd(fromYmd: string, toYmd: string, timeZone: string): number {
  let a = fromYmd;
  let b = toYmd;
  if (a > b) [a, b] = [b, a];
  let n = 0;
  let cur = a;
  for (let guard = 0; guard < 4000; guard++) {
    if (cur > b) break;
    n++;
    cur = shiftYmdInTimeZone(cur, 1, timeZone);
  }
  return n;
}

/** Group entries by calendar day in `timeZone`, then by month for display (newest first). */
export function buildArchiveMonthSections(entries: JournalEntry[], timeZone: string): ArchiveMonthSection[] {
  const dayFmt = ymdFormatter(timeZone);
  const byDay = new Map<string, JournalEntry[]>();
  for (const e of entries) {
    const k = dayFmt.format(new Date(e.created_at));
    const list = byDay.get(k);
    if (list) list.push(e);
    else byDay.set(k, [e]);
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  const dayKeys = [...byDay.keys()].sort((a, b) => b.localeCompare(a));

  type MonthAcc = { key: string; year: number; month: number; days: ArchiveDayGroup[] };
  const monthOrder: string[] = [];
  const months = new Map<string, MonthAcc>();

  for (const ymd of dayKeys) {
    const list = byDay.get(ymd)!;
    const [y, m] = ymd.split("-").map(Number);
    const mk = `${y}-${pad2(m)}`;
    if (!months.has(mk)) {
      months.set(mk, {
        key: mk,
        year: y,
        month: m,
        days: [],
      });
      monthOrder.push(mk);
    }
    months.get(mk)!.days.push({
      dateYmd: ymd,
      dayLabel: formatDayLabel(ymd, timeZone),
      entries: list,
    });
  }

  return monthOrder.map((mk) => {
    const m = months.get(mk)!;
    return {
      key: mk,
      heading: formatMonthHeading(m.year, m.month, timeZone),
      days: m.days,
    };
  });
}
