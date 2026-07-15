"use client";

export type MarketplaceDemoUser = {
  id: string;
  role: string;
  email: string;
};

export type MarketplaceDemoSession = {
  accessToken: string;
  expiresAt: number;
  user: MarketplaceDemoUser;
};

type MarketplaceDemoTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: MarketplaceDemoUser;
};

const DEMO_LOGIN_ENDPOINT = "/api/demo-auth/login";
const MARKETPLACE_CHAT_TOKEN_KEY = "marketplace_chat_token";
const MARKETPLACE_CHAT_TOKEN_EXPIRES_AT_KEY = "marketplace_chat_token_expires_at";
const MARKETPLACE_CHAT_USER_KEY = "marketplace_chat_user";
const MARKETPLACE_SHARED_DEMO_USER = {
  email: "provider@test.com",
  role: "provider",
  user_id: "550e8400-e29b-41d4-a716-446655440020",
} as const;
const TOKEN_REFRESH_BUFFER_MS = 10 * 60 * 1000;

let tokenIssuePromise: Promise<MarketplaceDemoSession> | null = null;

function isBrowser() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStoredString(key: string) {
  if (!isBrowser()) {
    return null;
  }

  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStoredString(key: string, value: string) {
  if (!isBrowser()) {
    return;
  }

  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // ignore storage failures
  }
}

function removeStoredString(key: string) {
  if (!isBrowser()) {
    return;
  }

  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // ignore storage failures
  }
}

function readStoredUser(): MarketplaceDemoUser | null {
  const rawUser = readStoredString(MARKETPLACE_CHAT_USER_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawUser) as unknown;

    if (!isRecord(parsed)) {
      return null;
    }

    const id = typeof parsed.id === "string" ? parsed.id : null;
    const role = typeof parsed.role === "string" ? parsed.role : null;
    const email = typeof parsed.email === "string" ? parsed.email : null;

    if (!id || !role || !email) {
      return null;
    }

    return {
      id,
      role,
      email,
    };
  } catch {
    return null;
  }
}

function readStoredExpiresAt() {
  const rawExpiresAt = readStoredString(MARKETPLACE_CHAT_TOKEN_EXPIRES_AT_KEY);

  if (!rawExpiresAt) {
    return null;
  }

  const expiresAt = Number(rawExpiresAt);

  return Number.isFinite(expiresAt) ? expiresAt : null;
}

function readStoredToken() {
  const token = readStoredString(MARKETPLACE_CHAT_TOKEN_KEY);

  return token && token.trim().length > 0 ? token : null;
}

function persistMarketplaceDemoSession(session: MarketplaceDemoSession) {
  writeStoredString(MARKETPLACE_CHAT_TOKEN_KEY, session.accessToken);
  writeStoredString(MARKETPLACE_CHAT_TOKEN_EXPIRES_AT_KEY, String(session.expiresAt));
  writeStoredString(MARKETPLACE_CHAT_USER_KEY, JSON.stringify(session.user));
}

function buildMarketplaceDemoSession(response: MarketplaceDemoTokenResponse): MarketplaceDemoSession {
  const expiresAt = Date.now() + Number(response.expires_in) * 1000;

  return {
    accessToken: response.access_token,
    expiresAt,
    user: response.user,
  };
}

function readMarketplaceDemoSessionInternal(): MarketplaceDemoSession | null {
  const accessToken = readStoredToken();
  const expiresAt = readStoredExpiresAt();
  const user = readStoredUser();

  if (!accessToken || !expiresAt || !user) {
    return null;
  }

  return {
    accessToken,
    expiresAt,
    user,
  };
}

function isSessionExpired(expiresAt: number) {
  return !Number.isFinite(expiresAt) || Date.now() >= expiresAt;
}

function getSecondsUntilExpiry(expiresAt: number) {
  return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
}

function logDemoAuth(event: string, payload: Record<string, unknown> = {}) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.log(`[Marketplace demo auth] ${event}`, payload);
}

function createAuthError(message: string) {
  const error = new Error(message) as Error & {
    code?: string;
  };

  error.name = "MarketplaceDemoAuthError";
  error.code = "MARKETPLACE_DEMO_AUTH_ERROR";

  return error;
}

async function issueMarketplaceDemoToken(kind: "login" | "refresh"): Promise<MarketplaceDemoSession> {
  if (tokenIssuePromise) {
    return tokenIssuePromise;
  }

  tokenIssuePromise = (async () => {
    logDemoAuth(`${kind} started`, {
      tokenPresent: Boolean(readStoredToken()),
    });

    try {
      const response = await fetch(DEMO_LOGIN_ENDPOINT, {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(MARKETPLACE_SHARED_DEMO_USER),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        logDemoAuth(`${kind} failed`, {
          status: response.status,
        });
        throw createAuthError(errorText || "Marketplace demo login failed.");
      }

      const parsed = (await response.json()) as MarketplaceDemoTokenResponse;
      const session = buildMarketplaceDemoSession(parsed);
      persistMarketplaceDemoSession(session);

      logDemoAuth(`${kind} succeeded`, {
        tokenPresent: Boolean(session.accessToken),
        secondsUntilExpiry: getSecondsUntilExpiry(session.expiresAt),
      });

      return session;
    } catch (error) {
      if (!(error instanceof Error && error.name === "MarketplaceDemoAuthError")) {
        logDemoAuth(`${kind} failed`, {
          tokenPresent: Boolean(readStoredToken()),
        });
      }

      throw error;
    }
  })();

  try {
    return await tokenIssuePromise;
  } finally {
    tokenIssuePromise = null;
  }
}

export function getMarketplaceDemoSession(): MarketplaceDemoSession | null {
  const session = readMarketplaceDemoSessionInternal();

  if (!session) {
    return null;
  }

  if (isSessionExpired(session.expiresAt)) {
    return null;
  }

  return session;
}

export function isMarketplaceTokenNearExpiry(expiresAt: number | string | null | undefined) {
  const normalizedExpiresAt =
    typeof expiresAt === "string" ? Number(expiresAt) : typeof expiresAt === "number" ? expiresAt : NaN;

  if (!Number.isFinite(normalizedExpiresAt)) {
    return false;
  }

  return normalizedExpiresAt - Date.now() <= TOKEN_REFRESH_BUFFER_MS;
}

export async function loginMarketplaceDemoUser() {
  return issueMarketplaceDemoToken("login");
}

export async function refreshMarketplaceDemoToken() {
  return issueMarketplaceDemoToken("refresh");
}

export async function getMarketplaceChatToken() {
  const session = readMarketplaceDemoSessionInternal();

  if (!session) {
    throw createAuthError("Marketplace demo session is missing or expired.");
  }

  if (isSessionExpired(session.expiresAt)) {
    clearMarketplaceDemoSession();
    throw createAuthError("Marketplace demo session is missing or expired.");
  }

  if (isMarketplaceTokenNearExpiry(session.expiresAt)) {
    const refreshed = await refreshMarketplaceDemoToken();
    return refreshed.accessToken;
  }

  return session.accessToken;
}

export function clearMarketplaceDemoSession() {
  removeStoredString(MARKETPLACE_CHAT_TOKEN_KEY);
  removeStoredString(MARKETPLACE_CHAT_TOKEN_EXPIRES_AT_KEY);
  removeStoredString(MARKETPLACE_CHAT_USER_KEY);
}

export function redirectToMarketplaceLogin() {
  if (!isBrowser()) {
    return;
  }

  if (window.location.pathname === "/auth/login") {
    return;
  }

  window.location.replace("/auth/login");
}

export function getMarketplaceAuthErrorMessage(error: unknown) {
  if (error instanceof Error) {
    const authError = error as Error & { code?: string };

    if (authError.code === "MARKETPLACE_DEMO_AUTH_ERROR") {
      return authError.message;
    }
  }

  return null;
}
