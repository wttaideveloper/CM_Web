"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import {
  completeLogin,
  getEnterpriseAdminAppOrigin,
  getPlatformAdminAppOrigin,
  getSafeEnterpriseAdminReturnUrl,
  getSafePlatformAdminReturnUrl,
  getSafeShellReturnPath,
  restartLogin,
  useAuth,
} from "@ihp/auth";
import { loginMarketplaceDemoUser } from "@/services/marketplace-demo-auth.service";

function ValidateLoginContent() {
  const searchParams = useSearchParams();
  const { authenticated, isLoading, membership, refreshSession, user } = useAuth();
  const hasStartedRef = useRef(false);
  const refreshTokenRef = useRef<string | null>(null);
  const [hasCompletedSessionCode, setHasCompletedSessionCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionCode = searchParams.get("he_session_code")?.trim() ?? "";
  const enterpriseAdminReturnUrl = getSafeEnterpriseAdminReturnUrl(searchParams.get("return_to"));
  const platformAdminReturnUrl = getSafePlatformAdminReturnUrl(searchParams.get("return_to"));
  const crossAppReturnUrl = enterpriseAdminReturnUrl ?? platformAdminReturnUrl;
  const shellReturnPath = getSafeShellReturnPath(searchParams.get("return_to"));
  const callbackError = searchParams.get("error")?.trim() || null;
  const isGoogleOwnerSignup = searchParams.get("owner_signup") === "google";
  const missingCodeError =
    !isLoading && !authenticated && (!sessionCode || hasCompletedSessionCode)
      ? "The login link is missing its session code. Please start the login again."
      : null;
  const enterpriseAdminOriginError =
    authenticated && !crossAppReturnUrl && !getEnterpriseAdminAppOrigin()
      ? "Enterprise Admin origin is not configured."
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

          const refreshToken = result.tokens?.refresh_token;
          if (refreshToken) {
            refreshTokenRef.current = refreshToken;
            await fetch("/api/platform-super-admin/session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                refreshToken,
                rememberMe: searchParams.get("rememberMe") === "true",
              }),
            }).catch(() => undefined);
          }

          await refreshSession();

          // Phase 1 keeps chat on its existing temporary bearer-token authentication.
          await loginMarketplaceDemoUser().catch(() => undefined);
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

    if (authenticated) {
      if (isGoogleOwnerSignup && membership === null) {
        const organizationSetupUrl = new URL("/auth/register", window.location.origin);
        if (isGoogleOwnerSignup) {
          organizationSetupUrl.searchParams.set("owner_signup", "google");
        }
        window.location.replace(organizationSetupUrl.toString());
        return;
      }
      if (platformAdminReturnUrl) {
        const platformAdminOrigin = getPlatformAdminAppOrigin();
        if (platformAdminOrigin) {
          const targetUrl = new URL(platformAdminReturnUrl);
          const targetPath = targetUrl.pathname + targetUrl.search;
          const token = refreshTokenRef.current;
          if (token) {
            const handoffUrl = new URL("/api/platform-super-admin/session/handoff", platformAdminOrigin);
            handoffUrl.searchParams.set("token", token);
            handoffUrl.searchParams.set("return_to", targetPath);
            if (searchParams.get("rememberMe") === "true") {
              handoffUrl.searchParams.set("rememberMe", "true");
            }
            window.location.replace(handoffUrl.toString());
            return;
          }
        }
        window.location.replace(platformAdminReturnUrl);
        return;
      }

      if (enterpriseAdminReturnUrl) {
        window.location.replace(enterpriseAdminReturnUrl);
        return;
      }

      if (shellReturnPath) {
        window.location.replace(shellReturnPath);
        return;
      }

      const userObj = user as unknown as Record<string, unknown> | null;
      const isSuperAdmin = Boolean(
        userObj?.isSuperAdmin === true ||
        userObj?.is_super_admin === true ||
        userObj?.role === "super_admin" ||
        userObj?.user_role === "super_admin" ||
        (userObj?.roles && typeof userObj.roles === "object" && ((userObj.roles as Record<string, unknown>).userRole === "super_admin" || (userObj.roles as Record<string, unknown>).role === "super_admin")) ||
        (Array.isArray(userObj?.groups) && userObj.groups.includes("super_admin"))
      );

      if (isSuperAdmin) {
        const platformAdminOrigin = getPlatformAdminAppOrigin();
        if (platformAdminOrigin) {
          const token = refreshTokenRef.current;
          if (token) {
            const handoffUrl = new URL("/api/platform-super-admin/session/handoff", platformAdminOrigin);
            handoffUrl.searchParams.set("token", token);
            handoffUrl.searchParams.set("return_to", "/dashboard");
            if (searchParams.get("rememberMe") === "true") {
              handoffUrl.searchParams.set("rememberMe", "true");
            }
            window.location.replace(handoffUrl.toString());
            return;
          }
          window.location.replace(new URL("/dashboard", platformAdminOrigin).toString());
          return;
        }
      }

      const enterpriseAdminOrigin = getEnterpriseAdminAppOrigin();
      if (!enterpriseAdminOrigin) {
        return;
      }

      window.location.replace(new URL("/admin/dashboard", enterpriseAdminOrigin).toString());
    }
  }, [
    authenticated,
    callbackError,
    crossAppReturnUrl,
    shellReturnPath,
    hasCompletedSessionCode,
    isGoogleOwnerSignup,
    isLoading,
    membership,
    refreshSession,
    sessionCode,
    user,
  ]);

  const visibleError = error ?? callbackError ?? missingCodeError ?? enterpriseAdminOriginError;

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
