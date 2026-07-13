import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/auth/:path*",
        destination: "https://p6wvqog202.execute-api.us-east-1.amazonaws.com/api/v1/auth/:path*",
      },
      {
        source: "/api/v1/tenant/:path*",
        destination: "https://p6wvqog202.execute-api.us-east-1.amazonaws.com/api/v1/tenant/:path*",
      },
    ];
  },
};

export default nextConfig;
