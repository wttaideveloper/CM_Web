"use client";

import { useMemo, type ReactNode } from "react";

import { AuthProvider, getShellAppOrigin } from "@ihp/auth";
import { CurrentEnterpriseProvider, TenantProvider } from "@ihp/enterprise-runtime";
import EnterpriseI18nProvider from "@/i18n/EnterpriseI18nProvider";

export default function EnterpriseAdminProviders({ children }: { children: ReactNode }) {
  const shellOrigin = getShellAppOrigin();
  const authConfig = useMemo(
    () => (shellOrigin ? { frontendOrigin: shellOrigin } : undefined),
    [shellOrigin],
  );

  return (
    <EnterpriseI18nProvider>
      <AuthProvider config={authConfig}>
        <TenantProvider>
          <CurrentEnterpriseProvider>{children}</CurrentEnterpriseProvider>
        </TenantProvider>
      </AuthProvider>
    </EnterpriseI18nProvider>
  );
}
