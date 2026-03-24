import { Link } from "react-router-dom";

type Props = { title: string; hint?: string };

export function PlaceholderPage({ title, hint }: Props) {
  return (
    <section style={{ marginTop: "1rem" }}>
      <h2 style={{ fontSize: "1rem", fontWeight: 600 }}>{title}</h2>
      {hint ? <p style={{ color: "#555", marginTop: "0.5rem" }}>{hint}</p> : null}
      <p style={{ marginTop: "1rem" }}>
        <Link to="/">← Dashboard</Link>
      </p>
    </section>
  );
}
