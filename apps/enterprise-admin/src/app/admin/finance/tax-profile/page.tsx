"use client";

import { useAuth } from "@ihp/auth";
import { useTenant } from "@ihp/enterprise-runtime";

import CurrentEnterpriseGuard from "@/components/CurrentEnterpriseGuard";
import EnterpriseMerchantTaxProfileScreen from "@/components/EnterpriseMerchantTaxProfileScreen";

/** Hosts the read-only merchant tax profile in authenticated tenant and enterprise scope. */
export default function EnterpriseMerchantTaxProfilePage() {
  const { user } = useAuth();
  const { tenantId, isLoadingTenant, tenantError } = useTenant();
  const accountId = user?.id ?? user?.userId ?? null;

  if (isLoadingTenant) return <section role="status" className="p-6 text-sm text-[#52736a]">Loading authenticated tenant…</section>;
  if (!tenantId || !accountId) return <section role="alert" className="p-6 text-sm text-[#8f3b2f]">{tenantError ?? "Authenticated tenant or account is unavailable. Profile data was not requested."}</section>;

  return <CurrentEnterpriseGuard>{({ enterpriseId }) => <EnterpriseMerchantTaxProfileScreen accountId={accountId} tenantId={tenantId} enterpriseId={enterpriseId} />}</CurrentEnterpriseGuard>;
}
