"use client";

import { useParams } from "next/navigation";

import CurrentEnterpriseGuard from "@/components/enterprise/CurrentEnterpriseGuard";
import AppShell from "@/components/layout/AppShell";
import { ProductDetailsScreen } from "@ihp/products";
import { EnterpriseCatalogManagement } from "@/components/enterprise/EnterpriseCatalogManagement";

export default function AdminProductDetailsPage() {
  const params = useParams<{ id: string }>();
  return (
    <CurrentEnterpriseGuard>
      {({ enterpriseId }) => (
        <AppShell>
          <EnterpriseCatalogManagement module="product" itemId={params.id}>
            <ProductDetailsScreen
              enterpriseFilterId={enterpriseId}
              listHref="/admin/products"
              editHrefBase="/admin/products"
            />
          </EnterpriseCatalogManagement>
        </AppShell>
      )}
    </CurrentEnterpriseGuard>
  );
}
