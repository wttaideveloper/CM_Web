"use client";

import CurrentEnterpriseGuard from "@/components/enterprise/CurrentEnterpriseGuard";
import AppShell from "@/components/layout/AppShell";
import { ProductDetailsScreen } from "@ihp/products";

export default function AdminProductDetailsPage() {
  return (
    <CurrentEnterpriseGuard>
      {({ enterpriseId }) => (
        <AppShell>
          <ProductDetailsScreen
            enterpriseFilterId={enterpriseId}
            listHref="/admin/products"
            editHrefBase="/admin/products"
          />
        </AppShell>
      )}
    </CurrentEnterpriseGuard>
  );
}
