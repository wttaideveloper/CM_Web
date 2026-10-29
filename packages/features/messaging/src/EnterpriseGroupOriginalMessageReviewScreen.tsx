"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@ihp/auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { GroupChatApiError, getGroupChat, getGroupChatOriginalMessage, listGroupChatComplianceGroups } from "./group-chat/group-chat.service";
import { canAccessGroupChatComplianceReports, canSubmitGroupChatOriginalMessageReview, isValidGroupChatUuid } from "./group-chat-models";
import type { GroupChatDetails, GroupChatOriginalMessage } from "./group-chat/group-chat.types";

type Props = { initialGroupId?: string; initialMessageId?: string; onBack?: () => void; onOpenAudit?: (groupId?: string, action?: string) => void };

function errorMessage(error: unknown): string {
  if (error instanceof GroupChatApiError && error.status === 401) return "Your session is no longer authorized to retrieve secure messages.";
  if (error instanceof GroupChatApiError && error.status === 403) return "The backend denied secure original-message access for this Group.";
  if (error instanceof GroupChatApiError && error.status === 404) return "The Group or secure message was not found or is no longer available.";
  if (error instanceof Error) return error.message;
  return "Unable to retrieve the secure original message.";
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function displayContent(value: string | null, emptyLabel: string): string {
  return value === null ? emptyLabel : value || "(Empty message)";
}

function isSensitiveVersionKey(key: string): boolean {
  return ["content", "current_content", "body", "text", "message"].includes(key.trim().toLowerCase());
}

function safeVersionMetadata(version: Record<string, unknown>): readonly [string, unknown][] {
  return Object.entries(version).filter(([key, value]) => !isSensitiveVersionKey(key) && (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean"));
}

function ReviewResult({ result }: { result: GroupChatOriginalMessage }) {
  return <section className="space-y-3 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] p-4" aria-live="polite">
    <div><h2 className="text-base font-bold text-[#16332b]">Secure original message</h2><p className="mt-1 text-xs text-[#52736a]">Message ID: <span className="break-all">{result.message_id}</span></p></div>
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#7f9d94]">Status</dt><dd className="mt-1 text-[#16332b]">{result.status}</dd></div>
      <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#7f9d94]">Original timestamp</dt><dd className="mt-1 text-[#16332b]">{formatDate(result.created_at)}</dd></div>
    </dl>
    <div className="rounded-lg border border-[#e1ebe6] bg-white p-3"><h3 className="text-sm font-bold text-[#16332b]">Original content</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm text-[#16332b]">{displayContent(result.content, "No original text is available.")}</p></div>
    <div className="rounded-lg border border-[#e1ebe6] bg-white p-3"><h3 className="text-sm font-bold text-[#16332b]">Current content</h3><p className="mt-2 whitespace-pre-wrap break-words text-sm text-[#16332b]">{displayContent(result.current_content, "No current text is available.")}</p></div>
    <div><h3 className="text-sm font-bold text-[#16332b]">Historical versions</h3>{result.versions.length === 0 ? <p className="mt-2 text-sm text-[#52736a]">No historical version metadata was returned.</p> : <div className="mt-2 space-y-2">{result.versions.map((version, index) => { const metadata = safeVersionMetadata(version); return <article key={index} className="rounded-lg border border-[#e1ebe6] bg-white p-3"><h4 className="text-xs font-bold uppercase tracking-wide text-[#52736a]">Version {index + 1}</h4>{metadata.length === 0 ? <p className="mt-2 text-xs text-[#52736a]">Structured version metadata is unavailable.</p> : <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-2">{metadata.map(([key, value]) => <div key={key}><dt className="font-semibold text-[#52736a]">{key.replace(/[_-]+/g, " ")}</dt><dd className="break-words text-[#16332b]">{value === null ? "Not recorded" : String(value)}</dd></div>)}</dl>}</article>; })}</div>}</div>
    {result.hidden_by || result.hidden_at || result.hidden_reason ? <div className="rounded-lg border border-[#f1d8ad] bg-[#fffaf0] p-3"><h3 className="text-sm font-bold text-[#8b5e00]">Hidden-message record</h3>{result.hidden_by ? <p className="mt-2 text-sm text-[#8b5e00]">Hiding actor ID: <span className="break-all">{result.hidden_by}</span></p> : null}{result.hidden_at ? <p className="mt-1 text-sm text-[#8b5e00]">Hidden at: {formatDate(result.hidden_at)}</p> : null}{result.hidden_reason ? <p className="mt-1 whitespace-pre-wrap text-sm text-[#8b5e00]">Reason: {result.hidden_reason}</p> : null}</div> : null}
  </section>;
}

function RestrictedMessage({ details, canAccessCompliance }: { details: GroupChatDetails; canAccessCompliance: boolean }) {
  const isOwner = details.my_role?.trim().toLowerCase() === "owner";
  if (canAccessCompliance || isOwner) return null;
  return <section className="rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-5" role="alert"><h2 className="text-base font-bold text-[#7a271a]">Secure review unavailable</h2><p className="mt-2 text-sm text-[#7a271a]">This review is restricted to authorized Compliance users and Group Owners. The backend remains authoritative.</p></section>;
}

/** Provides an explicit, non-prefetching secure-original review workflow. */
export default function EnterpriseGroupOriginalMessageReviewScreen({ initialGroupId, initialMessageId, onBack, onOpenAudit }: Props) {
  const { roles, user } = useAuth();
  const userScope = user?.userId ?? user?.id ?? "";
  const accessScope = [userScope, roles?.tenantSlug ?? "", roles?.tenantRole ?? "", ...(roles?.tenantRbacRoles ?? [])].join("|");
  const ownerEntry = Boolean(initialGroupId?.trim());
  const canAccessCompliance = canAccessGroupChatComplianceReports(roles);
  const [selectedGroupId, setSelectedGroupId] = useState(initialGroupId?.trim() ?? "");
  const [messageId, setMessageId] = useState(initialMessageId?.trim() ?? "");
  const groupsQuery = useQuery({ queryKey: ["group-chat", "compliance-groups", accessScope], queryFn: ({ signal }) => listGroupChatComplianceGroups(signal), enabled: Boolean(userScope) && canAccessCompliance && !ownerEntry, retry: false, staleTime: 15000 });
  const detailsQuery = useQuery({ queryKey: ["group-chat", "group", selectedGroupId, accessScope], queryFn: ({ signal }) => getGroupChat(selectedGroupId, signal), enabled: Boolean(userScope) && isValidGroupChatUuid(selectedGroupId), retry: false, staleTime: 15000 });
  const retrieval = useMutation({ mutationFn: ({ groupId, messageId: requestedMessageId }: { groupId: string; messageId: string }) => getGroupChatOriginalMessage(groupId, requestedMessageId), retry: false });

  useEffect(() => {
    setSelectedGroupId(initialGroupId?.trim() ?? "");
    setMessageId(initialMessageId?.trim() ?? "");
    retrieval.reset();
  }, [accessScope, initialGroupId, initialMessageId]);

  const details = detailsQuery.data;
  const ownerAuthorized = details?.my_role?.trim().toLowerCase() === "owner";
  const entryAuthorized = canAccessCompliance || ownerAuthorized;
  const selectGroup = (groupId: string) => { setSelectedGroupId(groupId); setMessageId(""); retrieval.reset(); };
  const handleBack = () => { retrieval.reset(); onBack?.(); };
  const retrieve = () => {
    const normalizedMessageId = messageId.trim();
    if (!canSubmitGroupChatOriginalMessageReview(selectedGroupId, normalizedMessageId, entryAuthorized, retrieval.isPending)) return;
    retrieval.mutate({ groupId: selectedGroupId, messageId: normalizedMessageId });
  };

  if (!canAccessCompliance && !ownerEntry) return <section className="rounded-2xl border border-[#e1ebe6] bg-white p-6"><h1 className="text-xl font-bold text-[#06201c]">Secure Message Review</h1><p className="mt-2 text-sm text-[#52736a]">Secure original-message review is available only from an authorized Compliance or Group Owner entry point.</p></section>;
  if (!ownerEntry && groupsQuery.isPending) return <p className="rounded-xl bg-[#f9fcfa] p-5 text-sm text-[#52736a]" aria-live="polite">Loading authorized Compliance Groups...</p>;
  if (!ownerEntry && groupsQuery.isError) return <section className="rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-5" role="alert"><p className="text-sm text-[#7a271a]">{errorMessage(groupsQuery.error)}</p><button type="button" onClick={() => void groupsQuery.refetch()} className="mt-3 text-sm font-semibold text-[#1f6a58] underline">Try again</button></section>;
  return <section className="space-y-4">
    <header>{onBack ? <button type="button" onClick={handleBack} className="text-sm font-semibold text-[#1f6a58] hover:underline">← Back</button> : null}<p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-[#7f9d94]">Messages / Compliance</p><h1 className="mt-1 text-2xl font-bold text-[#06201c]">Secure Message Review</h1><p className="mt-1 text-sm text-[#52736a]">Retrieving a secure original message is audited. No retrieval happens until you explicitly select the button below.</p></header>
    {!ownerEntry ? <label className="block text-sm font-semibold text-[#16332b]">Authorized Group<select value={selectedGroupId} onChange={(event) => selectGroup(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 font-normal"><option value="">Select a Group</option>{groupsQuery.data?.items.map((group) => <option key={group.id} value={group.id}>{group.name.trim() || "Untitled Group"}</option>)}</select></label> : <p className="rounded-xl border border-[#d7e5df] bg-[#f9fcfa] p-3 text-sm text-[#52736a]">Reviewing the selected Group Owner entry point.</p>}
    {selectedGroupId && detailsQuery.isPending ? <p className="text-sm text-[#52736a]" aria-live="polite">Loading Group authorization...</p> : null}
    {selectedGroupId && detailsQuery.isError ? <section className="rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-5" role="alert"><p className="text-sm text-[#7a271a]">{errorMessage(detailsQuery.error)}</p></section> : null}
    {details && !detailsQuery.isError ? <><RestrictedMessage details={details} canAccessCompliance={canAccessCompliance} />{entryAuthorized ? <section className="rounded-xl border border-[#d7e5df] bg-[#f9fcfa] p-4"><aside className="mb-4 rounded-lg border border-[#e1ebe6] bg-white p-3"><h2 className="text-sm font-bold text-[#16332b]">How to find a message</h2><p className="mt-2 text-sm text-[#52736a]">Looking for a hidden message? Open Group Audit Trail and select “Message hidden” in the Action filter. Find the relevant event and click “Review Original Message”.</p><p className="mt-2 text-sm text-[#52736a]">The group and message reference will be filled in automatically.</p><p className="mt-2 text-sm text-[#52736a]">If you already know the message ID, you can enter it directly below.</p>{onOpenAudit ? <button type="button" onClick={() => onOpenAudit(selectedGroupId, "message_hidden")} className="mt-3 rounded-full border border-[#1f6a58] px-3 py-1.5 text-xs font-semibold text-[#1f6a58]">Open Group Audit Trail</button> : null}</aside><label className="block text-sm font-semibold text-[#16332b]">Message UUID<input value={messageId} onChange={(event) => { setMessageId(event.target.value); retrieval.reset(); }} placeholder="Enter the message UUID from Technical references" disabled={retrieval.isPending} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 font-normal" /></label><button type="button" onClick={retrieve} disabled={!canSubmitGroupChatOriginalMessageReview(selectedGroupId, messageId.trim(), entryAuthorized, retrieval.isPending)} className="mt-3 rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{retrieval.isPending ? "Retrieving..." : "Retrieve Original Message"}</button>{retrieval.error ? <p className="mt-3 rounded-lg border border-[#f3d5d1] bg-[#fff7f6] p-3 text-sm text-[#7a271a]" role="alert">{errorMessage(retrieval.error)}</p> : null}</section> : null}{retrieval.data ? <ReviewResult result={retrieval.data} /> : null}</> : null}
  </section>;
}
