"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { completeLogin, useAuth } from "@ihp/auth";

/** Written by /auth/login before the OIDC round-trip and consumed exactly once here. */
const RETURN_TO_STORAGE_KEY = "ihp.enterprise.return-to";

/** Reads and clears the stored destination, accepting only same-origin Enterprise Admin paths. */
function takeSafeReturnTo(): string | null {
  try {
    const stored = window.sessionStorage.getItem(RETURN_TO_STORAGE_KEY);
    window.sessionStorage.removeItem(RETURN_TO_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const url = new URL(stored, window.location.origin);
    if (
      url.origin !== window.location.origin ||
      url.username ||
      url.password ||
      (url.pathname !== "/admin" && !url.pathname.startsWith("/admin/"))
    ) {
      return null;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

function ValidateLoginContent() {
  const searchParams = useSearchParams();
  const { authenticated, isLoading, refreshSession } = useAuth();
  const hasStartedRef = useRef(false);
  const [hasCompletedSessionCode, setHasCompletedSessionCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionCode = searchParams.get("he_session_code")?.trim() ?? "";
  const callbackError = searchParams.get("error")?.trim() || null;
  const missingCodeError =
    !isLoading && !authenticated && !sessionCode && !hasCompletedSessionCode
      ? "The login link is missing its session code. Please start the login again."
      : null;

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (callbackError) {
      return;
    }

    if (sessionCode && !hasCompletedSessionCode) {
      if (hasStartedRef.current) {
        return;
      }
      hasStartedRef.current = true;

      const finishLogin = async () => {
        try {
          const result = await completeLogin(sessionCode, {
            frontendOrigin: window.location.origin,
          });
          if (result.authenticated === false || !result.data) {
            throw new Error("The login session could not be authenticated.");
          }

          const callbackUrl = new URL(window.location.href);
          callbackUrl.searchParams.delete("he_session_code");
          window.history.replaceState(
            window.history.state,
            "",
            `${callbackUrl.pathname}${callbackUrl.search}${callbackUrl.hash}`,
          );

          await refreshSession();
          setHasCompletedSessionCode(true);
        } catch (loginError) {
          setError(
            loginError instanceof TypeError
              ? "Unable to connect to the sign-in service. Check your connection and try again."
              : loginError instanceof Error
                ? loginError.message
                : "Unable to complete login.",
          );
        }
      };

      void finishLogin();
      return;
    }

    if (authenticated || hasCompletedSessionCode) {
      window.location.replace(takeSafeReturnTo() ?? "/admin/dashboard");
    }
  }, [
    authenticated,
    callbackError,
    hasCompletedSessionCode,
    isLoading,
    refreshSession,
    sessionCode,
  ]);

  const visibleError = error ?? callbackError ?? missingCodeError;

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 text-[#06201c]">
      <div className="w-full max-w-md rounded-2xl border border-[#d8e7e1] bg-[#f7fbf9] p-8 text-center">
        {visibleError ? (
          <>
            <h1 className="text-xl font-bold">Unable to complete sign in</h1>
            <p role="alert" className="mt-3 text-sm text-[#b42318]">{visibleError}</p>
            <a
              href="/auth/login"
              className="mt-6 inline-block rounded-xl bg-[#1f6a58] px-5 py-2.5 text-sm font-bold text-white"
            >
              Return to login
            </a>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold">Completing your sign in</h1>
            <p className="mt-3 text-sm text-[#52736a]">
              Please wait while we verify your session.
            </p>
          </>
        )}
      </div>
    </main>
  );
}

export default function ValidateLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-white text-sm font-semibold text-[#52736a]">
          Preparing secure sign in...
        </main>
      }
    >
      <ValidateLoginContent />
    </Suspense>
  );
}
