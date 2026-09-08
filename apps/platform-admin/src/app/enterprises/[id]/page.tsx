"use client";

import PlatformAdminShell from "@/components/PlatformAdminShell";
import { EnterpriseDetailsScreen } from "@ihp/enterprises";
import {
  getPlatformEnterpriseById,
  getPlatformEnterpriseLocations,
  createPlatformEnterpriseLocation,
  updatePlatformEnterpriseLocation,
  deletePlatformEnterpriseLocation,
  getPlatformEnterprises,
  loadEnterpriseProductSummaries,
  loadEnterpriseServiceSummaries,
} from "@ihp/platform-enterprises";

export default function PlatformEnterpriseDetailsPage() {
  return (
    <PlatformAdminShell>
      <EnterpriseDetailsScreen
        enterpriseLoader={getPlatformEnterpriseById}
        enterprisesLoader={getPlatformEnterprises}
        enterpriseLocationsLoader={getPlatformEnterpriseLocations}
        createLocationAction={createPlatformEnterpriseLocation}
        updateLocationAction={updatePlatformEnterpriseLocation}
        deleteLocationAction={deletePlatformEnterpriseLocation}
        enterpriseProductsLoader={loadEnterpriseProductSummaries}
        enterpriseServicesLoader={loadEnterpriseServiceSummaries}
      />
    </PlatformAdminShell>
  );
}
