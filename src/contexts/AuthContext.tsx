"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  getSession,
  logoutWebAuth,
  type AuthMembership,
  type AuthRoles,
  type AuthUser,
} from "@/services/auth.service";

type AuthContextValue = {
  user: AuthUser | null;
  userId: string | null;
  authenticated: boolean;
  isLoading: boolean;
  membership: AuthMembership | null;
  roles: AuthRoles | null;
  hasActiveTenant: boolean;
  needsOrganizationSetup: boolean;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasActiveTenant, setHasActiveTenant] = useState(false);
  const [needsOrganizationSetup, setNeedsOrganizationSetup] = useState(false);

  const applySession = useCallback((session: Awaited<ReturnType<typeof getSession>>) => {
    const nextUser = session.data ?? null;
    const hasUserId = Boolean(nextUser?.userId ?? nextUser?.id);
    const isAuthenticated =
      session.authenticated === false
        ? false
        : session.authenticated === true
          ? nextUser !== null
          : hasUserId;

    setUser(isAuthenticated ? nextUser : null);
    setAuthenticated(isAuthenticated);
    setHasActiveTenant(session.hasActiveTenant ?? false);
    setNeedsOrganizationSetup(session.needsOrganizationSetup ?? false);
  }, []);

  const refreshSession = useCallback(async () => {
    setIsLoading(true);

    try {
      const session = await getSession();
      applySession(session);
    } catch {
      setUser(null);
      setAuthenticated(false);
      setHasActiveTenant(false);
      setNeedsOrganizationSetup(false);
    } finally {
      setIsLoading(false);
    }
  }, [applySession]);

  useEffect(() => {
    // Session restoration intentionally initializes provider state after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshSession();
  }, [refreshSession]);

  const logout = useCallback(async () => {
    await logoutWebAuth();
    setUser(null);
    setAuthenticated(false);
    setHasActiveTenant(false);
    setNeedsOrganizationSetup(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      userId: user?.userId ?? user?.id ?? null,
      authenticated,
      isLoading,
      membership: user?.membership ?? null,
      roles: user?.roles ?? null,
      hasActiveTenant,
      needsOrganizationSetup,
      refreshSession,
      logout,
    }),
    [
      authenticated,
      hasActiveTenant,
      isLoading,
      logout,
      needsOrganizationSetup,
      refreshSession,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
