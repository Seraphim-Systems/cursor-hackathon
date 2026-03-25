import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { clearToken, getMe, getToken, setToken as persistToken } from "../api/client";
import type { Theme } from "../types/userSettings";

type ResolvedTheme = "light" | "dark";

function computeResolvedTheme(pref: Theme): ResolvedTheme {
  if (pref === "light") return "light";
  if (pref === "dark") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

type AuthContextValue = {
  token: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
  /** From `GET /api/auth/me` after a valid token is present. */
  isAdmin: boolean;
  /** False until `/me` finishes (or no token). */
  meReady: boolean;
  /** Re-fetch `/me` (e.g. after settings save) to refresh admin + theme. */
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>({
  token: null,
  setToken: () => {},
  logout: () => {},
  isAdmin: false,
  duckName: "the duck",
  meReady: true,
  refreshSession: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [isAdmin, setIsAdmin] = useState(false);
  const [duckName, setDuckName] = useState("the duck");
  const [meReady, setMeReady] = useState(() => !getToken());
  const [themePref, setThemePref] = useState<Theme | null>(null);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => computeResolvedTheme("system"));

  const applyMe = useCallback((me: Awaited<ReturnType<typeof getMe>>) => {
    setIsAdmin(Boolean(me.user.is_admin));
    setDuckName(me.settings.duck_name || "the duck");
    const pref = me.settings.theme;
    setThemePref(pref);
    setResolvedTheme(computeResolvedTheme(pref));
  }, []);

  useEffect(() => {
    if (!token) {
      setIsAdmin(false);
      setThemePref(null);
      setMeReady(true);
      return;
    }
    let cancelled = false;
    setMeReady(false);
    getMe()
      .then((me) => {
        if (!cancelled) applyMe(me);
      })
      .catch(() => {
        if (!cancelled) {
          setIsAdmin(false);
          setThemePref(null);
        }
      })
      .finally(() => {
        if (!cancelled) setMeReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [token, applyMe]);

  useEffect(() => {
    if (themePref !== "system" || !token) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolvedTheme(mq.matches ? "dark" : "light");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [themePref, token]);

  useEffect(() => {
    const root = document.documentElement;
    if (!token) {
      root.removeAttribute("data-theme");
      root.style.removeProperty("color-scheme");
      return;
    }
    if (!meReady) {
      const provisional = computeResolvedTheme("system");
      root.setAttribute("data-theme", provisional);
      root.style.colorScheme = provisional === "light" ? "light" : "dark";
      return;
    }
    root.setAttribute("data-theme", resolvedTheme);
    root.style.colorScheme = resolvedTheme === "light" ? "light" : "dark";
  }, [token, meReady, resolvedTheme]);

  const refreshSession = useCallback(async () => {
    if (!getToken()) return;
    try {
      const me = await getMe();
      applyMe(me);
    } catch {
      setIsAdmin(false);
      setThemePref(null);
    }
  }, [applyMe]);

  const setToken = useCallback((t: string | null) => {
    if (t === null) {
      clearToken();
      setTokenState(null);
    } else {
      persistToken(t);
      setTokenState(t);
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
  }, []);

  const value = useMemo(
    () => ({ token, setToken, logout, isAdmin, duckName, meReady, refreshSession }),
    [token, setToken, logout, isAdmin, duckName, meReady, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
