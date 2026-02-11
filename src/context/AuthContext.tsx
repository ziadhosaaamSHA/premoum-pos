"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  status: "INVITED" | "ACTIVE" | "SUSPENDED";
  isOwner: boolean;
  roles: string[];
  permissions: string[];
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  authenticated: boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchMe() {
  const response = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
  if (!response.ok) return null;
  const payload = (await response.json()) as { ok: boolean; data?: { user: AuthUser } };
  if (!payload.ok || !payload.data?.user) return null;
  return payload.data.user;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const nextUser = await fetchMe();
    setUser(nextUser);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const nextUser = await fetchMe();
        if (!active) return;
        setUser(nextUser);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => undefined);
    setUser(null);
  }, []);

  const hasPermission = useCallback(
    (permission: string) => {
      if (!user) return false;
      if (user.isOwner) return true;
      return user.permissions.includes(permission);
    },
    [user]
  );

  const hasAnyPermission = useCallback(
    (permissions: string[]) => {
      if (!user) return false;
      if (user.isOwner) return true;
      return permissions.some((permission) => user.permissions.includes(permission));
    },
    [user]
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      authenticated: Boolean(user),
      hasPermission,
      hasAnyPermission,
      refresh,
      logout,
    }),
    [user, loading, hasPermission, hasAnyPermission, refresh, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
