"use client";

import type { ReactNode } from "react";

import { AuthProvider } from "@/contexts/AuthContext";
import { AdminSocketProvider } from "@/contexts/AdminSocketContext";
import { RegistrationProvider } from "@/contexts/RegistrationContext";
import { TenantProvider } from "@/contexts/TenantContext";

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <TenantProvider>
        <RegistrationProvider>
          <AdminSocketProvider>{children}</AdminSocketProvider>
        </RegistrationProvider>
      </TenantProvider>
    </AuthProvider>
  );
}
