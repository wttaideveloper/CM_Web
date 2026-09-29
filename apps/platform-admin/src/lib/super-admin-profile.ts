export type SuperAdminProfile = {
  id: string;
  email?: string;
  fullName?: string;
  name?: string;
  username?: string;
  status?: string;
  emailVerified?: boolean;
  createdAt?: string;
};

export const superAdminProfileQueryKey = ["platform-admin", "profile"] as const;

export async function getSuperAdminProfile(): Promise<SuperAdminProfile | null> {
  const response = await fetch("/api/platform-super-admin/session", { credentials: "include", cache: "no-store" });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error(`Unable to load the Super Admin profile (HTTP ${response.status}).`);
  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || !("user" in body) || !body.user || typeof body.user !== "object") return null;
  const user = body.user as Record<string, unknown>;
  if (typeof user.id !== "string") return null;
  const fullName = getName(user);
  return {
    id: user.id,
    ...(typeof user.email === "string" ? { email: user.email } : {}),
    ...(fullName ? { fullName } : {}),
    ...(typeof user.name === "string" ? { name: user.name } : {}),
    ...(typeof user.username === "string" ? { username: user.username } : {}),
    ...(typeof user.status === "string" ? { status: user.status } : {}),
    ...(typeof user.emailVerified === "boolean" ? { emailVerified: user.emailVerified } : typeof user.email_verified === "boolean" ? { emailVerified: user.email_verified } : {}),
    ...(typeof user.createdAt === "string" ? { createdAt: user.createdAt } : typeof user.created_at === "string" ? { createdAt: user.created_at } : {}),
  };
}

function getName(user: Record<string, unknown>): string | undefined {
  for (const key of ["fullName", "full_name", "displayName", "display_name", "name"]) {
    const value = user[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  const firstName = readNamePart(user, ["firstName", "first_name"]);
  const lastName = readNamePart(user, ["lastName", "last_name"]);
  return [firstName, lastName].filter(Boolean).join(" ") || undefined;
}

function readNamePart(user: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = user[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function getProfileDisplayName(profile: SuperAdminProfile | null): string | null {
  return profile?.fullName?.trim() || profile?.name?.trim() || profile?.username?.trim() || null;
}

export function getProfileInitials(profile: SuperAdminProfile | null): string | null {
  const displayName = getProfileDisplayName(profile);
  if (!displayName) return null;
  const parts = displayName.split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0][0]).toUpperCase();
}
