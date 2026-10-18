"use client";

import { useMemo, useState } from "react";
import { useAuth, type AuthRoles } from "@ihp/auth";
import { getTenantMembers, type TenantMember } from "@ihp/enterprise-runtime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listVerifiedGroupChatProviders, registerVerifiedGroupChatProvider, revokeVerifiedGroupChatProvider } from "./group-chat/group-chat.service";
import { isGroupChatProviderDirectoryCandidate, resolveGroupChatVerifiedProviderName } from "./group-chat-models";
import type { GroupChatVerifiedProvider } from "./group-chat/group-chat.types";

const registryKey = ["group-chat", "verified-providers"];

/** Matches the existing Enterprise tenant-owner/admin role semantics. */
export function canManageGroupChatProviderVerification(roles: AuthRoles | null | undefined): boolean {
  if (!roles) return false;
  const roleValues = [roles.tenantRole, ...roles.tenantRbacRoles].map((role) => role.trim().toLowerCase());
  if (roleValues.includes("internal_user")) return false;
  return roleValues.includes("tenant_owner") || roleValues.includes("tenant_admin");
}

function Retry({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-4 text-sm text-[#7a271a]" role="alert"><p>{message}</p><button type="button" onClick={onRetry} className="mt-2 font-semibold underline">Try again</button></div>;
}

function providerLabel(provider: GroupChatVerifiedProvider, members: readonly TenantMember[]): string {
  return resolveGroupChatVerifiedProviderName(provider, members) || "Provider name unavailable";
}

function formatVerifiedAt(value: string | null): string {
  if (!value) return "Verification date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Verification date unavailable" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function ProviderRow({ provider, members, onRevoke, disabled }: { provider: GroupChatVerifiedProvider; members: readonly TenantMember[]; onRevoke: () => void; disabled: boolean }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e1ebe6] p-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#16332b]">{providerLabel(provider, members)}</p>{provider.email ? <p className="mt-0.5 truncate text-xs text-[#52736a]">{provider.email}</p> : null}<p className="mt-1 text-xs text-[#7f9d94]">Verified for Group Chat · {formatVerifiedAt(provider.verified_at)}</p></div><button type="button" onClick={onRevoke} disabled={disabled} className="rounded-full border border-[#b42318] px-3 py-1.5 text-xs font-semibold text-[#b42318] disabled:opacity-50">Revoke</button></div>;
}

/** Manages the Enterprise tenant's separate Group Chat Provider registry. */
export default function GroupChatProviderVerificationPanel() {
  const { roles } = useAuth();
  const canManage = canManageGroupChatProviderVerification(roles);
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [registrationCouncil, setRegistrationCouncil] = useState("");
  const [revokeUserId, setRevokeUserId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const registryQuery = useQuery({
    queryKey: [...registryKey, page],
    queryFn: ({ signal }) => listVerifiedGroupChatProviders({ page, pageSize: 10, signal }),
    enabled: canManage,
    staleTime: 15000,
    retry: false,
  });
  const membersQuery = useQuery({
    queryKey: ["group-chat", "provider-directory"],
    queryFn: () => getTenantMembers(),
    enabled: canManage,
    staleTime: 15000,
    retry: false,
  });

  const providers = registryQuery.data?.items ?? [];
  const memberDirectory = membersQuery.data ?? [];
  const verifiedUserIds = useMemo(() => new Set(providers.map((provider) => provider.user_id)), [providers]);
  const providerCandidates = useMemo(
    () => memberDirectory.filter((member) => isGroupChatProviderDirectoryCandidate(member) && !verifiedUserIds.has(member.userId)),
    [memberDirectory, verifiedUserIds],
  );

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: registryKey }),
      queryClient.invalidateQueries({ queryKey: ["group-chat", "providers"] }),
      queryClient.invalidateQueries({ queryKey: ["group-chat", "invite-providers"] }),
    ]);
  };
  const registerMutation = useMutation({
    mutationFn: () => registerVerifiedGroupChatProvider({ user_id: selectedUserId, registration_number: registrationNumber, registration_council: registrationCouncil }),
    retry: false,
    onSuccess: async () => {
      setSelectedUserId("");
      setRegistrationNumber("");
      setRegistrationCouncil("");
      setFeedback("Provider verified for Group Chat.");
      await refresh();
    },
    onError: (error: Error) => setFeedback(error.message),
  });
  const revokeMutation = useMutation({
    mutationFn: (userId: string) => revokeVerifiedGroupChatProvider(userId),
    retry: false,
    onSuccess: async () => {
      setRevokeUserId(null);
      setFeedback("Group Chat verification revoked. Existing Enterprise Provider approval was not changed.");
      await refresh();
    },
    onError: (error: Error) => setFeedback(error.message),
  });

  if (!canManage) return <p className="rounded-xl border border-[#d7e5df] bg-[#f9fcfa] p-4 text-sm text-[#52736a]">Provider Verification management is available only to authorized Enterprise administrators.</p>;
  if (registryQuery.isPending) return <p className="rounded-xl bg-[#f9fcfa] p-4 text-sm text-[#52736a]" aria-live="polite">Loading Group Chat Provider verification...</p>;
  if (registryQuery.isError) return <Retry message={registryQuery.error.message} onRetry={() => void registryQuery.refetch()} />;

  const totalPages = registryQuery.data?.pagination.total_pages ?? 1;
  const isBusy = registerMutation.isPending || revokeMutation.isPending;
  return <div className="space-y-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7f9d94]">Group Chat administration</p><h1 className="mt-1 text-2xl font-bold text-[#06201c]">Provider Verification</h1><p className="mt-1 max-w-2xl text-sm text-[#52736a]">Register Providers once for Group Chat eligibility. This is separate from existing Enterprise Provider approval.</p></div>{feedback ? <p className="rounded-xl border border-[#b7dfc7] bg-[#e8f6ee] p-3 text-sm font-semibold text-[#1f6a58]" role="status">{feedback}</p> : null}<section className="rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-base font-bold text-[#16332b]">Verified Providers</h2><p className="mt-1 text-sm text-[#52736a]">These Providers can appear in Group Chat Provider eligibility results.</p></div><span className="text-xs text-[#7f9d94]">{registryQuery.data?.pagination.total ?? providers.length} registered</span></div><div className="mt-4 space-y-2">{providers.length === 0 ? <p className="rounded-xl bg-[#f9fcfa] p-4 text-sm text-[#52736a]">No Providers are registered for Group Chat.</p> : providers.map((provider) => <div key={provider.user_id}>{revokeUserId === provider.user_id ? <div className="rounded-xl border border-[#efc4bd] bg-[#fff7f6] p-3"><p className="text-sm font-semibold text-[#7a271a]">Revoke Group Chat verification for {providerLabel(provider, memberDirectory)}?</p><p className="mt-1 text-xs text-[#7a271a]">This does not change Enterprise Provider approval.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={isBusy} onClick={() => revokeMutation.mutate(provider.user_id)} className="rounded-full bg-[#b42318] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">{revokeMutation.isPending ? "Revoking..." : "Confirm revoke"}</button><button type="button" disabled={isBusy} onClick={() => setRevokeUserId(null)} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#16332b]">Cancel</button></div></div> : <ProviderRow provider={provider} members={memberDirectory} onRevoke={() => setRevokeUserId(provider.user_id)} disabled={isBusy} />}</div>)}</div>{totalPages > 1 ? <div className="mt-4 flex items-center justify-between text-xs text-[#52736a]"><span>Page {page} of {totalPages}</span><span className="flex gap-2"><button type="button" disabled={page <= 1 || isBusy} onClick={() => setPage((current) => current - 1)} className="rounded-lg border border-[#d7e5df] px-3 py-1.5 font-semibold disabled:opacity-40">Previous</button><button type="button" disabled={page >= totalPages || isBusy} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-[#d7e5df] px-3 py-1.5 font-semibold disabled:opacity-40">Next</button></span></div> : null}</section><section className="rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm sm:p-5"><h2 className="text-base font-bold text-[#16332b]">Register a Provider</h2><p className="mt-1 text-sm text-[#52736a]">Select an active Provider from this Enterprise. The backend will authorize the registry request.</p>{membersQuery.isPending ? <p className="mt-3 text-sm text-[#52736a]" aria-live="polite">Loading Enterprise Providers...</p> : membersQuery.isError ? <Retry message={membersQuery.error.message} onRetry={() => void membersQuery.refetch()} /> : providerCandidates.length === 0 ? <p className="mt-3 rounded-xl bg-[#f9fcfa] p-3 text-sm text-[#52736a]">No unregistered active Providers are available.</p> : <><label className="mt-3 block text-sm font-semibold text-[#16332b]">Provider<select value={selectedUserId} onChange={(event) => { setSelectedUserId(event.target.value); setRegistrationNumber(""); setRegistrationCouncil(""); setFeedback(null); }} disabled={isBusy} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 font-normal outline-none focus:border-[#1f6a58]"><option value="">Select a Provider</option>{providerCandidates.map((provider) => <option key={provider.userId} value={provider.userId}>{provider.fullName || "Provider name unavailable"}{provider.email ? ` · ${provider.email}` : ""}</option>)}</select></label><label className="mt-3 block text-sm font-semibold text-[#16332b]">Registration Number<input type="text" value={registrationNumber} onChange={(event) => setRegistrationNumber(event.target.value)} disabled={isBusy} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 font-normal outline-none focus:border-[#1f6a58]" /></label><label className="mt-3 block text-sm font-semibold text-[#16332b]">Registration Council<input type="text" value={registrationCouncil} onChange={(event) => setRegistrationCouncil(event.target.value)} disabled={isBusy} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 font-normal outline-none focus:border-[#1f6a58]" /></label><button type="button" disabled={!selectedUserId || isBusy} onClick={() => registerMutation.mutate()} className="mt-3 rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{registerMutation.isPending ? "Verifying..." : "Verify Provider"}</button></>}</section></div>;
}
