import type { NextConfig } from "next";

const authApiBaseUrl = process.env.AUTH_API_BASE_URL;
const onboardingFormsApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://chat.wisdomtooth.tech/api/v1";

const nextConfig: NextConfig = {
  transpilePackages: ["@ihp/auth", "@ihp/onboarding-forms", "@ihp/platform-layout", "@ihp/ui"],
  async rewrites() {
    const fallback = [
      {
        source: "/api/v1/onboarding-forms/:path*",
        destination: `${onboardingFormsApiBaseUrl}/onboarding-forms/:path*`,
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
