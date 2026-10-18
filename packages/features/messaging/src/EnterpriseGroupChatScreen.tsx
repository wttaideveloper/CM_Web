"use client";

import { useState } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import CreateTrainingGroupWizard from "./CreateTrainingGroupWizard";
import GroupChatInvitations from "./GroupChatInvitations";
import GroupChatWorkspace from "./GroupChatWorkspace";
import { listGroupChatGroups } from "./group-chat/group-chat.service";
import type { GroupChatListResponse, GroupChatSummary } from "./group-chat/group-chat.types";

type PreviewState = "home" | "create";
type GroupMode = "groups" | "invitations";
type Query<T> = UseQueryResult<T, Error>;
const PAGE_SIZE = 10;

function initials(name: string): string {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function ConversationIcon() {
  return <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e8f6ee] text-[#1f6a58] motion-safe:animate-pulse"><svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 6.5A3.5 3.5 0 0 1 8.5 3h7A3.5 3.5 0 0 1 19 6.5v5a3.5 3.5 0 0 1-3.5 3.5H11l-4.5 4v-4.6A3.5 3.5 0 0 1 5 11.5v-5Z" /><path d="M9 8.75h6M9 11.75h3" /></svg></span>;
}

function EmptyGroupSelection() {
  return <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#d7e5df] bg-[#f9fcfa] p-6 text-center"><ConversationIcon /><h2 className="mt-4 text-base font-bold text-[#16332b]">Select a group to get started</h2><p className="mt-1 max-w-sm text-sm text-[#52736a]">Choose a group from the list to view its details and conversations.</p></div>;
}

function CloseGroupViewButton({ onClose }: { onClose: () => void }) {
  return <button type="button" aria-label="Close group view" title="Close conversation" onClick={onClose} className="absolute right-20 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-[#b7dfc7] bg-[#e8f6ee] text-[#1f6a58] shadow-sm transition-colors hover:bg-[#d7efe1] hover:text-[#16332b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6a58] focus-visible:ring-offset-2"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="m7 7 10 10M17 7 7 17" /></svg></button>;
}

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  return <div className="flex items-center justify-between text-xs text-[#52736a]"><span>Page {page} of {totalPages}</span><span className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} className="rounded-lg border border-[#d7e5df] px-3 py-1.5 font-semibold disabled:opacity-40">Previous</button><button type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)} className="rounded-lg border border-[#d7e5df] px-3 py-1.5 font-semibold disabled:opacity-40">Next</button></span></div>;
}

function GroupListItem({ group, selected, onSelect }: { group: GroupChatSummary; selected: boolean; onSelect: () => void }) {
  const baseClass = "flex w-full cursor-pointer items-center gap-3 rounded-xl p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6a58] focus-visible:ring-offset-2";
  return <button type="button" aria-pressed={selected} onClick={onSelect} className={`${baseClass} ${selected ? "bg-[#e8f6ee]" : "hover:bg-[#f4faf7]"}`}><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#dceee5] text-sm font-bold text-[#1f6a58]">{initials(group.name)}</span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-bold text-[#16332b]">{group.name}</span>{group.unread_count > 0 ? <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1f6a58] px-1.5 text-[10px] font-bold text-white">{group.unread_count}</span> : null}</span><span className="mt-0.5 block truncate text-xs text-[#52736a]">{group.last_message || group.description || "No messages yet"}</span><span className="mt-1 block text-[11px] text-[#7f9d94]">{group.member_count ?? "—"} members · {group.status || "Active"}</span></span></button>;
}

function Retry({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-4 text-sm text-[#7a271a]" role="alert"><p>{message}</p><button type="button" onClick={onRetry} className="mt-2 font-semibold underline">Try again</button></div>;
}

function GroupList({ query, search, page, selectedGroupId, onSearch, onPage, onSelect }: { query: Query<GroupChatListResponse>; search: string; page: number; selectedGroupId: string; onSearch: (value: string) => void; onPage: (page: number) => void; onSelect: (id: string) => void }) {
  if (query.isPending) return <p className="text-sm text-[#52736a]" aria-live="polite">Loading Groups...</p>;
  if (query.isError) return <Retry message={query.error.message} onRetry={() => void query.refetch()} />;
  const groups = query.data?.items ?? [];
  return <><label className="sr-only" htmlFor="group-search">Search groups</label><input id="group-search" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search groups" className="mt-3 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm outline-none focus:border-[#1f6a58]" /><div className="mt-3 space-y-1">{groups.length === 0 ? <p className="rounded-xl bg-[#f9fcfa] p-4 text-sm text-[#52736a]">No Groups are available for your account.</p> : groups.map((group) => <GroupListItem key={group.id} group={group} selected={group.id === selectedGroupId} onSelect={() => onSelect(group.id)} />)}</div><div className="mt-4"><Pagination page={query.data?.pagination.page ?? page} totalPages={query.data?.pagination.total_pages ?? 1} onChange={onPage} /></div></>;
}

/** Renders the authenticated Group Chat list and received invitations. */
export default function EnterpriseGroupChatScreen() {
  const [view, setView] = useState<PreviewState>("home");
  const [mode, setMode] = useState<GroupMode>("groups");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const groupsQuery = useQuery({ queryKey: ["group-chat", "groups", search, page], queryFn: ({ signal }) => listGroupChatGroups({ q: search, page, pageSize: PAGE_SIZE, signal }), staleTime: 15000, retry: false });
  if (view === "create") return <CreateTrainingGroupWizard onClose={() => setView("home")} onCreated={(groupId) => { setSelectedGroupId(groupId); setMode("groups"); setView("home"); }} />;
  return <div className="space-y-4"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7f9d94]">Messages / Groups</p><h1 className="mt-1 text-2xl font-bold text-[#06201c]">{mode === "groups" ? "Groups" : "Invitations"}</h1><p className="mt-1 text-sm text-[#52736a]">{mode === "groups" ? "Manage Training Group membership and invitations." : "Review invitations received by your account."}</p></div>{mode === "groups" ? <button type="button" onClick={() => setView("create")} className="rounded-full bg-[#1f6a58] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#195646]">+ Create group</button> : null}</div><div className="flex flex-wrap gap-2 border-b border-[#e1ebe6] pb-3" role="tablist" aria-label="Group Chat views"><button type="button" role="tab" aria-selected={mode === "groups"} onClick={() => setMode("groups")} className={`rounded-full px-4 py-2 text-sm font-semibold ${mode === "groups" ? "bg-[#1f6a58] text-white" : "bg-[#f4faf7] text-[#52736a]"}`}>My Groups</button><button type="button" role="tab" aria-selected={mode === "invitations"} onClick={() => { setMode("invitations"); setSelectedGroupId(""); }} className={`rounded-full px-4 py-2 text-sm font-semibold ${mode === "invitations" ? "bg-[#1f6a58] text-white" : "bg-[#f4faf7] text-[#52736a]"}`}>Invitations</button></div>{mode === "invitations" ? <GroupChatInvitations onAccepted={(groupId) => { setMode("groups"); setSelectedGroupId(groupId); }} /> : <><div className="rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-4 py-3 text-sm text-[#52736a]" role="status"><span className="font-semibold text-[#16332b]">Group messaging is not connected yet.</span> Group creation, membership, and invitations use the authorized Group Chat APIs. Messages and Group Socket.IO remain disabled.</div><div className="grid min-h-[520px] gap-4 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]"><aside className="rounded-2xl border border-[#e1ebe6] bg-white p-3 shadow-sm" aria-label="Group conversations"><div className="flex items-center justify-between gap-2 px-1"><h2 className="text-base font-bold text-[#16332b]">Your groups</h2><span className="text-xs text-[#7f9d94]">{groupsQuery.data?.pagination.total ?? ""}</span></div><GroupList query={groupsQuery} search={search} page={page} selectedGroupId={selectedGroupId} onSearch={(value) => { setSearch(value); setPage(1); }} onPage={setPage} onSelect={setSelectedGroupId} /></aside><main><div className="mb-3 lg:hidden"><button type="button" onClick={() => setSelectedGroupId("")} className="text-sm font-semibold text-[#1f6a58] hover:underline">← Back to groups</button></div>{selectedGroupId ? <div className="relative"><GroupChatWorkspace groupId={selectedGroupId} /><CloseGroupViewButton onClose={() => setSelectedGroupId("")} /></div> : <EmptyGroupSelection />}</main></div></>}</div>;
}
