"use client";

import { useMemo, type ReactNode } from "react";

import { AuthProvider, getShellAppOrigin } from "@ihp/auth";
import { CurrentEnterpriseProvider, TenantProvider } from "@ihp/enterprise-runtime";

export default function EnterpriseAdminProviders({ children }: { children: ReactNode }) {
  const shellOrigin = getShellAppOrigin();
  const authConfig = useMemo(
    () => (shellOrigin ? { frontendOrigin: shellOrigin } : undefined),
    [shellOrigin],
  );

  return (
    <AuthProvider config={authConfig}>
      <TenantProvider>
        <CurrentEnterpriseProvider>{children}</CurrentEnterpriseProvider>
      </TenantProvider>
    </AuthProvider>
  );
}
