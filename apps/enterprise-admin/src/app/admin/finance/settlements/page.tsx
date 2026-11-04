"use client";

import { useAuth } from "@ihp/auth";
import { useTenant } from "@ihp/enterprise-runtime";

import CurrentEnterpriseGuard from "@/components/CurrentEnterpriseGuard";
import EnterpriseSettlementsScreen from "@/components/EnterpriseSettlementsScreen";

/** Hosts read-only Settlements inside the authenticated current-enterprise context. */
export default function EnterpriseSettlementsPage() {
  const { user } = useAuth();
  const { tenantId, isLoadingTenant, tenantError } = useTenant();
  const accountId = user?.id ?? user?.userId ?? null;
  if (isLoadingTenant) return <section role="status" className="p-6 text-sm text-[#52736a]">Loading authenticated tenant…</section>;
  if (!tenantId) return <section role="alert" className="p-6 text-sm text-[#8f3b2f]">{tenantError ?? "Authenticated tenant is unavailable. Settlement records were not requested."}</section>;
  return <CurrentEnterpriseGuard>{({ enterpriseId, enterpriseName }) => <EnterpriseSettlementsScreen accountId={accountId} tenantId={tenantId} enterpriseId={enterpriseId} enterpriseName={enterpriseName} />}</CurrentEnterpriseGuard>;
}
