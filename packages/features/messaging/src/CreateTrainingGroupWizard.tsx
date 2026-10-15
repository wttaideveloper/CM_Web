"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import {
  buildCreateGroupPayload,
  createGroup,
  listGroupChatLearners,
  listGroupChatProviders,
  listGroupChatTrainings,
  listTrainingGroupChats,
} from "./group-chat/group-chat.service";
import type {
  GroupChatLearner,
  GroupChatLearnerListResponse,
  GroupChatProvider,
  GroupChatProviderListResponse,
  GroupChatListResponse,
  GroupChatTraining,
  GroupChatTrainingListResponse,
} from "./group-chat/group-chat.types";
import { isGroupChatLearnerSelectable, isGroupChatProviderSelectable, remainingGroupChatMemberSlots } from "./group-chat-models";

type Props = { onClose: () => void; onCreated?: (groupId: string) => void };
type Step = 0 | 1 | 2 | 3;
type Permission = "admins" | "members";
type Query<T> = UseQueryResult<T, Error>;

const STEPS = ["Training", "Group details", "People", "Review"] as const;
const PAGE_SIZE = 10;
const DEFAULT_MAX_MEMBERS = 50;
const GROUP_QUERY_KEY = ["group-chat", "groups"];

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm sm:p-5"><h2 className="text-lg font-bold text-[#06201c]">{title}</h2><div className="mt-4">{children}</div></section>;
}

function SearchInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  const id = label.toLowerCase().replaceAll(" ", "-");
  return <><label className="sr-only" htmlFor={id}>{label}</label><input id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm outline-none focus:border-[#1f6a58]" /></>;
}

function Retry({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-3 text-sm text-[#7a271a]" role="alert"><p>{message}</p><button type="button" onClick={onRetry} className="mt-2 font-semibold underline">Try again</button></div>;
}

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  return <div className="flex items-center justify-between text-xs text-[#52736a]"><span>Page {page} of {totalPages}</span><span className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} className="rounded-lg border border-[#d7e5df] px-3 py-1.5 font-semibold disabled:opacity-40">Previous</button><button type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)} className="rounded-lg border border-[#d7e5df] px-3 py-1.5 font-semibold disabled:opacity-40">Next</button></span></div>;
}

function Progress({ step, onStep }: { step: Step; onStep: (step: Step) => void }) {
  return <ol aria-label="Create group progress" className="flex items-center overflow-x-auto rounded-xl border border-[#d7e5df] bg-white p-2 shadow-sm">{STEPS.map((label, index) => <li key={label} className="flex min-w-max items-center"><button type="button" disabled={index > step} onClick={() => onStep(index as Step)} className={index === step ? "rounded-lg bg-[#1f6a58] px-3 py-2 text-xs font-semibold text-white" : "px-3 py-2 text-xs font-semibold text-[#52736a]"}>{index + 1}. {label}</button>{index < STEPS.length - 1 ? <span className="h-px w-4 bg-[#d7e5df]" aria-hidden="true" /> : null}</li>)}</ol>;
}

function TrainingStep({ query, existingGroupsQuery, selected, search, page, onSearch, onPage, onSelect, onClear }: { query: Query<GroupChatTrainingListResponse>; existingGroupsQuery: Query<GroupChatListResponse>; selected: GroupChatTraining | null; search: string; page: number; onSearch: (value: string) => void; onPage: (page: number) => void; onSelect: (training: GroupChatTraining) => void; onClear: () => void }) {
  if (query.isPending) return <p className="text-sm text-[#52736a]" aria-live="polite">Loading Trainings...</p>;
  if (query.isError) return <Retry message={query.error.message} onRetry={() => void query.refetch()} />;
  const items = query.data?.items ?? [];
  return <div className="space-y-3"><SearchInput label="Search Trainings" value={search} onChange={onSearch} placeholder="Search Trainings" /><div className="grid gap-2">{items.length === 0 ? <p className="rounded-xl bg-[#f9fcfa] p-4 text-sm text-[#52736a]">No authorized Trainings match this search.</p> : items.map((training) => <button key={training.id} type="button" aria-pressed={selected?.id === training.id} onClick={() => onSelect(training)} className={selected?.id === training.id ? "w-full rounded-xl border border-[#1f6a58] bg-[#e8f6ee] p-3 text-left" : "w-full rounded-xl border border-[#e1ebe6] p-3 text-left hover:bg-[#f9fcfa]"}><span className="block truncate text-sm font-semibold text-[#16332b]">{training.title}</span><span className="mt-1 block text-xs capitalize text-[#52736a]">{training.status || "Status unavailable"} · {training.enrolled_count === null ? "Enrollment count unavailable" : `${training.enrolled_count} enrolled`}</span></button>)}</div><Pagination page={query.data?.pagination.page ?? page} totalPages={query.data?.pagination.total_pages ?? 1} onChange={onPage} />{selected ? <><p className="rounded-xl bg-[#f9fcfa] p-3 text-xs text-[#52736a]">{existingGroupsQuery.isPending ? "Checking existing groups for this Training..." : existingGroupsQuery.isError ? "Existing Training groups could not be loaded." : `${existingGroupsQuery.data?.pagination.total ?? 0} existing Group(s) are associated with this Training.`}</p><button type="button" onClick={onClear} className="text-xs font-semibold text-[#1f6a58] hover:underline">Clear selected Training</button></> : null}</div>;
}

function Toggle({ checked, disabled, label, detail, onChange }: { checked: boolean; disabled: boolean; label: string; detail: string; onChange: () => void }) {
  return <label className={disabled ? "flex cursor-not-allowed gap-3 rounded-xl border border-[#e1ebe6] p-3 opacity-60" : "flex cursor-pointer gap-3 rounded-xl border border-[#e1ebe6] p-3 hover:bg-[#f9fcfa]"}><input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} className="mt-1 h-4 w-4 accent-[#1f6a58]" /><span><span className="block text-sm font-semibold text-[#16332b]">{label}</span><span className="block text-xs text-[#52736a]">{detail}</span></span></label>;
}

function PeopleStep({ learnersQuery, providersQuery, learnerIds, providerIds, learnerSearch, providerSearch, learnerPage, maxSelectable, onLearnerSearch, onProviderSearch, onLearnerPage, onToggleLearner, onToggleProvider, onSelectAll }: { learnersQuery: Query<GroupChatLearnerListResponse>; providersQuery: Query<GroupChatProviderListResponse>; learnerIds: string[]; providerIds: string[]; learnerSearch: string; providerSearch: string; learnerPage: number; maxSelectable: number; onLearnerSearch: (value: string) => void; onProviderSearch: (value: string) => void; onLearnerPage: (page: number) => void; onToggleLearner: (learner: GroupChatLearner) => void; onToggleProvider: (provider: GroupChatProvider) => void; onSelectAll: () => void }) {
  const [audience, setAudience] = useState<"learners" | "providers">("learners");
  const selectedCount = new Set([...learnerIds, ...providerIds]).size;
  const learnerItems = learnersQuery.data?.items ?? [];
  const providerItems = providersQuery.data?.items ?? [];
  return <div className="space-y-4"><div className="rounded-xl bg-[#f9fcfa] p-3 text-sm text-[#16332b]"><strong>{selectedCount} of {maxSelectable}</strong> invitees selected. The group owner counts toward backend capacity.</div><div className="flex gap-2 border-b border-[#e1ebe6]" role="tablist"><button type="button" role="tab" aria-selected={audience === "learners"} onClick={() => setAudience("learners")} className="px-3 py-2 text-sm font-semibold text-[#1f6a58]">Learners ({learnerIds.length})</button><button type="button" role="tab" aria-selected={audience === "providers"} onClick={() => setAudience("providers")} className="px-3 py-2 text-sm font-semibold text-[#1f6a58]">Providers ({providerIds.length})</button></div>{audience === "learners" ? <section className="space-y-3" aria-label="Learner selection"><div className="flex items-center justify-between gap-2"><div><h3 className="text-sm font-bold text-[#16332b]">Enrolled learners</h3><p className="text-xs text-[#52736a]">Only an account and can_invite=true makes a learner selectable.</p></div><button type="button" onClick={onSelectAll} className="text-xs font-semibold text-[#1f6a58] hover:underline">Select all eligible on this page</button></div><SearchInput label="Search learners" value={learnerSearch} onChange={onLearnerSearch} placeholder="Search learners" />{learnersQuery.isPending ? <p className="text-sm text-[#52736a]">Loading enrolled learners...</p> : learnersQuery.isError ? <Retry message={learnersQuery.error.message} onRetry={() => void learnersQuery.refetch()} /> : learnerItems.length === 0 ? <p className="rounded-xl bg-[#f9fcfa] p-3 text-sm text-[#52736a]">No enrolled learners match this search.</p> : <div className="space-y-2">{learnerItems.map((learner) => { const unavailable = !learner.user_id || !learner.can_invite; const checked = Boolean(learner.user_id && learnerIds.includes(learner.user_id)); const detail = !learner.user_id ? "No account yet" : learner.reason || `${learner.email || "Email not provided"} · ${learner.enrolment_status || "Status unavailable"}`; return <Toggle key={learner.enrolment_id} checked={checked} disabled={unavailable || (selectedCount >= maxSelectable && !checked)} label={learner.name} detail={detail} onChange={() => onToggleLearner(learner)} />; })}</div>}<Pagination page={learnersQuery.data?.pagination.page ?? learnerPage} totalPages={learnersQuery.data?.pagination.total_pages ?? 1} onChange={onLearnerPage} /></section> : <section className="space-y-3" aria-label="Provider selection"><div><h3 className="text-sm font-bold text-[#16332b]">Additional Providers</h3><p className="text-xs text-[#52736a]">Only authorized verified Providers returned for this Training are shown.</p></div><SearchInput label="Search Providers" value={providerSearch} onChange={onProviderSearch} placeholder="Search Providers" />{providersQuery.isPending ? <p className="text-sm text-[#52736a]">Loading Providers...</p> : providersQuery.isError ? <Retry message={providersQuery.error.message} onRetry={() => void providersQuery.refetch()} /> : providerItems.length === 0 ? <p className="rounded-xl bg-[#f9fcfa] p-3 text-sm text-[#52736a]">No authorized Providers match this search.</p> : <div className="space-y-2">{providerItems.map((provider) => <Toggle key={provider.user_id} checked={providerIds.includes(provider.user_id)} disabled={provider.is_me || (selectedCount >= maxSelectable && !providerIds.includes(provider.user_id))} label={provider.name} detail={provider.is_me ? "You · Group owner" : provider.registration_number || (provider.is_training_instructor ? "Training instructor" : "Verified Provider")} onChange={() => onToggleProvider(provider)} />)}</div>}</section>}</div>;
}

function DetailsStep({ name, description, permission, onName, onDescription, onPermission }: { name: string; description: string; permission: Permission; onName: (value: string) => void; onDescription: (value: string) => void; onPermission: (value: Permission) => void }) {
  return <div className="space-y-5"><label className="block text-sm font-semibold text-[#16332b]">Group name<input value={name} onChange={(event) => onName(event.target.value)} placeholder="e.g. Future Health cohort" className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal outline-none focus:border-[#1f6a58]" /></label><label className="block text-sm font-semibold text-[#16332b]">Description <span className="font-normal text-[#7f9d94]">(optional)</span><textarea value={description} onChange={(event) => onDescription(event.target.value)} placeholder="What is this group for?" className="mt-1 min-h-20 w-full rounded-xl border border-[#d7e5df] p-3 font-normal outline-none focus:border-[#1f6a58]" /></label><label className="block text-sm font-semibold text-[#16332b]">Who can send messages<select value={permission} onChange={(event) => onPermission(event.target.value as Permission)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal outline-none focus:border-[#1f6a58]"><option value="admins">Providers and admins only</option><option value="members">All members</option></select></label><p className="text-xs text-[#52736a]">Group creation is authorized by the backend. No messages are sent by this wizard.</p></div>;
}

function ReviewStep({ training, learners, providers, name, description, permission, submitted, error, maxSelectable }: { training: GroupChatTraining | null; learners: GroupChatLearner[]; providers: GroupChatProvider[]; name: string; description: string; permission: Permission; submitted: boolean; error: string | null; maxSelectable: number }) {
  const selectedCount = learners.length + providers.length;
  return <div className="space-y-3"><div className="grid gap-3 rounded-xl bg-[#f9fcfa] p-4 text-sm text-[#52736a] sm:grid-cols-2"><p><strong className="text-[#16332b]">Training:</strong> {training?.title || "Not selected"}</p><p><strong className="text-[#16332b]">Group:</strong> {name || "Not named"}</p><p><strong className="text-[#16332b]">Learners:</strong> {learners.length}</p><p><strong className="text-[#16332b]">Providers:</strong> {providers.length}</p><p><strong className="text-[#16332b]">Capacity remaining:</strong> {Math.max(0, maxSelectable - selectedCount)}</p><p><strong className="text-[#16332b]">Posting:</strong> {permission === "admins" ? "Providers and admins only" : "All members"}</p>{description ? <p className="sm:col-span-2"><strong className="text-[#16332b]">Description:</strong> {description}</p> : null}</div>{error ? <p className="rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-3 text-sm text-[#7a271a]" role="alert">{error}</p> : null}{submitted ? <p className="rounded-xl border border-[#b7dfc7] bg-[#e8f6ee] p-4 text-sm font-semibold text-[#1f6a58]" role="status">Group created and invitations were submitted successfully.</p> : <p className="text-sm text-[#52736a]">Invitees remain pending until they explicitly accept.</p>}</div>;
}

/** Renders the real Training Group creation workflow without changing direct Chat. */
export default function CreateTrainingGroupWizard({ onClose, onCreated }: Props) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(0);
  const [training, setTraining] = useState<GroupChatTraining | null>(null);
  const [learnerIds, setLearnerIds] = useState<string[]>([]);
  const [providerIds, setProviderIds] = useState<string[]>([]);
  const [learnerCache, setLearnerCache] = useState<Record<string, GroupChatLearner>>({});
  const [providerCache, setProviderCache] = useState<Record<string, GroupChatProvider>>({});
  const [trainingSearch, setTrainingSearch] = useState("");
  const [learnerSearch, setLearnerSearch] = useState("");
  const [providerSearch, setProviderSearch] = useState("");
  const [trainingPage, setTrainingPage] = useState(1);
  const [learnerPage, setLearnerPage] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permission, setPermission] = useState<Permission>("admins");
  const trainingsQuery = useQuery({ queryKey: ["group-chat", "trainings", trainingSearch, trainingPage], queryFn: ({ signal }) => listGroupChatTrainings({ q: trainingSearch, page: trainingPage, pageSize: PAGE_SIZE, signal }), staleTime: 30000, retry: 1 });
  const learnersQuery = useQuery({ queryKey: ["group-chat", "learners", training?.id, learnerSearch, learnerPage], queryFn: ({ signal }) => listGroupChatLearners(training!.id, { q: learnerSearch, eligibleOnly: true, page: learnerPage, pageSize: PAGE_SIZE, signal }), enabled: Boolean(training), staleTime: 30000, retry: 1 });
  const providersQuery = useQuery({ queryKey: ["group-chat", "providers", training?.id, providerSearch], queryFn: ({ signal }) => listGroupChatProviders(training!.id, { q: providerSearch, signal }), enabled: Boolean(training), staleTime: 30000, retry: 1 });
  const trainingGroupsQuery = useQuery({ queryKey: ["group-chat", "training-groups", training?.id], queryFn: ({ signal }) => listTrainingGroupChats(training!.id, { page: 1, pageSize: PAGE_SIZE, signal }), enabled: Boolean(training), staleTime: 15000, retry: false });
  const selectedLearners = useMemo(() => learnerIds.map((id) => learnerCache[id]).filter((value): value is GroupChatLearner => Boolean(value)), [learnerCache, learnerIds]);
  const selectedProviders = useMemo(() => providerIds.map((id) => providerCache[id]).filter((value): value is GroupChatProvider => Boolean(value)), [providerCache, providerIds]);
  const maxMembers = learnersQuery.data?.max_members && learnersQuery.data.max_members > 0 ? learnersQuery.data.max_members : DEFAULT_MAX_MEMBERS;
  const maxSelectable = remainingGroupChatMemberSlots(maxMembers, 0);
  const selectedUserIds = [...new Set([...learnerIds, ...providerIds])];
  const canContinue = step === 0 ? Boolean(training) : step === 1 ? Boolean(name.trim()) : step === 2 ? selectedUserIds.length > 0 && selectedUserIds.length <= maxSelectable : true;
  const createMutation = useMutation({ mutationFn: createGroup, retry: false, onSuccess: async (created) => { setSubmitted(true); await queryClient.invalidateQueries({ queryKey: GROUP_QUERY_KEY }); onCreated?.(created.id); } });
  const selectTraining = (next: GroupChatTraining) => { if (training?.id === next.id) return; setTraining(next); setLearnerIds([]); setProviderIds([]); setLearnerCache({}); setProviderCache({}); setLearnerPage(1); };
  const toggleLearner = (learner: GroupChatLearner) => { if (!isGroupChatLearnerSelectable(learner) || !learner.user_id) return; if (learnerIds.includes(learner.user_id)) setLearnerIds((current) => current.filter((id) => id !== learner.user_id)); else if (selectedUserIds.length < maxSelectable) { setLearnerCache((current) => ({ ...current, [learner.user_id!]: learner })); setLearnerIds((current) => [...current, learner.user_id!]); } };
  const toggleProvider = (provider: GroupChatProvider) => { if (!isGroupChatProviderSelectable(provider)) return; if (providerIds.includes(provider.user_id)) setProviderIds((current) => current.filter((id) => id !== provider.user_id)); else if (selectedUserIds.length < maxSelectable) { setProviderCache((current) => ({ ...current, [provider.user_id]: provider })); setProviderIds((current) => [...current, provider.user_id]); } };
  const selectAll = () => { const remaining = remainingGroupChatMemberSlots(maxMembers, selectedUserIds.length); const eligible = (learnersQuery.data?.items ?? []).filter((item) => isGroupChatLearnerSelectable(item) && item.user_id && !selectedUserIds.includes(item.user_id)).slice(0, remaining); setLearnerCache((current) => ({ ...current, ...Object.fromEntries(eligible.map((item) => [item.user_id!, item])) })); setLearnerIds((current) => [...current, ...eligible.map((item) => item.user_id!)]); };
  const clearTraining = () => { setTraining(null); setLearnerIds([]); setProviderIds([]); setLearnerCache({}); setProviderCache({}); };
  const submit = () => { if (!training || !canContinue || createMutation.isPending || submitted) return; createMutation.mutate(buildCreateGroupPayload({ name, contextId: training.id, description, userIds: selectedUserIds, adminsOnlyPosting: permission === "admins" })); };
  const renderStep = () => { if (step === 0) return <TrainingStep query={trainingsQuery} existingGroupsQuery={trainingGroupsQuery} selected={training} search={trainingSearch} page={trainingPage} onSearch={(value) => { setTrainingSearch(value); setTrainingPage(1); }} onPage={setTrainingPage} onSelect={selectTraining} onClear={clearTraining} />; if (step === 1) return <DetailsStep name={name} description={description} permission={permission} onName={setName} onDescription={setDescription} onPermission={setPermission} />; if (step === 3) return <ReviewStep training={training} learners={selectedLearners} providers={selectedProviders} name={name} description={description} permission={permission} submitted={submitted} error={createMutation.error?.message ?? null} maxSelectable={maxSelectable} />; if (!training) return <p className="text-sm text-[#52736a]">Select a Training first.</p>; return <PeopleStep learnersQuery={learnersQuery} providersQuery={providersQuery} learnerIds={learnerIds} providerIds={providerIds} learnerSearch={learnerSearch} providerSearch={providerSearch} learnerPage={learnerPage} maxSelectable={maxSelectable} onLearnerSearch={(value) => { setLearnerSearch(value); setLearnerPage(1); }} onProviderSearch={setProviderSearch} onLearnerPage={setLearnerPage} onToggleLearner={toggleLearner} onToggleProvider={toggleProvider} onSelectAll={selectAll} />; };
  return <div className="mx-auto w-full max-w-3xl space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7f9d94]">Create workflow</p><h1 className="mt-1 text-2xl font-bold text-[#06201c]">Create group</h1><p className="mt-1 text-sm text-[#52736a]">Create a Training Group and send explicit invitations.</p></div><button type="button" onClick={onClose} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#52736a]">Back to groups</button></div><div className="rounded-xl border border-[#d7e5df] bg-[#f9fcfa] p-3 text-sm text-[#52736a]" role="status"><span className="font-semibold text-[#16332b]">Group Chat.</span> Group messages remain unavailable until the realtime group contract is integrated.</div><Progress step={step} onStep={setStep} /><Panel title={STEPS[step]}>{renderStep()}</Panel><div className="flex justify-between gap-3"><button type="button" onClick={() => step === 0 ? onClose() : setStep((current) => (current - 1) as Step)} className="rounded-full border border-[#d7e5df] px-5 py-2.5 text-sm font-semibold text-[#52736a]">{step === 0 ? "Cancel" : "Back"}</button>{step < 3 ? <button type="button" disabled={!canContinue} onClick={() => setStep((current) => (current + 1) as Step)} className="rounded-full bg-[#1f6a58] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Continue</button> : <button type="button" disabled={!canContinue || submitted || createMutation.isPending} onClick={submit} className="rounded-full bg-[#1f6a58] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{createMutation.isPending ? "Creating..." : submitted ? "Created" : "Create group"}</button>}</div></div>;
}
