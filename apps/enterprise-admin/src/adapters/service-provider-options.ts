import type { ServiceProviderOption } from "@ihp/services";
import { getTenantMembers } from "@ihp/enterprise-runtime";

export async function loadEnterpriseServiceProviderOptions(): Promise<ServiceProviderOption[]> {
  const members = await getTenantMembers();

  return members
    .filter(
      (member) =>
        member.status.trim().toLowerCase() === "active" &&
        member.role.trim().toLowerCase() === "internal_user",
    )
    .map((member) => ({
      id: member.id,
      userId: member.userId,
      fullName: member.fullName,
    }));
}
