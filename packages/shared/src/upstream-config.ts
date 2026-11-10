/**
 * Validation helpers for server-side upstream (backend) configuration.
 *
 * Handbook §14 requires configuration to come from the environment, and the
 * coding standards forbid stale hard-coded API-host fallbacks. These helpers
 * therefore never invent a default endpoint: a missing or malformed value is
 * reported by variable *name* only, so no URL, token or other value can leak
 * into build or runtime logs.
 */

/** Read-only view of an environment, e.g. `process.env`. */
export type EnvSource = Readonly<Record<string, string | undefined>>;

/** Describes one upstream URL variable an application consumes. */
export interface UpstreamUrlSpec {
  /** Whether the application cannot work safely without this variable. */
  readonly required: boolean;
  /** Short human description used in error messages (never a URL). */
  readonly purpose: string;
}

/** Raised when mandatory upstream configuration is missing or malformed. */
export class UpstreamConfigError extends Error {
  readonly missing: readonly string[];
  readonly invalid: readonly string[];

  constructor(missing: readonly string[], invalid: readonly string[], details: readonly string[]) {
    super(
      [
        "Upstream configuration is incomplete. No default endpoint is assumed; set the variables below explicitly (see .env.example).",
        ...details.map((detail) => `  - ${detail}`),
      ].join("\n"),
    );
    this.name = "UpstreamConfigError";
    this.missing = missing;
    this.invalid = invalid;
  }
}

const SINGLE_LABEL_HOSTNAME = /^[a-z0-9]([a-z0-9_-]*[a-z0-9])?$/i;

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".");
  if (parts.length !== 4 || !parts.every((part) => /^\d{1,3}$/.test(part))) return false;
  const [first, second] = parts.map(Number) as [number, number];
  return (
    first === 10 ||
    first === 127 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

/**
 * Returns true for hosts that are only reachable on a private network:
 * `localhost`, loopback/RFC 1918 IPv4 literals, and single-label names such as
 * a Docker Compose service name. Public hostnames are never "internal".
 */
export function isInternalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host === "::1") return true;
  if (isPrivateIpv4(host)) return true;
  return !host.includes(".") && !host.includes(":") && SINGLE_LABEL_HOSTNAME.test(host);
}

/**
 * Normalizes an upstream base URL to `origin + path` without a trailing slash.
 *
 * Rejects non-HTTP(S) schemes, embedded credentials, query strings and
 * fragments. Cleartext `http:` is accepted only for internal hostnames so a
 * bearer token is never sent unencrypted across a public network.
 *
 * @returns the normalized URL, or `null` when the value is unusable.
 */
export function normalizeUpstreamBaseUrl(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password || url.search || url.hash) return null;
  if (url.protocol === "http:" && !isInternalHostname(url.hostname)) return null;

  return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
}

/** Appends `/api/v1` unless the base already ends with it. */
export function toApiV1Base(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  return /\/api\/v1$/.test(trimmed) ? trimmed : `${trimmed}/api/v1`;
}

/**
 * Resolves and validates a set of upstream URL variables in one pass so an
 * operator sees every problem at once instead of fixing them one by one.
 *
 * @throws {UpstreamConfigError} when a required variable is missing, or any
 * supplied variable is malformed. Messages contain variable names only.
 */
export function resolveUpstreamUrls<const Spec extends Readonly<Record<string, UpstreamUrlSpec>>>(
  env: EnvSource,
  spec: Spec,
): ResolvedUpstreams<Spec> {
  const resolved: Record<string, string | null> = {};
  const missing: string[] = [];
  const invalid: string[] = [];
  const details: string[] = [];

  for (const name of Object.keys(spec)) {
    const { required, purpose } = spec[name] as UpstreamUrlSpec;
    const raw = env[name]?.trim();

    if (!raw) {
      resolved[name] = null;
      if (required) {
        missing.push(name);
        details.push(`${name} is required: ${purpose}.`);
      }
      continue;
    }

    const normalized = normalizeUpstreamBaseUrl(raw);
    if (!normalized) {
      resolved[name] = null;
      invalid.push(name);
      details.push(
        `${name} is not a valid upstream URL: ${purpose}. Use an absolute https:// URL, or http:// only for a private/internal host, without credentials, query or fragment.`,
      );
      continue;
    }

    resolved[name] = normalized;
  }

  if (missing.length > 0 || invalid.length > 0) {
    throw new UpstreamConfigError(missing, invalid, details);
  }

  return resolved as ResolvedUpstreams<Spec>;
}

/** Maps each variable to `string` when it is required (guaranteed present) and `string | null` otherwise. */
export type ResolvedUpstreams<Spec extends Readonly<Record<string, UpstreamUrlSpec>>> = {
  [Name in keyof Spec]: Spec[Name]["required"] extends true ? string : string | null;
};

/**
 * Returns the first candidate variable that holds a valid upstream URL.
 * An unset or invalid candidate is skipped; if none qualifies the result is
 * `null` so the caller can answer 503 instead of guessing an endpoint.
 */
export function firstConfiguredUpstream(env: EnvSource, names: readonly string[]): string | null {
  for (const name of names) {
    const normalized = normalizeUpstreamBaseUrl(env[name]);
    if (normalized) return normalized;
  }
  return null;
}

/** Returns the origin (`scheme://host[:port]`) of a URL string, or `null` if it is not parseable. */
export function originOf(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/** Removes a trailing `/api/v1` so the result can be joined with absolute `/api/v1/...` paths. */
export function stripApiV1(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "").replace(/\/api\/v1$/, "");
}

/** Lists the names (never values) of required variables that are unset or blank. */
export function findMissingEnv(env: EnvSource, names: readonly string[]): string[] {
  return names.filter((name) => !env[name]?.trim());
}

/**
 * Parses a comma-separated list of exact origins (e.g. `https://api.example.com,http://svc:8000`).
 * Entries that are not a bare origin are dropped, so a typo fails closed.
 */
export function parseOriginAllowlist(raw: string | undefined): ReadonlySet<string> {
  const origins = new Set<string>();
  for (const entry of (raw ?? "").split(",")) {
    const candidate = entry.trim();
    if (!candidate) continue;
    try {
      const url = new URL(candidate);
      const isBareOrigin = url.origin === candidate.replace(/\/+$/, "");
      if ((url.protocol === "https:" || url.protocol === "http:") && isBareOrigin && !url.username && !url.password) {
        origins.add(url.origin);
      }
    } catch {
      // A malformed entry is ignored on purpose: the allowlist must fail closed.
    }
  }
  return origins;
}

/**
 * Returns true only when the URL's origin is explicitly allowlisted and, for
 * cleartext `http:`, the host is also internal. This guards where a server-held
 * bearer token may be sent, so it must never be derived from request input.
 */
export function isTrustedUpstreamUrl(url: URL, allowlist: ReadonlySet<string>): boolean {
  if (url.username || url.password) return false;
  if (!allowlist.has(url.origin)) return false;
  return url.protocol === "https:" || (url.protocol === "http:" && isInternalHostname(url.hostname));
}
