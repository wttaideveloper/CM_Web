import type { NextConfig } from "next";

const authApiBaseUrl =
  process.env.AUTH_API_BASE_URL ?? "https://p6wvqog202.execute-api.us-east-1.amazonaws.com";
const platformApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://chat.wisdomtooth.tech/api/v1";

const nextConfig: NextConfig = {
  transpilePackages: ["@ihp/attributes", "@ihp/auth", "@ihp/enterprises", "@ihp/onboarding-forms", "@ihp/platform-attributes", "@ihp/platform-configuration", "@ihp/platform-enterprises", "@ihp/platform-layout", "@ihp/products", "@ihp/services", "@ihp/shared", "@ihp/ui"],
  async rewrites() {
    const fallback = [
      {
        source: "/api/v1/onboarding-forms/:path*",
        destination: `${platformApiBaseUrl}/onboarding-forms/:path*`,
      },
      {
        source: "/api/v1/attributes/:path*",
        destination: `${platformApiBaseUrl}/attributes/:path*`,
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
        source: "/api/v1/products/:path*",
        destination: `${platformApiBaseUrl}/products/:path*`,
      },
      {
        source: "/api/v1/services/:path*",
        destination: `${platformApiBaseUrl}/services/:path*`,
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

    return { fallback };
  },
};

export default nextConfig;
