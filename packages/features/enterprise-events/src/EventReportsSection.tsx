"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslation } from "react-i18next";

import { EventsApiError, getEventFeedbackReport, getEventReport, type Event } from "./events.service";

type ReportView = "registration" | "feedback";

/** Lazy Event-detail reporting view for registration and mobile feedback reports. */
export default function EventReportsSection({ eventId, ticketTypes }: { eventId: string; ticketTypes: Event["ticket_types"] }) {
  const { t } = useTranslation("enterpriseEvents");
  const [view, setView] = useState<ReportView>("registration");
  const registrationQuery = useQuery({ queryKey: ["event-reports", "detail", eventId, "registration", "json"], queryFn: () => getEventReport(eventId), enabled: Boolean(eventId) && view === "registration", staleTime: 30_000, retry: 1 });
  const feedbackQuery = useQuery({ queryKey: ["event-reports", "detail", eventId, "feedback", "json"], queryFn: () => getEventFeedbackReport(eventId), enabled: Boolean(eventId) && view === "feedback", staleTime: 30_000, retry: 1 });

  return <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
    <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7f9d94]">Event report</p><h2 className="mt-1 text-lg font-bold text-[#06201c]">{view === "registration" ? t("eventReports.registrationReport") : t("eventReports.feedbackRatingsReport")}</h2></div>
    <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Event report type">
      <button type="button" role="tab" aria-selected={view === "registration"} onClick={() => setView("registration")} className={`rounded-full border px-4 py-2 text-sm font-semibold ${view === "registration" ? "border-[#1f6a58] bg-[#e8f6ee] text-[#1f6a58]" : "border-[#d7e5df] text-[#52736a]"}`}>{t("eventReports.registrationReport")}</button>
      <button type="button" role="tab" aria-selected={view === "feedback"} onClick={() => setView("feedback")} className={`rounded-full border px-4 py-2 text-sm font-semibold ${view === "feedback" ? "border-[#1f6a58] bg-[#e8f6ee] text-[#1f6a58]" : "border-[#d7e5df] text-[#52736a]"}`}>{t("eventReports.feedbackRatingsReport")}</button>
    </div>
    {view === "registration" ? <RegistrationReport query={registrationQuery} ticketTypes={ticketTypes} /> : <FeedbackReport query={feedbackQuery} eventId={eventId} />}
  </section>;
}

function RegistrationReport({ query, ticketTypes }: { query: ReturnType<typeof useQuery<Awaited<ReturnType<typeof getEventReport>>, Error>>; ticketTypes: Event["ticket_types"] }) {
  const { t } = useTranslation("enterpriseEvents");
  if (query.isLoading) return <div role="status" aria-label={t("eventReports.loadingRegistrationReport")} className="mt-4 space-y-3"><div className="h-10 animate-pulse rounded-xl bg-[#edf3f0]" /><div className="h-20 animate-pulse rounded-xl bg-[#f1f4f3]" /></div>;
  if (query.isError) return <ReportError query={query} message={getReportErrorMessage(query.error, t("eventReports.registrationReportError"), t("eventReports.registrationReportForbidden"), t("eventReports.registrationReportUnavailable"))} />;
  if (!query.data) return <p className="mt-4 rounded-xl bg-[#f8fbf9] px-4 py-5 text-sm font-semibold text-[#52736a]">{t("eventReports.noRegistrationReport")}</p>;
  return <div className="mt-4 space-y-5"><Metric label={t("eventReports.totalRegistrations")} value={query.data.data.total_registrations} /><Breakdown title={t("eventReports.registrationStatusBreakdown")} values={query.data.data.by_status} emptyMessage={t("eventReports.noRegistrationStatuses")} /><Breakdown title={t("eventReports.ticketTypeBreakdown")} values={query.data.data.by_ticket_type} ticketTypes={ticketTypes} emptyMessage={t("eventReports.noTicketTypeRegistrations")} /></div>;
}

function FeedbackReport({ query, eventId }: { query: ReturnType<typeof useQuery<Awaited<ReturnType<typeof getEventFeedbackReport>>, Error>>; eventId: string }) {
  const { t } = useTranslation("enterpriseEvents");
  if (query.isLoading) return <div role="status" className="mt-4 animate-pulse rounded-xl bg-[#f1f4f3] p-6 text-sm">{t("eventReports.loadingFeedbackReport")}</div>;
  if (query.isError) return <ReportError query={query} message={t("eventReports.feedbackReportError")} />;
  if (!query.data) return <p className="mt-4 rounded-xl bg-[#f8fbf9] p-4 text-sm text-[#52736a]">{t("eventReports.feedbackReportEmpty")}</p>;
  const { total_feedbacks: feedbackCount, total_reviews: reviewCount, approved_reviews: approvedCount, average_rating: average } = query.data.data;
  return <div className="mt-4 space-y-4">
    <div className="grid gap-3 sm:grid-cols-3"><Metric label={t("eventReports.totalFeedbacksReceived")} value={feedbackCount} /><Metric label={t("eventReports.averageEventRating")} value={average === null ? "—" : t("eventFeedback.ratingOutOfFive", { rating: average.toFixed(1) })} /><Metric label={t("eventReports.reviews")} value={t("eventReports.totalAndApprovedReviews", { total: reviewCount, approved: approvedCount })} /></div>
    <Link href={`/admin/events/${encodeURIComponent(eventId)}?tab=reviews&subview=feedback`} className="inline-flex rounded-full border border-[#cfe2d9] px-4 py-2 text-sm font-semibold text-[#1f6a58] hover:bg-[#f4faf7]">{t("eventReports.openFeedback")}</Link>
  </div>;
}

function ReportError({ query, message }: { query: { refetch: () => Promise<unknown> }; message: string }) { const { t } = useTranslation("enterpriseEvents"); return <div className="mt-4 rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-4"><p role="alert" className="text-sm font-semibold text-[#b42318]">{message}</p><button type="button" onClick={() => void query.refetch()} className="mt-3 text-sm font-semibold text-[#1f6a58] underline">{t("eventFeedback.retry")}</button></div>; }
function Metric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-xl bg-[#f8fbf9] p-4"><p className="text-xs font-bold uppercase tracking-[0.1em] text-[#7f9d94]">{label}</p><p className="mt-2 text-2xl font-bold text-[#06201c]">{value}</p></div>; }
function Breakdown({ title, values, ticketTypes, emptyMessage }: { title: string; values: Record<string, number>; ticketTypes?: Event["ticket_types"]; emptyMessage: string }) { const entries = Object.entries(values); return <section><h3 className="text-sm font-bold text-[#06201c]">{title}</h3>{entries.length === 0 ? <p className="mt-2 text-sm text-[#52736a]">{emptyMessage}</p> : <dl className="mt-2 divide-y divide-[#edf3f0] rounded-xl border border-[#e1ebe6]">{entries.map(([key, value]) => { const ticket = ticketTypes?.find((item) => item.id === key); return <div key={key} className="flex items-center justify-between gap-4 px-4 py-3"><dt className="text-sm font-semibold text-[#31594d]">{ticket?.name ?? key.replace(/_/g, " ")}</dt><dd className="text-sm font-bold text-[#06201c]">{value}</dd></div>; })}</dl>}</section>; }
function getReportErrorMessage(error: Error, generic: string, forbidden: string, unavailable: string): string { if (!(error instanceof EventsApiError)) return generic; if (error.status === 401 || error.status === 403) return forbidden; if (error.status === 404) return unavailable; return generic; }
