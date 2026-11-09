/**
 * Liveness probe used by the Docker HEALTHCHECK.
 *
 * It proves only that the Next.js process accepts and answers HTTP requests. It
 * deliberately performs no database, backend or third-party call, so a downstream
 * outage can never make an otherwise healthy container look dead and restart-loop.
 */
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;

export function GET(): Response {
  return Response.json({ status: "ok", service: "enterprise-admin" }, { headers: NO_STORE_HEADERS });
}

export function HEAD(): Response {
  return new Response(null, { status: 200, headers: NO_STORE_HEADERS });
}
