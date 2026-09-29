import type { AuthUser } from "./types";

/** Normalizes supported Web Auth name fields for profile and navigation display. */
export function normalizeAuthUserName<T extends AuthUser>(user: T): T {
  const fields = Object.fromEntries(Object.entries(user)) as Record<string, unknown>;
  const fullName = readName(fields);
  return { ...user, fullName: fullName ?? user.fullName };
}

function readName(profile: Record<string, unknown>): string | undefined {
  for (const key of ["fullName", "full_name", "displayName", "display_name", "name"]) {
    const value = profile[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  const firstName = readNamePart(profile, ["firstName", "first_name"]);
  const lastName = readNamePart(profile, ["lastName", "last_name"]);
  return [firstName, lastName].filter(Boolean).join(" ") || undefined;
}

function readNamePart(profile: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = profile[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}
