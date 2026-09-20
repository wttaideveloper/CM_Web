/** A Super Admin account that invited another Super Admin. */
export type PlatformSuperAdminInviter = {
  id: string;
  email: string;
  fullName: string;
};

/** Runtime-verified dedicated Super Admin account. */
export type PlatformSuperAdmin = {
  id: string;
  email: string;
  fullName: string;
  isSuperAdmin: boolean;
  status: string;
  emailVerified: boolean;
  inviteStatus: string;
  keycloakId: string;
  createdAt: string;
  lastLoginAt: string | null;
  lastActivatedAt: string | null;
  invitedBy: PlatformSuperAdminInviter | null;
};

/** Runtime-verified dedicated Super Admin collection response. */
export type PlatformSuperAdminsResponse = {
  items: PlatformSuperAdmin[];
  total: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredString(value: Record<string, unknown>, ...keys: string[]): string | null {
  const candidate = keys.map((key) => value[key]).find((item) => typeof item === "string" && item.trim());
  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : null;
}

function readNullableString(value: Record<string, unknown>, ...keys: string[]): string | null {
  const candidate = keys.map((key) => value[key]).find((item) => item !== undefined);
  return candidate === null || candidate === undefined ? null : typeof candidate === "string" ? candidate : null;
}

function parseInvitedBy(value: unknown): PlatformSuperAdminInviter | null | undefined {
  if (value === null) return null;
  if (!isRecord(value)) return undefined;

  const id = readRequiredString(value, "id", "userId", "user_id");
  const email = readRequiredString(value, "email");
  const fullName = readRequiredString(value, "fullName", "full_name") ?? email;
  return id && email && fullName ? { id, email, fullName } : undefined;
}

function parseSuperAdmin(value: unknown): PlatformSuperAdmin | null {
  if (!isRecord(value)) return null;

  const id = readRequiredString(value, "id");
  const email = readRequiredString(value, "email");
  const fullName = readRequiredString(value, "fullName", "full_name") ?? email;
  const status = readRequiredString(value, "status") ?? "unknown";
  const inviteStatus = readRequiredString(value, "inviteStatus", "invite_status") ?? "unknown";
  const keycloakId = readRequiredString(value, "keycloakId", "keycloak_id", "userId", "user_id") ?? id;
  const createdAt = readRequiredString(value, "createdAt", "created_at") ?? "";
  const lastLoginAt = readNullableString(value, "lastLoginAt", "last_login_at");
  const lastActivatedAt = readNullableString(value, "lastActivatedAt", "last_activated_at");
  const invitedBy = parseInvitedBy(value.invitedBy ?? value.invited_by) ?? null;

  if (
    !id ||
    !email ||
    !fullName ||
    !status ||
    !inviteStatus ||
    !keycloakId
  ) {
    return null;
  }

  return {
    id,
    email,
    fullName,
    isSuperAdmin: value.isSuperAdmin === true,
    status,
    emailVerified: value.emailVerified === true,
    inviteStatus,
    keycloakId,
    createdAt,
    lastLoginAt,
    lastActivatedAt,
    invitedBy,
  };
}

/** Parses only the confirmed dedicated Super Admin collection contract. */
export function parsePlatformSuperAdminsResponse(value: unknown): PlatformSuperAdminsResponse {
  const records = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.data)
      ? value.data
      : isRecord(value) && Array.isArray(value.items)
        ? value.items
        : isRecord(value) && Array.isArray(value.users)
          ? value.users
          : null;
  if (!records) throw new Error();

  const items = records.map(parseSuperAdmin).filter((item): item is PlatformSuperAdmin => item !== null);
  const total = isRecord(value) && typeof value.total === "number" ? value.total : items.length;
  return { items, total };
}
