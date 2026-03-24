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
    <div className="page-shell page-shell--narrow">
      <section className="ui-card">
        <h2 className="page-title" style={{ marginBottom: "1.25rem" }}>
          Sign in
        </h2>
        <form onSubmit={onSubmit} className="stack-lg" style={{ gap: "1rem" }}>
          <label className="form-field">
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="form-field">
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error ? (
            <p role="alert" className="text-error" style={{ margin: 0, fontSize: "0.9rem" }}>
              {error}
            </p>
          ) : null}
          <button type="submit" className="btn-gold" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="muted" style={{ marginTop: "1rem", marginBottom: 0 }}>
          No account? <Link to="/register">Sign up</Link>
        </p>
        <p className="muted" style={{ marginTop: "0.75rem", marginBottom: 0 }}>
          <Link to="/" className="link-back">
            ← Dashboard
          </Link>
        </p>
      </section>
    </div>
  );
}
