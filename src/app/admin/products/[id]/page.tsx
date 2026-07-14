"use client";

import { ProductDetailsPage } from "@/app/products/[id]/page";
import AppShell from "@/components/layout/AppShell";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentEnterprise } from "@/contexts/CurrentEnterpriseContext";

export default function AdminProductDetailsPage() {
  const { authenticatedUser } = useAuth();
  const { enterpriseId } = useCurrentEnterprise();
  const tenantName = authenticatedUser?.membership?.tenantName ?? authenticatedUser?.roles?.tenantName ?? "this tenant";

  if (!enterpriseId) {
    return (
      <AppShell>
        <section className="rounded-2xl border border-[#e1ebe6] bg-white px-5 py-12 shadow-sm">
          <h2 className="text-lg font-bold text-[#06201c]">Marketplace enterprise is not linked yet</h2>
          <p className="mt-2 text-sm text-[#52736a]">
            Product details are unavailable until a marketplace enterprise is linked for {tenantName}.
          </p>
        </section>
      </AppShell>
    );
  }

  return (
    <ProductDetailsPage
      enterpriseFilterId={enterpriseId}
      listHref="/admin/products"
      editHrefBase="/admin/products"
    />
  );
}
