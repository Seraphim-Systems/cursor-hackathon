import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, register as registerApi } from "../api/client";
import { useAuth } from "../auth/AuthContext";

export function RegisterPage() {
  const navigate = useNavigate();
  const { setToken } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await registerApi(email.trim(), password);
      setToken(data.access_token);
      navigate("/", { replace: true });
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Registration failed";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-shell page-shell--narrow">
      <section className="ui-card">
        <h2 className="page-title" style={{ marginBottom: "1.25rem" }}>
          Sign up
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
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
            Use at least 8 characters.
          </p>
          {error ? (
            <p role="alert" className="text-error" style={{ margin: 0, fontSize: "0.9rem" }}>
              {error}
            </p>
          ) : null}
          <button type="submit" className="btn-gold" disabled={submitting}>
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="muted" style={{ marginTop: "1rem", marginBottom: 0 }}>
          Already have an account?{" "}
          <Link to="/login">Sign in</Link>
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
