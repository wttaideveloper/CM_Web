"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { isInternalUserRole, useAuth } from "@ihp/auth";

export default function EnterpriseListingManagementGuard({
  redirectTo,
  children,
}: {
  redirectTo: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const { authReady, roles } = useAuth();
  const isProvider = isInternalUserRole(roles?.tenantRole);

  useEffect(() => {
    if (authReady && isProvider) {
      router.replace(redirectTo);
    }
  }, [authReady, isProvider, redirectTo, router]);

  if (!authReady || isProvider) {
    return (
      <div role="status" className="rounded-2xl border border-[#e1ebe6] bg-white p-6 text-sm text-[#52736a]">
        Checking listing access...
      </div>
    );
  }

  return <>{children}</>;
}
