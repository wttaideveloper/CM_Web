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

function hasOnlyKeys(value: Record<string, unknown>, allowedKeys: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

function readRequiredString(value: Record<string, unknown>, key: string): string | null {
  const candidate = value[key];
  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : null;
}

function readNullableString(value: Record<string, unknown>, key: string): string | null | undefined {
  const candidate = value[key];
  return candidate === null ? null : typeof candidate === "string" ? candidate : undefined;
}

function parseInvitedBy(value: unknown): PlatformSuperAdminInviter | null | undefined {
  if (value === null) return null;
  if (!isRecord(value) || !hasOnlyKeys(value, ["id", "email", "fullName"])) return undefined;

  const id = readRequiredString(value, "id");
  const email = readRequiredString(value, "email");
  const fullName = readRequiredString(value, "fullName");
  return id && email && fullName ? { id, email, fullName } : undefined;
}

function parseSuperAdmin(value: unknown): PlatformSuperAdmin | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "id",
      "email",
      "fullName",
      "isSuperAdmin",
      "status",
      "emailVerified",
      "inviteStatus",
      "keycloakId",
      "createdAt",
      "lastLoginAt",
      "lastActivatedAt",
      "invitedBy",
    ])
  ) {
    return null;
  }

  const id = readRequiredString(value, "id");
  const email = readRequiredString(value, "email");
  const fullName = readRequiredString(value, "fullName");
  const status = readRequiredString(value, "status");
  const inviteStatus = readRequiredString(value, "inviteStatus");
  const keycloakId = readRequiredString(value, "keycloakId");
  const createdAt = readRequiredString(value, "createdAt");
  const lastLoginAt = readNullableString(value, "lastLoginAt");
  const lastActivatedAt = readNullableString(value, "lastActivatedAt");
  const invitedBy = parseInvitedBy(value.invitedBy);

  if (
    !id ||
    !email ||
    !fullName ||
    !status ||
    !inviteStatus ||
    !keycloakId ||
    !createdAt ||
    typeof value.isSuperAdmin !== "boolean" ||
    typeof value.emailVerified !== "boolean" ||
    lastLoginAt === undefined ||
    lastActivatedAt === undefined ||
    invitedBy === undefined
  ) {
    return null;
  }

  return {
    id,
    email,
    fullName,
    isSuperAdmin: value.isSuperAdmin,
    status,
    emailVerified: value.emailVerified,
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
  if (!isRecord(value) || !hasOnlyKeys(value, ["message", "data", "total"]) || typeof value.message !== "string" || !Array.isArray(value.data) || typeof value.total !== "number") {
    throw new Error();
  }

  const items = value.data.map(parseSuperAdmin);
  if (items.some((item) => item === null)) throw new Error();
  return { items: items as PlatformSuperAdmin[], total: value.total };
}
