import type { TrainingListItem } from "@ihp/enterprise-trainings";
import type { TenantMember } from "@ihp/enterprise-runtime";

export type GroupChatView = "conversation" | "members" | "settings";
export type GroupRole = "Owner" | "Admin" | "Member";
export type MembershipStatus = "active" | "pending" | "removed";
export type ProviderVerificationStatus = "verified" | "unverified" | "unavailable";
export type MemberManagementAction = "make-admin" | "remove-admin" | "remove-member";

export type GroupLearner = {
  id: string;
  name: string;
  email: string;
  status: string;
  eligible: boolean;
};

export type GroupProvider = {
  id: string;
  name: string;
  role: string;
  email: string;
};

export type GroupDraft = {
  training: TrainingListItem | null;
  learners: GroupLearner[];
  providers: GroupProvider[];
  name: string;
  description: string;
  postingPermission: "admins" | "members";
  capacity: number;
};

export type PreviewGroupMember = {
  id: string;
  name: string;
  role: GroupRole;
  kind: "learner" | "provider";
  membershipStatus: MembershipStatus;
  providerVerificationStatus?: ProviderVerificationStatus;
};

export const PREVIEW_GROUP_MEMBERS: PreviewGroupMember[] = [
  { id: "preview-owner", name: "Group owner", role: "Owner", kind: "provider", membershipStatus: "active", providerVerificationStatus: "verified" },
  { id: "preview-provider", name: "Training provider", role: "Member", kind: "provider", membershipStatus: "active", providerVerificationStatus: "unavailable" },
  { id: "preview-verified-provider", name: "Verified provider (preview)", role: "Member", kind: "provider", membershipStatus: "active", providerVerificationStatus: "verified" },
  { id: "preview-learner-one", name: "Enrolled learner", role: "Member", kind: "learner", membershipStatus: "active" },
];

/** Returns the locally previewed actions available to the current group role. */
export function getMemberManagementActions(viewerRole: GroupRole, member: PreviewGroupMember): readonly MemberManagementAction[] {
  if (member.membershipStatus !== "active" || member.role === "Owner") return [];
  if (viewerRole === "Member") return [];
  if (viewerRole === "Admin") return member.role === "Member" ? ["remove-member"] : [];
  if (member.role === "Admin") return ["remove-admin", "remove-member"];
  if (member.kind === "provider" && member.providerVerificationStatus === "verified") return ["make-admin", "remove-member"];
  return ["remove-member"];
}

/** Applies a mock-only membership action without contacting a backend service. */
export function applyPreviewMemberAction(members: readonly PreviewGroupMember[], memberId: string, action: MemberManagementAction): PreviewGroupMember[] {
  if (action === "remove-member") return members.filter((member) => member.id !== memberId);

  return members.map((member) => {
    if (member.id !== memberId || member.role === "Owner") return member;
    return { ...member, role: action === "make-admin" ? "Admin" : "Member" };
  });
}

function readString(value: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEligibleStatus(status: string): boolean {
  return !["cancelled", "canceled", "rejected", "withdrawn", "removed", "expired"].includes(status.toLowerCase());
}

/** Converts the existing Training enrolment response into safe, displayable preview data. */
export function normalizeGroupLearner(value: unknown, index: number): GroupLearner | null {
  if (!isRecord(value)) return null;
  const id = readString(value, "id", "enrolment_id", "enrollment_id", "user_id", "participant_id");
  const name = readString(value, "participant_name", "full_name", "fullName", "name", "user_name");
  const email = readString(value, "participant_email", "email", "user_email");
  const status = readString(value, "status", "enrolment_status", "enrollment_status") || "enrolled";
  if (!id && !name && !email) return null;
  return {
    id: id || `learner-${index}`,
    name: name || "Enrolled learner",
    email,
    status,
    eligible: isEligibleStatus(status),
  };
}

/** Converts the existing tenant member response into a provider candidate. */
export function normalizeGroupProvider(member: TenantMember): GroupProvider | null {
  const role = (member.roleSlug || member.role || "").toLowerCase();
  if (!role.includes("provider")) return null;
  return { id: member.userId, name: member.fullName, role: member.roleName || member.roleSlug, email: member.email };
}
