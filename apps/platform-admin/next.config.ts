import type { NextConfig } from "next";

const authApiBaseUrl = process.env.AUTH_API_BASE_URL;

const nextConfig: NextConfig = {
  transpilePackages: ["@ihp/auth", "@ihp/platform-layout", "@ihp/ui"],
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
