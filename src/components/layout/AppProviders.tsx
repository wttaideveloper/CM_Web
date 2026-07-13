"use client";

import type { ReactNode } from "react";

import { AuthProvider } from "@/contexts/AuthContext";
import { AdminSocketProvider } from "@/contexts/AdminSocketContext";
import { RegistrationProvider } from "@/contexts/RegistrationContext";

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AdminSocketProvider>
      <AuthProvider>
        <RegistrationProvider>{children}</RegistrationProvider>
      </AuthProvider>
    </AdminSocketProvider>
  );
}
