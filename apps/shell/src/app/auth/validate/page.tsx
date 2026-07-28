"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { completeLogin } from "@/services/auth.service";
import { loginMarketplaceDemoUser } from "@/services/marketplace-demo-auth.service";

function ValidateLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authenticated, isLoading, refreshSession } = useAuth();
  const hasStartedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const sessionCode = searchParams.get("he_session_code")?.trim() ?? "";
  const missingCodeError =
    !isLoading && !authenticated && !sessionCode
      ? "The login link is missing its session code. Please start the login again."
      : null;

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (authenticated) {
      router.replace("/admin/dashboard");
      return;
    }

    if (hasStartedRef.current) {
      return;
    }

    if (!sessionCode) {
      return;
    }

    hasStartedRef.current = true;

    const finishLogin = async () => {
      try {
        const result = await completeLogin(sessionCode);
        if (result.authenticated === false || !result.data) {
          throw new Error("The login session could not be authenticated.");
        }

        await refreshSession();

        // Phase 1 keeps chat on its existing temporary bearer-token authentication.
        await loginMarketplaceDemoUser().catch(() => undefined);
      } catch (loginError) {
        setError(loginError instanceof Error ? loginError.message : "Unable to complete login.");
      }
    };

    void finishLogin();
  }, [authenticated, isLoading, refreshSession, router, sessionCode]);

  const visibleError = error ?? missingCodeError;

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 text-[#06201c]">
      <div className="w-full max-w-md rounded-2xl border border-[#d8e7e1] bg-[#f7fbf9] p-8 text-center">
        {visibleError ? (
          <>
            <h1 className="text-xl font-bold">Unable to complete sign in</h1>
            <p className="mt-3 text-sm text-[#b42318]">{visibleError}</p>
            <button
              type="button"
              onClick={() => router.replace("/auth/login")}
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
