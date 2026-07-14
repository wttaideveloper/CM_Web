"use client";

import { ServicesPage } from "@/app/services/page";
import AppShell from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentEnterprise } from "@/contexts/CurrentEnterpriseContext";

export default function AdminServicesPage() {
  const { authenticatedUser } = useAuth();
  const { enterpriseId, enterpriseName } = useCurrentEnterprise();
  const tenantName = authenticatedUser?.membership?.tenantName ?? authenticatedUser?.roles?.tenantName ?? "this tenant";

  if (!enterpriseId) {
    return (
      <AppShell>
        <section className="rounded-2xl border border-[#e1ebe6] bg-white px-5 py-12 shadow-sm">
          <h2 className="text-lg font-bold text-[#06201c]">Marketplace enterprise is not linked yet</h2>
          <p className="mt-2 text-sm text-[#52736a]">
            Service listing is unavailable until a marketplace enterprise is linked for {tenantName}.
          </p>
        </section>
      </AppShell>
    );
  }

  return (
    <ServicesPage
      enterpriseFilterId={enterpriseId}
      enterpriseName={enterpriseName}
      createHref="/admin/services/create"
      detailHrefBase="/admin/services"
      editHrefBase="/admin/services"
    />
  );
}
