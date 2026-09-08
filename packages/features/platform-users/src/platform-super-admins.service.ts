import { parsePlatformSuperAdminsResponse, type PlatformSuperAdminsResponse } from "./platform-super-admins.types";

/** Browser-safe data required to request one Super Admin invitation. */
export type InvitePlatformSuperAdminPayload = { fullName: string; email: string };

/** Dedicated Super Admin BFF failure retaining the authorization status for localized UI handling. */
export class PlatformSuperAdminsApiError extends Error {
  constructor(readonly status: number) {
    super();
    this.name = "PlatformSuperAdminsApiError";
  }
}

async function requestSuperAdmins(path: string, method: "GET" | "POST", requestBody?: string): Promise<unknown> {
  const response = await fetch(`/api/platform-super-admin/super-admins${path}`, {
    method,
    credentials: "include",
    cache: "no-store",
    ...(requestBody ? { headers: { "Content-Type": "application/json" }, body: requestBody } : {}),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new PlatformSuperAdminsApiError(response.status);
  return body;
}

/** Retrieves dedicated Super Admin accounts through the same-origin Platform BFF. */
export async function getPlatformSuperAdmins(): Promise<PlatformSuperAdminsResponse> {
  return parsePlatformSuperAdminsResponse(await requestSuperAdmins("", "GET"));
}

/** Activates one dedicated Super Admin through the same-origin Platform BFF. */
export async function activatePlatformSuperAdmin(userId: string): Promise<void> {
  await requestSuperAdmins(`/${encodeURIComponent(userId)}/activate`, "POST");
}

/** Deactivates one dedicated Super Admin through the same-origin Platform BFF. */
export async function deactivatePlatformSuperAdmin(userId: string): Promise<void> {
  await requestSuperAdmins(`/${encodeURIComponent(userId)}/deactivate`, "POST");
}

/** Deletes one dedicated Super Admin through the same-origin Platform BFF. */
export async function deletePlatformSuperAdmin(userId: string): Promise<void> {
  await requestSuperAdmins(`/${encodeURIComponent(userId)}/delete`, "POST");
}

/** Sends an invitation through the Platform BFF; the approved Shell origin is derived server-side. */
export async function invitePlatformSuperAdmin(payload: InvitePlatformSuperAdminPayload): Promise<void> {
  const response = await fetch("/api/platform-super-admin/invite", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new PlatformSuperAdminsApiError(response.status);
}
