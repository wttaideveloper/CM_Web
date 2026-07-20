"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/contexts/AuthContext";

export default function AdminAuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { authenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !authenticated) {
      router.replace("/auth/login");
    }
  }, [authenticated, isLoading, router]);

  if (isLoading || !authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white text-sm font-semibold text-[#52736a]">
        Checking your session...
      </main>
    );
  }

  return children;
}
