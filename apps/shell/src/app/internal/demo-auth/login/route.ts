import { NextResponse } from "next/server";

import { firstConfiguredUpstream, toApiV1Base } from "@ihp/shared/upstream-config";

/**
 * LEGACY, DISABLED BY DEFAULT: bridge to the Marketplace `dev-token` endpoint.
 *
 * The Marketplace API documents `dev-token` as local-testing only (it is itself gated by
 * `ENABLE_DEV_TOKEN`), and this route issues a token for a shared demo identity to any caller.
 * Shell chat/realtime still consumes that token (see marketplace-demo-auth.service.ts), so the
 * route cannot simply be deleted: its replacement is an Identity-team decision that is tracked
 * in docs/deployment/BLOCKERS.md. Until that decision is made the route is OFF unless
 * `MARKETPLACE_DEMO_AUTH_ENABLED=true` is set explicitly, and it never falls back to a built-in host.
 */
const MARKETPLACE_SHARED_DEMO_USER = {
  email: "provider@test.com",
  role: "provider",
  user_id: "550e8400-e29b-41d4-a716-446655440020",
};

const DEMO_AUTH_UPSTREAM_TIMEOUT_MS = 10_000;
const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function POST() {
  if (process.env.MARKETPLACE_DEMO_AUTH_ENABLED !== "true") {
    // Indistinguishable from a missing route so it is not advertised on a default deployment.
    return NextResponse.json({ detail: "Not found" }, { status: 404, headers: NO_STORE });
  }

  const configuredBase = firstConfiguredUpstream(process.env, ["MARKETPLACE_API_BASE_URL"]);
  if (!configuredBase) {
    return NextResponse.json({ detail: "Marketplace demo authentication is not configured." }, { status: 503, headers: NO_STORE });
  }

  let response: Response;
  try {
    response = await fetch(`${toApiV1Base(configuredBase)}/auth/dev-token`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(MARKETPLACE_SHARED_DEMO_USER),
      signal: AbortSignal.timeout(DEMO_AUTH_UPSTREAM_TIMEOUT_MS),
    });
  } catch {
    return NextResponse.json({ detail: "Marketplace demo authentication is unavailable." }, { status: 502, headers: NO_STORE });
  }

  const body = await response.text().catch(() => "");

  return new NextResponse(body || null, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
    },
  });
}
