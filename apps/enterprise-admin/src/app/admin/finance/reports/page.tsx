"use client";

import { useAuth } from "@ihp/auth";
import { useTenant } from "@ihp/enterprise-runtime";

import CurrentEnterpriseGuard from "@/components/CurrentEnterpriseGuard";
import EnterpriseFinanceReportsScreen from "@/components/EnterpriseFinanceReportsScreen";

/** Hosts merchant reports in the authenticated tenant and current-enterprise context. */
export default function EnterpriseFinanceReportsPage() {
  const { user } = useAuth();
  const { tenantId, isLoadingTenant, tenantError } = useTenant();
  const accountId = user?.id ?? user?.userId ?? null;
  if (isLoadingTenant) return <section role="status" className="p-6 text-sm text-[#52736a]">Loading authenticated tenant…</section>;
  if (!tenantId || !accountId) return <section role="alert" className="p-6 text-sm text-[#8f3b2f]">{tenantError ?? "Authenticated account or tenant is unavailable. Reports were not requested."}</section>;
  return <CurrentEnterpriseGuard>{({ enterpriseId, enterpriseName }) => <EnterpriseFinanceReportsScreen accountId={accountId} tenantId={tenantId} enterpriseId={enterpriseId} enterpriseName={enterpriseName} />}</CurrentEnterpriseGuard>;
}
