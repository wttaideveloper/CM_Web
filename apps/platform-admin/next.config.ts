import path from "node:path";
import type { NextConfig } from "next";

import { STATIC_SECURITY_HEADERS } from "../../packages/shared/src/security-headers.ts";
import { resolveUpstreamUrls, toApiV1Base } from "../../packages/shared/src/upstream-config.ts";

const assetPrefix = process.env.NEXT_PUBLIC_ASSET_PREFIX?.replace(/\/$/, "") || undefined;

// `__dirname` exists when the config is loaded as CommonJS; fall back to the working
// directory (the app folder when run through its npm workspace script) for ESM loaders.
const appDirectory = typeof __dirname === "string" ? __dirname : process.cwd();

const commerceProxyResources = [
  "payments",
  "currencies",
  "tax",
  "refunds",
  "invoices",
  "settlements",
  "payment-reports",
  "finance",
] as const;

function buildCommerceProxyRoutes(apiBaseUrl: string) {
  return commerceProxyResources.flatMap((resource) => [
    {
      source: `/api/v1/${resource}`,
      destination: `${apiBaseUrl}/${resource}`,
    },
    {
      source: `/api/v1/${resource}/:path*`,
      destination: `${apiBaseUrl}/${resource}/:path*`,
    },
  ]);
}

const nextConfig: NextConfig = {
  // Self-contained server output for the Docker image; the tracing root is the
  // monorepo root so workspace packages under /packages are traced too.
  output: "standalone",
  outputFileTracingRoot: path.join(appDirectory, "../.."),
  poweredByHeader: false,
  assetPrefix,
  experimental: {
    proxyClientMaxBodySize: "310mb",
  },
  transpilePackages: ["@ihp/attributes", "@ihp/auth", "@ihp/commerce", "@ihp/enterprise-trainings", "@ihp/enterprises", "@ihp/onboarding-forms", "@ihp/platform-attributes", "@ihp/platform-configuration", "@ihp/platform-dashboard", "@ihp/platform-enterprises", "@ihp/platform-form-configurations", "@ihp/platform-layout", "@ihp/platform-marketplace-static", "@ihp/platform-users", "@ihp/products", "@ihp/services", "@ihp/shared", "@ihp/ui", "@ihp/workflow-admin", "@ihp/workflow-runtime"],
  async headers() {
    return [{ source: "/:path*", headers: [...STATIC_SECURITY_HEADERS] }];
  },
  async rewrites() {
    // Rewrites are evaluated at build time, so these variables must be present when
    // `next build` runs. There is deliberately no default endpoint (handbook §14).
    // Super-Admin and Workflow upstreams are read at request time by the BFF routes and
    // are validated separately; they are intentionally not part of this table.
    const upstreams = resolveUpstreamUrls(process.env, {
      AUTH_API_BASE_URL: { required: true, purpose: "Identity API serving /api/v1/auth and /api/v1/tenant" },
      CHAT_API_BASE_URL: { required: true, purpose: "Marketplace API serving reviews, enterprises, products, services, events and trainings" },
    });

    const authApiBaseUrl = upstreams.AUTH_API_BASE_URL;
    // The scheme is used exactly as configured: an internal http:// upstream must
    // stay http://, so no http->https conversion is applied here.
    const platformApiBaseUrl = toApiV1Base(upstreams.CHAT_API_BASE_URL);

    const fallback = [
      {
        source: "/api/v1/reviews/:path*",
        destination: `${platformApiBaseUrl}/reviews/:path*`,
      },
      {
        source: "/api/v1/trainings/form-configuration/:path*",
        destination: `${platformApiBaseUrl}/trainings/form-configuration/:path*`,
      },
      {
        source: "/api/v1/admin/training-form-configurations/:path*",
        destination: `${platformApiBaseUrl}/admin/training-form-configurations/:path*`,
      },
      {
        source: "/api/v1/programs/form-configuration/:path*",
        destination: `${platformApiBaseUrl}/programs/form-configuration/:path*`,
      },
      {
        source: "/api/v1/admin/program-form-configurations/:path*",
        destination: `${platformApiBaseUrl}/admin/program-form-configurations/:path*`,
      },
      {
        source: "/api/v1/courses/form-configuration/:path*",
        destination: `${platformApiBaseUrl}/courses/form-configuration/:path*`,
      },
      {
        source: "/api/v1/admin/course-form-configurations/:path*",
        destination: `${platformApiBaseUrl}/admin/course-form-configurations/:path*`,
      },
      {
        source: "/api/v1/onboarding-forms",
        destination: `${platformApiBaseUrl}/onboarding-forms/`,
      },
      {
        source: "/api/v1/onboarding-forms/:path*",
        destination: `${platformApiBaseUrl}/onboarding-forms/:path*`,
      },
      {
        source: "/api/v1/attributes/:path*",
        destination: `${platformApiBaseUrl}/attributes/:path*`,
      },
      {
        source: "/api/v1/enterprises",
        destination: `${platformApiBaseUrl}/enterprises/`,
      },
      {
        source: "/api/v1/enterprises/:path*",
        destination: `${platformApiBaseUrl}/enterprises/:path*`,
      },
      {
        source: "/api/v1/locations/:path*",
        destination: `${platformApiBaseUrl}/locations/:path*`,
      },
      {
        source: "/api/v1/products",
        destination: `${platformApiBaseUrl}/products/`,
      },
      {
        source: "/api/v1/products/:path*",
        destination: `${platformApiBaseUrl}/products/:path*`,
      },
      {
        source: "/api/v1/services",
        destination: `${platformApiBaseUrl}/services/`,
      },
      {
        source: "/api/v1/services/:path*",
        destination: `${platformApiBaseUrl}/services/:path*`,
      },
      {
        source: "/api/v1/events",
        destination: `${platformApiBaseUrl}/events/`,
      },
      {
        source: "/api/v1/events/:path*",
        destination: `${platformApiBaseUrl}/events/:path*`,
      },
      {
        source: "/api/v1/event-types/",
        destination: `${platformApiBaseUrl}/event-types/`,
      },
      {
        source: "/api/v1/event-types/:path*",
        destination: `${platformApiBaseUrl}/event-types/:path*`,
      },
      {
        source: "/api/v1/admin/event-form-configurations",
        destination: `${platformApiBaseUrl}/admin/event-form-configurations/`,
      },
      {
        source: "/api/v1/admin/event-form-configurations/:path*",
        destination: `${platformApiBaseUrl}/admin/event-form-configurations/:path*`,
      },
      {
        source: "/api/v1/admin/events/:path*",
        destination: `${platformApiBaseUrl}/admin/events/:path*`,
      },
      {
        source: "/api/v1/admin/event-audits/:path*",
        destination: `${platformApiBaseUrl}/admin/event-audits/:path*`,
      },
      {
        source: "/api/v1/trainings",
        destination: `${platformApiBaseUrl}/trainings/`,
      },
      {
        source: "/api/v1/trainings/:path*",
        destination: `${platformApiBaseUrl}/trainings/:path*`,
      },
      {
        source: "/api/v1/search/trainings",
        destination: `${platformApiBaseUrl}/search/trainings`,
      },
      {
        source: "/api/v1/admin/trainings/:path*",
        destination: `${platformApiBaseUrl}/admin/trainings/:path*`,
      },
      {
        source: "/api/v1/programs",
        destination: `${platformApiBaseUrl}/programs/`,
      },
      {
        source: "/api/v1/programs/:path*",
        destination: `${platformApiBaseUrl}/programs/:path*`,
      },
      {
        source: "/api/v1/search/programs",
        destination: `${platformApiBaseUrl}/search/programs`,
      },
      {
        source: "/api/v1/admin/programs/:path*",
        destination: `${platformApiBaseUrl}/admin/programs/:path*`,
      },
      {
        source: "/api/v1/courses",
        destination: `${platformApiBaseUrl}/courses/`,
      },
      {
        source: "/api/v1/courses/:path*",
        destination: `${platformApiBaseUrl}/courses/:path*`,
      },
      {
        source: "/api/v1/search/courses",
        destination: `${platformApiBaseUrl}/search/courses`,
      },
      {
        source: "/api/v1/admin/courses/:path*",
        destination: `${platformApiBaseUrl}/admin/courses/:path*`,
      },
      {
        source: "/api/v1/auth/:path*",
        destination: `${authApiBaseUrl}/api/v1/auth/:path*`,
      },
      {
        source: "/api/v1/tenant/:path*",
        destination: `${authApiBaseUrl}/api/v1/tenant/:path*`,
      },
    ];

    fallback.push(...buildCommerceProxyRoutes(platformApiBaseUrl));

    return { fallback };
  },
};

export default nextConfig;
