"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { InviteUserModal, useAuth } from "@ihp/auth";
import {
  getTenantMembers,
  getTenantPermissions,
  getTenantRoles,
  type TenantMember,
  useTenant,
} from "@ihp/enterprise-runtime";
import { useMemo, useState, type KeyboardEvent } from "react";

import MemberDetailsModal from "./MemberDetailsModal";
import MemberList from "./MemberList";
import { settingsQueryKeys } from "./settings-query-keys";

type TeamTab = "members" | "invite" | "roles";
type MemberStatusFilter = "active" | "archived" | "all";

/** Callbacks the Team & Users card invokes after a successful invitation. */
type TeamAndUsersCardProps = {
  onInviteSuccess: () => void;
};

const TENANT_QUERY_STALE_TIME_MS = 30_000;
const TEAM_TABS = ["members", "invite", "roles"] as const;

function LoadingRows() {
  return (
    <div className="space-y-2" role="status" aria-live="polite" aria-label="Loading team information">
      {["first", "second", "third"].map((key) => (
        <div key={key} className="animate-pulse rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] px-3 py-3">
          <div className="h-3 w-2/5 rounded bg-[#e1ebe6]" />
          <div className="mt-2 h-3 w-3/5 rounded bg-[#edf3f0]" />
        </div>
      ))}
    </div>
  );
}

/** Renders tenant-scoped member, invitation, and read-only RBAC information for Enterprise Settings. */
export default function TeamAndUsersCard({ onInviteSuccess }: TeamAndUsersCardProps) {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const [teamTab, setTeamTab] = useState<TeamTab>("members");
  const [memberStatusFilter, setMemberStatusFilter] = useState<MemberStatusFilter>("active");
  const [selectedMember, setSelectedMember] = useState<TenantMember | null>(null);
  const [isInviting, setIsInviting] = useState(false);
  const canInviteUsers = user?.membership?.canInviteUsers ?? user?.roles?.canInviteUsers;
  const canManageInvitations = canInviteUsers === true;
  const canLoadTenantResources = tenantId !== null;
  const membersQuery = useQuery({
    queryKey: [...settingsQueryKeys.members(tenantId ?? "unavailable"), memberStatusFilter],
    queryFn: () => memberStatusFilter === "active" ? getTenantMembers() : getTenantMembers({ includeArchived: true }),
    staleTime: TENANT_QUERY_STALE_TIME_MS,
    retry: 1,
    enabled: canLoadTenantResources,
  });
  const rolesQuery = useQuery({
    queryKey: settingsQueryKeys.roles(tenantId ?? "unavailable"),
    queryFn: getTenantRoles,
    staleTime: TENANT_QUERY_STALE_TIME_MS,
    retry: 1,
    enabled: canLoadTenantResources && (teamTab === "roles" || selectedMember !== null),
  });
  const permissionsQuery = useQuery({
    queryKey: settingsQueryKeys.permissions(tenantId ?? "unavailable"),
    queryFn: getTenantPermissions,
    staleTime: TENANT_QUERY_STALE_TIME_MS,
    retry: 1,
    enabled: canLoadTenantResources && teamTab === "roles",
  });
  const permissionsByCode = useMemo(
    () => new Map((permissionsQuery.data?.data ?? []).map((permission) => [permission.code, permission])),
    [permissionsQuery.data],
  );
  const visibleMembers = useMemo(() => {
    const members = membersQuery.data ?? [];

    if (memberStatusFilter === "archived") {
      return members.filter((member) => member.status.trim().toLowerCase() === "archived");
    }

    return memberStatusFilter === "active"
      ? members.filter((member) => member.status.trim().toLowerCase() !== "archived")
      : members;
  }, [memberStatusFilter, membersQuery.data]);
  const actorRole = user?.membership?.tenantRole ?? user?.roles?.tenantRole;
  const actorUserId = user?.userId ?? user?.id;

  const inviteUser = () => {
    setIsInviting(true);
  };

  const selectTab = (tab: TeamTab) => {
    setTeamTab(tab);
    window.requestAnimationFrame(() => document.getElementById(`team-${tab}-tab`)?.focus());
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentTab: TeamTab) => {
    const currentIndex = TEAM_TABS.indexOf(currentTab);
    const nextTab =
      event.key === "ArrowRight"
        ? TEAM_TABS[(currentIndex + 1) % TEAM_TABS.length]
        : event.key === "ArrowLeft"
          ? TEAM_TABS[(currentIndex - 1 + TEAM_TABS.length) % TEAM_TABS.length]
          : event.key === "Home"
            ? TEAM_TABS[0]
            : event.key === "End"
              ? TEAM_TABS[TEAM_TABS.length - 1]
              : null;

    if (nextTab) {
      event.preventDefault();
      selectTab(nextTab);
    }
  };

  return (
    <>
      <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-[#06201c]">Team &amp; Users</h2>
        <div className="mt-3 border-b border-[#e1ebe6]">
          <div className="flex flex-wrap gap-5" role="tablist" aria-label="Team and users">
            {([
              ["members", "Members"],
              ["invite", "Invite User"],
              ["roles", "Roles & Permissions"],
            ] as const).map(([tab, label]) => (
              <button
                key={tab}
                id={`team-${tab}-tab`}
                type="button"
                role="tab"
                aria-selected={teamTab === tab}
                aria-controls={`team-${tab}-panel`}
                tabIndex={teamTab === tab ? 0 : -1}
                onClick={() => selectTab(tab)}
                onKeyDown={(event) => handleTabKeyDown(event, tab)}
                className={`border-b-2 pb-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6a58] ${teamTab === tab ? "border-[#1f6a58] text-[#1f6a58]" : "border-transparent text-[#6b8980] hover:text-[#16332b]"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div id="team-members-panel" role="tabpanel" aria-labelledby="team-members-tab" hidden={teamTab !== "members"} className="pt-4">
            <div className="mb-3 flex flex-wrap gap-2" aria-label="Member status filter">
              {(["active", "archived", "all"] as const).map((filter) => (
                <button key={filter} type="button" onClick={() => setMemberStatusFilter(filter)} aria-pressed={memberStatusFilter === filter} className={`rounded-full px-3 py-1.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6a58] ${memberStatusFilter === filter ? "bg-[#1f6a58] text-white" : "bg-[#edf3f0] text-[#52736a] hover:text-[#16332b]"}`}>
                  {filter === "active" ? "Active" : filter === "archived" ? "Archived" : "All"}
                </button>
              ))}
            </div>
            {membersQuery.isPending ? (
              <LoadingRows />
            ) : membersQuery.isError ? (
              <div className="py-2">
                <p role="alert" className="text-sm text-[#b42318]">Unable to load team members. Please try again.</p>
                <button type="button" onClick={() => void membersQuery.refetch()} className="mt-2 text-sm font-semibold text-[#1f6a58] hover:text-[#16332b]">Retry</button>
              </div>
            ) : (
              <MemberList members={visibleMembers} onSelectMember={setSelectedMember} />
            )}
        </div>

        <div id="team-invite-panel" role="tabpanel" aria-labelledby="team-invite-tab" hidden={teamTab !== "invite"} className="space-y-4 pt-4">
            <p className="text-sm text-[#52736a]">
              {canManageInvitations
                ? "Invite team members to your organization."
                : "Your available team actions are determined by your organization permissions."}
            </p>
            {canManageInvitations ? (
              <button
                type="button"
                onClick={inviteUser}
                className="inline-flex h-10 w-full items-center justify-center rounded-full bg-[#1f6a58] px-5 text-sm font-semibold text-white transition hover:bg-[#195646]"
              >
                Invite User
              </button>
            ) : null}
        </div>

        <div id="team-roles-panel" role="tabpanel" aria-labelledby="team-roles-tab" hidden={teamTab !== "roles"} className="pt-4">
            {rolesQuery.isPending || permissionsQuery.isPending ? (
              <LoadingRows />
            ) : rolesQuery.isError || permissionsQuery.isError ? (
              <div className="py-2">
                <p role="alert" className="text-sm text-[#b42318]">Unable to load roles and permissions. Please try again.</p>
                <button
                  type="button"
                  onClick={() => {
                    if (rolesQuery.isError) {
                      void rolesQuery.refetch();
                    }
                    if (permissionsQuery.isError) {
                      void permissionsQuery.refetch();
                    }
                  }}
                  className="mt-2 text-sm font-semibold text-[#1f6a58] hover:text-[#16332b]"
                >
                  Retry
                </button>
              </div>
            ) : rolesQuery.data.data.length === 0 ? (
              <p className="py-2 text-sm text-[#52736a]">No roles are available for this organization.</p>
            ) : (
              <div className="max-h-[26rem] space-y-3 overflow-y-auto pr-1">
                {rolesQuery.data.data.map((role) => (
                  <article key={role.slug} className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-[#16332b]">{role.name}</h3>
                      {typeof role.isAssignable === "boolean" ? (
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${role.isAssignable ? "bg-[#e8f6ee] text-[#167550]" : "bg-[#edf3f0] text-[#52736a]"}`}>
                          {role.isAssignable ? "Assignable" : "Not assignable"}
                        </span>
                      ) : null}
                    </div>
                    {role.description ? <p className="mt-1 text-sm text-[#52736a]">{role.description}</p> : null}
                    {role.permissions.length > 0 ? (
                      <ul className="mt-3 space-y-2">
                        {role.permissions.map((code) => {
                          const permission = permissionsByCode.get(code);

                          return (
                            <li key={code} className="rounded-lg border border-[#e7efeb] bg-white px-2.5 py-2">
                              <p className="text-xs font-semibold text-[#16332b]">{code}</p>
                              {permission?.name ? <p className="mt-0.5 text-xs text-[#52736a]">{permission.name}</p> : null}
                              {permission?.description ? <p className="mt-0.5 text-xs text-[#52736a]">{permission.description}</p> : null}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-[#52736a]">No permissions are assigned to this role.</p>
                    )}
                  </article>
                ))}
              </div>
            )}
        </div>
      </section>

      {isInviting ? (
        <InviteUserModal
          onClose={() => setIsInviting(false)}
          onSuccess={() => {
            if (tenantId) {
              void queryClient.invalidateQueries({ queryKey: settingsQueryKeys.members(tenantId) });
            }
            onInviteSuccess();
          }}
        />
      ) : null}

      {selectedMember && tenantId ? (
        <MemberDetailsModal
          membershipId={selectedMember.id}
          tenantId={tenantId}
          actorRole={actorRole}
          actorUserId={actorUserId}
          roles={rolesQuery.data?.data ?? []}
          isLoadingRoles={rolesQuery.isPending}
          onClose={() => setSelectedMember(null)}
        />
      ) : null}
    </>
  );
}
