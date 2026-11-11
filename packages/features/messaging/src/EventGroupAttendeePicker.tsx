"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useEventGroupAttendees, useEventGroupGroups } from "./group-chat/event-group.queries";
import type { EventGroupAttendee, EventGroupEvent } from "./group-chat/event-group.types";
import { buildEventGroupAttendeeFilters, canContinueEventGroupAttendeeStep, getEventAttendeeEligibilityReason, resolveEventGroupQueryState, summarizeEventGroupAttendeeEligibility } from "./event-group-wizard-models";

interface EventGroupAttendeePickerProps {
  event: EventGroupEvent;
  selectedAttendees: Readonly<Record<string, EventGroupAttendee>>;
  inviteAllRegistered: boolean;
  onBack: () => void;
  onContinue: () => void;
  onCapacityChange: (maxMembers: number | null) => void;
  onInviteAllRegisteredChange: (value: boolean) => void;
  onToggle: (attendee: EventGroupAttendee) => void;
}

/** Provides server-paginated attendee selection by platform user ID and displays existing Event Groups. */
export default function EventGroupAttendeePicker({ event, selectedAttendees, inviteAllRegistered, onBack, onContinue, onCapacityChange, onInviteAllRegisteredChange, onToggle }: EventGroupAttendeePickerProps) {
  const { t } = useTranslation("groupChatSpeech");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    const timeoutId = window.setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [search]);
  const attendeesQuery = useEventGroupAttendees(event.id, buildEventGroupAttendeeFilters({ page, search: debouncedSearch, status, paymentStatus }));
  const existingGroupsQuery = useEventGroupGroups(event.id);
  useEffect(() => { if (attendeesQuery.data) onCapacityChange(attendeesQuery.data.max_members); }, [attendeesQuery.data, onCapacityChange]);
  const state = resolveEventGroupQueryState({ isPending: attendeesQuery.isPending, isError: attendeesQuery.isError, itemCount: attendeesQuery.data?.items.length ?? 0 });
  const selectedCount = Object.keys(selectedAttendees).length;
  const canContinue = canContinueEventGroupAttendeeStep({ hasResponse: Boolean(attendeesQuery.data), isError: attendeesQuery.isError });
  const totalPages = attendeesQuery.data ? Math.max(1, Math.ceil(attendeesQuery.data.total / attendeesQuery.data.page_size)) : 1;
  const eligibilitySummary = attendeesQuery.data ? summarizeEventGroupAttendeeEligibility(attendeesQuery.data) : null;
  return <div className="mx-auto w-full max-w-5xl space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7f9d94]">{t("eventGroup.stepAttendees")}</p><h1 className="mt-1 text-2xl font-bold text-[#06201c]">{event.title ?? t("eventGroup.eventNameUnavailable")}</h1><p className="mt-1 text-sm text-[#52736a]">{t("eventGroup.chooseAttendeesDescription")}</p></div><button type="button" onClick={onBack} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#52736a]">{t("eventGroup.backToEvents")}</button></div>
    <div className="rounded-2xl border border-[#d7e5df] bg-white p-4"><label className="flex items-start gap-3 text-sm font-semibold text-[#16332b]"><input type="checkbox" checked={inviteAllRegistered} onChange={(change) => { onInviteAllRegisteredChange(change.target.checked); if (!change.target.checked) setPage(1); }} className="mt-1 h-4 w-4 accent-[#1f6a58]" /><span><span className="block">{t("eventGroup.inviteAllRegistered")}</span><span className="mt-1 block text-xs font-normal text-[#52736a]">{t("eventGroup.inviteAllRegisteredDescription")}</span></span></label>{inviteAllRegistered ? <p className="mt-3 rounded-lg bg-[#fff8e8] p-3 text-xs text-[#805900]">{t("eventGroup.inviteAllCapacityNotice")}</p> : null}</div>
    <div className="grid gap-3 rounded-2xl border border-[#d7e5df] bg-white p-4 sm:grid-cols-[minmax(0,1fr)_180px_180px]"><label className="text-sm font-semibold text-[#16332b]"><span className="sr-only">{t("eventGroup.searchAttendees")}</span><input value={search} onChange={(change) => setSearch(change.target.value)} placeholder={t("eventGroup.searchAttendees")} className="h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal outline-none focus:border-[#1f6a58]" /></label><label className="text-sm font-semibold text-[#16332b]">{t("eventGroup.registrationStatus")}<select value={status} onChange={(change) => { setPage(1); setStatus(change.target.value); }} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-2 font-normal"><option value="">{t("eventGroup.allStatuses")}</option><option value="confirmed">Confirmed</option><option value="attended">Attended</option><option value="cancelled">Cancelled</option><option value="no_show">No-show</option></select></label><label className="text-sm font-semibold text-[#16332b]">{t("eventGroup.paymentStatus")}<select value={paymentStatus} onChange={(change) => { setPage(1); setPaymentStatus(change.target.value); }} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-2 font-normal"><option value="">{t("eventGroup.allStatuses")}</option><option value="free">Free</option><option value="paid">Paid</option><option value="pending">Pending</option><option value="unpaid">Unpaid</option><option value="refunded">Refunded</option><option value="failed">Failed</option></select></label></div>
    <div className="rounded-xl border border-[#f1dfab] bg-[#fff8e8] p-3 text-sm text-[#805900]"><strong>{selectedCount} {inviteAllRegistered ? t("eventGroup.excludedAttendees") : t("eventGroup.selectedAttendees")}</strong><span className="ml-1">{t("eventGroup.identityFromBackend")}</span></div>
    {state === "loading" ? <div className="grid gap-2" aria-live="polite">{[1, 2, 3, 4].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-[#edf5f0]" />)}</div> : null}
    {state === "error" ? <div className="rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-4 text-sm text-[#7a271a]" role="alert"><p>{attendeesQuery.error?.message ?? t("eventGroup.attendeesError")}</p><button type="button" onClick={() => void attendeesQuery.refetch()} className="mt-2 font-semibold underline">{t("eventGroup.tryAgain")}</button></div> : null}
    {state === "empty" ? <p className="rounded-xl border border-dashed border-[#d7e5df] bg-[#f9fcfa] p-6 text-sm text-[#52736a]">{debouncedSearch || status || paymentStatus ? t("eventGroup.noAttendeesMatch") : t("eventGroup.noAttendees")}</p> : null}
    {state === "ready" ? <div className="space-y-2">{attendeesQuery.data?.items.map((attendee) => { const userId = attendee.user_id; const selected = Boolean(userId && selectedAttendees[userId]); const selectable = Boolean(userId) && attendee.can_invite; const eligibilityReason = getEventAttendeeEligibilityReason(attendee); const eligibilityLabel = eligibilityReason === "inviteable" ? attendee.group_state : eligibilityReason === "no_account" ? t("eventGroup.noLinkedAccount") : eligibilityReason === "not_eligible" ? t("eventGroup.notEligible") : t(`eventGroup.attendeeReasons.${eligibilityReason}`); return <label key={attendee.registration_id} className={`flex items-start gap-3 rounded-xl border p-3 transition ${selectable ? "cursor-pointer" : "cursor-not-allowed opacity-60"} ${selected ? "border-[#1f6a58] bg-[#f4faf7]" : "border-[#d7e5df] bg-white hover:border-[#8ccaa2]"}`}><input type="checkbox" checked={selected} disabled={!selectable} onChange={() => onToggle(attendee)} className="mt-1 h-4 w-4 accent-[#1f6a58]" /><span className="min-w-0 flex-1"><span className="block font-semibold text-[#16332b]">{attendee.name ?? t("eventGroup.referenceUnavailable")}</span><span className="block text-xs text-[#52736a]">{attendee.email ?? t("eventGroup.referenceUnavailable")}</span><span className="mt-1 block text-xs text-[#7f9d94]">{attendee.registration_status ?? "status unavailable"} · {attendee.payment_status ?? "payment unavailable"} · {eligibilityLabel}</span></span><span className="text-xs font-semibold text-[#52736a]">{userId ?? eligibilityLabel}</span></label>; })}</div> : null}
    {eligibilitySummary && attendeesQuery.data && attendeesQuery.data.items.length > 0 && eligibilitySummary.inviteableOnPage === 0 ? <p className="rounded-xl border border-[#f1dfab] bg-[#fff8e8] p-3 text-sm text-[#805900]">{t("eventGroup.noInviteableAttendeesSummary", { eligibleRegistrations: eligibilitySummary.eligibleRegistrationTotal })}</p> : null}
    {attendeesQuery.data ? <div className="flex items-center justify-between text-xs text-[#52736a]"><span>{t("eventGroup.pageOfAttendees", { page: attendeesQuery.data.page, totalPages, total: attendeesQuery.data.total })}</span><span className="flex gap-2"><button type="button" disabled={page <= 1 || attendeesQuery.isFetching} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-[#d7e5df] px-3 py-1.5 font-semibold disabled:opacity-40">{t("eventGroup.previous")}</button><button type="button" disabled={page >= totalPages || attendeesQuery.isFetching} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-[#d7e5df] px-3 py-1.5 font-semibold disabled:opacity-40">{t("eventGroup.next")}</button></span></div> : null}
    {existingGroupsQuery.data ? <section className="rounded-2xl border border-[#d7e5df] bg-white p-4"><h2 className="font-bold text-[#16332b]">{t("eventGroup.existingGroupsTitle")}</h2>{existingGroupsQuery.data.items.length === 0 ? <p className="mt-2 text-sm text-[#52736a]">{t("eventGroup.noExistingGroups")}</p> : <div className="mt-2 grid gap-2 sm:grid-cols-2">{existingGroupsQuery.data.items.map((group) => <div key={group.id} className="rounded-xl bg-[#f9fcfa] p-3"><p className="font-semibold text-[#16332b]">{group.name}</p><p className="mt-1 text-xs text-[#52736a]">{group.status} · {group.member_count} {t("eventGroup.membersLabel")}</p></div>)}</div>}<p className="mt-2 text-xs text-[#805900]">{t("eventGroup.multipleGroupsAllowed")}</p></section> : null}
    <div className="flex flex-wrap justify-between gap-2"><button type="button" onClick={onBack} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#52736a]">{t("eventGroup.backToEvents")}</button><button type="button" disabled={!canContinue} onClick={onContinue} className="rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{t("eventGroup.continueDetails")}</button></div>
  </div>;
}
