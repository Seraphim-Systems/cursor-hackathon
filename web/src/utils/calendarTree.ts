import type { JournalEntry } from "../api/types";
import type { WeekStartsOn } from "../types/userSettings";

export type CalendarTreeDay = {
  date: string;
  entry_ids: string[];
  count: number;
};

export type CalendarTreeWeek = {
  weekStart: string;
  label: string;
  days: CalendarTreeDay[];
  totalCount: number;
};

export type CalendarTreeMonth = {
  year: number;
  month: number;
  label: string;
  weeks: CalendarTreeWeek[];
  totalCount: number;
};

export type CalendarTreeYear = {
  year: number;
  months: CalendarTreeMonth[];
  totalCount: number;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Map each entry to YYYY-MM-DD in the user's IANA timezone (matches server calendar bucketing). */
export function bucketEntryDates(entries: Iterable<JournalEntry>, timeZone: string): Map<string, string[]> {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const map = new Map<string, string[]>();
  for (const e of entries) {
    const day = fmt.format(new Date(e.created_at));
    const list = map.get(day);
    if (list) list.push(e.id);
    else map.set(day, [e.id]);
  }
  return map;
}

function addCalendarDaysYmd(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d + delta);
  const u = new Date(t);
  return `${u.getUTCFullYear()}-${pad2(u.getUTCMonth() + 1)}-${pad2(u.getUTCDate())}`;
}

/** Gregorian weekday for civil date Y-M-D: 0 Sun … 6 Sat (via UTC calendar fields). */
function civilWeekdaySun0(y: number, m: number, d: number): number {
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function weekStartYmdForDay(ymd: string, weekStartsOn: WeekStartsOn): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const wd = civilWeekdaySun0(y, m, d);
  const daysBack =
    weekStartsOn === "monday" ? (wd === 0 ? 6 : wd - 1) : wd;
  return addCalendarDaysYmd(ymd, -daysBack);
}

/** Find a Date whose calendar date in `timeZone` equals y-mo-d (for labels). */
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

export function formatDayHeading(ymd: string, timeZone: string): string {
  const [y, mo, d] = ymd.split("-").map(Number);
  const instant = instantOnLocalCalendarDate(y, mo, d, timeZone);
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(instant);
}

export function formatWeekRangeLabel(weekStartYmd: string, timeZone: string): string {
  const endYmd = addCalendarDaysYmd(weekStartYmd, 6);
  const [y1, m1, d1] = weekStartYmd.split("-").map(Number);
  const [y2, m2, d2] = endYmd.split("-").map(Number);
  const a = instantOnLocalCalendarDate(y1, m1, d1, timeZone);
  const b = instantOnLocalCalendarDate(y2, m2, d2, timeZone);
  const short = new Intl.DateTimeFormat(undefined, { timeZone, month: "short", day: "numeric" });
  const yFmt = new Intl.DateTimeFormat(undefined, { timeZone, year: "numeric" });
  const sameYear = yFmt.format(a) === yFmt.format(b);
  if (sameYear) {
    return `${short.format(a)} – ${short.format(b)}, ${yFmt.format(a)}`;
  }
  return `${short.format(a)}, ${yFmt.format(a)} – ${short.format(b)}, ${yFmt.format(b)}`;
}

export function buildCalendarTree(
  entries: JournalEntry[],
  timeZone: string,
  weekStartsOn: WeekStartsOn,
): CalendarTreeYear[] {
  const bucket = bucketEntryDates(entries, timeZone);
  const days: CalendarTreeDay[] = [...bucket.entries()]
    .map(([date, entry_ids]) => ({ date, entry_ids, count: entry_ids.length }))
    .filter((d) => d.count > 0)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  type Wk = { weekStart: string; days: CalendarTreeDay[] };
  type Mo = { year: number; month: number; weeks: Map<string, Wk> };
  type Yr = { year: number; months: Map<string, Mo> };

  const years = new Map<number, Yr>();

  for (const day of days) {
    const [y, m] = day.date.split("-").map(Number);
    const weekStart = weekStartYmdForDay(day.date, weekStartsOn);

    let yr = years.get(y);
    if (!yr) {
      yr = { year: y, months: new Map() };
      years.set(y, yr);
    }
    const mk = `${y}-${pad2(m)}`;
    let mo = yr.months.get(mk);
    if (!mo) {
      mo = { year: y, month: m, weeks: new Map() };
      yr.months.set(mk, mo);
    }
    let wk = mo.weeks.get(weekStart);
    if (!wk) {
      wk = { weekStart, days: [] };
      mo.weeks.set(weekStart, wk);
    }
    wk.days.push(day);
  }

  const monthLabelFmt = new Intl.DateTimeFormat(undefined, { month: "long" });

  const result: CalendarTreeYear[] = [...years.values()]
    .sort((a, b) => b.year - a.year)
    .map((yr) => {
      const months: CalendarTreeMonth[] = [...yr.months.values()]
        .sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : 0))
        .map((mo) => {
          const weeks: CalendarTreeWeek[] = [...mo.weeks.values()]
            .sort((a, b) => (a.weekStart < b.weekStart ? 1 : a.weekStart > b.weekStart ? -1 : 0))
            .map((w) => {
              w.days.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
              const totalCount = w.days.reduce((s, d) => s + d.count, 0);
              return {
                weekStart: w.weekStart,
                label: formatWeekRangeLabel(w.weekStart, timeZone),
                days: w.days,
                totalCount,
              };
            });
          const totalCount = weeks.reduce((s, w) => s + w.totalCount, 0);
          return {
            year: mo.year,
            month: mo.month,
            label: monthLabelFmt.format(new Date(Date.UTC(mo.year, mo.month - 1, 1))),
            weeks,
            totalCount,
          };
        });
      const totalCount = months.reduce((s, m) => s + m.totalCount, 0);
      return { year: yr.year, months, totalCount };
    });

  return result;
}
