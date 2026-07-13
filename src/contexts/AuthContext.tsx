"use client";

import { useEffect, useMemo, useRef, useState, createContext, useCallback, useContext, type ReactNode } from "react";

import { useAdminSocket } from "@/contexts/AdminSocketContext";
import {
  getSession,
  logout as logoutEnterpriseOwner,
  type AuthUser,
  type SessionResponse,
} from "@/services/auth.service";

type AuthContextValue = {
  authenticatedUser: AuthUser | null;
  isAuthLoading: boolean;
  isAuthenticated: boolean;
  setAuthenticatedUser: (user: AuthUser | null) => void;
  clearAuthenticatedUser: () => void;
  restoreSession: () => Promise<SessionResponse>;
  logout: (options?: {
    local?: boolean;
    returnToLogin?: boolean;
  }) => Promise<void>;
  isLoggingOut: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const restorePromiseRef = useRef<Promise<SessionResponse> | null>(null);
  const logoutPromiseRef = useRef<Promise<void> | null>(null);
  const { disconnect } = useAdminSocket();

  const clearAuthenticatedUser = useCallback(() => {
    setAuthenticatedUser(null);
  }, []);

  const shouldUseLocalLogoutFallback = useCallback((logoutUrl: string | null) => {
    if (process.env.NODE_ENV === "production") {
      return false;
    }

    if (!logoutUrl || typeof window === "undefined") {
      return true;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(logoutUrl, window.location.origin);
    } catch {
      return true;
    }

    const logoutUrlText = `${parsedUrl.href} ${parsedUrl.pathname} ${parsedUrl.search}`.toLowerCase();

    if (logoutUrlText.includes("/api/v1/auth/logout/complete")) {
      return false;
    }

    if (
      logoutUrlText.includes("keycloak") ||
      logoutUrlText.includes("/protocol/openid-connect/") ||
      logoutUrlText.includes("/login-actions/") ||
      logoutUrlText.includes("/login")
    ) {
      return true;
    }

    return false;
  }, []);

  const restoreSession = useCallback(() => {
    if (restorePromiseRef.current) {
      return restorePromiseRef.current;
    }

    const promise = (async () => {
      setIsAuthLoading(true);

      if (process.env.NODE_ENV === "development") {
        console.log("[Auth] session restore started");
      }

      try {
        const response = await getSession();

        if (process.env.NODE_ENV === "development") {
          console.log("[Auth] session restore result", {
            authenticated: response.authenticated,
            hasData: Boolean(response.data),
          });
        }

        if (response.authenticated && response.data) {
          setAuthenticatedUser(response.data);
        } else {
          clearAuthenticatedUser();
        }

        return response;
      } catch (error) {
        clearAuthenticatedUser();

        if (process.env.NODE_ENV === "development") {
          console.error("[Auth] session restore failed", error);
        }

        return {
          authenticated: false,
          data: null,
          raw: error,
        } satisfies SessionResponse;
      } finally {
        restorePromiseRef.current = null;
        setIsAuthLoading(false);
      }
    })();

    restorePromiseRef.current = promise;

    return promise;
  }, [clearAuthenticatedUser]);

  const logout = useCallback(
    (options?: {
      local?: boolean;
      returnToLogin?: boolean;
    }) => {
      if (logoutPromiseRef.current) {
        return logoutPromiseRef.current;
      }

      const promise = (async () => {
        const localLogout = options?.local ?? false;
        const returnToLogin = options?.returnToLogin ?? false;

        try {
          const requestDetails = {
            frontend_origin: window.location.origin,
            local: localLogout,
          };

          if (process.env.NODE_ENV === "development") {
            console.log("[Auth] logout request", requestDetails);
          }

          const response = await logoutEnterpriseOwner(localLogout);

          if (process.env.NODE_ENV === "development") {
            console.log("[Auth] logout response", {
              response: response.raw,
              logoutUrl: response.logoutUrl,
            });
          }

          const useLocalFallback = !returnToLogin && shouldUseLocalLogoutFallback(response.logoutUrl);
          let finalResponse = response;

          if (useLocalFallback && process.env.NODE_ENV !== "production") {
            console.log("[Auth] logout fallback request", {
              frontend_origin: window.location.origin,
              local: true,
            });
            finalResponse = await logoutEnterpriseOwner(true);
            console.log("[Auth] logout fallback response", {
              response: finalResponse.raw,
              logoutUrl: finalResponse.logoutUrl,
            });
          }

          clearAuthenticatedUser();
          disconnect();

          const finalLogoutUrl = finalResponse.logoutUrl;

          if (process.env.NODE_ENV === "development") {
            console.log("[Auth] final logout_url", {
              logoutUrl: finalLogoutUrl,
              usedLocalFallback: useLocalFallback,
              returnToLogin,
            });
          }

          if (returnToLogin) {
            window.location.replace("/auth/login");
            return;
          }

          if (useLocalFallback && process.env.NODE_ENV !== "production") {
            window.location.replace("/auth/login");
            return;
          }

          if (finalLogoutUrl) {
            window.location.href = finalLogoutUrl;
            return;
          }

          if (process.env.NODE_ENV !== "production") {
            console.error("[Auth] logout response missing logoutUrl", finalResponse.raw);
          }

          window.location.href = "/auth/login";
        } catch (error) {
          clearAuthenticatedUser();
          disconnect();

          if (process.env.NODE_ENV !== "production") {
            console.error("[Auth] logout failed", error);
          }

          window.location.href = "/auth/login";
        } finally {
          logoutPromiseRef.current = null;
          setIsLoggingOut(false);
        }
      })();

      logoutPromiseRef.current = promise;
      setIsLoggingOut(true);

      return promise;
    },
    [clearAuthenticatedUser, disconnect, shouldUseLocalLogoutFallback],
  );

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) {
        return;
      }

      void restoreSession();
    };

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [restoreSession]);

  const isAuthenticated = useMemo(() => Boolean(authenticatedUser), [authenticatedUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      authenticatedUser,
      isAuthLoading,
      isAuthenticated,
      setAuthenticatedUser,
      clearAuthenticatedUser,
      restoreSession,
      logout,
      isLoggingOut,
    }),
    [authenticatedUser, clearAuthenticatedUser, isAuthLoading, isAuthenticated, isLoggingOut, logout, restoreSession],
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
