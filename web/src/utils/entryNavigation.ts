/** Passed as React Router `state` when opening an entry so detail can link back. */
export type EntryDetailNavState = { from?: string };

const DEFAULT_BACK = "/history";

/** Same-origin path only — avoids open redirects via `state.from`. */
export function safeEntryBackPath(from: unknown): string {
  if (typeof from !== "string") return DEFAULT_BACK;
  const p = from.trim();
  if (!p.startsWith("/") || p.startsWith("//")) return DEFAULT_BACK;
  if (p.includes(":")) return DEFAULT_BACK;
  return p || DEFAULT_BACK;
}

export function entryBackLinkLabel(path: string): string {
  if (path === "/" || path === "") return "Dashboard";
  if (path === "/history" || path.startsWith("/history?")) return "History";
  if (path.startsWith("/record")) return "Record";
  if (path.startsWith("/settings")) return "Settings";
  if (path.startsWith("/admin")) return "Admin";
  return "Back";
}
