"use client";

import type { ReactNode } from "react";

import { AuthProvider, getShellAppOrigin } from "@ihp/auth";
import { CurrentEnterpriseProvider, TenantProvider } from "@ihp/enterprise-runtime";

export default function EnterpriseAdminProviders({ children }: { children: ReactNode }) {
  const shellOrigin = getShellAppOrigin();

  return (
    <AuthProvider config={shellOrigin ? { frontendOrigin: shellOrigin } : undefined}>
      <TenantProvider>
        <CurrentEnterpriseProvider>{children}</CurrentEnterpriseProvider>
      </TenantProvider>
    </AuthProvider>
  );
}
