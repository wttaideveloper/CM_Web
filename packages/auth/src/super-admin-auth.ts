/** Identity fields observed in the dedicated Super Admin login response. */
export interface SuperAdminIdentity {
  id: string;
  email: string;
  fullName: string;
  isSuperAdmin: boolean;
  status: string;
  emailVerified: boolean;
  keycloakId: string;
  createdAt: string;
}

/** Credentials submitted only to the dedicated Keycloak-backed Super Admin gateway. */
export interface SuperAdminLoginInput {
  email: string;
  password: string;
  rememberMe: boolean;
}

/** Safe identity result returned by the Shell server-side Super Admin login route. */
export interface SuperAdminLoginResult {
  user: SuperAdminIdentity;
}

const SUPER_ADMIN_AUTH_PATH = "/api/platform-super-admin";

/** Normalized error categories preserve the distinction between login and verification failures. */
export class SuperAdminAuthError extends Error {
  constructor(readonly kind: "login" | "malformed-login" | "not-super-admin" | "verification" | "transport", readonly status: number | null, message: string) {
    super(message);
    this.name = "SuperAdminAuthError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function isIdentity(value: unknown): value is SuperAdminIdentity { return isRecord(value) && typeof value.id === "string" && typeof value.email === "string" && typeof value.fullName === "string" && typeof value.isSuperAdmin === "boolean" && typeof value.status === "string" && typeof value.emailVerified === "boolean" && typeof value.keycloakId === "string" && typeof value.createdAt === "string"; }

async function request(path: string, init?: RequestInit, failureKind: "login" | "verification" = "verification"): Promise<Response> {
  try {
    const response = await fetch(`${SUPER_ADMIN_AUTH_PATH}${path}`, { credentials: "include", ...init });
    if (!response.ok) {
      throw new SuperAdminAuthError(failureKind, response.status, failureKind === "login" ? "Unable to sign in with those Super Admin credentials." : "Unable to verify the Super Admin session.");
    }
    return response;
  } catch (error) {
    if (error instanceof SuperAdminAuthError) throw error;
    throw new SuperAdminAuthError("transport", null, "Unable to reach Super Admin authentication.");
  }
}

async function parseJson(response: Response, kind: "malformed-login" | "verification"): Promise<unknown> {
  if (!(response.headers.get("content-type") ?? "").includes("application/json")) {
    throw new SuperAdminAuthError(kind, response.status, "Super Admin authentication returned an unsupported response.");
  }
  return response.json().catch(() => { throw new SuperAdminAuthError(kind, response.status, "Super Admin authentication returned invalid JSON."); });
}

function parseLoginResponse(value: unknown, status: number): SuperAdminLoginResult {
  if (!isRecord(value) || !isIdentity(value.data)) {
    throw new SuperAdminAuthError("malformed-login", status, "Super Admin login returned an unsupported response.");
  }
  if (!value.data.isSuperAdmin) throw new SuperAdminAuthError("not-super-admin", status, "This account is not authorized for Super Admin access.");
  return { user: value.data };
}

/** Starts the server-side Keycloak-backed Super Admin login without exposing tokens to browser code. */
export async function loginSuperAdmin(input: SuperAdminLoginInput): Promise<SuperAdminLoginResult> {
  const response = await request("/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }, "login");
  return parseLoginResponse(await parseJson(response, "malformed-login"), response.status);
}
