"use client";

import { ServiceBookingManagementScreen } from "@ihp/services";

import CurrentEnterpriseGuard from "@/components/CurrentEnterpriseGuard";
import EnterpriseListingManagementGuard from "@/components/EnterpriseListingManagementGuard";

export default function EnterpriseServiceBookingsPage() {
  return (
    <EnterpriseListingManagementGuard redirectTo="/admin/services">
      <CurrentEnterpriseGuard>
        {({ enterpriseId, enterpriseName }) => (
          <ServiceBookingManagementScreen enterpriseId={enterpriseId} enterpriseName={enterpriseName} />
        )}
      </CurrentEnterpriseGuard>
    </EnterpriseListingManagementGuard>
  );
}
