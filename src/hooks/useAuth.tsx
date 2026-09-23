"use client";

import { useState, useEffect, createContext, useContext, useCallback, type ReactNode } from "react";

export interface AdminUser {
  id: number;
  email: string;
  name: string | null;
}

interface AuthContextType {
  user: AdminUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => ({ error: new Error("Not ready") }),
  signOut: async () => {},
});

/**
 * Admin session state.
 *
 * The session itself is an httpOnly cookie the browser cannot read, so this
 * asks the server who is signed in rather than decoding a token client-side.
 * That also means a session revoked on the server takes effect on the next
 * request instead of living on until a JWT expires.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/auth", { cache: "no-store" });
      const { user: u } = await res.json();
      setUser(u ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        const res = await fetch("/api/admin/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const body = await res.json();
        if (!res.ok) return { error: new Error(body.error ?? "Sign-in failed") };
        setUser(body.user);
        return { error: null };
      } catch (e) {
        return { error: e instanceof Error ? e : new Error("Sign-in failed") };
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/admin/auth", { method: "DELETE" });
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
