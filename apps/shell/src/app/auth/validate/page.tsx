"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import {
  completeLogin,
  getEnterpriseAdminAppOrigin,
  getSafeEnterpriseAdminReturnUrl,
  getSafePlatformAdminReturnUrl,
  restartLogin,
  useAuth,
} from "@ihp/auth";
import { loginMarketplaceDemoUser } from "@/services/marketplace-demo-auth.service";

function ValidateLoginContent() {
  const searchParams = useSearchParams();
  const { authenticated, isLoading, membership, refreshSession } = useAuth();
  const hasStartedRef = useRef(false);
  const [hasCompletedSessionCode, setHasCompletedSessionCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionCode = searchParams.get("he_session_code")?.trim() ?? "";
  const enterpriseAdminReturnUrl = getSafeEnterpriseAdminReturnUrl(searchParams.get("return_to"));
  const platformAdminReturnUrl = getSafePlatformAdminReturnUrl(searchParams.get("return_to"));
  const crossAppReturnUrl = enterpriseAdminReturnUrl ?? platformAdminReturnUrl;
  const callbackError = searchParams.get("error")?.trim() || null;
  const isGoogleOwnerSignup = searchParams.get("owner_signup") === "google";
  const missingCodeError =
    !isLoading && !authenticated && (!sessionCode || hasCompletedSessionCode)
      ? "The login link is missing its session code. Please start the login again."
      : null;

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    console.log("[AUTH DEBUG] Validate callback loaded", {
      origin: window.location.origin,
      path: window.location.pathname,
      queryParameterNames: Array.from(new Set(searchParams.keys())),
    });
  }, [searchParams]);

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
          const result = await completeLogin(sessionCode);
          if (result.authenticated === false || !result.data) {
            throw new Error("The login session could not be authenticated.");
          }

          const callbackUrl = new URL(window.location.href);
          callbackUrl.searchParams.delete("he_session_code");
          window.history.replaceState(window.history.state, "", `${callbackUrl.pathname}${callbackUrl.search}${callbackUrl.hash}`);

          await refreshSession();

          // Phase 1 keeps chat on its existing temporary bearer-token authentication.
          await loginMarketplaceDemoUser().catch(() => undefined);
          setHasCompletedSessionCode(true);
        } catch (loginError) {
          setError(loginError instanceof Error ? loginError.message : "Unable to complete login.");
        }
      };

      void finishLogin();
      return;
    }

    if (authenticated) {
      if (isGoogleOwnerSignup && membership === null) {
        const organizationSetupUrl = new URL("/auth/register", window.location.origin);
        if (isGoogleOwnerSignup) {
          organizationSetupUrl.searchParams.set("owner_signup", "google");
        }
        window.location.replace(organizationSetupUrl.toString());
        return;
      }
      if (crossAppReturnUrl) {
        window.location.replace(crossAppReturnUrl);
      } else {
        const enterpriseAdminOrigin = getEnterpriseAdminAppOrigin();
        if (!enterpriseAdminOrigin) {
          setError("Enterprise Admin origin is not configured.");
          return;
        }

        window.location.replace(new URL("/admin/dashboard", enterpriseAdminOrigin).toString());
      }
    }
  }, [
    authenticated,
    callbackError,
    crossAppReturnUrl,
    hasCompletedSessionCode,
    isGoogleOwnerSignup,
    isLoading,
    membership,
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
            <p className="mt-3 text-sm text-[#b42318]">{visibleError}</p>
            <button
              type="button"
              onClick={() => restartLogin()}
              className="mt-6 rounded-xl bg-[#1f6a58] px-5 py-2.5 text-sm font-bold text-white"
            >
              Return to login
            </button>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold">Completing your sign in</h1>
            <p className="mt-3 text-sm text-[#52736a]">Please wait while we verify your session.</p>
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
