import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "packages/**/src/**/*.test.ts",
      "packages/**/src/**/*.test.tsx",
      "apps/**/src/**/*.test.ts",
      "apps/**/src/**/*.test.tsx",
    ],
    globals: false,
  },
  resolve: {
    alias: {
      "@ihp/shared": path.resolve(__dirname, "packages/shared/src"),
      "@ihp/auth": path.resolve(__dirname, "packages/auth/src"),
    },
  },
});