import type { ReactNode } from "react";
import { Component } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  message: string;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(err: unknown): State {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return { hasError: true, message: msg };
  }

  componentDidCatch(err: unknown) {
    // Keep a console breadcrumb for local debugging.
    console.error("Unhandled render error", err);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="page-shell stack-lg">
        <h2 className="page-title">Something went wrong</h2>
        <p className="text-error" role="alert" style={{ margin: 0 }}>
          {this.state.message || "The page crashed while rendering."}
        </p>
        <p className="muted" style={{ marginTop: "0.75rem" }}>
          Try refreshing. If it keeps happening, open the browser console to see the full error.
        </p>
      </div>
    );
  }
}

