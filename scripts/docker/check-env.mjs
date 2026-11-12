// Validates deployment configuration for one frontend container and reports problems by
// variable NAME only — values are never printed, so logs cannot leak endpoints or secrets.
//
//   node check-env.mjs runtime <app>   fail (exit 1) when mandatory server variables are missing
//   node check-env.mjs build   <app>   warn about unset browser-visible (NEXT_PUBLIC_*) variables
//
// It reuses the same validators as next.config.ts so build-time and start-up rules cannot drift.
import { findMissingEnv, normalizeUpstreamBaseUrl, originOf, parseOriginAllowlist } from "../../packages/shared/src/upstream-config.ts";

const [phase, app] = process.argv.slice(2);

/** Server-side variables per app. `url` entries must also be valid upstream URLs when set. */
const RUNTIME = {
  shell: {
    required: ["AUTH_API_BASE_URL", "CHAT_API_BASE_URL", "CHAT_PROXY_TARGET", "SUPER_ADMIN_AUTH_API_BASE_URL"],
    optional: [
      ["EVENTS_API_BASE_URL", "CHAT_API_BASE_URL is used for Events"],
      ["MARKETPLACE_DEMO_AUTH_ENABLED", "legacy chat demo-token bridge stays disabled (default)"],
    ],
    urls: ["AUTH_API_BASE_URL", "CHAT_API_BASE_URL", "CHAT_PROXY_TARGET", "SUPER_ADMIN_AUTH_API_BASE_URL", "EVENTS_API_BASE_URL", "MARKETPLACE_API_BASE_URL"],
  },
  "enterprise-admin": {
    required: ["AUTH_API_BASE_URL", "CHAT_API_BASE_URL", "CHAT_PROXY_TARGET"],
    optional: [
      ["EVENTS_API_BASE_URL", "Event API routes are not proxied"],
      ["WORKFLOW_API_BASE_URL", "Workflow forms/workflows/media are unavailable"],
      ["CHAT_TOKEN_UPSTREAM_URL", "chat-token requests use CHAT_PROXY_TARGET"],
    ],
    urls: ["AUTH_API_BASE_URL", "CHAT_API_BASE_URL", "CHAT_PROXY_TARGET", "EVENTS_API_BASE_URL", "WORKFLOW_API_BASE_URL", "CHAT_TOKEN_UPSTREAM_URL"],
  },
  "platform-admin": {
    required: ["AUTH_API_BASE_URL", "CHAT_API_BASE_URL", "SUPER_ADMIN_AUTH_API_BASE_URL", "PLATFORM_TRUSTED_UPSTREAM_ORIGINS"],
    optional: [["WORKFLOW_API_BASE_URL", "Workflow proxy routes answer 503 (its origin must also be listed in PLATFORM_TRUSTED_UPSTREAM_ORIGINS)"]],
    urls: ["AUTH_API_BASE_URL", "CHAT_API_BASE_URL", "SUPER_ADMIN_AUTH_API_BASE_URL", "WORKFLOW_API_BASE_URL"],
  },
};

/** Browser-visible values are inlined at build time, so they can only be reviewed while building. */
const BUILD_PUBLIC = {
  shell: [
    ["NEXT_PUBLIC_CHAT_SOCKET_URL", "realtime chat is disabled"],
    ["NEXT_PUBLIC_PROTECTED_MEDIA_ORIGIN", "protected event media is not routed through the proxy"],
    ["NEXT_PUBLIC_SHELL_ORIGIN", "cross-app login redirects fail"],
    ["NEXT_PUBLIC_ENTERPRISE_ADMIN_ORIGIN", "cross-app login redirects fail"],
    ["NEXT_PUBLIC_PLATFORM_ADMIN_ORIGIN", "cross-app login redirects fail"],
  ],
  "enterprise-admin": [
    ["NEXT_PUBLIC_CHAT_SOCKET_URL", "realtime chat is disabled"],
    ["NEXT_PUBLIC_PROTECTED_MEDIA_ORIGIN", "protected event media is not routed through the proxy"],
    ["NEXT_PUBLIC_SHELL_ORIGIN", "cross-app login redirects fail"],
    ["NEXT_PUBLIC_ENTERPRISE_ADMIN_ORIGIN", "cross-app login redirects fail"],
  ],
  "platform-admin": [
    ["NEXT_PUBLIC_PROTECTED_MEDIA_ORIGIN", "protected event media is not routed through the proxy"],
    ["NEXT_PUBLIC_SHELL_ORIGIN", "cross-app login redirects fail"],
    ["NEXT_PUBLIC_PLATFORM_ADMIN_ORIGIN", "cross-app login redirects fail"],
  ],
};

function fail(lines) {
  console.error(["[check-env] Refusing to start: configuration is incomplete.", ...lines.map((line) => `  - ${line}`), "  See deploy/docker/frontend.env.example for the full variable list."].join("\n"));
  process.exit(1);
}

if (!RUNTIME[app] || (phase !== "runtime" && phase !== "build")) {
  console.error("[check-env] usage: check-env.mjs <runtime|build> <shell|enterprise-admin|platform-admin>");
  process.exit(64);
}

if (phase === "build") {
  // Cross-app login redirects cannot resolve without these browser-visible origins, so
  // treat them as hard build requirements (not mere warnings) for every app that uses them.
  const requiredBuildOrigins = {
    shell: ["NEXT_PUBLIC_SHELL_ORIGIN", "NEXT_PUBLIC_ENTERPRISE_ADMIN_ORIGIN", "NEXT_PUBLIC_PLATFORM_ADMIN_ORIGIN"],
    "enterprise-admin": ["NEXT_PUBLIC_SHELL_ORIGIN", "NEXT_PUBLIC_ENTERPRISE_ADMIN_ORIGIN"],
    "platform-admin": ["NEXT_PUBLIC_SHELL_ORIGIN", "NEXT_PUBLIC_PLATFORM_ADMIN_ORIGIN"],
  }[app] ?? [];
  const missingRequiredOrigins = requiredBuildOrigins.filter((name) => findMissingEnv(process.env, [name]).length > 0);
  if (missingRequiredOrigins.length > 0) {
    console.error(`[check-env] Refusing to build: required browser-visible origin(s) not set: ${missingRequiredOrigins.join(", ")}.`);
    console.error("  Cross-app login redirects cannot resolve without them. See deploy/docker/frontend.env.example.");
    process.exit(1);
  }
  const unset = BUILD_PUBLIC[app].filter(([name]) => findMissingEnv(process.env, [name]).length > 0);
  for (const [name, effect] of unset) console.warn(`[check-env] WARNING ${name} is not set: ${effect}.`);
  process.exit(0);
}

const problems = [];
for (const name of findMissingEnv(process.env, RUNTIME[app].required)) problems.push(`${name} is required but not set`);
for (const name of RUNTIME[app].urls) {
  if (process.env[name]?.trim() && !normalizeUpstreamBaseUrl(process.env[name])) {
    problems.push(`${name} is not a valid upstream URL (https://, or http:// for a private/internal host only; no credentials, query or fragment)`);
  }
}
if (process.env.PLATFORM_TRUSTED_UPSTREAM_ORIGINS?.trim() && parseOriginAllowlist(process.env.PLATFORM_TRUSTED_UPSTREAM_ORIGINS).size === 0) {
  problems.push("PLATFORM_TRUSTED_UPSTREAM_ORIGINS contains no valid origin (expected comma-separated scheme://host[:port])");
}
if (problems.length > 0) fail(problems);

// The Super Admin bearer is only ever sent to a listed origin. A Workflow origin that is configured but not
// listed is not an error (the app still starts) but its proxy routes answer 503, so say so by name.
if (app === "platform-admin") {
  const workflowOrigin = originOf(normalizeUpstreamBaseUrl(process.env.WORKFLOW_API_BASE_URL) ?? undefined);
  if (workflowOrigin && !parseOriginAllowlist(process.env.PLATFORM_TRUSTED_UPSTREAM_ORIGINS).has(workflowOrigin)) {
    console.warn("[check-env] WARNING WORKFLOW_API_BASE_URL has an origin that is not listed in PLATFORM_TRUSTED_UPSTREAM_ORIGINS: Workflow proxy routes will answer 503 and the Super Admin token will not be sent.");
  }
}

for (const [name, effect] of RUNTIME[app].optional) {
  if (findMissingEnv(process.env, [name]).length > 0) console.warn(`[check-env] note: ${name} is not set: ${effect}.`);
}
console.log(`[check-env] ${app}: configuration OK`);
