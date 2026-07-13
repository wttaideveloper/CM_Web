"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import {
  completeEnterpriseOwnerLogin,
  AuthServiceError,
  type CompleteLoginResponse,
} from "@/services/auth.service";

type ViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "success" };

const SUPPORTED_ADMIN_ROLES = new Set(["tenant_owner", "tenant_admin", "admin"]);

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred while completing sign-in.";
}

function getFriendlyAuthError(error: unknown): string {
  if (error instanceof AuthServiceError) {
    if (error.kind === "expired_or_used_session_code") {
      return "This sign-in link has expired or was already used. Please try again from the login page.";
    }

    if (error.kind === "invalid_response") {
      return "We received an invalid response while completing sign-in. Please try again.";
    }

    if (error.kind === "network_failure") {
      return "We could not reach the sign-in service. Please check your connection and try again.";
    }
  }

  return getErrorMessage(error);
}

function extractTenantRole(response: CompleteLoginResponse) {
  return response.data.membership?.tenantRole ?? response.data.roles?.tenantRole ?? null;
}

function isSupportedAdminRole(tenantRole: string | null) {
  return tenantRole !== null && SUPPORTED_ADMIN_ROLES.has(tenantRole);
}

function AuthValidateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuthenticatedUser, restoreSession, logout, isLoggingOut } = useAuth();
  const handledSessionCodeRef = useRef<string | null>(null);
  const handledExistingSessionRef = useRef(false);
  const [viewState, setViewState] = useState<ViewState>({ kind: "loading" });

  const sessionCode = searchParams.get("he_session_code");
  const authReady = searchParams.get("he_auth_ready");
  const authReadyIsOne = authReady === "1";
  const isUnauthorizedAccessError =
    viewState.kind === "error" &&
    viewState.message === "This account does not have Enterprise Owner access.";

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[Auth validate] page started", {
        hasSessionCode: Boolean(sessionCode),
        authReady,
      });
    }
  }, [authReady, sessionCode]);

  const startFreshLogin = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams({
      frontend_origin: window.location.origin,
    });

    const restartUrl = `/api/v1/auth/restart-login?${params.toString()}`;

    window.location.href = restartUrl;
  }, []);

  const signOutAndUseAnotherAccount = useCallback(() => {
    void logout({
      local: true,
      returnToLogin: true,
    });
  }, [logout]);

  useEffect(() => {
    if (sessionCode) {
      if (handledSessionCodeRef.current === sessionCode) {
        return;
      }

      handledSessionCodeRef.current = sessionCode;
      setViewState({ kind: "loading" });

      let active = true;

      void (async () => {
        try {
          if (process.env.NODE_ENV === "development") {
            console.log("[Auth validate] branch", "session-code");
          }

          const response = await completeEnterpriseOwnerLogin(sessionCode);

          if (!active) {
            return;
          }

          const tenantRole = extractTenantRole(response);

          if (process.env.NODE_ENV === "development") {
            console.log("[Auth validate] tenant role", tenantRole);
          }

          if (!isSupportedAdminRole(tenantRole)) {
            setViewState({
              kind: "error",
              message: "This account does not have Enterprise Owner access.",
            });
            return;
          }

          setAuthenticatedUser(response.data);
          setViewState({ kind: "success" });
          router.replace("/admin/dashboard");
        } catch (error) {
          if (!active) {
            return;
          }

          if (process.env.NODE_ENV === "development") {
            console.log("[Auth validate] complete-login failure", {
              message: getErrorMessage(error),
              kind: error instanceof AuthServiceError ? error.kind : "unknown",
            });
          }

          setViewState({
            kind: "error",
            message: getFriendlyAuthError(error),
          });
        }
      })();

      return () => {
        active = false;
      };
    }

    if (!authReadyIsOne) {
      setViewState({
        kind: "error",
        message: "We could not complete sign-in. Please start a fresh Enterprise Owner login.",
      });
      return;
    }

    if (handledExistingSessionRef.current) {
      return;
    }

    handledExistingSessionRef.current = true;
    setViewState({ kind: "loading" });

    let active = true;

    void (async () => {
      try {
        if (process.env.NODE_ENV === "development") {
          console.log("[Auth validate] branch", "existing-session");
        }

        const response = await restoreSession();

        if (!active) {
          return;
        }

        if (!response.authenticated || !response.data) {
          if (process.env.NODE_ENV === "development") {
            console.log("[Auth validate] unauthenticated session result", {
              authenticated: response.authenticated,
              hasData: Boolean(response.data),
            });
          }

          setViewState({
            kind: "error",
            message: "We could not restore your Enterprise Owner session. Please start a fresh login.",
          });
          return;
        }

        const tenantRole =
          response.data.membership?.tenantRole ?? response.data.roles?.tenantRole ?? null;

        if (process.env.NODE_ENV === "development") {
          console.log("[Auth validate] restored tenant role", tenantRole);
        }

        if (!isSupportedAdminRole(tenantRole)) {
          setViewState({
            kind: "error",
            message: "This account does not have Enterprise Owner access.",
          });
          return;
        }

        setAuthenticatedUser(response.data);
        setViewState({ kind: "success" });
        router.replace("/admin/dashboard");
      } catch (error) {
        if (!active) {
          return;
        }

        if (process.env.NODE_ENV === "development") {
          console.log("[Auth validate] complete-login failure", {
            message: getErrorMessage(error),
            kind: error instanceof AuthServiceError ? error.kind : "unknown",
          });
        }

        setViewState({
          kind: "error",
          message: getFriendlyAuthError(error),
        });
      }
    })();

    return () => {
      active = false;
    };
  }, [authReadyIsOne, restoreSession, router, sessionCode, setAuthenticatedUser]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 py-12 text-[#06201c]">
      <div className="w-full max-w-md rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm">
        {viewState.kind === "loading" ? (
          <div className="space-y-3">
            <h1 className="text-2xl font-bold">Completing secure sign-in...</h1>
            <p className="text-sm text-[#52736a]">
              We&apos;re finishing your Enterprise Owner sign-in and preparing your dashboard.
            </p>
          </div>
        ) : viewState.kind === "error" ? (
          <div className="space-y-5">
            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-[#b42318]">Sign-in could not be completed</h1>
              <p className="text-sm leading-6 text-[#7a271a]">{viewState.message}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              {isUnauthorizedAccessError ? (
                <>
                  <button
                    type="button"
                    onClick={signOutAndUseAnotherAccount}
                    disabled={isLoggingOut}
                    className="inline-flex h-10 items-center justify-center rounded-[13px] bg-[#1f6a58] px-4 text-sm font-bold text-white transition hover:bg-[#185746] disabled:cursor-not-allowed disabled:bg-[#8fb5aa]"
                  >
                    {isLoggingOut ? "Signing out..." : "Sign out and use another account"}
                  </button>
                  <button
                    type="button"
                    onClick={startFreshLogin}
                    className="inline-flex h-10 items-center justify-center rounded-[13px] border border-[#d8e4df] bg-white px-4 text-sm font-bold text-[#06201c] transition hover:bg-[#f7fbf9]"
                  >
                    Try login again
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={startFreshLogin}
                  className="inline-flex h-10 items-center justify-center rounded-[13px] bg-[#1f6a58] px-4 text-sm font-bold text-white transition hover:bg-[#185746]"
                >
                  Start fresh login
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <h1 className="text-2xl font-bold text-[#1f6a58]">Signed in</h1>
            <p className="text-sm text-[#52736a]">
              Redirecting you to your Enterprise Owner dashboard...
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

export default function AuthValidatePage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-white px-6 py-12 text-[#06201c]"><div className="w-full max-w-md rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm"><div className="space-y-3"><h1 className="text-2xl font-bold">Completing secure sign-in...</h1><p className="text-sm text-[#52736a]">We&apos;re finishing your Enterprise Owner sign-in and preparing your dashboard.</p></div></div></main>}>
      <AuthValidateContent />
    </Suspense>
  );
}
