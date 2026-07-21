"use client";

import type { ReactNode } from "react";

import { AuthProvider } from "@/contexts/AuthContext";
import { AdminSocketProvider } from "@/contexts/AdminSocketContext";
import { CurrentEnterpriseProvider } from "@/contexts/CurrentEnterpriseContext";
import { RegistrationProvider } from "@/contexts/RegistrationContext";
import { TenantProvider } from "@/contexts/TenantContext";

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <TenantProvider>
        <CurrentEnterpriseProvider>
          <RegistrationProvider>
            <AdminSocketProvider>{children}</AdminSocketProvider>
          </RegistrationProvider>
        </CurrentEnterpriseProvider>
      </TenantProvider>
    </AuthProvider>
  );
}
