import type { NextConfig } from "next";

const authApiBaseUrl = process.env.AUTH_API_BASE_URL;

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      fallback: [
        {
          source: "/api/v1/auth/:path*",
          destination: `${authApiBaseUrl ?? "https://p6wvqog202.execute-api.us-east-1.amazonaws.com"}/api/v1/auth/:path*`,
        },
        {
          source: "/api/v1/tenant/:path*",
          destination: `${authApiBaseUrl ?? "https://p6wvqog202.execute-api.us-east-1.amazonaws.com"}/api/v1/tenant/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
