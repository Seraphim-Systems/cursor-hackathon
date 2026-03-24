/** localStorage key for JWT from `POST /api/auth/login` / `register` (see contracts). */
export const ACCESS_TOKEN_KEY = "journal_access_token";

export function getStoredToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}
