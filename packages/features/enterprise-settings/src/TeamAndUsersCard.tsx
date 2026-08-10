"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { InviteUserModal, useAuth } from "@ihp/auth";
import {
  getTenantMembers,
  getTenantPermissions,
  getTenantRoles,
  type TenantMember,
} from "@ihp/enterprise-runtime";
import { useMemo, useState, type KeyboardEvent } from "react";

type TeamTab = "members" | "invite" | "roles";

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

function MemberList({ members }: { members: TenantMember[] }) {
  if (members.length === 0) {
    return <p className="py-2 text-sm text-[#52736a]">No members are available for this organization.</p>;
  }

  return (
    <ul className="max-h-[26rem] space-y-2 overflow-y-auto pr-1">
      {members.map((member) => (
        <li key={member.id} className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] px-3 py-2.5">
          <p className="text-sm font-bold text-[#16332b]">{member.fullName}</p>
          <p className="mt-0.5 break-words text-xs text-[#52736a]">{member.email}</p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#52736a]">
            <span>{member.roleName || member.roleSlug || member.role}</span>
            <span className="font-semibold text-[#16332b]">{member.status}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Renders the Enterprise Settings Team & Users card. */
export default function TeamAndUsersCard({ onInviteSuccess }: TeamAndUsersCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [teamTab, setTeamTab] = useState<TeamTab>("members");
  const [isInviting, setIsInviting] = useState(false);
  const canInviteUsers = user?.membership?.canInviteUsers ?? user?.roles?.canInviteUsers;
  const canManageInvitations = canInviteUsers === true;
  const membersQuery = useQuery({
    queryKey: ["tenant", "members"],
    queryFn: getTenantMembers,
    staleTime: TENANT_QUERY_STALE_TIME_MS,
    retry: 1,
  });
  const rolesQuery = useQuery({
    queryKey: ["tenant", "roles"],
    queryFn: getTenantRoles,
    staleTime: TENANT_QUERY_STALE_TIME_MS,
    retry: 1,
    enabled: teamTab === "roles",
  });
  const permissionsQuery = useQuery({
    queryKey: ["tenant", "permissions"],
    queryFn: getTenantPermissions,
    staleTime: TENANT_QUERY_STALE_TIME_MS,
    retry: 1,
    enabled: teamTab === "roles",
  });
  const permissionsByCode = useMemo(
    () => new Map((permissionsQuery.data?.data ?? []).map((permission) => [permission.code, permission])),
    [permissionsQuery.data],
  );

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
            {membersQuery.isPending ? (
              <LoadingRows />
            ) : membersQuery.isError ? (
              <p role="alert" className="py-2 text-sm text-[#b42318]">Unable to load team members. Please try again.</p>
            ) : (
              <MemberList members={membersQuery.data} />
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
              <p role="alert" className="py-2 text-sm text-[#b42318]">Unable to load roles and permissions. Please try again.</p>
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
            void queryClient.invalidateQueries({ queryKey: ["tenant", "members"] });
            onInviteSuccess();
          }}
        />
      ) : null}
    </>
  );
}
