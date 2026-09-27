export type SuperAdminProfile = {
  id: string;
  email?: string;
  fullName?: string;
  name?: string;
  username?: string;
};

export async function getSuperAdminProfile(): Promise<SuperAdminProfile | null> {
  const response = await fetch("/api/platform-super-admin/session", { credentials: "include", cache: "no-store" });
  if (!response.ok) return null;
  const body: unknown = await response.json().catch(() => null);
  if (!body || typeof body !== "object" || !("user" in body) || !body.user || typeof body.user !== "object") return null;
  const user = body.user as Record<string, unknown>;
  if (typeof user.id !== "string") return null;
  return {
    id: user.id,
    ...(typeof user.email === "string" ? { email: user.email } : {}),
    ...(typeof user.fullName === "string" ? { fullName: user.fullName } : {}),
    ...(typeof user.name === "string" ? { name: user.name } : {}),
    ...(typeof user.username === "string" ? { username: user.username } : {}),
  };
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
