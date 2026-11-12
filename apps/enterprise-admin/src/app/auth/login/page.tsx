"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { startLogin } from "@ihp/auth";

/** Survives the OIDC round-trip in the same tab without putting data in the URL. */
const RETURN_TO_STORAGE_KEY = "ihp.enterprise.return-to";

/** Accepts only same-origin Enterprise Admin paths so a crafted link cannot redirect elsewhere. */
function isSafeAdminReturnTo(value: string | null): value is string {
  if (!value?.trim()) {
    return false;
  }

  try {
    const url = new URL(value, window.location.origin);
    return (
      url.origin === window.location.origin &&
      !url.username &&
      !url.password &&
      (url.pathname === "/admin" || url.pathname.startsWith("/admin/"))
    );
  } catch {
    return false;
  }
}

function EnterpriseLoginContent() {
  const searchParams = useSearchParams();
  const hasStartedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const returnTo = searchParams.get("return_to");
  const rememberMe = searchParams.get("rememberMe") === "true";

  useEffect(() => {
    if (hasStartedRef.current) {
      return;
    }
    hasStartedRef.current = true;

    if (isSafeAdminReturnTo(returnTo)) {
      window.sessionStorage.setItem(RETURN_TO_STORAGE_KEY, returnTo);
    }

    // Starting the flow on this origin makes the Invigorate session cookie
    // land on the Enterprise Admin host instead of the Shell host.
    void Promise.resolve()
      .then(() => {
        startLogin({
          frontendOrigin: window.location.origin,
          callbackPath: "/auth/validate",
          module: "enterprise",
          rememberMe,
        });
      })
      .catch((loginError: unknown) => {
        setError(
          loginError instanceof Error
            ? loginError.message
            : "Unable to start secure login.",
        );
      });
  }, [rememberMe, returnTo]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 text-[#06201c]">
      <div className="w-full max-w-md rounded-2xl border border-[#d8e7e1] bg-[#f7fbf9] p-8 text-center">
        {error ? (
          <>
            <h1 className="text-xl font-bold">Unable to start sign in</h1>
            <p role="alert" className="mt-3 text-sm text-[#b42318]">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 rounded-xl bg-[#1f6a58] px-5 py-2.5 text-sm font-bold text-white"
            >
              Try again
            </button>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold">Redirecting to secure sign in</h1>
            <p className="mt-3 text-sm text-[#52736a]">
              Please wait while we connect you to the Invigorate Health sign-in page.
            </p>
          </>
        )}
      </div>
    </main>
  );
}

export default function EnterpriseLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-white text-sm font-semibold text-[#52736a]">
          Preparing secure sign in...
        </main>
      }
    >
      <EnterpriseLoginContent />
    </Suspense>
  );
}
