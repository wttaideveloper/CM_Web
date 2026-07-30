"use client";

import { EnterpriseDetailsScreen } from "@ihp/enterprises";

import {
  loadEnterpriseProductSummaries,
  loadEnterpriseServiceSummaries,
} from "@/adapters/enterprise-screen-loaders";
import CurrentEnterpriseGuard from "@/components/CurrentEnterpriseGuard";
import { getShellRoute } from "@/lib/shell-route";

export default function EnterprisePage() {
  return (
    <CurrentEnterpriseGuard>
      {({ enterpriseId }) => (
        <EnterpriseDetailsScreen
          enterpriseId={enterpriseId}
          allowEnterpriseSelector={false}
          editHref="/admin/enterprise/edit"
          productCreateHref={getShellRoute("/admin/products/create")}
          serviceCreateHref={getShellRoute("/admin/services/create")}
          enterpriseProductsLoader={loadEnterpriseProductSummaries}
          enterpriseServicesLoader={loadEnterpriseServiceSummaries}
          emptyValue="—"
        />
      )}
    </CurrentEnterpriseGuard>
  );
}
