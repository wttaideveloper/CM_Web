"use client";

import type { ReactNode } from "react";

import { AuthProvider } from "@/contexts/AuthContext";
import { AdminSocketProvider } from "@/contexts/AdminSocketContext";
import { ChatAuthProvider } from "@/contexts/ChatAuthContext";
import { CurrentEnterpriseProvider } from "@/contexts/CurrentEnterpriseContext";
import { RegistrationProvider } from "@/contexts/RegistrationContext";
import { TenantProvider } from "@/contexts/TenantContext";

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <TenantProvider>
        <CurrentEnterpriseProvider>
          <RegistrationProvider>
            <ChatAuthProvider>
              <AdminSocketProvider>{children}</AdminSocketProvider>
            </ChatAuthProvider>
          </RegistrationProvider>
        </CurrentEnterpriseProvider>
      </TenantProvider>
    </AuthProvider>
  );
}
