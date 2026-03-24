import { Link } from "react-router-dom";

type Props = { title: string; hint?: string };

export function PlaceholderPage({ title, hint }: Props) {
  return (
    <section className="page-shell stack-lg">
      <h2 className="page-title">{title}</h2>
      {hint ? <p className="muted" style={{ margin: 0 }}>{hint}</p> : null}
      <p style={{ margin: 0 }}>
        <Link to="/" className="link-back">
          ← Dashboard
        </Link>
      </p>
    </section>
  );
}
