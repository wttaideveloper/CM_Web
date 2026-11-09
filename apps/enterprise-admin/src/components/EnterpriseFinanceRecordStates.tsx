"use client";

import { useTranslation } from "react-i18next";
import { enterpriseFinanceErrorKey } from "@/lib/enterprise-refunds-invoices";

/** Shows a status-preserving error and user-triggered retry for a Commerce query. */
export function FinanceRecordError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { t } = useTranslation("enterpriseFinanceRecords");
  const message = t(enterpriseFinanceErrorKey(error));
  return <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-4 text-sm text-[#8f3b2f]"><span>{message}</span><button type="button" onClick={onRetry} className="rounded-lg border border-[#d8a7a0] px-3 py-1.5 font-semibold">{t("retry")}</button></div>;
}

/** Renders stable page controls for backend-paginated Enterprise Finance lists. */
export function FinanceRecordPager({ page, pageCount, total, busy, onPage }: { page: number; pageCount: number; total: number; busy: boolean; onPage: (page: number) => void }) {
  const { t } = useTranslation("enterpriseFinanceRecords");
  return <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf3f0] px-4 py-3 text-sm text-[#52736a]"><span>{t("page", { current: page, total: pageCount, count: total })}</span><div className="flex gap-2"><button type="button" disabled={page <= 1 || busy} onClick={() => onPage(Math.max(1, page - 1))} className="rounded-lg border border-[#d7e5df] px-3 py-1.5 disabled:opacity-50">{t("previous")}</button><button type="button" disabled={page >= pageCount || busy} onClick={() => onPage(page + 1)} className="rounded-lg border border-[#d7e5df] px-3 py-1.5 disabled:opacity-50">{t("next")}</button></div></div>;
}
