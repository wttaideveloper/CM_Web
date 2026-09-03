import type { NextConfig } from "next";

const authApiBaseUrl = process.env.AUTH_API_BASE_URL;
const chatApiBaseUrl = process.env.CHAT_API_BASE_URL;
const eventsApiBaseUrl = process.env.EVENTS_API_BASE_URL;
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
    "@ihp/workflow-admin",
    "@ihp/workflow-runtime",
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

    if (chatApiBaseUrl) {
      fallback.push(
        {
          source: "/api/v1/search/enterprises",
          destination: `${chatApiBaseUrl}/search/enterprises`,
        },
        {
          source: "/api/v1/enterprises",
          destination: `${chatApiBaseUrl}/enterprises/`,
        },
        {
          source: "/api/v1/enterprises/:path*",
          destination: `${chatApiBaseUrl}/enterprises/:path*`,
        },
        {
          source: "/api/v1/locations/:path*",
          destination: `${chatApiBaseUrl}/locations/:path*`,
        },
        {
          source: "/api/v1/products",
          destination: `${chatApiBaseUrl}/products/`,
        },
        {
          source: "/api/v1/products/:path*",
          destination: `${chatApiBaseUrl}/products/:path*`,
        },
        {
          source: "/api/v1/services",
          destination: `${chatApiBaseUrl}/services/`,
        },
        {
          source: "/api/v1/services/:path*",
          destination: `${chatApiBaseUrl}/services/:path*`,
        },
        {
          source: "/api/v1/attributes",
          destination: `${chatApiBaseUrl}/attributes`,
        },
        {
          source: "/api/v1/attributes/:path*",
          destination: `${chatApiBaseUrl}/attributes/:path*`,
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

    if (eventsApiBaseUrl) {
      fallback.push(
        {
          source: "/api/v1/events",
          destination: `${eventsApiBaseUrl}/api/v1/events/`,
        },
        {
          source: "/api/v1/events/:path*",
          destination: `${eventsApiBaseUrl}/api/v1/events/:path*`,
        },
      );
    }

    return { fallback };
  },
};

export default nextConfig;
