import { parsePlatformUsersResponse, type PlatformUsersResponse } from "./platform-users.types";

/** Normalized global-users BFF failure retaining the dedicated authorization status. */
export class PlatformUsersApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "PlatformUsersApiError";
  }
}

/** Retrieves dedicated Super Admin global users through the same-origin Platform BFF. */
export async function getPlatformUsers(): Promise<PlatformUsersResponse> {
  const response = await fetch("/api/platform-super-admin/users", { credentials: "include", cache: "no-store" });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = typeof body === "object" && body !== null && "detail" in body && typeof body.detail === "string" ? body.detail : "Unable to load users.";
    throw new PlatformUsersApiError(response.status, detail);
  }
  return parsePlatformUsersResponse(body);
}
