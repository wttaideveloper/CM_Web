"use client";

import { EnterpriseDetailsPage } from "@/app/enterprises/[id]/page";
import AppShell from "@/components/layout/AppShell";
import { useCurrentEnterprise } from "@/contexts/CurrentEnterpriseContext";

export default function AdminEnterprisePage() {
  const { enterpriseId, enterpriseError, isLoadingEnterprise } = useCurrentEnterprise();

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

  if (!enterpriseId) {
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

  return (
    <EnterpriseDetailsPage
      enterpriseId={enterpriseId}
      editHref="/admin/enterprise/edit"
      productCreateHref="/admin/products/create"
      serviceCreateHref="/admin/services/create"
      allowEnterpriseSelector={false}
      emptyValue="—"
    />
  );
}
