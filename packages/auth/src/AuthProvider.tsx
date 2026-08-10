"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { AuthClientConfig } from "./client";
import { getSession, logoutWebAuth } from "./session";
import type { AuthContextValue, AuthUser } from "./types";

export const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
  config?: AuthClientConfig;
};

export function AuthProvider({ children, config }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasActiveTenant, setHasActiveTenant] = useState(false);
  const [needsOrganizationSetup, setNeedsOrganizationSetup] = useState(false);
  const sessionRequestVersion = useRef(0);

  const applySession = useCallback((session: Awaited<ReturnType<typeof getSession>>) => {
    const nextUser = session.data ?? null;
    const isAuthenticated = session.authenticated !== false && nextUser !== null;

    setUser(isAuthenticated ? nextUser : null);
    setAuthenticated(isAuthenticated);
    setHasActiveTenant(session.hasActiveTenant ?? false);
    setNeedsOrganizationSetup(session.needsOrganizationSetup ?? false);
  }, []);

  const refreshSession = useCallback(async () => {
    const requestVersion = ++sessionRequestVersion.current;
    setIsLoading(true);

    try {
      const session = await getSession(config);
      if (requestVersion === sessionRequestVersion.current) {
        applySession(session);
      }
    } catch {
      if (requestVersion === sessionRequestVersion.current) {
        setUser(null);
        setAuthenticated(false);
        setHasActiveTenant(false);
        setNeedsOrganizationSetup(false);
      }
    } finally {
      if (requestVersion === sessionRequestVersion.current) {
        setIsLoading(false);
      }
    }
  }, [applySession, config]);

  const updateUser = useCallback((nextUser: AuthUser) => {
    setUser(nextUser);
  }, []);

  useEffect(() => {
    // Session restoration intentionally initializes provider state after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshSession();
  }, [refreshSession]);

  const logout = useCallback(async () => {
    sessionRequestVersion.current += 1;
    const logoutUrl = await logoutWebAuth(config);
    setUser(null);
    setAuthenticated(false);
    setHasActiveTenant(false);
    setNeedsOrganizationSetup(false);
    return logoutUrl;
  }, [config]);

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
      updateUser,
      logout,
    }),
    [
      authenticated,
      hasActiveTenant,
      isLoading,
      logout,
      needsOrganizationSetup,
      refreshSession,
      updateUser,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
