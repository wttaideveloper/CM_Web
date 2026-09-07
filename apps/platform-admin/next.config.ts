import type { NextConfig } from "next";

const authApiBaseUrl =
  process.env.AUTH_API_BASE_URL ?? "https://admin.apis.invigor8.app";
const workflowApiBaseUrl = process.env.WORKFLOW_API_BASE_URL;
function normalizePlatformApiBaseUrl(value: string): string {
  const url = new URL(value);

  if (url.hostname === "chat.wisdomtooth.tech") {
    url.protocol = "https:";
  }

  return url.toString().replace(/\/$/, "");
}

const platformApiBaseUrl = normalizePlatformApiBaseUrl(
  process.env.CHAT_API_BASE_URL ?? "https://chat.wisdomtooth.tech/api/v1",
);

const nextConfig: NextConfig = {
  transpilePackages: ["@ihp/attributes", "@ihp/auth", "@ihp/enterprises", "@ihp/onboarding-forms", "@ihp/platform-attributes", "@ihp/platform-configuration", "@ihp/platform-dashboard", "@ihp/platform-enterprises", "@ihp/platform-form-configurations", "@ihp/platform-layout", "@ihp/platform-marketplace-static", "@ihp/products", "@ihp/services", "@ihp/shared", "@ihp/ui", "@ihp/workflow-admin", "@ihp/workflow-runtime"],
  async rewrites() {
    const fallback = [
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
    ];

    if (authApiBaseUrl) {
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
    }

    if (workflowApiBaseUrl) {
      fallback.push(
        {
          source: "/api/v1/forms/:path*",
          destination: `${workflowApiBaseUrl}/api/v1/forms/:path*`,
        },
        {
          source: "/api/v1/workflows/:path*",
          destination: `${workflowApiBaseUrl}/api/v1/workflows/:path*`,
        },
        {
          source: "/api/v1/media/:path*",
          destination: `${workflowApiBaseUrl}/api/v1/media/:path*`,
        },
      );
    }

    return { fallback };
  },
};

export default nextConfig;
