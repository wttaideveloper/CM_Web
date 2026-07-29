"use client";

import AppShell from "@/components/layout/AppShell";
import { EnterpriseDetailsScreen } from "@ihp/enterprises";
import {
  loadEnterpriseProductSummaries,
  loadEnterpriseServiceSummaries,
} from "@/adapters/enterprise-screen-loaders";

export default function SuperAdminEnterpriseDetailsPage() {
  return (
    <AppShell>
      <EnterpriseDetailsScreen
        enterpriseProductsLoader={loadEnterpriseProductSummaries}
        enterpriseServicesLoader={loadEnterpriseServiceSummaries}
      />
    </AppShell>
  );
}
