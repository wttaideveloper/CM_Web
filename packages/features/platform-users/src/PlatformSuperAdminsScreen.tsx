"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useActivatePlatformSuperAdmin,
  useDeactivatePlatformSuperAdmin,
  useDeletePlatformSuperAdmin,
  useInvitePlatformSuperAdmin,
  usePlatformSuperAdmins,
} from "./platform-super-admins.queries";
import { PlatformSuperAdminsApiError } from "./platform-super-admins.service";
import type { PlatformSuperAdmin } from "./platform-super-admins.types";

type SuperAdminAction = "activate" | "deactivate" | "delete";
type PendingAction = { action: SuperAdminAction; user: PlatformSuperAdmin };

function formatDate(value: string | null): string | null {
  if (!value || Number.isNaN(Date.parse(value))) return null;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

function BooleanBadge({ value }: { value: boolean }) {
  const { t } = useTranslation("platform");
  return <span className={value ? "inline-flex rounded-full bg-[#e8f6ee] px-2.5 py-1 text-[11px] font-bold text-[#16825b]" : "inline-flex rounded-full bg-[#f1f4f3] px-2.5 py-1 text-[11px] font-bold text-[#6b7f79]"}>{t(value ? "superAdmins.yes" : "superAdmins.no")}</span>;
}

function SuperAdminsContent() {
  const { t } = useTranslation("platform");
  const superAdminsQuery = usePlatformSuperAdmins();
  const activateMutation = useActivatePlatformSuperAdmin();
  const deactivateMutation = useDeactivatePlatformSuperAdmin();
  const deleteMutation = useDeletePlatformSuperAdmin();
  const inviteMutation = useInvitePlatformSuperAdmin();
  const [search, setSearch] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionError, setActionError] = useState<SuperAdminAction | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteError, setInviteError] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const isMutating = activateMutation.isPending || deactivateMutation.isPending || deleteMutation.isPending || inviteMutation.isPending;

  const visibleSuperAdmins = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return (superAdminsQuery.data?.items ?? []).filter((user) => (
      !query || user.fullName.toLocaleLowerCase().includes(query) || user.email.toLocaleLowerCase().includes(query)
    ));
  }, [search, superAdminsQuery.data?.items]);

  const loadErrorMessage = superAdminsQuery.error instanceof PlatformSuperAdminsApiError
    ? superAdminsQuery.error.status === 401
      ? t("superAdmins.authenticationRequired")
      : superAdminsQuery.error.status === 403
        ? t("superAdmins.permissionDenied")
        : t("superAdmins.loadError")
    : t("superAdmins.loadError");

  const mutationFor = (action: SuperAdminAction) => {
    if (action === "activate") return activateMutation;
    if (action === "deactivate") return deactivateMutation;
    return deleteMutation;
  };

  const runAction = (action: SuperAdminAction, userId: string, onSuccess?: () => void) => {
    if (isMutating) return;
    setActionError(null);
    mutationFor(action).mutate(userId, {
      onSuccess,
      onError: () => setActionError(action),
    });
  };

  const confirmPendingAction = () => {
    if (!pendingAction) return;
    runAction(pendingAction.action, pendingAction.user.id, () => setPendingAction(null));
  };

  const submitInvite = (payload: { fullName: string; email: string }) => {
    if (isMutating) return;
    setInviteError(false);
    setInviteSuccess(false);
    inviteMutation.mutate(payload, {
      onSuccess: () => {
        setInviteOpen(false);
        setInviteSuccess(true);
      },
      onError: () => setInviteError(true),
    });
  };

  const actionErrorKey = actionError === "activate"
    ? "superAdmins.unableToActivate"
    : actionError === "deactivate"
      ? "superAdmins.unableToDeactivate"
      : "superAdmins.unableToDelete";

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#06201c]">{t("superAdmins.title")}</h2>
          <p className="mt-1 text-sm text-[#52736a]">{t("superAdmins.description")}</p>
        </div>
        <button type="button" onClick={() => { setInviteSuccess(false); setInviteError(false); setInviteOpen(true); }} disabled={isMutating} className="h-10 rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{t("superAdmins.invite")}</button>
      </div>
      {inviteSuccess ? <p role="status" className="mt-4 text-sm font-semibold text-[#16825b]">{t("superAdmins.inviteSuccess")}</p> : null}
      {inviteError ? <p role="alert" className="mt-4 text-sm font-semibold text-[#b42318]">{t("superAdmins.unableToInvite")}</p> : null}
      <div className="mt-5 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
        <label className="block w-full lg:max-w-sm">
          <span className="sr-only">{t("superAdmins.searchLabel")}</span>
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("superAdmins.searchPlaceholder")} className="h-12 w-full rounded-2xl border border-[#d7e5df] bg-[#f9fcfa] px-4 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]" />
        </label>
      </div>
      <section className="mt-5 overflow-hidden rounded-2xl border border-[#e1ebe6] bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-[#edf3f0] px-5 py-4">
          <span className="text-base font-bold text-[#06201c]">{superAdminsQuery.isSuccess ? superAdminsQuery.data.total : "—"}</span>
          <h3 className="text-base font-bold text-[#06201c]">{t("superAdmins.countLabel")}</h3>
        </div>
        {superAdminsQuery.isLoading ? <div className="px-5 py-16 text-center"><p className="font-bold text-[#06201c]">{t("superAdmins.loading")}</p></div> : null}
        {superAdminsQuery.isError ? <div className="px-5 py-16 text-center"><p role="alert" className="font-bold text-[#b42318]">{loadErrorMessage}</p><button type="button" onClick={() => void superAdminsQuery.refetch()} className="mt-4 h-10 rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white">{t("superAdmins.retry")}</button></div> : null}
        {superAdminsQuery.isSuccess && visibleSuperAdmins.length === 0 ? <div className="px-5 py-16 text-center"><p className="font-bold text-[#06201c]">{t("superAdmins.empty")}</p></div> : null}
        {superAdminsQuery.isSuccess && visibleSuperAdmins.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px] text-left text-sm">
              <thead className="bg-[#f8fbf9] text-[11px] uppercase tracking-[0.1em] text-[#7f9d94]"><tr><th className="px-4 py-3">{t("superAdmins.fullName")}</th><th className="px-4 py-3">{t("superAdmins.email")}</th><th className="px-4 py-3">{t("superAdmins.status")}</th><th className="px-4 py-3">{t("superAdmins.inviteStatus")}</th><th className="px-4 py-3">{t("superAdmins.emailVerified")}</th><th className="px-4 py-3">{t("superAdmins.invitedBy")}</th><th className="px-4 py-3">{t("superAdmins.lastLogin")}</th><th className="px-4 py-3">{t("superAdmins.created")}</th><th className="px-4 py-3 text-right">{t("superAdmins.actions")}</th></tr></thead>
              <tbody className="divide-y divide-[#edf3f0]">{visibleSuperAdmins.map((user) => {
                const isActive = user.status.toLocaleLowerCase() === "active";
                return <tr key={user.id}><td className="px-4 py-3 font-semibold text-[#06201c]">{user.fullName}</td><td className="px-4 py-3 text-[#52736a]">{user.email}</td><td className="px-4 py-3 capitalize text-[#52736a]">{user.status}</td><td className="px-4 py-3 capitalize text-[#52736a]">{user.inviteStatus}</td><td className="px-4 py-3"><BooleanBadge value={user.emailVerified} /></td><td className="px-4 py-3 text-[#52736a]">{user.invitedBy ? `${user.invitedBy.fullName} (${user.invitedBy.email})` : t("superAdmins.unavailable")}</td><td className="px-4 py-3 text-[#52736a]">{formatDate(user.lastLoginAt) ?? t("superAdmins.unavailable")}</td><td className="px-4 py-3 text-[#52736a]">{formatDate(user.createdAt) ?? t("superAdmins.unavailable")}</td><td className="px-4 py-3 text-right"><div className="inline-flex gap-3">{isActive ? <button type="button" disabled={isMutating} onClick={() => setPendingAction({ action: "deactivate", user })} className="font-semibold text-[#b54708] disabled:cursor-not-allowed disabled:opacity-50">{t("superAdmins.deactivate")}</button> : <button type="button" disabled={isMutating} onClick={() => runAction("activate", user.id)} className="font-semibold text-[#1f6a58] disabled:cursor-not-allowed disabled:opacity-50">{t("superAdmins.activate")}</button>}<button type="button" disabled={isMutating} onClick={() => setPendingAction({ action: "delete", user })} className="font-semibold text-[#b42318] disabled:cursor-not-allowed disabled:opacity-50">{t("superAdmins.delete")}</button></div></td></tr>;
              })}</tbody>
            </table>
          </div>
        ) : null}
      </section>
      {actionError ? <p role="alert" className="mt-4 text-sm font-semibold text-[#b42318]">{t(actionErrorKey)}</p> : null}
      {inviteOpen ? <InviteSuperAdminDialog pending={inviteMutation.isPending} onCancel={() => setInviteOpen(false)} onSubmit={submitInvite} /> : null}
      {pendingAction ? <div role="dialog" aria-modal="true" aria-labelledby="super-admin-action-title" className="fixed inset-0 z-[90] flex items-center justify-center bg-[#06201c]/25 p-4"><section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><h3 id="super-admin-action-title" className="text-lg font-bold text-[#06201c]">{t(pendingAction.action === "delete" ? "superAdmins.deleteTitle" : "superAdmins.deactivateTitle")}</h3><p className="mt-2 text-sm text-[#52736a]">{t(pendingAction.action === "delete" ? "superAdmins.deleteDescription" : "superAdmins.deactivateDescription")}</p><dl className="mt-4 rounded-xl bg-[#f7fbf9] p-4 text-sm"><dt className="font-semibold text-[#06201c]">{pendingAction.user.fullName}</dt><dd className="mt-1 text-[#52736a]">{pendingAction.user.email}</dd></dl><div className="mt-6 flex justify-end gap-3"><button type="button" disabled={isMutating} onClick={() => setPendingAction(null)} className="h-10 rounded-full border border-[#d7e5df] px-4 text-sm font-bold text-[#06201c] disabled:cursor-not-allowed disabled:opacity-50">{t("superAdmins.cancel")}</button><button type="button" disabled={isMutating} onClick={confirmPendingAction} className={pendingAction.action === "delete" ? "h-10 rounded-full bg-[#b42318] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50" : "h-10 rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"}>{t("superAdmins.confirm")}</button></div></section></div> : null}
    </>
  );
}

/** Captures the only invitation fields accepted by the dedicated Super Admin endpoint. */
function InviteSuperAdminDialog({ pending, onCancel, onSubmit }: { pending: boolean; onCancel: () => void; onSubmit: (payload: { fullName: string; email: string }) => void }) {
  const { t } = useTranslation("platform");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const canSubmit = !pending && fullName.trim().length > 0 && email.trim().length > 0;

  return <div role="dialog" aria-modal="true" aria-labelledby="super-admin-invite-title" className="fixed inset-0 z-[90] flex items-center justify-center bg-[#06201c]/25 p-4"><form onSubmit={(event) => { event.preventDefault(); if (canSubmit) onSubmit({ fullName: fullName.trim(), email: email.trim() }); }} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><h3 id="super-admin-invite-title" className="text-lg font-bold text-[#06201c]">{t("superAdmins.inviteTitle")}</h3><p className="mt-2 text-sm text-[#52736a]">{t("superAdmins.inviteDescription")}</p><label className="mt-4 block text-sm font-semibold text-[#06201c]">{t("superAdmins.fullNameField")}<input required autoComplete="name" disabled={pending} value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal disabled:opacity-60" /></label><label className="mt-4 block text-sm font-semibold text-[#06201c]">{t("superAdmins.emailField")}<input required type="email" autoComplete="email" disabled={pending} value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal disabled:opacity-60" /></label><div className="mt-6 flex justify-end gap-3"><button type="button" disabled={pending} onClick={onCancel} className="h-10 rounded-full border border-[#d7e5df] px-4 text-sm font-bold text-[#06201c] disabled:cursor-not-allowed disabled:opacity-50">{t("superAdmins.cancel")}</button><button type="submit" disabled={!canSubmit} className="h-10 rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{pending ? t("superAdmins.sendingInvite") : t("superAdmins.sendInvite")}</button></div></form></div>;
}

/** Renders Platform Super Admin lifecycle controls with an isolated server-state client. */
export default function PlatformSuperAdminsScreen() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } }));
  return <QueryClientProvider client={queryClient}><SuperAdminsContent /></QueryClientProvider>;
}
