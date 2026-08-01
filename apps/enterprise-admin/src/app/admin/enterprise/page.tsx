"use client";

import { EnterpriseDetailsScreen } from "@ihp/enterprises";

import {
  loadEnterpriseProductSummaries,
  loadEnterpriseServiceSummaries,
} from "@/adapters/enterprise-screen-loaders";
import CurrentEnterpriseGuard from "@/components/CurrentEnterpriseGuard";

export default function EnterprisePage() {
  return (
    <CurrentEnterpriseGuard>
      {({ enterpriseId }) => (
        <EnterpriseDetailsScreen
          enterpriseId={enterpriseId}
          allowEnterpriseSelector={false}
          editHref="/admin/enterprise/edit"
          productCreateHref="/admin/products/create"
          serviceCreateHref="/admin/services/create"
          enterpriseProductsLoader={loadEnterpriseProductSummaries}
          enterpriseServicesLoader={loadEnterpriseServiceSummaries}
          emptyValue="—"
        />
      )}
    </CurrentEnterpriseGuard>
  );
}
