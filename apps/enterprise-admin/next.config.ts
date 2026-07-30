import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@ihp/attributes",
    "@ihp/enterprises",
    "@ihp/products",
    "@ihp/services",
    "@ihp/shared",
    "@ihp/ui",
  ],
};

export default nextConfig;
