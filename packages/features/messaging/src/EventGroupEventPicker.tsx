"use client";

import { useEffect, useState } from "react";
import { useCurrentEnterprise } from "@ihp/enterprise-runtime";
import { useTranslation } from "react-i18next";
import { useEventGroupEvents } from "./group-chat/event-group.queries";
import type { EventGroupEvent } from "./group-chat/event-group.types";
import { buildEventGroupListParams, eventGroupReviewLabel, formatEventEligibilityReason, formatEventStatusLabel, resolveEventGroupQueryState } from "./event-group-wizard-models";

interface EventGroupEventPickerProps {
  onBackToGroupTypes: () => void;
  onBackToGroups: () => void;
  onSelect: (event: EventGroupEvent) => void;
}

function formatEventDate(event: Pick<EventGroupEvent, "start_date" | "end_date">): string {
  if (!event.start_date || !event.end_date) return "Date unavailable";
  const start = new Date(event.start_date);
  const end = new Date(event.end_date);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Date unavailable";
  const formatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

/** Loads only the authenticated administrator's enterprise-scoped Events for selection. */
export default function EventGroupEventPicker({ onBackToGroupTypes, onBackToGroups, onSelect }: EventGroupEventPickerProps) {
  const { t } = useTranslation("groupChatSpeech");
  const { isLoadingEnterprise, enterpriseError } = useCurrentEnterprise();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    const timeoutId = window.setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [search]);
  const eventsQuery = useEventGroupEvents(buildEventGroupListParams({ search: debouncedSearch, page }), !isLoadingEnterprise && !enterpriseError);
  const state = resolveEventGroupQueryState({ isPending: isLoadingEnterprise || eventsQuery.isPending, isError: Boolean(enterpriseError) || eventsQuery.isError, itemCount: eventsQuery.data?.items.length ?? 0 });
  return <div className="mx-auto w-full max-w-5xl space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7f9d94]">{t("eventGroup.stepEvent")}</p><h1 className="mt-1 text-2xl font-bold text-[#06201c]">{t("eventGroup.chooseEvent")}</h1><p className="mt-1 text-sm text-[#52736a]">{t("eventGroup.chooseEventDescription")}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={onBackToGroupTypes} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#52736a]">{t("eventGroup.backToGroupTypes")}</button><button type="button" onClick={onBackToGroups} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#52736a]">{t("eventGroup.backToGroups")}</button></div></div>
    <label className="block text-sm font-semibold text-[#16332b]"><span className="sr-only">{t("eventGroup.searchEvents")}</span><input value={search} onChange={(change) => setSearch(change.target.value)} placeholder={t("eventGroup.searchEvents")} className="h-11 w-full rounded-xl border border-[#d7e5df] bg-white px-3 font-normal outline-none focus:border-[#1f6a58]" /></label>
    {state === "loading" ? <div className="grid gap-2" aria-live="polite">{[1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse rounded-xl bg-[#edf5f0]" />)}</div> : null}
    {state === "error" ? <div className="rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-4 text-sm text-[#7a271a]" role="alert"><p>{enterpriseError ?? eventsQuery.error?.message ?? t("eventGroup.eventsError")}</p><button type="button" onClick={() => void eventsQuery.refetch()} className="mt-2 font-semibold underline">{t("eventGroup.tryAgain")}</button></div> : null}
    {state === "empty" ? <p className="rounded-xl border border-dashed border-[#d7e5df] bg-[#f9fcfa] p-6 text-sm text-[#52736a]">{debouncedSearch ? t("eventGroup.noEventsMatch") : t("eventGroup.noEvents")}</p> : null}
    {state === "ready" ? <div className="space-y-2">{eventsQuery.data?.items.map((event) => <button key={event.id} type="button" disabled={!event.can_create_group} onClick={() => onSelect(event)} className={`group flex min-h-20 w-full items-center justify-between gap-3 rounded-xl border bg-white px-3 py-3 text-left shadow-sm transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6a58] motion-reduce:transition-none ${event.can_create_group ? "border-[#d7e5df] hover:-translate-y-0.5 hover:border-[#1f6a58] hover:bg-[#f4faf7] hover:shadow-[0_8px_20px_rgba(31,106,88,0.1)]" : "cursor-not-allowed border-[#e1ebe6] bg-[#f9fcfa] opacity-70"}`}><span className="min-w-0 flex-1"><span className="flex min-w-0 items-center gap-2"><span className="min-w-0 truncate text-sm font-bold text-[#16332b]">{eventGroupReviewLabel(event)}</span><span className="shrink-0 rounded-full bg-[#e8f6ee] px-2 py-1 text-[11px] font-semibold text-[#1f6a58]">{formatEventStatusLabel(event.status)}</span></span><span className="mt-1 block truncate text-xs text-[#52736a]">{formatEventDate(event)} · {t("eventGroup.registeredCount", { count: event.registered_count })} · {t("eventGroup.existingGroupCount", { count: event.group_count })}</span>{!event.can_create_group ? <span className="mt-1 block text-xs text-[#805900]">{formatEventEligibilityReason(event.reason)}</span> : null}</span></button>)}</div> : null}
    {eventsQuery.data ? <div className="flex items-center justify-between text-xs text-[#52736a]"><span>{t("eventGroup.pageOf", { page: eventsQuery.data.page, totalPages: Math.max(1, Math.ceil(eventsQuery.data.total / eventsQuery.data.page_size)) })}</span><span className="flex gap-2"><button type="button" disabled={page <= 1 || eventsQuery.isFetching} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-[#d7e5df] px-3 py-1.5 font-semibold disabled:opacity-40">{t("eventGroup.previous")}</button><button type="button" disabled={page >= Math.max(1, Math.ceil(eventsQuery.data.total / eventsQuery.data.page_size)) || eventsQuery.isFetching} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-[#d7e5df] px-3 py-1.5 font-semibold disabled:opacity-40">{t("eventGroup.next")}</button></span></div> : null}
  </div>;
}
