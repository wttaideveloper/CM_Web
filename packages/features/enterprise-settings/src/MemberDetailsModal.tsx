"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activateTenantMember,
  archiveTenantMember,
  getTenantMember,
  softDeleteTenantMember,
  type TenantMember,
  type TenantRole,
  updateTenantMemberProfile,
  updateTenantMemberStatus,
} from "@ihp/enterprise-runtime";
import { useState, type FormEvent } from "react";

import { settingsQueryKeys } from "./settings-query-keys";

type MemberDetailsModalProps = {
  membershipId: string;
  tenantId: string;
  actorRole: string | null | undefined;
  actorUserId: string | null | undefined;
  roles: TenantRole[];
  isLoadingRoles: boolean;
  onClose: () => void;
};

type ConfirmationAction = "archive" | "remove";

function formatRole(value: string | null | undefined) {
  return value?.trim()
    ? value.replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "Not provided";
}

function formatJoinedAt(value: string | null | undefined) {
  if (!value) {
    return "Not provided";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error) || !error.message) {
    return fallback;
  }

  try {
    const payload = JSON.parse(error.message) as { detail?: unknown; message?: unknown };
    if (typeof payload.detail === "string") {
      return payload.detail;
    }
    if (typeof payload.message === "string") {
      return payload.message;
    }
  } catch {
    // Fall back to the server's plain-text error below.
  }

  return error.message;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-[#edf3f0] py-2.5 last:border-b-0">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7f9d94]">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-[#16332b]">{value}</p>
    </div>
  );
}

function isProtectedOwner(member: TenantMember) {
  return member.roleSlug === "tenant_owner" || member.role === "tenant_owner" || member.tenantRbacRoles?.includes("tenant_owner") === true;
}

function isAdmin(member: TenantMember) {
  return member.roleSlug === "tenant_admin" || member.role === "tenant_admin" || member.tenantRbacRoles?.includes("tenant_admin") === true;
}

function isExternalMember(member: TenantMember) {
  return member.roleSlug === "external_user" || member.role === "external_user" || member.tenantRbacRoles?.includes("external_user") === true;
}

/** Displays and manages one current-tenant membership using server-authorized member endpoints. */
export default function MemberDetailsModal({
  membershipId,
  tenantId,
  actorRole,
  actorUserId,
  roles,
  isLoadingRoles,
  onClose,
}: MemberDetailsModalProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [roleSlug, setRoleSlug] = useState("");
  const [confirmationAction, setConfirmationAction] = useState<ConfirmationAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const memberQuery = useQuery({
    queryKey: settingsQueryKeys.member(tenantId, membershipId),
    queryFn: () => getTenantMember(membershipId),
    staleTime: 30_000,
    retry: 1,
  });

  const invalidateMemberData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: settingsQueryKeys.members(tenantId) }),
      queryClient.invalidateQueries({ queryKey: settingsQueryKeys.member(tenantId, membershipId) }),
    ]);
  };
  const profileMutation = useMutation({
    mutationFn: () => updateTenantMemberProfile(membershipId, { fullName: fullName.trim(), roleSlug }),
    onSuccess: async (response) => {
      await invalidateMemberData();
      setIsEditing(false);
      setSuccessMessage(response.message || "Member profile updated.");
    },
    onError: (error) => setActionError(getApiErrorMessage(error, "Unable to update this member.")),
  });
  const statusMutation = useMutation({
    mutationFn: (status: "active" | "inactive") => updateTenantMemberStatus(membershipId, status),
    onSuccess: async (response) => {
      await invalidateMemberData();
      setSuccessMessage(response.message || "Member status updated.");
    },
    onError: (error) => setActionError(getApiErrorMessage(error, "Unable to update this member's status.")),
  });
  const activateMutation = useMutation({
    mutationFn: () => activateTenantMember(membershipId),
    onSuccess: async (response) => {
      await invalidateMemberData();
      setSuccessMessage(response.message || "Archived member reactivated.");
    },
    onError: (error) => setActionError(getApiErrorMessage(error, "Unable to reactivate this member.")),
  });
  const archiveMutation = useMutation({
    mutationFn: () => archiveTenantMember(membershipId),
    onSuccess: async () => {
      await invalidateMemberData();
      onClose();
    },
    onError: (error) => setActionError(getApiErrorMessage(error, "Unable to archive this member.")),
  });
  const removeMutation = useMutation({
    mutationFn: () => softDeleteTenantMember(membershipId),
    onSuccess: async () => {
      await invalidateMemberData();
      onClose();
    },
    onError: (error) => setActionError(getApiErrorMessage(error, "Unable to remove this member.")),
  });

  const member = memberQuery.data?.data;
  const isMutationPending = profileMutation.isPending || statusMutation.isPending || activateMutation.isPending || archiveMutation.isPending || removeMutation.isPending;
  const actorIsOwner = actorRole === "tenant_owner";
  const actorIsAdmin = actorRole === "tenant_admin";
  const targetIsOwner = member ? isProtectedOwner(member) : false;
  const targetIsAdmin = member ? isAdmin(member) : false;
  const targetIsExternal = member ? isExternalMember(member) : false;
  const isCurrentUser = member?.userId === actorUserId;
  const canManageMember = (actorIsOwner || actorIsAdmin) && !targetIsOwner && !(actorIsAdmin && targetIsAdmin) && !isCurrentUser;
  const canChangeStatus = canManageMember && !targetIsExternal;
  const canArchiveOrRemove = canManageMember && !targetIsExternal;
  const memberStatus = member?.status.trim().toLowerCase();
  const selectableRoles = member
    ? roles.filter((role) => role.isAssignable !== false || role.slug === member.roleSlug)
    : roles.filter((role) => role.isAssignable !== false);

  const beginEdit = () => {
    if (!member) {
      return;
    }

    setActionError(null);
    setSuccessMessage(null);
    setFullName(member.fullName);
    setRoleSlug(member.roleSlug);
    setIsEditing(true);
  };

  const submitProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!fullName.trim() || !roleSlug) {
      setActionError("Enter a full name and select a role.");
      return;
    }

    setActionError(null);
    profileMutation.mutate();
  };

  const runConfirmedAction = () => {
    setActionError(null);
    if (confirmationAction === "archive") {
      archiveMutation.mutate();
    } else if (confirmationAction === "remove") {
      removeMutation.mutate();
    }
    setConfirmationAction(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-[#06201c]/35 p-0 sm:items-center sm:justify-center sm:p-5" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="member-details-title" className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="member-details-title" className="text-lg font-bold text-[#06201c]">Member Details</h2>
            <p className="mt-1 text-sm text-[#52736a]">View and manage this organization member.</p>
          </div>
          <button type="button" onClick={onClose} disabled={isMutationPending} className="text-sm font-semibold text-[#52736a] hover:text-[#06201c] disabled:cursor-not-allowed disabled:opacity-60">Close</button>
        </div>

        {memberQuery.isPending ? (
          <div className="mt-5 space-y-3" role="status" aria-live="polite" aria-label="Loading member details">
            <div className="h-16 animate-pulse rounded-xl bg-[#edf3f0]" />
            <div className="h-16 animate-pulse rounded-xl bg-[#edf3f0]" />
            <div className="h-16 animate-pulse rounded-xl bg-[#edf3f0]" />
          </div>
        ) : memberQuery.isError || !member ? (
          <div className="mt-5">
            <p role="alert" className="text-sm text-[#b42318]">Unable to load this member. Please try again.</p>
            <button type="button" onClick={() => void memberQuery.refetch()} className="mt-2 text-sm font-semibold text-[#1f6a58] hover:text-[#16332b]">Retry</button>
          </div>
        ) : isEditing ? (
          <form onSubmit={submitProfile} className="mt-5 space-y-4">
            <label className="block text-sm font-semibold text-[#16332b]">Full Name<input value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f7fbf8] px-3 text-sm text-[#06201c] outline-none transition focus:border-[#1f6a58]" /></label>
            <label className="block text-sm font-semibold text-[#16332b]">Email<input value={member.email} readOnly className="mt-1.5 h-10 w-full cursor-not-allowed rounded-xl border border-[#d7e5df] bg-[#edf3f0] px-3 text-sm text-[#52736a]" /></label>
            <label className="block text-sm font-semibold text-[#16332b]">Role<select value={roleSlug} onChange={(event) => setRoleSlug(event.target.value)} disabled={isLoadingRoles} className="mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f7fbf8] px-3 text-sm text-[#06201c] outline-none transition focus:border-[#1f6a58] disabled:cursor-not-allowed"><option value="">{isLoadingRoles ? "Loading roles..." : "Select a role"}</option>{selectableRoles.map((role) => <option key={role.slug} value={role.slug}>{role.name}</option>)}</select></label>
            {actionError ? <p role="alert" className="text-sm font-medium text-[#b42318]">{actionError}</p> : null}
            <div className="flex justify-end gap-3"><button type="button" onClick={() => setIsEditing(false)} disabled={profileMutation.isPending} className="inline-flex h-10 items-center justify-center rounded-full border border-[#d7e5df] bg-white px-5 text-sm font-semibold text-[#1f6a58] disabled:opacity-60">Cancel</button><button type="submit" disabled={profileMutation.isPending || isLoadingRoles} className="inline-flex h-10 items-center justify-center rounded-full bg-[#1f6a58] px-5 text-sm font-semibold text-white disabled:opacity-60">{profileMutation.isPending ? "Saving..." : "Save Changes"}</button></div>
          </form>
        ) : (
          <div className="mt-5 space-y-4">
            {successMessage ? <p role="status" className="rounded-xl border border-[#bce8d1] bg-[#effaf4] px-3 py-2 text-sm font-medium text-[#167550]">{successMessage}</p> : null}
            {actionError ? <p role="alert" className="rounded-xl border border-[#f3c5bf] bg-[#fff7f6] px-3 py-2 text-sm font-medium text-[#b42318]">{actionError}</p> : null}
            <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2"><DetailRow label="Full Name" value={member.fullName} /><DetailRow label="Email" value={member.email} /><DetailRow label="Role" value={member.roleName || formatRole(member.roleSlug || member.role)} /><DetailRow label="Status" value={formatRole(member.status)} /><DetailRow label="Joined" value={formatJoinedAt(member.joinedAt)} /><DetailRow label="Role slug" value={member.roleSlug || "Not provided"} /></div>
            <div><h3 className="text-sm font-bold text-[#16332b]">Tenant RBAC Roles</h3><p className="mt-1 text-sm text-[#52736a]">{member.tenantRbacRoles?.length ? member.tenantRbacRoles.map(formatRole).join(", ") : "No tenant RBAC roles are available."}</p></div>
            <div><h3 className="text-sm font-bold text-[#16332b]">Permissions</h3>{member.permissions?.length ? <ul className="mt-2 flex flex-wrap gap-2">{member.permissions.map((permission) => <li key={permission} className="rounded-full bg-[#edf3f0] px-2.5 py-1 text-xs font-semibold text-[#52736a]">{permission}</li>)}</ul> : <p className="mt-1 text-sm text-[#52736a]">No permissions are available.</p>}</div>
            {canManageMember ? <div className="flex flex-wrap gap-2 border-t border-[#e1ebe6] pt-4"><button type="button" onClick={beginEdit} disabled={isMutationPending} className="inline-flex h-10 items-center justify-center rounded-full border border-[#d7e5df] px-4 text-sm font-semibold text-[#1f6a58] disabled:opacity-60">Edit</button>{canChangeStatus && memberStatus === "active" ? <button type="button" onClick={() => { setActionError(null); statusMutation.mutate("inactive"); }} disabled={isMutationPending} className="inline-flex h-10 items-center justify-center rounded-full border border-[#d7e5df] px-4 text-sm font-semibold text-[#1f6a58] disabled:opacity-60">Deactivate</button> : null}{canChangeStatus && memberStatus === "inactive" ? <button type="button" onClick={() => { setActionError(null); statusMutation.mutate("active"); }} disabled={isMutationPending} className="inline-flex h-10 items-center justify-center rounded-full border border-[#d7e5df] px-4 text-sm font-semibold text-[#1f6a58] disabled:opacity-60">Activate</button> : null}{canChangeStatus && memberStatus === "archived" ? <button type="button" onClick={() => { setActionError(null); activateMutation.mutate(); }} disabled={isMutationPending} className="inline-flex h-10 items-center justify-center rounded-full border border-[#d7e5df] px-4 text-sm font-semibold text-[#1f6a58] disabled:opacity-60">Reactivate</button> : null}</div> : null}
            {canArchiveOrRemove ? <div className="flex flex-wrap gap-2 border-t border-[#f3d5d1] pt-4"><button type="button" onClick={() => setConfirmationAction("archive")} disabled={isMutationPending} className="inline-flex h-10 items-center justify-center rounded-full border border-[#d89488] px-4 text-sm font-semibold text-[#9b2c21] disabled:opacity-60">Archive</button><button type="button" onClick={() => setConfirmationAction("remove")} disabled={isMutationPending} className="inline-flex h-10 items-center justify-center rounded-full bg-[#b42318] px-4 text-sm font-semibold text-white disabled:opacity-60">Remove member</button></div> : null}
            {confirmationAction ? <div className="rounded-xl border border-[#f3c5bf] bg-[#fff7f6] p-4"><h3 className="text-sm font-bold text-[#7a271a]">{confirmationAction === "archive" ? "Archive member?" : "Remove member?"}</h3><p className="mt-1 text-sm text-[#7a271a]">{confirmationAction === "archive" ? `Archive ${member.fullName}. This member can be reactivated later.` : `Remove ${member.fullName} (${member.email}). This removes the tenant membership and associated account.`}</p><div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setConfirmationAction(null)} disabled={isMutationPending} className="text-sm font-semibold text-[#7a271a]">Cancel</button><button type="button" onClick={runConfirmedAction} disabled={isMutationPending} className="rounded-full bg-[#b42318] px-4 py-2 text-sm font-semibold text-white">{confirmationAction === "archive" ? "Archive member" : "Remove member"}</button></div></div> : null}
          </div>
        )}
      </div>
    </div>
  );
}
