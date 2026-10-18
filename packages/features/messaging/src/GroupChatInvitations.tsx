"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { acceptGroupChatInvitation, declineGroupChatInvitation, getGroupChatInvitation, listGroupChatInvitations } from "./group-chat/group-chat.service";
import type { AcceptGroupInvitationPayload, GroupChatInvitation, GroupChatInvitationDetails } from "./group-chat/group-chat.types";

type Props = { onAccepted: (groupId: string) => void };
const invitationKey = ["group-chat", "invitations"];
const groupsKey = ["group-chat", "groups"];

function formatInvitationDate(value: string | null): string {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function Retry({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-4 text-sm text-[#7a271a]" role="alert"><p>{message}</p><button type="button" onClick={onRetry} className="mt-2 font-semibold underline">Try again</button></div>;
}

function InvitationListItem({ invitation, selected, onSelect }: { invitation: GroupChatInvitation; selected: boolean; onSelect: () => void }) {
  return <button type="button" aria-pressed={selected} onClick={onSelect} className={`w-full rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6a58] focus-visible:ring-offset-2 ${selected ? "border-[#1f6a58] bg-[#e8f6ee]" : "border-[#e1ebe6] hover:bg-[#f4faf7]"}`}><span className="flex items-start justify-between gap-3"><span className="min-w-0"><span className="block truncate text-sm font-bold text-[#16332b]">{invitation.group_name}</span><span className="mt-1 block text-xs text-[#52736a]">{invitation.invited_by_name ? `Invited by ${invitation.invited_by_name}` : "Group invitation"}</span></span><span className="shrink-0 rounded-full bg-[#fff5d6] px-2 py-1 text-[11px] font-semibold capitalize text-[#8b5e00]">{invitation.status || "Pending"}</span></span><span className="mt-2 block text-[11px] text-[#7f9d94]">{formatInvitationDate(invitation.created_at)}</span></button>;
}

function InvitationDetails({ detail, onAccepted, onDeclined }: { detail: GroupChatInvitationDetails; onAccepted: (groupId: string) => void; onDeclined: () => void }) {
  const queryClient = useQueryClient();
  const [consent, setConsent] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianRelationship, setGuardianRelationship] = useState("");
  const [declineConfirmation, setDeclineConfirmation] = useState(false);
  const guardianRequired = detail.guardian_consent_required;
  const acceptReady = consent && (!guardianRequired || Boolean(guardianName.trim() && guardianRelationship.trim()));
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: invitationKey }),
      queryClient.invalidateQueries({ queryKey: groupsKey }),
    ]);
  };
  const acceptMutation = useMutation({
    mutationFn: (payload: AcceptGroupInvitationPayload) => acceptGroupChatInvitation(detail.group_id, payload),
    retry: false,
    onSuccess: async () => {
      await refresh();
      onAccepted(detail.group_id);
    },
  });
  const declineMutation = useMutation({
    mutationFn: () => declineGroupChatInvitation(detail.group_id),
    retry: false,
    onSuccess: async () => {
      await refresh();
      setDeclineConfirmation(false);
      onDeclined();
    },
  });
  const submitAccept = () => {
    if (!acceptReady || acceptMutation.isPending) return;
    const payload: AcceptGroupInvitationPayload = {
      consent: true,
      ...(displayName.trim() ? { display_name: displayName.trim() } : {}),
      ...(guardianRequired ? { guardian_name: guardianName.trim(), guardian_relationship: guardianRelationship.trim() } : {}),
    };
    acceptMutation.mutate(payload);
  };

  return <div className="space-y-4">
    <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7f9d94]">Invitation details</p><h2 className="mt-1 text-xl font-bold text-[#06201c]">{detail.group_name}</h2><p className="mt-1 text-sm text-[#52736a]">Received {formatInvitationDate(detail.created_at)}</p></div>
    {detail.description ? <section className="rounded-xl bg-[#f9fcfa] p-4"><h3 className="text-sm font-bold text-[#16332b]">Description</h3><p className="mt-1 text-sm text-[#52736a]">{detail.description}</p></section> : null}
    {detail.purpose ? <section className="rounded-xl bg-[#f9fcfa] p-4"><h3 className="text-sm font-bold text-[#16332b]">Purpose</h3><p className="mt-1 text-sm text-[#52736a]">{detail.purpose}</p></section> : null}
    <dl className="grid gap-3 rounded-xl border border-[#e1ebe6] p-4 text-sm sm:grid-cols-2">
      <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#7f9d94]">Invited by</dt><dd className="mt-1 text-[#16332b]">{detail.invited_by_name || "Name unavailable"}</dd></div>
      <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#7f9d94]">Status</dt><dd className="mt-1 capitalize text-[#16332b]">{detail.status || "Pending"}</dd></div>
      {detail.provider_names.length > 0 ? <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-[#7f9d94]">Providers</dt><dd className="mt-1 text-[#16332b]">{detail.provider_names.join(", ")}</dd></div> : null}
      {detail.member_names.length > 0 ? <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-[#7f9d94]">Current members</dt><dd className="mt-1 text-[#16332b]">{detail.member_names.join(", ")}</dd></div> : null}
    </dl>
    {detail.visibility_notice ? <p className="rounded-xl border border-[#d7e5df] bg-[#f9fcfa] p-3 text-sm text-[#52736a]">{detail.visibility_notice}</p> : null}
    {detail.emergency_notice ? <p className="rounded-xl border border-[#f1d8ad] bg-[#fffaf0] p-3 text-sm text-[#8b5e00]">{detail.emergency_notice}</p> : null}
    {detail.what_members_can_see ? <section className="rounded-xl border border-[#d7e5df] p-4"><h3 className="text-sm font-bold text-[#16332b]">What members can see</h3><p className="mt-1 text-sm text-[#52736a]">{detail.what_members_can_see}</p></section> : null}
    {detail.guardian_consent_text ? <p className="rounded-xl border border-[#f1d8ad] bg-[#fffaf0] p-3 text-sm text-[#8b5e00]">{detail.guardian_consent_text}</p> : null}
    <section className="rounded-xl border border-[#e1ebe6] p-4">
      <h3 className="text-base font-bold text-[#16332b]">Consent</h3>
      <label className="mt-3 flex items-start gap-2 text-sm text-[#16332b]"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} disabled={acceptMutation.isPending || declineMutation.isPending} className="mt-0.5 h-4 w-4 accent-[#1f6a58]" /> <span>I have reviewed these details and consent to join this Group Chat.</span></label>
      <label className="mt-3 block text-sm font-semibold text-[#16332b]">Display name <span className="font-normal text-[#7f9d94]">(optional)</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} disabled={acceptMutation.isPending || declineMutation.isPending} placeholder="Use your preferred name" className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal outline-none focus:border-[#1f6a58]" /></label>
      {guardianRequired ? <div className="mt-3 space-y-3 rounded-xl border border-[#f1d8ad] bg-[#fffaf0] p-3"><p className="text-sm font-semibold text-[#8b5e00]">Guardian consent is required before joining.</p><label className="block text-sm font-semibold text-[#16332b]">Guardian name<input required value={guardianName} onChange={(event) => setGuardianName(event.target.value)} disabled={acceptMutation.isPending || declineMutation.isPending} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 font-normal" /></label><label className="block text-sm font-semibold text-[#16332b]">Guardian relationship<input required value={guardianRelationship} onChange={(event) => setGuardianRelationship(event.target.value)} disabled={acceptMutation.isPending || declineMutation.isPending} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 font-normal" /></label></div> : null}
      {acceptMutation.isError ? <p className="mt-3 text-sm font-semibold text-[#b42318]" role="alert">{acceptMutation.error.message}</p> : null}
      <button type="button" disabled={!acceptReady || acceptMutation.isPending || declineMutation.isPending} onClick={submitAccept} className="mt-4 rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{acceptMutation.isPending ? "Accepting invitation..." : "Accept invitation"}</button>
    </section>
    <section className="rounded-xl border border-[#efc4bd] bg-[#fff7f6] p-4"><h3 className="text-sm font-bold text-[#16332b]">Decline invitation</h3>{declineConfirmation ? <div className="mt-2" role="dialog" aria-label="Confirm decline invitation"><p className="text-sm text-[#7a271a]">Decline this invitation? You can no longer join this Group Chat from this invitation.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={acceptMutation.isPending || declineMutation.isPending} onClick={() => declineMutation.mutate()} className="rounded-full bg-[#b54708] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{declineMutation.isPending ? "Declining invitation..." : "Confirm decline"}</button><button type="button" disabled={declineMutation.isPending} onClick={() => setDeclineConfirmation(false)} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#16332b]">Cancel</button></div></div> : <button type="button" disabled={acceptMutation.isPending || declineMutation.isPending} onClick={() => setDeclineConfirmation(true)} className="mt-2 rounded-full border border-[#b54708] px-4 py-2 text-sm font-semibold text-[#b54708]">Decline invitation</button>}{declineMutation.isError ? <p className="mt-3 text-sm font-semibold text-[#b42318]" role="alert">{declineMutation.error.message}</p> : null}</section>
  </div>;
}

/** Displays invitations received by the authenticated Group Chat user. */
export default function GroupChatInvitations({ onAccepted }: Props) {
  const [page, setPage] = useState(1);
  const [selectedInvitationId, setSelectedInvitationId] = useState("");
  const invitationQuery = useQuery({ queryKey: [...invitationKey, page], queryFn: ({ signal }) => listGroupChatInvitations({ page, pageSize: 10, signal }), staleTime: 15000, retry: false });
  const detailQuery = useQuery({ queryKey: [...invitationKey, "detail", selectedInvitationId], queryFn: ({ signal }) => getGroupChatInvitation(selectedInvitationId, signal), enabled: Boolean(selectedInvitationId), staleTime: 15000, retry: false });
  if (invitationQuery.isPending) return <p className="rounded-xl bg-[#f9fcfa] p-4 text-sm text-[#52736a]" aria-live="polite">Loading invitations...</p>;
  if (invitationQuery.isError) return <Retry message={invitationQuery.error.message} onRetry={() => void invitationQuery.refetch()} />;
  const invitations = invitationQuery.data?.items ?? [];
  return <div className="space-y-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7f9d94]">Messages / Groups</p><h1 className="mt-1 text-2xl font-bold text-[#06201c]">Invitations</h1><p className="mt-1 text-sm text-[#52736a]">Review invitations received by your account before joining a Group Chat.</p></div><div className="grid gap-4 lg:grid-cols-[minmax(240px,320px)_minmax(0,1fr)]"><section className="rounded-2xl border border-[#e1ebe6] bg-white p-3 shadow-sm" aria-label="Received invitations"><div className="flex items-center justify-between gap-2 px-1"><h2 className="text-base font-bold text-[#16332b]">Received invitations</h2><span className="text-xs text-[#7f9d94]">{invitationQuery.data?.pagination.total ?? invitations.length}</span></div>{invitations.length === 0 ? <p className="mt-3 rounded-xl bg-[#f9fcfa] p-4 text-sm text-[#52736a]">No pending invitations.</p> : <div className="mt-3 space-y-2">{invitations.map((invitation) => <InvitationListItem key={invitation.id} invitation={invitation} selected={invitation.id === selectedInvitationId} onSelect={() => setSelectedInvitationId(invitation.id)} />)}</div>}{(invitationQuery.data?.pagination.total_pages ?? 1) > 1 ? <div className="mt-4 flex items-center justify-between text-xs text-[#52736a]"><span>Page {page} of {invitationQuery.data?.pagination.total_pages}</span><span className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => { setPage((current) => current - 1); setSelectedInvitationId(""); }} className="rounded-lg border border-[#d7e5df] px-3 py-1.5 font-semibold disabled:opacity-40">Previous</button><button type="button" disabled={page >= (invitationQuery.data?.pagination.total_pages ?? 1)} onClick={() => { setPage((current) => current + 1); setSelectedInvitationId(""); }} className="rounded-lg border border-[#d7e5df] px-3 py-1.5 font-semibold disabled:opacity-40">Next</button></span></div> : null}</section><section className="rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm sm:p-5">{!selectedInvitationId ? <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-[#d7e5df] bg-[#f9fcfa] p-6 text-center text-sm text-[#52736a]">Select an invitation to review its details.</div> : detailQuery.isPending ? <p className="text-sm text-[#52736a]" aria-live="polite">Loading invitation details...</p> : detailQuery.isError ? <Retry message={detailQuery.error.message} onRetry={() => void detailQuery.refetch()} /> : detailQuery.data ? <InvitationDetails detail={detailQuery.data} onAccepted={onAccepted} onDeclined={() => setSelectedInvitationId("")} /> : null}</section></div></div>;
}
