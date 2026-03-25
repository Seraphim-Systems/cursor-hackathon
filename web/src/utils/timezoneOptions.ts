/** IANA timezone ids for environments without `Intl.supportedValuesOf("timeZone")`. */
const FALLBACK_TIMEZONE_IDS: readonly string[] = [
  "UTC",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "America/Anchorage",
  "America/Bogota",
  "America/Buenos_Aires",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Mexico_City",
  "America/New_York",
  "America/Sao_Paulo",
  "America/Toronto",
  "America/Vancouver",
  "Asia/Bangkok",
  "Asia/Dubai",
  "Asia/Hong_Kong",
  "Asia/Jakarta",
  "Asia/Jerusalem",
  "Asia/Kolkata",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Melbourne",
  "Australia/Perth",
  "Australia/Sydney",
  "Europe/Amsterdam",
  "Europe/Athens",
  "Europe/Berlin",
  "Europe/Brussels",
  "Europe/Dublin",
  "Europe/Helsinki",
  "Europe/Istanbul",
  "Europe/Lisbon",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Moscow",
  "Europe/Paris",
  "Europe/Prague",
  "Europe/Rome",
  "Europe/Stockholm",
  "Europe/Vienna",
  "Europe/Warsaw",
  "Europe/Zurich",
  "Pacific/Auckland",
  "Pacific/Honolulu",
];

/**
 * All IANA timezone identifiers supported by the runtime, sorted, or a fixed fallback list.
 */
export function getSortedTimeZoneIds(): string[] {
  try {
    const supported = Intl.supportedValuesOf("timeZone");
    return [...supported].sort((a, b) => a.localeCompare(b));
  } catch {
    return [...FALLBACK_TIMEZONE_IDS];
  }
}

/**
 * Extra searchable tokens (countries, abbreviations) keyed by IANA id — helps when the id is only a city.
 */
const EXTRA_SEARCH_BY_ZONE: Record<string, string> = {
  "Europe/Amsterdam": "netherlands holland nl",
  "Europe/Athens": "greece greek",
  "Europe/Belgrade": "serbia",
  "Europe/Berlin": "germany deutsch",
  "Europe/Brussels": "belgium",
  "Europe/Bucharest": "romania",
  "Europe/Budapest": "hungary",
  "Europe/Copenhagen": "denmark danish",
  "Europe/Dublin": "ireland irish eire",
  "Europe/Helsinki": "finland finnish",
  "Europe/Istanbul": "turkey turkiye",
  "Europe/Kiev": "ukraine kyiv",
  "Europe/Lisbon": "portugal",
  "Europe/London": "uk britain united kingdom england gb",
  "Europe/Luxembourg": "luxembourg",
  "Europe/Madrid": "spain español espana",
  "Europe/Malta": "malta",
  "Europe/Oslo": "norway norwegian",
  "Europe/Paris": "france french",
  "Europe/Prague": "czechia czech republic",
  "Europe/Riga": "latvia",
  "Europe/Rome": "italy italian italia",
  "Europe/Stockholm": "sweden swedish",
  "Europe/Tallinn": "estonia",
  "Europe/Vienna": "austria austrian",
  "Europe/Vilnius": "lithuania",
  "Europe/Warsaw": "poland polish",
  "Europe/Zurich": "switzerland swiss",
  "America/New_York": "usa us united states eastern est",
  "America/Chicago": "usa us united states central cst",
  "America/Denver": "usa us united states mountain mst",
  "America/Los_Angeles": "usa us united states pacific pst california",
  "America/Phoenix": "usa us united states arizona",
  "America/Anchorage": "usa us united states alaska",
  "America/Toronto": "canada canadian eastern",
  "America/Vancouver": "canada canadian british columbia",
  "America/Mexico_City": "mexico mexican",
  "America/Sao_Paulo": "brazil brasil brazilian",
  "America/Buenos_Aires": "argentina argentine",
  "America/Bogota": "colombia",
  "America/Lima": "peru",
  "America/Santiago": "chile",
  "Asia/Tokyo": "japan japanese",
  "Asia/Seoul": "korea south korean",
  "Asia/Shanghai": "china chinese prc",
  "Asia/Hong_Kong": "hong kong china",
  "Asia/Singapore": "singapore",
  "Asia/Bangkok": "thailand thai",
  "Asia/Jakarta": "indonesia",
  "Asia/Manila": "philippines filipino",
  "Asia/Kolkata": "india indian",
  "Asia/Dubai": "uae emirates",
  "Asia/Tel_Aviv": "israel israeli",
  "Asia/Jerusalem": "israel israeli",
  "Australia/Sydney": "australia australian nsw",
  "Australia/Melbourne": "australia australian victoria",
  "Australia/Perth": "australia australian western",
  "Pacific/Auckland": "new zealand nz",
  "Africa/Johannesburg": "south africa",
  "Africa/Cairo": "egypt egyptian",
  "Africa/Lagos": "nigeria",
  "Africa/Nairobi": "kenya",
};

const haystackCache = new Map<string, string>();

/** Lowercase string used to match user search (id, path segments, optional country hints). */
export function buildTimezoneHaystack(id: string): string {
  const cached = haystackCache.get(id);
  if (cached !== undefined) return cached;

  const extra = EXTRA_SEARCH_BY_ZONE[id] ?? "";
  const segments = id.split("/").map((s) => s.replace(/_/g, " "));
  const normalizedId = id.replace(/\//g, " ").replace(/_/g, " ");
  const haystack = [normalizedId, ...segments, extra].join(" ").toLowerCase().replace(/\s+/g, " ").trim();

  haystackCache.set(id, haystack);
  return haystack;
}
