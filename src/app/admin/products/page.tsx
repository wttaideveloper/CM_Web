"use client";

import { ProductsPage } from "@/app/products/page";
import AppShell from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentEnterprise } from "@/contexts/CurrentEnterpriseContext";

export default function AdminProductsPage() {
  const { authenticatedUser } = useAuth();
  const { enterpriseId, enterpriseName } = useCurrentEnterprise();
  const tenantName = authenticatedUser?.membership?.tenantName ?? authenticatedUser?.roles?.tenantName ?? "this tenant";

  if (!enterpriseId) {
    return (
      <AppShell>
        <section className="rounded-2xl border border-[#e1ebe6] bg-white px-5 py-12 shadow-sm">
          <h2 className="text-lg font-bold text-[#06201c]">Marketplace enterprise is not linked yet</h2>
          <p className="mt-2 text-sm text-[#52736a]">
            Product listing is unavailable until a marketplace enterprise is linked for {tenantName}.
          </p>
        </section>
      </AppShell>
    );
  }

  return (
    <ProductsPage
      enterpriseFilterId={enterpriseId}
      enterpriseName={enterpriseName}
      createHref="/admin/products/create"
      detailHrefBase="/admin/products"
      editHrefBase="/admin/products"
    />
  );
}
