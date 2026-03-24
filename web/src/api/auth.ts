import { apiJson } from "./client";

/** Aligns with [`contracts/auth-responses.schema.json`](../../contracts/auth-responses.schema.json). */
export type AuthTokenResponse = {
  access_token: string;
  token_type: "bearer";
  expires_in?: number;
  user: { id: string; email: string };
};

/** `GET /api/auth/me` — settings optional per docs/DATA_CONTRACTS.md. */
export type MeResponse = {
  user: { id: string; email: string };
  settings?: Record<string, unknown>;
};

export async function loginRequest(email: string, password: string): Promise<AuthTokenResponse> {
  return apiJson<AuthTokenResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function fetchMe(): Promise<MeResponse> {
  return apiJson<MeResponse>("/api/auth/me", { method: "GET" });
}
