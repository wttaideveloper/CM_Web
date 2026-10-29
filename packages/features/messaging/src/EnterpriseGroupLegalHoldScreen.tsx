"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@ihp/auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GroupChatApiError, clearGroupChatLegalHold, getGroupChat, listGroupChatComplianceGroups, setGroupChatLegalHold } from "./group-chat/group-chat.service";
import { buildGroupChatLegalHoldPayload, canAccessGroupChatComplianceReports, canManageGroupChatLegalHold, isValidGroupChatUuid } from "./group-chat-models";

function errorMessage(error: unknown): string {
  if (error instanceof GroupChatApiError && error.status === 403) return "The backend denied Legal Hold access for this Group.";
  if (error instanceof GroupChatApiError && error.status === 404) return "This Group or its Legal Hold state was not found.";
  if (error instanceof GroupChatApiError && error.status === 409) return "The Group Legal Hold state changed. Refresh the Group and try again.";
  if (error instanceof Error) return error.message;
  return "Unable to load Legal Hold data.";
}

function isStatus(error: unknown, status: number): boolean {
  return error instanceof GroupChatApiError && error.status === status;
}

/** Renders the Compliance-only, backend-authorized Group Legal Hold workflow. */
export default function EnterpriseGroupLegalHoldScreen() {
  const { roles, user } = useAuth();
  const userScope = user?.userId ?? user?.id ?? "";
  const accessScope = [userScope, roles?.tenantSlug ?? "", roles?.tenantRole ?? "", ...(roles?.tenantRbacRoles ?? [])].join("|");
  const canAccess = canAccessGroupChatComplianceReports(roles);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectionScope, setSelectionScope] = useState(accessScope);
  const [reason, setReason] = useState("");
  const [confirmingPlace, setConfirmingPlace] = useState(false);
  const [confirmingLift, setConfirmingLift] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; error: boolean } | null>(null);
  const queryClient = useQueryClient();
  const selectionIsCurrent = selectionScope === accessScope;
  const scopedSelectedGroupId = selectionIsCurrent ? selectedGroupId : "";

  useEffect(() => {
    setSelectedGroupId("");
    setSelectionScope(accessScope);
    setReason("");
    setConfirmingPlace(false);
    setConfirmingLift(false);
    setFeedback(null);
  }, [accessScope]);

  const groupsQuery = useQuery({
    queryKey: ["group-chat", "compliance-groups", accessScope],
    queryFn: ({ signal }) => listGroupChatComplianceGroups(signal),
    enabled: canAccess && Boolean(userScope),
    retry: false,
    staleTime: 15000,
  });
  const detailsQuery = useQuery({
    queryKey: ["group-chat", "group", scopedSelectedGroupId, accessScope],
    queryFn: ({ signal }) => getGroupChat(scopedSelectedGroupId, signal),
    enabled: canAccess && Boolean(userScope) && isValidGroupChatUuid(scopedSelectedGroupId),
    retry: false,
    staleTime: 15000,
  });

  const refreshAuthoritativeDetails = async (successMessage: string) => {
    await queryClient.invalidateQueries({ queryKey: ["group-chat", "group", scopedSelectedGroupId, accessScope] });
    await queryClient.invalidateQueries({ queryKey: ["group-chat", "compliance-groups", accessScope] });
    const refreshed = await detailsQuery.refetch();
    setConfirmingPlace(false);
    setConfirmingLift(false);
    setReason("");
    setFeedback({
      message: refreshed.isError ? `${successMessage} The refreshed Group state could not be loaded.` : successMessage,
      error: refreshed.isError,
    });
  };
  const mutationError = (error: unknown) => {
    setConfirmingPlace(false);
    setConfirmingLift(false);
    setFeedback({ message: errorMessage(error), error: true });
  };
  const setMutation = useMutation({
    mutationFn: () => setGroupChatLegalHold(scopedSelectedGroupId, reason),
    retry: false,
    onSuccess: () => refreshAuthoritativeDetails("Legal Hold placed."),
    onError: mutationError,
  });
  const clearMutation = useMutation({
    mutationFn: () => clearGroupChatLegalHold(scopedSelectedGroupId),
    retry: false,
    onSuccess: () => refreshAuthoritativeDetails("Legal Hold lifted."),
    onError: mutationError,
  });

  if (!canAccess) return <section className="rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm"><h1 className="text-xl font-bold text-[#06201c]">Group Legal Hold</h1><p className="mt-2 text-sm text-[#52736a]">Legal Hold management is available only to authorized Compliance users.</p></section>;
  if (groupsQuery.isPending) return <p className="rounded-xl bg-[#f9fcfa] p-5 text-sm text-[#52736a]" aria-live="polite">Loading Compliance Groups...</p>;
  if (groupsQuery.isError) return <ErrorPanel error={groupsQuery.error} onRetry={() => void groupsQuery.refetch()} />;

  const details = detailsQuery.data;
  const permissionGranted = details?.permissions.can_set_legal_hold === true;
  const stateKnown = details?.legal_hold === true || details?.legal_hold === false;
  const reasonPayload = buildGroupChatLegalHoldPayload(reason);
  const operationPending = setMutation.isPending || clearMutation.isPending;
  const canManage = selectionIsCurrent && details !== undefined && canManageGroupChatLegalHold(details.permissions, details.legal_hold, operationPending);
  const canPlace = canManage && details?.legal_hold === false && reasonPayload !== null;
  const canLift = canManage && details?.legal_hold === true;
  const reasonTrimmedLength = reason.trim().length;
  const reasonInvalid = reasonPayload === null;

  return <section className="space-y-4">
    <header><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7f9d94]">Messages / Compliance</p><h1 className="mt-1 text-2xl font-bold text-[#06201c]">Group Legal Hold</h1><p className="mt-1 text-sm text-[#52736a]">Preserve Training Group records under an explicit, backend-authorized Compliance action.</p></header>
    <label className="block text-sm font-semibold text-[#16332b]">Group<select value={selectedGroupId} onChange={(event) => { setSelectedGroupId(event.target.value); setSelectionScope(accessScope); setReason(""); setConfirmingPlace(false); setConfirmingLift(false); setFeedback(null); }} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 font-normal"><option value="">Select a Group</option>{groupsQuery.data.items.map((group) => <option key={group.id} value={group.id}>{group.name.trim() || "Untitled Group"}</option>)}</select></label>
    {groupsQuery.data.items.length === 0 ? <p className="rounded-xl border border-dashed border-[#d7e5df] bg-[#f9fcfa] p-6 text-sm text-[#52736a]">No authorized Compliance Groups are available.</p> : null}
    {scopedSelectedGroupId && detailsQuery.isPending ? <p className="text-sm text-[#52736a]" aria-live="polite">Loading Group Legal Hold state...</p> : null}
    {scopedSelectedGroupId && detailsQuery.isError ? <ErrorPanel error={detailsQuery.error} onRetry={() => void detailsQuery.refetch()} /> : null}
    {details ? <section className="rounded-xl border border-[#d7e5df] bg-white p-5"><h2 className="text-lg font-bold text-[#06201c]">{details.name}</h2><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="font-semibold text-[#52736a]">Current Legal Hold</dt><dd className="mt-1 text-[#16332b]">{details.legal_hold === true ? "Active" : details.legal_hold === false ? "Not active" : "Unknown"}</dd></div><div><dt className="font-semibold text-[#52736a]">Permission</dt><dd className="mt-1 text-[#16332b]">{permissionGranted ? "Authorized by backend" : "Not authorized by backend"}</dd></div></dl>{!stateKnown ? <p className="mt-4 rounded-lg border border-[#f3d5d1] bg-[#fff7f6] p-3 text-sm text-[#7a271a]">The backend returned no valid boolean Legal Hold state. Actions are unavailable until the state is refreshed.</p> : null}{!permissionGranted ? <p className="mt-4 rounded-lg border border-[#f3d5d1] bg-[#fff7f6] p-3 text-sm text-[#7a271a]">The backend has not authorized Legal Hold management for this Group.</p> : null}{details.legal_hold === false ? <div className="mt-4 space-y-3"><label className="block text-sm font-semibold text-[#16332b]">Reason<textarea value={reason} onChange={(event) => { setReason(event.target.value); setConfirmingPlace(false); setFeedback(null); }} disabled={operationPending} maxLength={500} rows={4} className="mt-1 w-full rounded-xl border border-[#d7e5df] bg-white px-3 py-2 font-normal" placeholder="Explain why this Training Group must be preserved." /></label>{reasonInvalid ? <p className="text-xs text-[#b42318]" role="alert">Reason must be between 3 and 500 characters after trimming.</p> : <p className="text-xs text-[#7f9d94]">Enter 3–500 characters.</p>}{confirmingPlace ? <div className="rounded-lg border border-[#d7e5df] bg-[#f9fcfa] p-3"><p className="text-sm text-[#16332b]">Place a Legal Hold on this Group using the entered reason?</p><div className="mt-3 flex gap-2"><button type="button" disabled={!canPlace} onClick={() => setMutation.mutate()} className="rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{setMutation.isPending ? "Placing..." : "Confirm placement"}</button><button type="button" disabled={operationPending} onClick={() => setConfirmingPlace(false)} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#16332b]">Cancel</button></div></div> : <button type="button" disabled={!canPlace} onClick={() => setConfirmingPlace(true)} className="rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Place Legal Hold</button>}</div> : null}{details.legal_hold === true ? <div className="mt-4">{confirmingLift ? <div className="rounded-lg border border-[#d7e5df] bg-[#f9fcfa] p-3"><p className="text-sm text-[#16332b]">Lift the Legal Hold for this Group? Records may become subject to ordinary retention rules after the backend processes this request.</p><div className="mt-3 flex gap-2"><button type="button" disabled={!canLift} onClick={() => clearMutation.mutate()} className="rounded-full bg-[#b54708] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{clearMutation.isPending ? "Lifting..." : "Confirm lift"}</button><button type="button" disabled={operationPending} onClick={() => setConfirmingLift(false)} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#16332b]">Cancel</button></div></div> : <button type="button" disabled={!canLift} onClick={() => setConfirmingLift(true)} className="rounded-full border border-[#b54708] px-4 py-2 text-sm font-semibold text-[#b54708] disabled:cursor-not-allowed disabled:opacity-50">Lift Legal Hold</button>}</div> : null}{feedback ? <p className={`mt-4 rounded-lg border p-3 text-sm ${feedback.error ? "border-[#f3d5d1] bg-[#fff7f6] text-[#7a271a]" : "border-[#c7e8d4] bg-[#e8f6ee] text-[#1f6a58]"}`} role={feedback.error ? "alert" : "status"}>{feedback.message}</p> : null}</section> : null}
  </section>;
}

function ErrorPanel({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const message = isStatus(error, 403) ? "The backend denied access to Legal Hold data." : isStatus(error, 404) ? "The selected Group or Legal Hold state was not found." : errorMessage(error);
  return <section className="rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-4" role="alert"><p className="text-sm text-[#7a271a]">{message}</p><button type="button" onClick={onRetry} className="mt-3 text-sm font-semibold text-[#1f6a58] underline">Try again</button></section>;
}
