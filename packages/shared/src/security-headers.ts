/**
 * Web security headers required by handbook §7 (Client-Side Security) for the
 * three Next.js portals. Pure functions only, so they are unit-testable and can
 * be shared by every app's `proxy.ts` and `next.config.ts`.
 */

/** A single HTTP response header. */
export interface SecurityHeader {
  readonly key: string;
  readonly value: string;
}

/**
 * Headers that are identical for every response and need no per-request state.
 * Sent through `next.config.ts` `headers()`. The Content-Security-Policy is
 * excluded because it carries a per-request nonce (see `buildContentSecurityPolicy`).
 *
 * HSTS only takes effect over HTTPS; browsers ignore it on plain HTTP. TLS
 * termination is expected at the reverse proxy, which should also send it.
 */
export const STATIC_SECURITY_HEADERS: readonly SecurityHeader[] = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Legacy clickjacking defence for browsers that ignore CSP frame-ancestors.
  { key: "X-Frame-Options", value: "DENY" },
  // Camera/microphone are used by attendance check-in and voice messages only.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(), payment=(), usb=()" },
];

/** Options for {@link buildContentSecurityPolicy}. */
export interface ContentSecurityPolicyOptions {
  /** Per-request, unpredictable nonce. Never reuse across requests. */
  readonly nonce: string;
  /** Development needs `unsafe-eval`/websockets for React debugging and HMR. */
  readonly isDevelopment: boolean;
  /**
   * Extra origins the browser may call with fetch/XHR/WebSocket (for example the
   * Socket.IO origin). `http(s)` origins also allow their `ws(s)` counterpart. Unset
   * values (for example an unconfigured environment variable) are ignored.
   */
  readonly connectOrigins?: readonly (string | undefined)[];
}

/** Generates a base64 nonce from 16 random bytes using Web Crypto. */
export function createCspNonce(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/**
 * Converts configured origins into CSP `connect-src` sources.
 * Invalid entries are dropped so a typo can only tighten the policy.
 */
export function toConnectSources(origins: readonly (string | undefined)[]): string[] {
  const sources = new Set<string>();
  for (const candidate of origins) {
    const value = candidate?.trim();
    if (!value) continue;
    try {
      const url = new URL(value);
      if (url.protocol === "https:") {
        sources.add(url.origin);
        sources.add(`wss://${url.host}`);
      } else if (url.protocol === "http:") {
        sources.add(url.origin);
        sources.add(`ws://${url.host}`);
      }
    } catch {
      // Ignore malformed entries.
    }
  }
  return [...sources];
}

/**
 * Builds the Content-Security-Policy header value.
 *
 * Script execution is limited to same-origin files and nonce-bearing scripts
 * (`strict-dynamic` lets those load their own chunks); `unsafe-eval` is only
 * added in development. `style-src` keeps `'unsafe-inline'` because shipped
 * libraries (for example the DOCX previewer) inject `<style>` elements at
 * runtime — a documented deviation tracked in the deployment ADR exception.
 */
export function buildContentSecurityPolicy(options: ContentSecurityPolicyOptions): string {
  const { nonce, isDevelopment, connectOrigins = [] } = options;
  const connectSources = toConnectSources(connectOrigins);

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(isDevelopment ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "media-src": ["'self'", "blob:", "https:"],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", ...connectSources, ...(isDevelopment ? ["ws:", "http://localhost:*"] : [])],
    "frame-src": ["'self'", "blob:", "https://www.youtube-nocookie.com"],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };

  return Object.entries(directives)
    .map(([name, sources]) => `${name} ${sources.join(" ")}`)
    .join("; ");
}

/** Header name used to enforce or, as a rollout kill-switch, only report the policy. */
export function cspHeaderName(reportOnly: boolean): "Content-Security-Policy" | "Content-Security-Policy-Report-Only" {
  return reportOnly ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy";
}
