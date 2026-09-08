/** Runtime-verified dedicated Super Admin global user. */
export type PlatformUser = {
  id: string;
  email: string;
  fullName: string;
  isSuperAdmin: boolean;
  status: string;
  emailVerified: boolean;
  keycloakId: string;
  createdAt: string;
  lastLoginAt: string | null;
  lastActivatedAt: string | null;
};

/** Runtime-verified global-user collection envelope. */
export type PlatformUsersResponse = { items: PlatformUser[]; total: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredString(value: Record<string, unknown>, key: string): string | null {
  const candidate = value[key];
  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : null;
}

function readNullableString(value: Record<string, unknown>, key: string): string | null {
  const candidate = value[key];
  return candidate === null ? null : typeof candidate === "string" ? candidate : null;
}

/** Parses only the authenticated global-user payload observed from the dedicated BFF. */
export function parsePlatformUsersResponse(value: unknown): PlatformUsersResponse {
  if (!isRecord(value) || typeof value.message !== "string" || !Array.isArray(value.data) || typeof value.total !== "number") {
    throw new Error("Users API returned an unsupported response.");
  }

  const items = value.data.map((item) => {
    if (!isRecord(item)) throw new Error("Users API returned an unsupported user.");
    const id = readRequiredString(item, "id");
    const email = readRequiredString(item, "email");
    const fullName = readRequiredString(item, "fullName");
    const status = readRequiredString(item, "status");
    const keycloakId = readRequiredString(item, "keycloakId");
    const createdAt = readRequiredString(item, "createdAt");
    const lastLoginAt = readNullableString(item, "lastLoginAt");
    const lastActivatedAt = readNullableString(item, "lastActivatedAt");
    if (!id || !email || !fullName || !status || !keycloakId || !createdAt || typeof item.isSuperAdmin !== "boolean" || typeof item.emailVerified !== "boolean" || (item.lastLoginAt !== null && lastLoginAt === null) || (item.lastActivatedAt !== null && lastActivatedAt === null)) {
      throw new Error("Users API returned an incomplete user.");
    }
    return { id, email, fullName, isSuperAdmin: item.isSuperAdmin, status, emailVerified: item.emailVerified, keycloakId, createdAt, lastLoginAt, lastActivatedAt };
  });

  return { items, total: value.total };
}
