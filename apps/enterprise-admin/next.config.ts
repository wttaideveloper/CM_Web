import type { NextConfig } from "next";

const authApiBaseUrl = process.env.AUTH_API_BASE_URL;
const workflowApiBaseUrl = process.env.WORKFLOW_API_BASE_URL;

const nextConfig: NextConfig = {
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
  ],
  async rewrites() {
    const fallback = [];

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
      );
    }

    return { fallback };
  },
};

export default nextConfig;
