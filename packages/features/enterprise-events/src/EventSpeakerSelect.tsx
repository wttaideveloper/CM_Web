"use client";

import { useQuery } from "@tanstack/react-query";
import { getTenantMembers } from "@ihp/enterprise-runtime";

type EventSpeakerSelectProps = {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
};

/** Selects an active internal tenant member as the speaker for an Event session. */
export default function EventSpeakerSelect({ value, onChange, required = false, disabled = false, id, className = "mt-1 h-10 w-full rounded-lg border border-[#d7e5df] bg-white px-3 font-normal outline-none focus:border-[#1f6a58]" }: EventSpeakerSelectProps) {
  const membersQuery = useQuery({ queryKey: ["tenant", "members", "event-speakers"], queryFn: () => getTenantMembers(), staleTime: 30_000, retry: 1 });
  const members = (membersQuery.data ?? []).filter((member) => member.status.trim().toLowerCase() === "active" && member.role.trim().toLowerCase() === "internal_user");
  const selectedMemberIsAvailable = members.some((member) => member.fullName === value);
  const prompt = membersQuery.isLoading ? "Loading speakers..." : membersQuery.isError ? "Unable to load speakers" : members.length === 0 ? "No active speakers available" : "Select speaker";
  return <><select id={id} value={value} required={required} disabled={disabled || membersQuery.isLoading || membersQuery.isError || members.length === 0} onChange={(event) => onChange(event.target.value)} className={className}><option value="">{prompt}</option>{value && !selectedMemberIsAvailable ? <option value={value}>{value}</option> : null}{members.map((member) => <option key={member.id} value={member.fullName}>{member.fullName}</option>)}</select>{membersQuery.isError ? <button type="button" onClick={() => void membersQuery.refetch()} className="mt-1 text-xs font-semibold text-[#1f6a58] underline">Retry loading speakers</button> : null}</>;
}
