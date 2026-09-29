"use client";

import { usePathname, useRouter } from "next/navigation";
import { type ReactNode } from "react";

import { RequireAuthenticated } from "@ihp/auth";

export default function AdminAuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <RequireAuthenticated
      unauthenticatedRedirectPath="/auth/login"
      redirect={(path) => router.replace(`${path}?return_to=${encodeURIComponent(pathname)}`)}
      loadingFallback={(
        <main className="flex min-h-screen items-center justify-center bg-white text-sm font-semibold text-[#52736a]">
          Checking your session...
        </main>
      )}
    >
      {children}
    </RequireAuthenticated>
  );
}
