"use client";

import { ServiceCreatePage } from "@/app/services/create/page";
import AppShell from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentEnterprise } from "@/contexts/CurrentEnterpriseContext";

export default function AdminCreateServicePage() {
  const { authenticatedUser } = useAuth();
  const { enterpriseId } = useCurrentEnterprise();
  const tenantName = authenticatedUser?.membership?.tenantName ?? authenticatedUser?.roles?.tenantName ?? "this tenant";

  if (!enterpriseId) {
    return (
      <AppShell>
        <section className="rounded-2xl border border-[#e1ebe6] bg-white px-5 py-12 shadow-sm">
          <h2 className="text-lg font-bold text-[#06201c]">Marketplace enterprise is not linked yet</h2>
          <p className="mt-2 text-sm text-[#52736a]">
            Service creation is disabled until a marketplace enterprise is linked for {tenantName}.
          </p>
        </section>
      </AppShell>
    );
  }

  return <ServiceCreatePage mode="enterprise-admin" redirectTo="/admin/services" />;
}
