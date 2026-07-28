"use client";

import CurrentEnterpriseGuard from "@/components/enterprise/CurrentEnterpriseGuard";
import AppShell from "@/components/layout/AppShell";
import { ProductEditScreen } from "@ihp/products";

export default function AdminEditProductPage() {
  return (
    <CurrentEnterpriseGuard>
      {({ enterpriseId }) => (
        <AppShell>
          <ProductEditScreen
            enterpriseFilterId={enterpriseId}
            listHref="/admin/products"
            detailHrefBase="/admin/products"
          />
        </AppShell>
      )}
    </CurrentEnterpriseGuard>
  );
}
