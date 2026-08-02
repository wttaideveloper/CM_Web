"use client";

import PlatformAdminShell from "@/components/PlatformAdminShell";
import { EnterpriseDetailsScreen } from "@ihp/enterprises";
import {
  loadEnterpriseProductSummaries,
  loadEnterpriseServiceSummaries,
} from "@ihp/platform-enterprises";

export default function PlatformEnterpriseDetailsPage() {
  return (
    <PlatformAdminShell>
      <EnterpriseDetailsScreen
        enterpriseProductsLoader={loadEnterpriseProductSummaries}
        enterpriseServicesLoader={loadEnterpriseServiceSummaries}
      />
    </PlatformAdminShell>
  );
}
