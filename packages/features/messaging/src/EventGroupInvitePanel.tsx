"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listGroupChatMembers } from "./group-chat/group-chat.service";
import type { GroupChatDetails, GroupChatInvitationResult, GroupChatMember } from "./group-chat/group-chat.types";
import { buildInviteRegisteredPayload, isValidEventGroupUserId } from "./group-chat/event-group.models";
import { useEventGroupAttendees, useEventGroupGroups, useEventGroupProviders } from "./group-chat/event-group.queries";
import { inviteRegisteredGroupMembers } from "./group-chat/event-group.service";
import type { EventGroupAttendee, EventGroupProvider, InviteRegisteredResponse } from "./group-chat/event-group.types";
import { addEventAttendeeSelection, canSelectEventGroupAttendee, eventGroupInvitationInvalidationQueryKeys, isEventGroupInvitationEnabled, removeEventAttendeeSelection, toggleEventGroupProviderSelection } from "./event-group-wizard-models";

const PAGE_SIZE = 25;

type Props = {
  group: GroupChatDetails;
  groupId: string;
  eventId: string;
  canManage: boolean;
};

type FeedbackTone = "success" | "warning" | "error";

async function listAllMembers(groupId: string, signal: AbortSignal): Promise<GroupChatMember[]> {
  const members: GroupChatMember[] = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages) {
    const response = await listGroupChatMembers(groupId, { page, pageSize: 100, signal });
    members.push(...response.items);
    totalPages = response.pagination.total_pages;
    page += 1;
  }
  return members;
}

function displayAttendeeState(attendee: EventGroupAttendee): string {
  if (attendee.group_state === "invited") return "Pending invitation";
  if (attendee.group_state === "member") return "Already a member";
  if (attendee.group_state === "declined") return "Previously declined";
  if (attendee.group_state === "left") return "Previously left";
  if (attendee.group_state === "removed") return "Previously removed";
  return "Not in this Group";
}

function resultMessage(result: InviteRegisteredResponse | GroupChatInvitationResult, registered: boolean): string {
  if (registered) {
    return `Registered invitations: ${result.invited.length} invited, ${result.skipped.length} skipped.`;
  }
  return `Provider invitations: ${result.invited.length} invited, ${result.skipped.length} skipped.`;
}

function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-3 text-sm text-[#7a271a]" role="alert"><p>{message}</p>{onRetry ? <button type="button" onClick={onRetry} className="mt-2 font-semibold underline">Try again</button> : null}</div>;
}

function PageControls({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (page: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  return <div className="flex items-center justify-between gap-2 text-xs text-[#52736a]"><span>Page {page} of {totalPages}</span><span className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} className="rounded-full border border-[#d7e5df] px-3 py-1 disabled:opacity-40">Previous</button><button type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)} className="rounded-full border border-[#d7e5df] px-3 py-1 disabled:opacity-40">Next</button></span></div>;
}

export default function EventGroupInvitePanel({ group, groupId, eventId, canManage }: Props) {
  const queryClient = useQueryClient();
  const [attendeeSearch, setAttendeeSearch] = useState("");
  const [appliedAttendeeSearch, setAppliedAttendeeSearch] = useState("");
  const [attendeePage, setAttendeePage] = useState(1);
  const [registrationStatus, setRegistrationStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [providerSearch, setProviderSearch] = useState("");
  const [selectedAttendees, setSelectedAttendees] = useState<Readonly<Record<string, EventGroupAttendee>>>({});
  const [selectedProviders, setSelectedProviders] = useState<Readonly<Record<string, EventGroupProvider>>>({});
  const [inviteAllMode, setInviteAllMode] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>("success");
  const [registeredResult, setRegisteredResult] = useState<InviteRegisteredResponse | null>(null);
  const [providerResult, setProviderResult] = useState<GroupChatInvitationResult | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setAppliedAttendeeSearch(attendeeSearch.trim());
      setAttendeePage(1);
    }, 250);
    return () => window.clearTimeout(timeoutId);
  }, [attendeeSearch]);

  const attendeeQuery = useEventGroupAttendees(eventId, {
    q: appliedAttendeeSearch || undefined,
    eligibleOnly: false,
    registrationStatus: registrationStatus || undefined,
    paymentStatus: paymentStatus || undefined,
    notInGroup: false,
    groupId,
    page: attendeePage,
    pageSize: PAGE_SIZE,
  }, canManage);
  const providerQuery = useEventGroupProviders(eventId, { q: providerSearch.trim() || undefined }, canManage);
  const eventGroupsQuery = useEventGroupGroups(eventId, canManage);
  const memberQuery = useQuery({
    queryKey: ["event-group", "workspace-members", groupId],
    queryFn: ({ signal }) => listAllMembers(groupId, signal),
    enabled: canManage && group.permissions.can_view_members === true,
    staleTime: 15_000,
    retry: false,
  });

  const currentMemberIds = useMemo(() => new Set((memberQuery.data ?? []).map((member) => member.user_id).filter((userId): userId is string => Boolean(userId))), [memberQuery.data]);
  const providers = (providerQuery.data?.items ?? []).filter((provider) => !provider.is_me && !currentMemberIds.has(provider.user_id));
  const selectedAttendeeIds = Object.keys(selectedAttendees);
  const selectedProviderIds = Object.keys(selectedProviders);
  const selectedTotal = selectedAttendeeIds.length + selectedProviderIds.length;
  const maxMembers = group.max_members ?? attendeeQuery.data?.max_members ?? null;
  const occupiedSlots = (group.member_count ?? 0) + (group.pending_invitation_count ?? 0);
  const remainingSlots = maxMembers === null ? null : Math.max(0, maxMembers - occupiedSlots);
  const invitationGateEnabled = isEventGroupInvitationEnabled();
  const capacityReached = remainingSlots !== null && remainingSlots <= 0;
  const selectionCapacityReached = remainingSlots !== null && selectedTotal >= remainingSlots;

  const invalidateInvitationQueries = async () => {
    await Promise.all(eventGroupInvitationInvalidationQueryKeys(eventId, groupId).map((queryKey) => queryClient.invalidateQueries({ queryKey })));
  };

  const registeredMutation = useMutation({
    mutationFn: async () => {
      if (!canManage) throw new Error("You do not have permission to invite members to this Event Group.");
      if (!invitationGateEnabled) throw new Error("Event Group invitations are disabled in this environment.");
      if (selectedAttendeeIds.length === 0) throw new Error("Select at least one eligible attendee.");
      const payload = buildInviteRegisteredPayload({ user_ids: selectedAttendeeIds });
      return inviteRegisteredGroupMembers(groupId, payload);
    },
    retry: false,
    onMutate: () => { setFeedback(null); setRegisteredResult(null); },
    onSuccess: async (result) => {
      setRegisteredResult(result);
      setSelectedAttendees({});
      setFeedback(resultMessage(result, true));
      setFeedbackTone(result.invited.length > 0 ? "success" : "warning");
      await invalidateInvitationQueries();
    },
    onError: (error: Error) => { setFeedback(error.message); setFeedbackTone("error"); },
  });

  const inviteAllMutation = useMutation({
    mutationFn: async () => {
      if (!canManage) throw new Error("You do not have permission to invite members to this Event Group.");
      if (!invitationGateEnabled) throw new Error("Event Group invitations are disabled in this environment.");
      if (capacityReached) throw new Error("The Event Group has no remaining capacity.");
      return inviteRegisteredGroupMembers(groupId, buildInviteRegisteredPayload({ all_eligible: true, exclude_user_ids: selectedAttendeeIds }));
    },
    retry: false,
    onMutate: () => { setFeedback(null); setRegisteredResult(null); },
    onSuccess: async (result) => {
      setRegisteredResult(result);
      setSelectedAttendees({});
      setFeedback(resultMessage(result, true));
      setFeedbackTone(result.invited.length > 0 ? "success" : "warning");
      await invalidateInvitationQueries();
    },
    onError: (error: Error) => { setFeedback(error.message); setFeedbackTone("error"); },
  });

  const providerMutation = useMutation({
    mutationFn: async () => {
      if (!canManage) throw new Error("You do not have permission to invite members to this Event Group.");
      if (!invitationGateEnabled) throw new Error("Event Group invitations are disabled in this environment.");
      if (selectedProviderIds.length === 0) throw new Error("Select at least one verified Provider.");
      if (selectedProviderIds.some((userId) => currentMemberIds.has(userId))) throw new Error("One or more selected Providers are already members or have a pending invitation.");
      return inviteRegisteredGroupMembers(groupId, buildInviteRegisteredPayload({ user_ids: selectedProviderIds }));
    },
    retry: false,
    onMutate: () => { setFeedback(null); setProviderResult(null); },
    onSuccess: async (result) => {
      setProviderResult(result);
      setSelectedProviders({});
      setFeedback(resultMessage(result, false));
      setFeedbackTone(result.invited.length > 0 ? "success" : "warning");
      await invalidateInvitationQueries();
    },
    onError: (error: Error) => { setFeedback(error.message); setFeedbackTone("error"); },
  });

  const pending = registeredMutation.isPending || inviteAllMutation.isPending || providerMutation.isPending;
  const toggleAttendee = (attendee: EventGroupAttendee) => {
    const userId = attendee.user_id;
    if (!userId || !canSelectEventGroupAttendee(attendee) || currentMemberIds.has(userId) || selectedProviders[userId]) return;
    const isSelected = Boolean(selectedAttendees[userId]);
    if (!isSelected && selectionCapacityReached) return;
    setSelectedAttendees((current) => isSelected ? removeEventAttendeeSelection(current, userId) : addEventAttendeeSelection(current, attendee));
  };
  const toggleProvider = (provider: EventGroupProvider) => {
    if (!isValidEventGroupUserId(provider.user_id) || currentMemberIds.has(provider.user_id) || selectedAttendees[provider.user_id]) return;
    const isSelected = Boolean(selectedProviders[provider.user_id]);
    if (!isSelected && selectionCapacityReached) return;
    setSelectedProviders((current) => toggleEventGroupProviderSelection(current, provider));
  };

  if (!canManage) return <p className="rounded-xl border border-[#d7e5df] bg-[#f9fcfa] p-4 text-sm text-[#52736a]">Event Group invitations are available only to the owning Enterprise Admin, according to backend permissions.</p>;

  return <div className="space-y-5">
    <section className="rounded-xl border border-[#f1d8ad] bg-[#fffaf0] p-3 text-sm text-[#8b5e00]" role="status"><p className="font-semibold">Additional Event Group invitations</p><p className="mt-1">Initial invitations are handled during Group creation. Additional invitations use the backend Event eligibility, permission, and capacity rules.</p>{eventGroupsQuery.data ? <p className="mt-1">This Event currently has {eventGroupsQuery.data.items.length} Group(s); membership eligibility is evaluated for this Group only.</p> : null}</section>
    <section className="rounded-xl border border-[#d7e5df] bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-base font-bold text-[#16332b]">Registered attendees</h3><p className="mt-1 text-sm text-[#52736a]">Select platform user IDs returned by the Event API. Registration IDs and email addresses are never used as invitation identities.</p></div><div className="text-right text-xs text-[#52736a]"><p>{maxMembers === null ? "Capacity is backend-controlled." : `${occupiedSlots} occupied of ${maxMembers}, including pending invitations.`}</p><p>{remainingSlots === null ? "Remaining capacity unavailable" : `${remainingSlots} remaining place(s)`}</p></div></div>
      <div className="mt-4 grid gap-2 md:grid-cols-[minmax(0,1fr)_180px_180px]"><input value={attendeeSearch} onChange={(event) => setAttendeeSearch(event.target.value)} placeholder="Search attendees" className="h-10 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm outline-none focus:border-[#1f6a58]" /><select value={registrationStatus} onChange={(event) => { setRegistrationStatus(event.target.value); setAttendeePage(1); }} className="h-10 rounded-xl border border-[#d7e5df] bg-white px-3 text-sm"><option value="">All registration statuses</option><option value="confirmed">Confirmed</option><option value="attended">Attended</option><option value="cancelled">Cancelled</option></select><select value={paymentStatus} onChange={(event) => { setPaymentStatus(event.target.value); setAttendeePage(1); }} className="h-10 rounded-xl border border-[#d7e5df] bg-white px-3 text-sm"><option value="">All payment statuses</option><option value="paid">Paid</option><option value="free">Free</option><option value="pending">Pending</option><option value="refunded">Refunded</option></select></div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#f4faf7] p-3 text-sm"><label className="flex items-start gap-2"><input type="checkbox" checked={inviteAllMode} onChange={(event) => setInviteAllMode(event.target.checked)} disabled={pending} className="mt-1 h-4 w-4 accent-[#1f6a58]" /><span><span className="block font-semibold text-[#16332b]">Invite all eligible registered attendees</span><span className="block text-xs text-[#52736a]">The backend evaluates later registrations and may cap invitations at the remaining capacity. Selected attendees become exclusions for this mode.</span></span></label><div className="flex gap-2"><button type="button" disabled={!invitationGateEnabled || inviteAllMode || selectedAttendeeIds.length === 0 || pending} onClick={() => registeredMutation.mutate()} className="rounded-full bg-[#1f6a58] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{registeredMutation.isPending ? "Inviting..." : `Invite selected (${selectedAttendeeIds.length})`}</button><button type="button" disabled={!invitationGateEnabled || !inviteAllMode || pending || capacityReached} onClick={() => inviteAllMutation.mutate()} className="rounded-full border border-[#1f6a58] px-3 py-1.5 text-xs font-semibold text-[#1f6a58] disabled:opacity-50">{inviteAllMutation.isPending ? "Inviting all..." : `Invite all eligible${selectedAttendeeIds.length ? ` (excluding ${selectedAttendeeIds.length})` : ""}`}</button></div></div>
      {attendeeQuery.isPending ? <p className="mt-4 text-sm text-[#52736a]">Loading Event attendees...</p> : attendeeQuery.isError ? <div className="mt-4"><ErrorBox message={attendeeQuery.error.message} onRetry={() => void attendeeQuery.refetch()} /></div> : <div className="mt-4 space-y-2">{(attendeeQuery.data?.items ?? []).length === 0 ? <p className="rounded-xl bg-[#f9fcfa] p-4 text-sm text-[#52736a]">No Event attendees match these filters.</p> : (attendeeQuery.data?.items ?? []).map((attendee) => { const hasIdentity = Boolean(attendee.user_id); const selectable = canSelectEventGroupAttendee(attendee) && !currentMemberIds.has(attendee.user_id!); const checked = Boolean(attendee.user_id && selectedAttendees[attendee.user_id]); return <label key={attendee.registration_id} className="flex items-start gap-3 rounded-xl border border-[#e1ebe6] p-3"><input type="checkbox" checked={checked} disabled={!selectable || pending || (!checked && selectionCapacityReached)} onChange={() => toggleAttendee(attendee)} className="mt-1 h-4 w-4 accent-[#1f6a58]" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[#16332b]">{attendee.name || "Unnamed attendee"}</span><span className="mt-0.5 block text-xs text-[#52736a]">{attendee.registration_status || "Registration status unavailable"} · {attendee.payment_status || "Payment status unavailable"} · {displayAttendeeState(attendee)}</span>{attendee.reason ? <span className="mt-1 block text-xs text-[#8b5e00]">Backend reason: {attendee.reason}</span> : null}{!hasIdentity ? <span className="mt-1 block text-xs text-[#8b5e00]">No platform account identity was returned.</span> : null}</span><span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${selectable ? "bg-[#e8f6ee] text-[#1f6a58]" : "bg-[#f4faf7] text-[#7f9d94]"}`}>{selectable ? "Eligible" : "Not eligible"}</span></label>; })}</div>}
      {attendeeQuery.data ? <div className="mt-4"><PageControls page={attendeeQuery.data.page} total={attendeeQuery.data.total} pageSize={attendeeQuery.data.page_size} onChange={setAttendeePage} /></div> : null}
      {registeredResult ? <div className="mt-4 rounded-xl border border-[#b7dfc7] bg-[#e8f6ee] p-3 text-sm text-[#1f6a58]" role="status"><p className="font-semibold">{resultMessage(registeredResult, true)}</p><p className="mt-1">Not invited because the Group was full: {registeredResult.not_invited_group_full}. No account: {registeredResult.no_account}. Remaining capacity: {registeredResult.free_places}.</p></div> : null}
    </section>
    <section className="rounded-xl border border-[#d7e5df] bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-base font-bold text-[#16332b]">Verified Providers</h3><p className="mt-1 text-sm text-[#52736a]">Verified Providers are invited as ordinary members through the Event-specific endpoint. Provider records are selected only by platform user ID.</p></div><button type="button" disabled={!invitationGateEnabled || selectedProviderIds.length === 0 || pending || memberQuery.isPending || memberQuery.isError} onClick={() => providerMutation.mutate()} className="rounded-full border border-[#1f6a58] px-3 py-1.5 text-xs font-semibold text-[#1f6a58] disabled:opacity-50">{providerMutation.isPending ? "Inviting..." : `Invite selected (${selectedProviderIds.length})`}</button></div><input value={providerSearch} onChange={(event) => setProviderSearch(event.target.value)} placeholder="Search verified Providers" className="mt-4 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm outline-none focus:border-[#1f6a58]" />{memberQuery.isPending ? <p className="mt-3 text-sm text-[#52736a]">Checking current members and pending invitations...</p> : memberQuery.isError ? <div className="mt-3"><ErrorBox message={memberQuery.error.message} onRetry={() => void memberQuery.refetch()} /></div> : providerQuery.isPending ? <p className="mt-3 text-sm text-[#52736a]">Loading verified Providers...</p> : providerQuery.isError ? <div className="mt-3"><ErrorBox message={providerQuery.error.message} onRetry={() => void providerQuery.refetch()} /></div> : <div className="mt-3 space-y-2">{providers.length === 0 ? <p className="rounded-xl bg-[#f9fcfa] p-4 text-sm text-[#52736a]">No eligible verified Providers match this search.</p> : providers.map((provider) => <label key={provider.user_id} className="flex items-center gap-3 rounded-xl border border-[#e1ebe6] p-3"><input type="checkbox" checked={Boolean(selectedProviders[provider.user_id])} disabled={provider.is_me || pending || (!selectedProviders[provider.user_id] && selectionCapacityReached)} onChange={() => toggleProvider(provider)} className="h-4 w-4 accent-[#1f6a58]" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[#16332b]">{provider.name || "Provider name unavailable"}</span><span className="block text-xs text-[#52736a]">{provider.registration_number || "Verified Provider"} · Ordinary Group member</span></span></label>)}</div>}{providerResult ? <div className="mt-4 rounded-xl border border-[#b7dfc7] bg-[#e8f6ee] p-3 text-sm text-[#1f6a58]" role="status"><p className="font-semibold">{resultMessage(providerResult, false)}</p></div> : null}</section>
    {feedback ? <p className={`rounded-xl border p-3 text-sm font-semibold ${feedbackTone === "error" ? "border-[#f3d5d1] bg-[#fff7f6] text-[#7a271a]" : feedbackTone === "warning" ? "border-[#f1d8ad] bg-[#fffaf0] text-[#8b5e00]" : "border-[#b7dfc7] bg-[#e8f6ee] text-[#1f6a58]"}`} role={feedbackTone === "error" ? "alert" : "status"}>{feedback}</p> : null}
  </div>;
}
