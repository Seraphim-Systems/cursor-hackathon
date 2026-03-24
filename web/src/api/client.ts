import type { UserSettings } from "../types/userSettings";
import type { CalendarResponse, EntryListResponse, JournalEntry, TokenResponse } from "./types";

export type { CalendarResponse, EntryListResponse, JournalEntry, TokenResponse } from "./types";

const TOKEN_KEY = "journal_access_token";

export function apiUrl(path: string): string {
  const base = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  if (base) return `${base}${path.startsWith("/") ? path : `/${path}`}`;
  return path.startsWith("/") ? path : `/${path}`;
}

/** Empty string means same-origin (Vite dev proxy to `/api`). */
export function getApiBase(): string {
  return (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const j = JSON.parse(text) as { detail?: unknown };
    if (typeof j.detail === "string") return j.detail;
    if (j.detail !== undefined) return JSON.stringify(j.detail);
  } catch {
    /* ignore */
  }
  return text || res.statusText;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const body = init?.body;
  if (body !== undefined && !(body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(apiUrl(path), { ...init, headers });
  if (res.status === 401) {
    clearToken();
    throw new ApiError("Unauthorized", 401);
  }
  if (!res.ok) {
    const text = await parseError(res);
    throw new ApiError(text, res.status, text);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  return apiFetch<TokenResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

/** Password must be at least 8 characters (server rule). */
export async function register(email: string, password: string): Promise<TokenResponse> {
  return apiFetch<TokenResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function listEntries(limit = 50, offset = 0): Promise<EntryListResponse> {
  const q = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  return apiFetch<EntryListResponse>(`/api/entries?${q.toString()}`);
}

export async function getEntry(id: string): Promise<JournalEntry> {
  return apiFetch<JournalEntry>(`/api/entries/${encodeURIComponent(id)}`);
}

function parseDetailString(text: string): string {
  try {
    const j = JSON.parse(text) as { detail?: unknown };
    if (typeof j.detail === "string") return j.detail;
    if (j.detail !== undefined) return JSON.stringify(j.detail);
  } catch {
    if (text.trim()) return text;
  }
  return "Request failed";
}

/**
 * Multipart POST /api/entries with upload progress (XHR — `fetch` has no upload progress events).
 * Form fields must match the API: `audio` file, optional `text`, `run_analysis`.
 */
export function createEntryWithAudioProgress(
  formData: FormData,
  onProgress: (loaded: number, total: number) => void,
): Promise<JournalEntry> {
  const token = getToken();
  if (!token) {
    return Promise.reject(new ApiError("Unauthorized", 401));
  }
  const url = apiUrl("/api/entries");
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) onProgress(ev.loaded, ev.total);
    };
    xhr.onload = () => {
      const text = xhr.responseText;
      if (xhr.status === 401) {
        clearToken();
        reject(new ApiError("Unauthorized", 401));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(text) as JournalEntry);
        } catch {
          reject(new ApiError("Invalid JSON from server", xhr.status, text));
        }
        return;
      }
      reject(new ApiError(parseDetailString(text), xhr.status, text));
    };
    xhr.onerror = () => reject(new ApiError("Network error", 0));
    xhr.send(formData);
  });
}

export interface PatchEntryBody {
  cleaned_text?: string | null;
  transcript?: string | null;
  summary?: string | null;
  sentiment_score?: number | null;
  insights?: InsightsPayload;
  insights_field_locks?: string[];
}

export interface InsightsPayload {
  key_points: string[];
  projects: { name: string; notes: string }[];
  goals: string[];
  blockers: string[];
  people: string[];
  priorities: string[];
  themes: string[];
}

export async function patchEntry(id: string, body: PatchEntryBody): Promise<JournalEntry> {
  return apiFetch<JournalEntry>(`/api/entries/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function analyzeEntry(
  id: string,
  preserveLockedFields = true,
): Promise<JournalEntry> {
  return apiFetch<JournalEntry>(`/api/entries/${encodeURIComponent(id)}/analyze`, {
    method: "POST",
    body: JSON.stringify({ preserve_locked_fields: preserveLockedFields }),
  });
}

export async function getCalendar(from: string, to: string): Promise<CalendarResponse> {
  const q = new URLSearchParams({ from, to });
  return apiFetch<CalendarResponse>(`/api/calendar?${q.toString()}`);
}

/** GET/PATCH /api/settings — contracts/user-settings.schema.json */
export async function getSettings(): Promise<UserSettings> {
  return apiFetch<UserSettings>("/api/settings");
}

export async function patchSettings(patch: Partial<UserSettings>): Promise<UserSettings> {
  return apiFetch<UserSettings>("/api/settings", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}
