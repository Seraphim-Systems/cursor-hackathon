import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./styles/global.css";
import { AuthProvider } from "./auth/AuthContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { App } from "./App";
import faviconUrl from "./assets/favicon.png";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root");
}

const faviconLink =
  (document.querySelector("link[rel~='icon']") as HTMLLinkElement | null) ??
  document.createElement("link");
faviconLink.rel = "icon";
faviconLink.type = "image/png";
faviconLink.href = faviconUrl;

if (!faviconLink.parentElement) {
  document.head.appendChild(faviconLink);
}

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
