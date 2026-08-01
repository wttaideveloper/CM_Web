import type { NextConfig } from "next";

const authApiBaseUrl = process.env.AUTH_API_BASE_URL;

const nextConfig: NextConfig = {
  transpilePackages: [
    "@ihp/auth",
    "@ihp/attributes",
    "@ihp/enterprise-analytics",
    "@ihp/enterprise-dashboard",
    "@ihp/enterprise-events",
    "@ihp/enterprise-layout",
    "@ihp/enterprise-profile",
    "@ihp/enterprise-runtime",
    "@ihp/enterprise-settings",
    "@ihp/enterprise-trainings",
    "@ihp/enterprises",
    "@ihp/products",
    "@ihp/services",
    "@ihp/shared",
    "@ihp/ui",
  ],
  async rewrites() {
    if (!authApiBaseUrl) {
      return { fallback: [] };
    }

    return {
      fallback: [
        {
          source: "/api/v1/auth/:path*",
          destination: `${authApiBaseUrl}/api/v1/auth/:path*`,
        },
        {
          source: "/api/v1/tenant/:path*",
          destination: `${authApiBaseUrl}/api/v1/tenant/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
