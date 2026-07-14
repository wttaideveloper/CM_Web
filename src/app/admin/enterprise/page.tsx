"use client";

import { EnterpriseDetailsPage } from "@/app/enterprises/[id]/page";
import AppShell from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentEnterprise } from "@/contexts/CurrentEnterpriseContext";

export default function AdminEnterprisePage() {
  const { authenticatedUser } = useAuth();
  const { enterpriseId } = useCurrentEnterprise();
  const tenantName = authenticatedUser?.membership?.tenantName ?? authenticatedUser?.roles?.tenantName ?? "this tenant";

  if (!enterpriseId) {
    return (
      <AppShell>
        <section className="rounded-2xl border border-[#e1ebe6] bg-white px-5 py-12 shadow-sm">
          <h2 className="text-lg font-bold text-[#06201c]">Marketplace enterprise is not linked yet</h2>
          <p className="mt-2 text-sm text-[#52736a]">
            We could not resolve a marketplace enterprise for {tenantName}. The rest of the admin portal still works.
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
