"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@ihp/auth";
import { getTenantMembers, type TenantMember } from "@ihp/enterprise-runtime";
import { listTrainings, type TrainingListItem } from "@ihp/enterprise-trainings";
import CreateTrainingGroupWizard from "./CreateTrainingGroupWizard";
import GroupChatPreview from "./GroupChatPreview";

type QueryState<T> = {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
};

type PreviewGroup = {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
};

const PREVIEW_GROUPS: readonly PreviewGroup[] = [
  {
    id: "future-health",
    name: "Future Health cohort",
    description: "Provider-led training group",
    memberCount: 4,
    lastMessage: "Remember to review this week's schedule.",
    lastMessageTime: "09:14",
    unreadCount: 2,
  },
  {
    id: "wellness-connect",
    name: "Wellness Connect",
    description: "Members-only discussion",
    memberCount: 8,
    lastMessage: "Welcome to the group preview.",
    lastMessageTime: "Yesterday",
    unreadCount: 0,
  },
];

function initials(name: string): string {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function GroupListItem({ group, selected, onSelect }: { group: PreviewGroup; selected: boolean; onSelect: () => void }) {
  return <button type="button" aria-pressed={selected} onClick={onSelect} className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6a58] ${selected ? "bg-[#e8f6ee]" : "hover:bg-[#f4faf7]"}`}>
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#dceee5] text-sm font-bold text-[#1f6a58]">{initials(group.name)}</span>
    <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-bold text-[#16332b]">{group.name}</span><span className="shrink-0 text-[11px] text-[#7f9d94]">{group.lastMessageTime}</span></span><span className="mt-0.5 block truncate text-xs text-[#52736a]">{group.lastMessage}</span><span className="mt-1 block text-[11px] text-[#7f9d94]">{group.memberCount} members</span></span>
    {group.unreadCount > 0 ? <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1f6a58] px-1.5 text-[10px] font-bold text-white">{group.unreadCount}</span> : null}
  </button>;
}

/** Renders the isolated Group Chat UI and its preview-only data states. */
export default function EnterpriseGroupChatScreen() {
  const { roles, user } = useAuth();
  const tenantKey = user?.membership?.tenantSlug ?? roles?.tenantSlug ?? "unavailable";
  const [view, setView] = useState<"home" | "create">("home");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [search, setSearch] = useState("");
  const isProvider = roles?.userRole?.toLowerCase() === "provider";
  const canSelectTrainings = !isProvider && tenantKey !== "unavailable";
  const trainingsQuery = useQuery({
    queryKey: ["group-chat-preview", "trainings", tenantKey],
    queryFn: () => listTrainings({ page_size: 100 }),
    enabled: canSelectTrainings,
    staleTime: 30_000,
    retry: 1,
  });
  const membersQuery = useQuery({
    queryKey: ["group-chat-preview", "tenant-members", tenantKey],
    queryFn: () => getTenantMembers(),
    enabled: tenantKey !== "unavailable" && !isProvider && view === "create",
    staleTime: 30_000,
    retry: 1,
  });
  const visibleGroups = useMemo(() => PREVIEW_GROUPS.filter((group) => `${group.name} ${group.description}`.toLowerCase().includes(search.toLowerCase())), [search]);
  const selectedGroup = PREVIEW_GROUPS.find((group) => group.id === selectedGroupId) ?? PREVIEW_GROUPS[0];

  if (view === "create") {
    return <CreateTrainingGroupWizard canSelectTrainings={canSelectTrainings} isProvider={isProvider} trainings={trainingsQuery as QueryState<{ items: TrainingListItem[] }>} members={membersQuery as QueryState<TenantMember[]>} onClose={() => setView("home")} />;
  }

  return <div className="space-y-4">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7f9d94]">Messages / Groups</p><h1 className="mt-1 text-2xl font-bold text-[#06201c]">Groups</h1><p className="mt-1 text-sm text-[#52736a]">Keep training conversations organized in one place.</p></div><button type="button" onClick={() => setView("create")} className="rounded-full bg-[#1f6a58] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#195646] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6a58]">+ Create group</button></div>
    <div className="rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-4 py-3 text-sm text-[#52736a]" role="status"><span className="font-semibold text-[#16332b]">Preview mode.</span> Group messaging is not connected to live backend actions yet.</div>
    {isProvider ? <div className="rounded-xl border border-[#d7e5df] bg-white px-4 py-3 text-sm text-[#52736a]" role="status">Provider view shows preview groups only. Assigned Training access will be applied when the backend authorization contract is connected.</div> : null}
    <div className="grid min-h-[520px] gap-4 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
      <aside className={`rounded-2xl border border-[#e1ebe6] bg-white p-3 shadow-sm ${selectedGroupId ? "hidden lg:block" : "block"}`} aria-label="Group conversations"><div className="flex items-center justify-between gap-2 px-1"><h2 className="text-base font-bold text-[#16332b]">Your groups</h2><span className="text-xs text-[#7f9d94]">{PREVIEW_GROUPS.length}</span></div><label className="sr-only" htmlFor="group-search">Search groups</label><input id="group-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search groups" className="mt-3 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm text-[#16332b] outline-none focus:border-[#1f6a58] focus:ring-2 focus:ring-[#d7eee4]" />{visibleGroups.length === 0 ? <p className="p-4 text-sm text-[#52736a]">No groups match your search.</p> : <div className="mt-3 space-y-1">{visibleGroups.map((group) => <GroupListItem key={group.id} group={group} selected={group.id === selectedGroupId} onSelect={() => setSelectedGroupId(group.id)} />)}</div>}</aside>
      <main className={`${selectedGroupId ? "block" : "hidden lg:block"}`}><div className="mb-3 lg:hidden"><button type="button" onClick={() => setSelectedGroupId("")} className="text-sm font-semibold text-[#1f6a58] hover:underline">← Back to groups</button></div><GroupChatPreview groupName={selectedGroup.name} memberCount={selectedGroup.memberCount} description={selectedGroup.description} /></main>
    </div>
  </div>;
}
