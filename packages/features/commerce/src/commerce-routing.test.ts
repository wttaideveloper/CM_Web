import assert from "node:assert/strict";
import test from "node:test";

type Rewrite = { source: string; destination: string };

const commerceResources = [
  "payments",
  "currencies",
  "tax",
  "refunds",
  "invoices",
  "settlements",
  "payment-reports",
  "finance",
] as const;

const enterpriseRewrittenResources = commerceResources.filter((resource) => resource !== "payments");

async function getRewrites(configPath: string): Promise<Rewrite[]> {
  const configModule = await import(new URL(configPath, import.meta.url).href) as {
    default: { rewrites: () => Promise<{ fallback: Rewrite[] }> };
  };
  return (await configModule.default.rewrites()).fallback;
}

function assertCommerceRoutes(rewrites: readonly Rewrite[], backendBase: string, resources: readonly string[] = commerceResources): void {
  for (const resource of resources) {
    assert.deepEqual(
      rewrites.find((rewrite) => rewrite.source === `/api/v1/${resource}`),
      { source: `/api/v1/${resource}`, destination: `${backendBase}/${resource}` },
    );
    assert.deepEqual(
      rewrites.find((rewrite) => rewrite.source === `/api/v1/${resource}/:path*`),
      { source: `/api/v1/${resource}/:path*`, destination: `${backendBase}/${resource}/:path*` },
    );
  }
}

test("Platform Admin forwards all Commerce resource roots and nested paths", async () => {
  const rewrites = await getRewrites("../../../../apps/platform-admin/next.config.ts");
  assertCommerceRoutes(rewrites, "https://chat.wisdomtooth.tech/api/v1");
});

test("Enterprise Admin keeps non-Payments rewrites and uses its BFF instead of rewriting Payments", async () => {
  const previousChatBaseUrl = process.env.CHAT_API_BASE_URL;
  process.env.CHAT_API_BASE_URL = "https://chat.example.test/api/v1";

  try {
    const rewrites = await getRewrites("../../../../apps/enterprise-admin/next.config.ts");
    assertCommerceRoutes(rewrites, "https://chat.example.test/api/v1", enterpriseRewrittenResources);
    assert.equal(rewrites.some((rewrite) => rewrite.source === "/api/v1/payments" || rewrite.source === "/api/v1/payments/:path*"), false);
  } finally {
    if (previousChatBaseUrl === undefined) delete process.env.CHAT_API_BASE_URL;
    else process.env.CHAT_API_BASE_URL = previousChatBaseUrl;
  }
});
