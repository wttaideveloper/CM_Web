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
import { getSession, invalidateAuthRefreshes, logoutWebAuth, refreshAuthSessionSingleFlight } from "./session";
import type { AuthContextValue, AuthUser } from "./types";
import { normalizeAuthUserName } from "./profile-name";

export const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
  config?: AuthClientConfig;
};

export function AuthProvider({ children, config }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSessionError, setHasSessionError] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [hasActiveTenant, setHasActiveTenant] = useState(false);
  const [needsOrganizationSetup, setNeedsOrganizationSetup] = useState(false);
  const sessionRequestVersion = useRef(0);
  const hiddenAt = useRef<number | null>(null);

  const applySession = useCallback((session: Awaited<ReturnType<typeof getSession>>) => {
    const nextUser = session.data ? normalizeAuthUserName(session.data) : null;
    const isAuthenticated = session.authenticated !== false && nextUser !== null;

    setUser(isAuthenticated ? nextUser : null);
    setAuthenticated(isAuthenticated);
    setHasSessionError(false);
    setHasActiveTenant(session.hasActiveTenant ?? false);
    setNeedsOrganizationSetup(session.needsOrganizationSetup ?? false);
  }, []);

  const refreshSession = useCallback(async () => {
    const requestVersion = ++sessionRequestVersion.current;
    setIsLoading(true);
    setHasSessionError(false);

    try {
      let session;
      try {
        session = await getSession(config);
      } catch (error) {
        if (!(error instanceof Error) || (error as Error & { status?: number }).status !== 401) {
          throw error;
        }
        await refreshAuthSessionSingleFlight(config);
        session = await getSession(config);
      }
      if (requestVersion === sessionRequestVersion.current) {
        applySession(session);
      }
    } catch (error) {
      if (requestVersion === sessionRequestVersion.current) {
        setUser(null);
        setAuthenticated(false);
        setHasActiveTenant(false);
        setNeedsOrganizationSetup(false);
        const status = error instanceof Error ? (error as Error & { status?: number }).status : undefined;
        setHasSessionError(status !== 401);
      }
    } finally {
      if (requestVersion === sessionRequestVersion.current) {
        setIsLoading(false);
        setAuthReady(true);
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

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        void refreshSession();
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt.current = Date.now();
        return;
      }

      const wasHiddenAt = hiddenAt.current;
      hiddenAt.current = null;
      if (wasHiddenAt !== null && Date.now() - wasHiddenAt >= 15 * 60 * 1000) {
        void refreshSession();
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshSession]);

  const logout = useCallback(async () => {
    sessionRequestVersion.current += 1;
    invalidateAuthRefreshes();
    const logoutUrl = await logoutWebAuth(config);
    setUser(null);
    setAuthenticated(false);
    setHasSessionError(false);
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
      hasSessionError,
      authReady,
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
      hasSessionError,
      authReady,
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
