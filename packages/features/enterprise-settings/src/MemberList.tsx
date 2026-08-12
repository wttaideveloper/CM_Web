"use client";

import type { TenantMember } from "@ihp/enterprise-runtime";

type MemberListProps = {
  members: TenantMember[];
  onSelectMember: (member: TenantMember) => void;
};

/** Renders selectable tenant members for the Team & Users member-management panel. */
export default function MemberList({ members, onSelectMember }: MemberListProps) {
  if (members.length === 0) {
    return <p className="py-2 text-sm text-[#52736a]">No members are available for this organization.</p>;
  }

  return (
    <ul className="max-h-[26rem] space-y-2 overflow-y-auto pr-1">
      {members.map((member) => (
        <li key={member.id}>
          <button
            type="button"
            onClick={() => onSelectMember(member)}
            className="w-full rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] px-3 py-2.5 text-left transition hover:border-[#9bcbb9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6a58]"
          >
            <p className="text-sm font-bold text-[#16332b]">{member.fullName}</p>
            <p className="mt-0.5 break-words text-xs text-[#52736a]">{member.email}</p>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#52736a]">
              <span>{member.roleName || member.roleSlug || member.role}</span>
              <span className="font-semibold text-[#16332b]">{member.status}</span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
