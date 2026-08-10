import type { NextConfig } from "next";

const authApiBaseUrl = process.env.AUTH_API_BASE_URL;
const resolvedAuthApiBaseUrl = authApiBaseUrl ?? "https://p6wvqog202.execute-api.us-east-1.amazonaws.com";

if (process.env.NODE_ENV === "development") {
  console.log("[AUTH PROXY DEBUG] AUTH_API_BASE_URL:", authApiBaseUrl ?? "(unset; using default)");
  console.log("[AUTH PROXY DEBUG] /api/v1/auth/:path* ->", `${resolvedAuthApiBaseUrl}/api/v1/auth/:path*`);
  console.log("[AUTH PROXY DEBUG] /api/v1/tenant/:path* ->", `${resolvedAuthApiBaseUrl}/api/v1/tenant/:path*`);
}

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
    "@ihp/onboarding-forms",
    "@ihp/messaging",
    "@ihp/platform-layout",
    "@ihp/platform-configuration",
    "@ihp/platform-dashboard",
    "@ihp/platform-attributes",
    "@ihp/platform-enterprises",
    "@ihp/platform-marketplace-static",
    "@ihp/products",
    "@ihp/realtime",
    "@ihp/services",
    "@ihp/shared",
    "@ihp/ui",
  ],
  async rewrites() {
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
      ],
    };
  },
};

export default nextConfig;
