import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

if ("window" in globalThis) throw new Error("The CSRF utility is server-only.");

/** Identifies an admin application so a token cannot be replayed across apps. */
export type CsrfApplicationContext = "platform-admin" | "enterprise-admin";

/**
 * Versioned server-only HMAC key set; keys are base64url-encoded random bytes.
 * Rotation advances activeKeyId, retains prior keys for verification through the token lifetime,
 * then removes them after all tokens signed by those keys have expired.
 */
export interface CsrfKeyRing {
  readonly activeKeyId: string;
  readonly keys: Readonly<Record<string, string>>;
}

/** Server configuration used by CSRF issuance and request validation. */
export interface CsrfServerConfiguration {
  readonly application: CsrfApplicationContext;
  readonly keyRing: CsrfKeyRing;
  readonly allowedOrigins: readonly string[];
  readonly tokenTtlSeconds: number;
}

/** Options for creating a session-bound signed double-submit token. */
export interface CreateCsrfTokenOptions {
  readonly application: CsrfApplicationContext;
  readonly sessionBinding: string;
  readonly keyRing: CsrfKeyRing;
  readonly tokenTtlSeconds: number;
  readonly nowSeconds?: number;
}

/** Options for verifying a signed double-submit token. */
export interface VerifyCsrfTokenOptions {
  readonly application: CsrfApplicationContext;
  readonly sessionBinding: string;
  readonly keyRing: CsrfKeyRing;
  readonly tokenTtlSeconds: number;
  readonly nowSeconds?: number;
}

/** Options for guarding an authenticated BFF request before a state change. */
export interface CsrfRequestGuardOptions extends VerifyCsrfTokenOptions {
  readonly allowedOrigins: readonly string[];
  readonly csrfCookieName: string;
}

const TOKEN_VERSION = "v1";
const CSRF_HEADER_NAME = "x-csrf-token";
const MAX_TOKEN_LENGTH = 2048;
const KEY_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

function isSafeMethod(method: string): boolean {
  return ["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

function decodeKey(encodedKey: string): Buffer | null {
  if (!BASE64URL_PATTERN.test(encodedKey)) return null;
  const key = Buffer.from(encodedKey, "base64url");
  if (key.toString("base64url") !== encodedKey || key.byteLength < 32) return null;
  return key;
}

function validKeyRing(keyRing: CsrfKeyRing): boolean {
  if (!KEY_ID_PATTERN.test(keyRing.activeKeyId)) return false;
  const activeKey = keyRing.keys[keyRing.activeKeyId];
  return typeof activeKey === "string" && decodeKey(activeKey) !== null;
}

function validApplication(application: string): application is CsrfApplicationContext {
  return application === "platform-admin" || application === "enterprise-admin";
}

function constantTimeTextEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, "utf8");
  const rightBytes = Buffer.from(right, "utf8");
  return leftBytes.byteLength === rightBytes.byteLength && timingSafeEqual(leftBytes, rightBytes);
}

function canonicalOrigin(value: string): string | null {
  if (!value || value === "null" || value.trim() !== value) return null;
  try {
    const parsed = new URL(value);
    if ((parsed.protocol !== "http:" && parsed.protocol !== "https:") || parsed.origin !== value) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

function signatureInput(
  version: string,
  keyId: string,
  issuedAt: string,
  expiresAt: string,
  nonce: string,
  application: CsrfApplicationContext,
  sessionBinding: string,
): string {
  return [version, keyId, issuedAt, expiresAt, nonce, application, sessionBinding].join("\n");
}

function sign(input: string, encodedKey: string): string | null {
  const key = decodeKey(encodedKey);
  if (!key) return null;
  return createHmac("sha256", key).update(input, "utf8").digest("base64url");
}

/**
 * Creates a versioned HMAC token bound to a caller-provided stable server session identifier.
 * Callers must not pass access or refresh tokens as the session binding.
 */
export function createSignedCsrfToken(options: CreateCsrfTokenOptions): string {
  const { application, sessionBinding, keyRing, tokenTtlSeconds } = options;
  const issuedAt = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (!validApplication(application)) throw new Error("The CSRF application context is invalid.");
  if (!sessionBinding || sessionBinding.length > 4096) throw new Error("A stable session binding is required.");
  if (!validKeyRing(keyRing)) throw new Error("The CSRF key ring is invalid.");
  if (!Number.isSafeInteger(tokenTtlSeconds) || tokenTtlSeconds <= 0) throw new Error("The CSRF token lifetime is invalid.");
  if (!Number.isSafeInteger(issuedAt) || issuedAt < 0) throw new Error("The CSRF issuance time is invalid.");

  const version = TOKEN_VERSION;
  const keyId = keyRing.activeKeyId;
  const issuedAtSegment = String(issuedAt);
  const expiresAtSegment = String(issuedAt + tokenTtlSeconds);
  if (!Number.isSafeInteger(issuedAt + tokenTtlSeconds)) throw new Error("The CSRF token expiry is invalid.");
  const nonce = randomBytes(32).toString("base64url");
  const payload = signatureInput(version, keyId, issuedAtSegment, expiresAtSegment, nonce, application, sessionBinding);
  const signature = sign(payload, keyRing.keys[keyId]!);
  if (!signature) throw new Error("The active CSRF key is invalid.");
  return [version, keyId, issuedAtSegment, expiresAtSegment, nonce, signature].join(".");
}

/** Verifies token structure, lifetime, application context, session binding, and HMAC. */
export function verifySignedCsrfToken(token: string, options: VerifyCsrfTokenOptions): boolean {
  if (!validApplication(options.application)) return false;
  if (!token || token.length > MAX_TOKEN_LENGTH || !options.sessionBinding || options.sessionBinding.length > 4096) return false;
  if (!Number.isSafeInteger(options.tokenTtlSeconds) || options.tokenTtlSeconds <= 0 || !validKeyRing(options.keyRing)) return false;

  const segments = token.split(".");
  if (segments.length !== 6) return false;
  const [version, keyId, issuedAtSegment, expiresAtSegment, nonce, suppliedSignature] = segments as [string, string, string, string, string, string];
  if (version !== TOKEN_VERSION || !KEY_ID_PATTERN.test(keyId)) return false;
  if (!/^(0|[1-9]\d*)$/.test(issuedAtSegment) || !/^(0|[1-9]\d*)$/.test(expiresAtSegment)) return false;
  if (!BASE64URL_PATTERN.test(nonce) || Buffer.from(nonce, "base64url").byteLength !== 32) return false;
  if (!BASE64URL_PATTERN.test(suppliedSignature)) return false;

  const issuedAt = Number(issuedAtSegment);
  const expiresAt = Number(expiresAtSegment);
  const now = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(issuedAt) || !Number.isSafeInteger(expiresAt) || !Number.isSafeInteger(now)) return false;
  if (issuedAt > now || expiresAt <= now || expiresAt <= issuedAt || expiresAt - issuedAt > options.tokenTtlSeconds) return false;

  const encodedKey = options.keyRing.keys[keyId];
  if (typeof encodedKey !== "string") return false;
  const payload = signatureInput(version, keyId, issuedAtSegment, expiresAtSegment, nonce, options.application, options.sessionBinding);
  const expectedSignature = sign(payload, encodedKey);
  return expectedSignature !== null && constantTimeTextEqual(suppliedSignature, expectedSignature);
}

/** Parses a comma-separated exact-origin allowlist; entries may not include paths or credentials. */
export function parseCsrfAllowedOrigins(value: string): readonly string[] {
  const entries = value.split(",").map((entry) => entry.trim());
  if (entries.length === 0 || entries.some((entry) => !entry)) throw new Error("The CSRF origin allowlist is invalid.");
  const origins = entries.map(canonicalOrigin);
  if (origins.some((origin) => origin === null)) throw new Error("The CSRF origin allowlist is invalid.");
  return [...new Set(origins as string[])];
}

/** Loads app-specific secrets and exact allowed origins from server environment configuration. */
export function loadCsrfServerConfiguration(
  application: CsrfApplicationContext,
  environment: Readonly<Record<string, string | undefined>> = process.env,
): CsrfServerConfiguration {
  const prefix = application === "platform-admin" ? "PLATFORM_ADMIN" : "ENTERPRISE_ADMIN";
  const keyRingVariable = `${prefix}_CSRF_KEYRING_JSON`;
  const originsVariable = `${prefix}_CSRF_ALLOWED_ORIGINS`;
  const lifetimeVariable = `${prefix}_CSRF_TOKEN_TTL_SECONDS`;
  if (keyRingVariable.startsWith("NEXT_PUBLIC_") || originsVariable.startsWith("NEXT_PUBLIC_")) {
    throw new Error("CSRF configuration must remain server-only.");
  }

  const keyRingJson = environment[keyRingVariable];
  const originsValue = environment[originsVariable];
  const ttlValue = environment[lifetimeVariable];
  if (!keyRingJson || !originsValue || !ttlValue) throw new Error("CSRF server configuration is incomplete.");

  let parsedKeyRing: unknown;
  try {
    parsedKeyRing = JSON.parse(keyRingJson);
  } catch {
    throw new Error("The CSRF key ring configuration is invalid.");
  }
  if (typeof parsedKeyRing !== "object" || parsedKeyRing === null || Array.isArray(parsedKeyRing)) {
    throw new Error("The CSRF key ring configuration is invalid.");
  }
  const candidate = parsedKeyRing as Record<string, unknown>;
  if (typeof candidate.activeKeyId !== "string" || typeof candidate.keys !== "object" || candidate.keys === null || Array.isArray(candidate.keys)) {
    throw new Error("The CSRF key ring configuration is invalid.");
  }
  const keys = candidate.keys as Record<string, unknown>;
  if (Object.values(keys).some((key) => typeof key !== "string")) throw new Error("The CSRF key ring configuration is invalid.");
  const keyRing: CsrfKeyRing = { activeKeyId: candidate.activeKeyId, keys: keys as Record<string, string> };
  if (!validKeyRing(keyRing)) throw new Error("The CSRF key ring configuration is invalid.");

  const tokenTtlSeconds = Number(ttlValue);
  if (!Number.isSafeInteger(tokenTtlSeconds) || tokenTtlSeconds <= 0) throw new Error("The CSRF token lifetime is invalid.");
  return {
    application,
    keyRing,
    allowedOrigins: parseCsrfAllowedOrigins(originsValue),
    tokenTtlSeconds,
  };
}

/** Validates Origin, or Referer only when Origin is absent, against exact configured origins. */
export function hasAllowedCsrfOrigin(
  originHeader: string | null,
  refererHeader: string | null,
  allowedOrigins: readonly string[],
): boolean {
  const allowed = new Set(allowedOrigins.map(canonicalOrigin));
  if (allowed.size === 0 || allowed.has(null)) return false;
  if (originHeader !== null) {
    const origin = canonicalOrigin(originHeader);
    return origin !== null && allowed.has(origin);
  }
  if (refererHeader === null || !refererHeader || refererHeader === "null") return false;
  try {
    const referer = new URL(refererHeader);
    if (referer.protocol !== "http:" && referer.protocol !== "https:") return false;
    if (referer.username || referer.password) return false;
    return allowed.has(referer.origin);
  } catch {
    return false;
  }
}

function getCookieValue(cookieHeader: string | null, cookieName: string): string | null {
  if (!cookieHeader || !cookieName || /[;=\s]/.test(cookieName)) return null;
  const matches = cookieHeader.split(";").map((part) => part.trim()).filter((part) => part.startsWith(`${cookieName}=`));
  if (matches.length !== 1) return null;
  const value = matches[0]!.slice(cookieName.length + 1);
  return value || null;
}

/** Returns null for safe methods or valid requests, otherwise a generic no-store 403 response. */
export function guardCsrfRequest(request: Request, options: CsrfRequestGuardOptions): Response | null {
  if (isSafeMethod(request.method)) return null;
  const failure = (): Response => Response.json(
    { detail: "Request could not be validated." },
    { status: 403, headers: { "Cache-Control": "no-store" } },
  );

  if (!options.sessionBinding || !hasAllowedCsrfOrigin(
    request.headers.get("origin"),
    request.headers.get("referer"),
    options.allowedOrigins,
  )) return failure();

  const cookieToken = getCookieValue(request.headers.get("cookie"), options.csrfCookieName);
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  if (!cookieToken || !headerToken || !constantTimeTextEqual(cookieToken, headerToken)) return failure();
  if (!verifySignedCsrfToken(cookieToken, options)) return failure();
  return null;
}
