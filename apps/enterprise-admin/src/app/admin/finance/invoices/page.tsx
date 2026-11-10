"use client";

import { useAuth } from "@ihp/auth";
import { useTenant } from "@ihp/enterprise-runtime";
import { useTranslation } from "react-i18next";

import CurrentEnterpriseGuard from "@/components/CurrentEnterpriseGuard";
import EnterpriseInvoicesScreen from "@/components/EnterpriseInvoicesScreen";

/** Hosts the read-only Invoices screen within the authenticated current-enterprise context. */
export default function EnterpriseInvoicesPage() {
  const { user } = useAuth();
  const { tenantId, isLoadingTenant, tenantError } = useTenant();
  const { t } = useTranslation("enterpriseFinanceRecords");
  const accountId = user?.id ?? user?.userId ?? null;
  if (isLoadingTenant) return <section role="status" className="p-6 text-sm text-[#52736a]">{t("loading")}</section>;
  if (!tenantId || !accountId) return <section role="alert" className="p-6 text-sm text-[#8f3b2f]">{tenantError ?? t("tenantUnavailable")}</section>;
  return <CurrentEnterpriseGuard>{({ enterpriseId, enterpriseName }) => <EnterpriseInvoicesScreen accountId={accountId} tenantId={tenantId} enterpriseId={enterpriseId} enterpriseName={enterpriseName} />}</CurrentEnterpriseGuard>;
}
