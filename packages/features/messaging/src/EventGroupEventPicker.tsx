"use client";

import { useEffect, useState } from "react";
import { useCurrentEnterprise } from "@ihp/enterprise-runtime";
import { useTranslation } from "react-i18next";
import { useEventGroupEvents } from "./group-chat/event-group.queries";
import type { EventGroupEvent } from "./group-chat/event-group.types";
import { buildEventGroupListParams, eventGroupReviewLabel, resolveEventGroupQueryState } from "./event-group-wizard-models";

interface EventGroupEventPickerProps {
  onBack: () => void;
  onSelect: (event: EventGroupEvent) => void;
}

function formatEventDate(event: Pick<EventGroupEvent, "start_date" | "end_date">): string {
  if (!event.start_date || !event.end_date) return "Date unavailable";
  const start = new Date(event.start_date);
  const end = new Date(event.end_date);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Date unavailable";
  const formatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

/** Loads only the authenticated administrator's enterprise-scoped Events for selection. */
export default function EventGroupEventPicker({ onBack, onSelect }: EventGroupEventPickerProps) {
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
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7f9d94]">{t("eventGroup.stepEvent")}</p><h1 className="mt-1 text-2xl font-bold text-[#06201c]">{t("eventGroup.chooseEvent")}</h1><p className="mt-1 text-sm text-[#52736a]">{t("eventGroup.chooseEventDescription")}</p></div><button type="button" onClick={onBack} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#52736a]">{t("eventGroup.backToGroupTypes")}</button></div>
    <label className="block text-sm font-semibold text-[#16332b]"><span className="sr-only">{t("eventGroup.searchEvents")}</span><input value={search} onChange={(change) => setSearch(change.target.value)} placeholder={t("eventGroup.searchEvents")} className="h-11 w-full rounded-xl border border-[#d7e5df] bg-white px-3 font-normal outline-none focus:border-[#1f6a58]" /></label>
    {state === "loading" ? <div className="grid gap-3" aria-live="polite">{[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-[#edf5f0]" />)}</div> : null}
    {state === "error" ? <div className="rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-4 text-sm text-[#7a271a]" role="alert"><p>{enterpriseError ?? eventsQuery.error?.message ?? t("eventGroup.eventsError")}</p><button type="button" onClick={() => void eventsQuery.refetch()} className="mt-2 font-semibold underline">{t("eventGroup.tryAgain")}</button></div> : null}
    {state === "empty" ? <p className="rounded-xl border border-dashed border-[#d7e5df] bg-[#f9fcfa] p-6 text-sm text-[#52736a]">{debouncedSearch ? t("eventGroup.noEventsMatch") : t("eventGroup.noEvents")}</p> : null}
    {state === "ready" ? <div className="space-y-3">{eventsQuery.data?.items.map((event) => <button key={event.id} type="button" disabled={!event.can_create_group} onClick={() => onSelect(event)} className="w-full rounded-2xl border border-[#d7e5df] bg-white p-4 text-left shadow-sm transition hover:border-[#1f6a58] hover:bg-[#f9fcfa] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6a58] disabled:cursor-not-allowed disabled:opacity-60"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-bold text-[#16332b]">{eventGroupReviewLabel(event)}</h2><p className="mt-1 text-sm text-[#52736a]">{formatEventDate(event)}</p><p className="mt-1 text-xs text-[#52736a]">{t("eventGroup.registeredCount", { count: event.registered_count })} · {t("eventGroup.existingGroupCount", { count: event.group_count })}</p></div><span className="rounded-full bg-[#e8f6ee] px-3 py-1 text-xs font-bold capitalize text-[#1f6a58]">{event.status?.replace(/[_-]+/g, " ") ?? "status unavailable"}</span></div><p className="mt-2 text-xs text-[#7f9d94]">{event.can_create_group ? t("eventGroup.selectEventHint") : event.reason ?? t("eventGroup.eventNotEligible")}</p></button>)}</div> : null}
    {eventsQuery.data ? <div className="flex items-center justify-between text-xs text-[#52736a]"><span>{t("eventGroup.pageOf", { page: eventsQuery.data.page, totalPages: Math.max(1, Math.ceil(eventsQuery.data.total / eventsQuery.data.page_size)) })}</span><span className="flex gap-2"><button type="button" disabled={page <= 1 || eventsQuery.isFetching} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-[#d7e5df] px-3 py-1.5 font-semibold disabled:opacity-40">{t("eventGroup.previous")}</button><button type="button" disabled={page >= Math.max(1, Math.ceil(eventsQuery.data.total / eventsQuery.data.page_size)) || eventsQuery.isFetching} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-[#d7e5df] px-3 py-1.5 font-semibold disabled:opacity-40">{t("eventGroup.next")}</button></span></div> : null}
    <p className="rounded-xl border border-[#f1dfab] bg-[#fff8e8] p-3 text-xs text-[#805900]">{t("eventGroup.enterpriseScopeNotice")}</p>
  </div>;
}
