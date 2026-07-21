"use client";

import type { ReactNode } from "react";

import AppShell from "@/components/layout/AppShell";
import { useCurrentEnterprise } from "@/contexts/CurrentEnterpriseContext";

type CurrentEnterpriseGuardProps = {
  children: (enterprise: { enterpriseId: string; enterpriseName: string }) => ReactNode;
};

export default function CurrentEnterpriseGuard({ children }: CurrentEnterpriseGuardProps) {
  const { currentEnterprise, enterpriseError, enterpriseId, isLoadingEnterprise } = useCurrentEnterprise();

  if (isLoadingEnterprise) {
    return (
      <AppShell>
        <section className="rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm">
          <p className="text-base font-bold text-[#06201c]">Loading enterprise...</p>
          <p className="mt-2 text-sm text-[#52736a]">Please wait while we resolve your organization&apos;s enterprise.</p>
        </section>
      </AppShell>
    );
  }

  if (!enterpriseId || !currentEnterprise) {
    return (
      <AppShell>
        <section className="rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm">
          <p className="text-base font-bold text-[#06201c]">Enterprise unavailable</p>
          <p className="mt-2 text-sm text-[#52736a]">
            {enterpriseError ?? "No enterprise is linked to this organization yet."}
          </p>
        </section>
      </AppShell>
    );
  }

  const enterpriseName =
    currentEnterprise.business_legal_name || currentEnterprise.business_short_name || currentEnterprise.name || "Unnamed Enterprise";

  return children({ enterpriseId, enterpriseName });
}
