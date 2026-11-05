import path from "node:path";
import type { NextConfig } from "next";

import { STATIC_SECURITY_HEADERS } from "../../packages/shared/src/security-headers.ts";
import { resolveUpstreamUrls, stripApiV1, toApiV1Base } from "../../packages/shared/src/upstream-config.ts";

// `__dirname` exists when the config is loaded as CommonJS; fall back to the working
// directory (the app folder when run through its npm workspace script) for ESM loaders.
const appDirectory = typeof __dirname === "string" ? __dirname : process.cwd();

const nextConfig: NextConfig = {
  // Self-contained server output for the Docker image; the tracing root is the
  // monorepo root so workspace packages under /packages are traced too.
  output: "standalone",
  outputFileTracingRoot: path.join(appDirectory, "../.."),
  poweredByHeader: false,
  skipTrailingSlashRedirect: true,
  experimental: {
    proxyClientMaxBodySize: "310mb",
  },
  transpilePackages: [
    "@ihp/auth",
    "@ihp/attributes",
    "@ihp/chat-runtime",
    "@ihp/enterprise-analytics",
    "@ihp/enterprise-dashboard",
    "@ihp/enterprise-events",
    "@ihp/enterprise-notifications",
    "@ihp/enterprise-layout",
    "@ihp/enterprise-profile",
    "@ihp/enterprise-runtime",
    "@ihp/enterprise-settings",
    "@ihp/enterprise-trainings",
    "@ihp/enterprises",
    "@ihp/messaging",
    "@ihp/products",
    "@ihp/realtime",
    "@ihp/services",
    "@ihp/shared",
    "@ihp/ui",
    "@ihp/workflow-admin",
    "@ihp/workflow-runtime",
  ],
  async headers() {
    return [{ source: "/:path*", headers: [...STATIC_SECURITY_HEADERS] }];
  },
  async rewrites() {
    // Rewrites are evaluated at build time, so these variables must be present when
    // `next build` runs. There is deliberately no default endpoint (handbook §14).
    // Identity, Marketplace, Events and Workflow stay independently configurable.
    const upstreams = resolveUpstreamUrls(process.env, {
      AUTH_API_BASE_URL: { required: true, purpose: "Identity API serving /api/v1/auth and /api/v1/tenant" },
      CHAT_API_BASE_URL: { required: true, purpose: "Marketplace API serving enterprises, locations, products, services, attributes and trainings" },
      EVENTS_API_BASE_URL: { required: false, purpose: "Events API; event rewrites are omitted when this is unset" },
      WORKFLOW_API_BASE_URL: { required: false, purpose: "Workflow API; form/workflow/media rewrites are omitted when this is unset" },
    });

    const authApiBaseUrl = upstreams.AUTH_API_BASE_URL;
    // The scheme is used exactly as configured: an internal http:// upstream must
    // stay http://, so no http->https conversion is applied here.
    const chatApiV1Base = toApiV1Base(upstreams.CHAT_API_BASE_URL);
    const fallback = [];

    fallback.push(
      {
        source: "/api/v1/auth/:path*",
        destination: `${authApiBaseUrl}/api/v1/auth/:path*`,
      },
      {
        source: "/api/v1/tenant/:path*",
        destination: `${authApiBaseUrl}/api/v1/tenant/:path*`,
      },
    );

    fallback.push(
      {
        source: "/api/v1/users/me/notifications",
        destination: `${chatApiV1Base}/users/me/notifications`,
      },
      {
        source: "/api/v1/users/me/notifications/:path*",
        destination: `${chatApiV1Base}/users/me/notifications/:path*`,
      },
      {
        source: "/api/v1/trainings/form-configuration/:path*",
        destination: `${chatApiV1Base}/trainings/form-configuration/:path*`,
      },
      {
        source: "/api/v1/admin/training-form-configurations/:path*",
        destination: `${chatApiV1Base}/admin/training-form-configurations/:path*`,
      },
      {
        source: "/api/v1/programs/form-configuration/:path*",
        destination: `${chatApiV1Base}/programs/form-configuration/:path*`,
      },
      {
        source: "/api/v1/admin/program-form-configurations/:path*",
        destination: `${chatApiV1Base}/admin/program-form-configurations/:path*`,
      },
      {
        source: "/api/v1/courses/form-configuration/:path*",
        destination: `${chatApiV1Base}/courses/form-configuration/:path*`,
      },
      {
        source: "/api/v1/admin/course-form-configurations/:path*",
        destination: `${chatApiV1Base}/admin/course-form-configurations/:path*`,
      },
      {
        source: "/api/v1/search/enterprises",
        destination: `${chatApiV1Base}/search/enterprises`,
      },
      {
        source: "/api/v1/enterprises",
        destination: `${chatApiV1Base}/enterprises/`,
      },
      {
        source: "/api/v1/enterprises/:path*",
        destination: `${chatApiV1Base}/enterprises/:path*`,
      },
      {
        source: "/api/v1/locations/:path*",
        destination: `${chatApiV1Base}/locations/:path*`,
      },
      {
        source: "/api/v1/products",
        destination: `${chatApiV1Base}/products/`,
      },
      {
        source: "/api/v1/products/:path*",
        destination: `${chatApiV1Base}/products/:path*`,
      },
      {
        source: "/api/v1/services",
        destination: `${chatApiV1Base}/services/`,
      },
      {
        source: "/api/v1/services/:path*",
        destination: `${chatApiV1Base}/services/:path*`,
      },
      {
        source: "/api/v1/attributes",
        destination: `${chatApiV1Base}/attributes`,
      },
      {
        source: "/api/v1/attributes/:path*",
        destination: `${chatApiV1Base}/attributes/:path*`,
      },
      {
        source: "/api/v1/trainings",
        destination: `${chatApiV1Base}/trainings/`,
      },
      {
        source: "/api/v1/reviews/:path*",
        destination: `${chatApiV1Base}/reviews/:path*`,
      },
      {
        source: "/api/v1/trainings/:path*",
        destination: `${chatApiV1Base}/trainings/:path*`,
      },
      {
        source: "/api/v1/training-categories",
        destination: `${chatApiV1Base}/training-categories/`,
      },
      {
        source: "/api/v1/training-categories/:path*",
        destination: `${chatApiV1Base}/training-categories/:path*`,
      },
      {
        source: "/api/v1/search/trainings",
        destination: `${chatApiV1Base}/search/trainings`,
      },
      {
        source: "/api/v1/admin/trainings/:path*",
        destination: `${chatApiV1Base}/admin/trainings/:path*`,
      },
      {
        source: "/api/v1/programs",
        destination: `${chatApiV1Base}/programs/`,
      },
      {
        source: "/api/v1/programs/:path*",
        destination: `${chatApiV1Base}/programs/:path*`,
      },
      {
        source: "/api/v1/search/programs",
        destination: `${chatApiV1Base}/search/programs`,
      },
      {
        source: "/api/v1/admin/programs/:path*",
        destination: `${chatApiV1Base}/admin/programs/:path*`,
      },
      {
        source: "/api/v1/courses",
        destination: `${chatApiV1Base}/courses/`,
      },
      {
        source: "/api/v1/courses/:path*",
        destination: `${chatApiV1Base}/courses/:path*`,
      },
      {
        source: "/api/v1/search/courses",
        destination: `${chatApiV1Base}/search/courses`,
      },
      {
        source: "/api/v1/admin/courses/:path*",
        destination: `${chatApiV1Base}/admin/courses/:path*`,
      },
    );

    if (upstreams.WORKFLOW_API_BASE_URL) {
      const workflowOrigin = stripApiV1(upstreams.WORKFLOW_API_BASE_URL);
      fallback.push(
        {
          source: "/api/v1/forms/:path*",
          destination: `${workflowOrigin}/api/v1/forms/:path*`,
        },
        {
          source: "/api/v1/workflows/:path*",
          destination: `${workflowOrigin}/api/v1/workflows/:path*`,
        },
        {
          source: "/api/v1/media/:path*",
          destination: `${workflowOrigin}/api/v1/media/:path*`,
        },
      );
    }

    if (upstreams.EVENTS_API_BASE_URL) {
      const eventsApiV1Base = toApiV1Base(upstreams.EVENTS_API_BASE_URL);
      fallback.push(
        // Preserve the documented collection slash before proxying multipart requests.
        {
          source: "/api/v1/events/media",
          destination: `${eventsApiV1Base}/events/media/`,
        },
        {
          source: "/api/v1/events/media/",
          destination: `${eventsApiV1Base}/events/media/`,
        },
        {
          source: "/api/v1/events",
          destination: `${eventsApiV1Base}/events/`,
        },
        {
          source: "/api/v1/events/:path*",
          destination: `${eventsApiV1Base}/events/:path*`,
        },
        {
          source: "/api/v1/event-categories",
          destination: `${eventsApiV1Base}/event-categories/`,
        },
        {
          source: "/api/v1/event-types",
          destination: `${eventsApiV1Base}/event-types/`,
        },
        {
          source: "/api/v1/event-types/:path*",
          destination: `${eventsApiV1Base}/event-types/:path*`,
        },
      );
    }

    return { fallback };
  },
};

export default nextConfig;
