"use client";

import CurrentEnterpriseGuard from "@/components/enterprise/CurrentEnterpriseGuard";
import AppShell from "@/components/layout/AppShell";
import { ProductsListScreen } from "@ihp/products";
import { EnterpriseCatalogManagement } from "@/components/enterprise/EnterpriseCatalogManagement";

export default function AdminProductsPage() {
  return (
    <CurrentEnterpriseGuard>
      {({ enterpriseId, enterpriseName }) => (
        <AppShell>
          <EnterpriseCatalogManagement module="product">
            <ProductsListScreen
              enterpriseFilterId={enterpriseId}
              enterpriseName={enterpriseName}
              createHref="/admin/products/create"
              detailHrefBase="/admin/products"
              editHrefBase="/admin/products"
            />
          </EnterpriseCatalogManagement>
        </AppShell>
      )}
    </CurrentEnterpriseGuard>
  );
}
