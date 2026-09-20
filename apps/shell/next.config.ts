import type { NextConfig } from "next";

const authApiBaseUrl = process.env.AUTH_API_BASE_URL;
const resolvedAuthApiBaseUrl = authApiBaseUrl ?? "https://admin.apis.invigor8.app";
const chatApiBaseUrl = process.env.CHAT_API_BASE_URL ?? "https://chat.wisdomtooth.tech/api/v1";

if (process.env.NODE_ENV === "development") {
  console.log("[AUTH PROXY DEBUG] AUTH_API_BASE_URL:", authApiBaseUrl ?? "(unset; using default)");
  console.log("[AUTH PROXY DEBUG] /api/v1/auth/:path* ->", `${resolvedAuthApiBaseUrl}/api/v1/auth/:path*`);
  console.log("[AUTH PROXY DEBUG] /api/v1/tenant/:path* ->", `${resolvedAuthApiBaseUrl}/api/v1/tenant/:path*`);
}

const nextConfig: NextConfig = {
  experimental: {
    cpus: 1,
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
    "@ihp/onboarding-forms",
    "@ihp/platform-layout",
    "@ihp/platform-configuration",
    "@ihp/platform-dashboard",
    "@ihp/platform-attributes",
    "@ihp/platform-enterprises",
    "@ihp/platform-form-configurations",
    "@ihp/platform-marketplace-static",
    "@ihp/products",
    "@ihp/realtime",
    "@ihp/services",
    "@ihp/shared",
    "@ihp/ui",
  ],
  async rewrites() {
    const chatBaseHttps = chatApiBaseUrl.replace(/^http:/, "https:");
    return {
      fallback: [
        {
          source: "/api/v1/auth/:path*",
          destination: `${resolvedAuthApiBaseUrl}/api/v1/auth/:path*`,
        },
        {
          source: "/api/v1/tenant/:path*",
          destination: `${resolvedAuthApiBaseUrl}/api/v1/tenant/:path*`,
        },
        {
          source: "/api/v1/trainings/form-configuration/:path*",
          destination: `${chatBaseHttps}/trainings/form-configuration/:path*`,
        },
        {
          source: "/api/v1/admin/training-form-configurations/:path*",
          destination: `${chatBaseHttps}/admin/training-form-configurations/:path*`,
        },
        {
          source: "/api/v1/programs/form-configuration/:path*",
          destination: `${chatBaseHttps}/programs/form-configuration/:path*`,
        },
        {
          source: "/api/v1/admin/program-form-configurations/:path*",
          destination: `${chatBaseHttps}/admin/program-form-configurations/:path*`,
        },
        {
          source: "/api/v1/courses/form-configuration/:path*",
          destination: `${chatBaseHttps}/courses/form-configuration/:path*`,
        },
        {
          source: "/api/v1/admin/course-form-configurations/:path*",
          destination: `${chatBaseHttps}/admin/course-form-configurations/:path*`,
        },
        {
          source: "/api/v1/trainings",
          destination: `${chatBaseHttps}/trainings/`,
        },
        {
          source: "/api/v1/trainings/:path*",
          destination: `${chatBaseHttps}/trainings/:path*`,
        },
        {
          source: "/api/v1/search/trainings",
          destination: `${chatBaseHttps}/search/trainings`,
        },
        {
          source: "/api/v1/admin/trainings/:path*",
          destination: `${chatBaseHttps}/admin/trainings/:path*`,
        },
        {
          source: "/api/v1/programs",
          destination: `${chatApiBaseUrl}/programs/`,
        },
        {
          source: "/api/v1/programs/:path*",
          destination: `${chatApiBaseUrl}/programs/:path*`,
        },
        {
          source: "/api/v1/search/programs",
          destination: `${chatApiBaseUrl}/search/programs`,
        },
        {
          source: "/api/v1/admin/programs/:path*",
          destination: `${chatApiBaseUrl}/admin/programs/:path*`,
        },
        {
          source: "/api/v1/courses",
          destination: `${chatBaseHttps}/courses/`,
        },
        {
          source: "/api/v1/courses/:path*",
          destination: `${chatBaseHttps}/courses/:path*`,
        },
        {
          source: "/api/v1/search/courses",
          destination: `${chatBaseHttps}/search/courses`,
        },
        {
          source: "/api/v1/admin/courses/:path*",
          destination: `${chatBaseHttps}/admin/courses/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
