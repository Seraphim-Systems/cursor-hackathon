import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchMe, loginRequest } from "../api/auth";
import { clearStoredToken, getStoredToken, setStoredToken } from "../api/token";

type User = { id: string; email: string; is_admin?: boolean };

type AuthContextValue = {
  token: string | null;
  user: User | null;
  /** False while validating stored token or completing login (`GET /api/auth/me`). */
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(() => !getStoredToken());

  useEffect(() => {
    if (!token) {
      setUser(null);
      setReady(true);
      return;
    }
    setReady(false);
    fetchMe()
      .then((res) => setUser(res.user as User))
      .catch(() => {
        clearStoredToken();
        setToken(null);
        setUser(null);
      })
      .finally(() => setReady(true));
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await loginRequest(email, password);
    setStoredToken(data.access_token);
    setToken(data.access_token);
    setUser(data.user as User);
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    setToken(null);
    setUser(null);
    setReady(true);
  }, []);

  const value = useMemo(
    () => ({ token, user, ready, login, logout }),
    [token, user, ready, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
