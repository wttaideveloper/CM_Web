"use client";

import { CommerceApiError, getMerchantTaxProfile } from "@ihp/commerce";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { enterpriseMerchantTaxProfileQueryKey, formatMerchantTaxProfileDate, getEnterpriseMerchantTaxProfileState, hasEnterpriseMerchantTaxProfileScope, merchantTaxProfileDisplayFields, parseEnterpriseMerchantTaxProfile } from "@/lib/enterprise-merchant-tax-profile";
import { FinanceRecordError } from "./EnterpriseFinanceRecordStates";

const REQUEST_OPTIONS = { baseUrl: "/api/enterprise-commerce" } as const;

/** Displays the merchant-profile read state without guessing undocumented tax fields. */
export default function EnterpriseMerchantTaxProfileScreen({ accountId, tenantId, enterpriseId }: { accountId: string; tenantId: string; enterpriseId: string }) {
  const { t } = useTranslation("enterpriseFinanceRecords");
  const query = useQuery({
    queryKey: enterpriseMerchantTaxProfileQueryKey(accountId, tenantId, enterpriseId),
    queryFn: async () => parseEnterpriseMerchantTaxProfile(await getMerchantTaxProfile(REQUEST_OPTIONS), tenantId),
    enabled: hasEnterpriseMerchantTaxProfileScope(accountId, tenantId, enterpriseId),
    retry: (count, error) => !(error instanceof CommerceApiError && [401, 403, 404, 422].includes(error.status)) && count < 1,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  const profileState = getEnterpriseMerchantTaxProfileState({ isLoading: query.isPending, isError: query.isError, error: query.error, profile: query.data });
  const fields = query.data ? merchantTaxProfileDisplayFields(query.data) : [];

  return <main className="min-w-0 space-y-5 bg-white p-4 sm:p-6 lg:p-8" aria-labelledby="enterprise-merchant-tax-profile-title">
    <header>
      <h1 id="enterprise-merchant-tax-profile-title" className="text-2xl font-extrabold text-[#06201c]">{t("merchantTaxProfileTitle")}</h1>
      <p className="mt-2 max-w-3xl text-sm text-[#52736a]">{t("merchantTaxProfileDescription")}</p>
    </header>
    <section aria-labelledby="enterprise-merchant-tax-profile-panel-title" className="rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="enterprise-merchant-tax-profile-panel-title" className="text-lg font-bold text-[#06201c]">{t("merchantTaxProfileTitle")}</h2>
        <span className="rounded-full border border-[#d7e5df] px-3 py-1 text-xs font-semibold text-[#31594d]">{t("merchantTaxProfileReadOnly")}</span>
      </div>
      {profileState === "loading" ? <p role="status" className="mt-4 text-sm text-[#52736a]">{t("merchantTaxProfileLoading")}</p> : null}
      {profileState === "error" ? <div className="mt-4"><FinanceRecordError error={query.error} onRetry={() => void query.refetch()} /></div> : null}
      {profileState === "missing-profile" ? <div role="status" className="mt-4 rounded-xl border border-[#edf3f0] bg-[#fbfdfc] p-4 text-sm text-[#52736a]"><p className="font-semibold">{t("merchantTaxProfileMissing")}</p><p className="mt-1">{t("merchantTaxProfileCreationPending")}</p></div> : null}
      {profileState === "loaded" && query.data ? <dl className="mt-5 grid gap-4 sm:grid-cols-2">{fields.map(({ key, value }) => <div key={key} className="min-w-0 rounded-xl border border-[#edf3f0] p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-[#52736a]">{t(key)}</dt><dd className="mt-1 break-words text-sm text-[#06201c]">{key === "merchantTaxRegistrationStatus" ? t(value) : key === "merchantTaxProfileUpdatedAt" ? (formatMerchantTaxProfileDate(value || null) || t("merchantTaxProfileNotProvided")) : value || t("merchantTaxProfileNotProvided")}</dd></div>)}</dl> : null}
    </section>
    <p className="text-xs text-[#7f9d94]">{t("merchantTaxProfileCreationPending")}</p>
  </main>;
}
