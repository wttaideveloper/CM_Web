import "server-only";

const SUPER_ADMIN_AUTH_API_BASE_URL = process.env.SUPER_ADMIN_AUTH_API_BASE_URL;

type InviteAcceptPayload = { token: string; email: string; password: string };
type PasswordResetPayload = { email: string; password?: string; otp?: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function redactSensitiveValues(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitiveValues);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !["accessToken", "access_token", "refreshToken", "refresh_token", "authorization"].includes(key))
    .map(([key, nestedValue]) => [key, redactSensitiveValues(nestedValue)]));
}

function publicInviteApiUrl(pathname: string): URL | null {
  if (!SUPER_ADMIN_AUTH_API_BASE_URL) return null;
  try {
    const url = new URL(SUPER_ADMIN_AUTH_API_BASE_URL);
    if (process.env.NODE_ENV === "production" && url.protocol !== "https:") return null;
    url.pathname = pathname;
    url.search = "";
    return url;
  } catch {
    return null;
  }
}

/** Retrieves an invitation preview without issuing or returning an authenticated session. */
export async function previewSuperAdminInvite(token: string): Promise<{ status: number; body: unknown }> {
  const url = publicInviteApiUrl("/api/v1/auth/invite/preview");
  if (!url) return { status: 503, body: { detail: "Super Admin authentication is not configured." } };
  url.searchParams.set("token", token);

  try {
    const response = await fetch(url, { cache: "no-store" });
    return { status: response.status, body: redactSensitiveValues(await response.json().catch(() => null)) };
  } catch {
    return { status: 502, body: { detail: "Unable to reach Super Admin authentication." } };
  }
}

/** Accepts an invitation without returning credentials or session tokens to browser code. */
export async function acceptSuperAdminInvite(payload: InviteAcceptPayload): Promise<{ status: number; body: unknown }> {
  const url = publicInviteApiUrl("/api/v1/auth/invite/accept");
  if (!url) return { status: 503, body: { detail: "Super Admin authentication is not configured." } };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    return { status: response.status, body: redactSensitiveValues(await response.json().catch(() => null)) };
  } catch {
    return { status: 502, body: { detail: "Unable to reach Super Admin authentication." } };
  }
}

async function postPublicSuperAdminAuth(pathname: string, payload: PasswordResetPayload): Promise<{ status: number; body: unknown }> {
  const url = publicInviteApiUrl(pathname);
  if (!url) return { status: 503, body: { detail: "Super Admin authentication is not configured." } };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    return { status: response.status, body: redactSensitiveValues(await response.json().catch(() => null)) };
  } catch {
    return { status: 502, body: { detail: "Unable to reach Super Admin authentication." } };
  }
}

/** Requests a neutral Super Admin password-reset email response. */
export function requestSuperAdminPasswordReset(email: string): Promise<{ status: number; body: unknown }> {
  return postPublicSuperAdminAuth("/api/v1/auth/forgot-password", { email });
}

/** Verifies the six-digit Super Admin reset OTP without creating an authenticated login session. */
export function verifySuperAdminPasswordResetCode(email: string, otp: string): Promise<{ status: number; body: unknown }> {
  return postPublicSuperAdminAuth("/api/v1/auth/verify-reset-code", { email, otp });
}

/** Resets a Super Admin password, retaining the verified OTP only in the current request flow. */
export function resetSuperAdminPassword(email: string, password: string, otp: string): Promise<{ status: number; body: unknown }> {
  return postPublicSuperAdminAuth("/api/v1/auth/reset-password", { email, password, otp });
}
