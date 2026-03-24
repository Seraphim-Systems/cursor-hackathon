import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ApiError, login as loginApi } from "../api/client";
import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setToken } = useAuth();
  const from = (location.state as { from?: string } | null)?.from || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await loginApi(email.trim(), password);
      setToken(data.access_token);
      const target = from === "/login" ? "/" : from;
      navigate(target, { replace: true });
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Login failed";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section style={{ maxWidth: 360, marginTop: "1rem" }}>
      <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>Sign in</h2>
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.9rem" }}>
          Email
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: "0.5rem 0.6rem", borderRadius: 6, border: "1px solid #ccc" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.9rem" }}>
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: "0.5rem 0.6rem", borderRadius: 6, border: "1px solid #ccc" }}
          />
        </label>
        {error ? <p style={{ color: "#b42318", margin: 0, fontSize: "0.9rem" }}>{error}</p> : null}
        <button type="submit" disabled={submitting} style={{ padding: "0.5rem 1rem", borderRadius: 6, cursor: submitting ? "wait" : "pointer" }}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p style={{ marginTop: "1rem", fontSize: "0.9rem" }}>
        <Link to="/">Back to dashboard</Link>
      </p>
    </section>
  );
}
