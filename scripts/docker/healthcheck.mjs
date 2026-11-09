// Docker HEALTHCHECK probe: succeeds only if the Next.js process answers its own /api/health.
// Uses Node's built-in fetch because the slim runtime image ships neither curl nor wget.
const port = process.env.PORT ?? "3000";

try {
  const response = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(4_000) });
  const body = await response.json().catch(() => null);
  process.exit(response.ok && body?.status === "ok" ? 0 : 1);
} catch {
  process.exit(1);
}
