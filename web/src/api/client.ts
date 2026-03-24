import { clearStoredToken, getStoredToken } from "./token";

const apiBase = import.meta.env.VITE_API_URL ?? "";

/** Browser URL for API paths (e.g. `/api/...`). Empty `VITE_API_URL` uses same-origin + Vite dev proxy. */
export function apiUrl(path: string): string {
  if (!path.startsWith("/")) {
    throw new Error(`api path must start with /, got: ${path}`);
  }
  return `${apiBase}${path}`;
}

function parseErrorDetail(body: unknown): string {
  if (body && typeof body === "object" && "detail" in body) {
    const d = (body as { detail: unknown }).detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) {
      return d.map((x) => (typeof x === "object" && x && "msg" in x ? String((x as { msg: unknown }).msg) : String(x))).join(", ");
    }
  }
  return "Request failed";
}

/** JSON `fetch` with `Authorization: Bearer` when a token is stored. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getStoredToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(apiUrl(path), { ...init, headers });
  // Drop session only when an authenticated request is rejected (not e.g. wrong password on login).
  if (res.status === 401 && token) {
    clearStoredToken();
  }
  return res;
}

/** Parse JSON response; on error status, throw with message from FastAPI `detail` when present. */
export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, init);
  const text = await res.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      throw new Error(res.ok ? "Invalid JSON response" : text || `HTTP ${res.status}`);
    }
  }
  if (!res.ok) {
    throw new Error(parseErrorDetail(data));
  }
  return data as T;
}
