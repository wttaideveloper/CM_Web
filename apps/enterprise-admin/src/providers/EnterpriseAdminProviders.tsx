"use client";

import type { ReactNode } from "react";

import { AuthProvider } from "@ihp/auth";
import { CurrentEnterpriseProvider, TenantProvider } from "@ihp/enterprise-runtime";

export default function EnterpriseAdminProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <TenantProvider>
        <CurrentEnterpriseProvider>{children}</CurrentEnterpriseProvider>
      </TenantProvider>
    </AuthProvider>
  );
}
