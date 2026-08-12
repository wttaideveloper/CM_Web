"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { AuthProvider } from "@ihp/auth";
import { AdminSocketProvider } from "@/contexts/AdminSocketContext";
import { ChatAuthProvider } from "@/contexts/ChatAuthContext";
import { CurrentEnterpriseProvider } from "@/contexts/CurrentEnterpriseContext";
import { RegistrationProvider } from "@/contexts/RegistrationContext";
import { TenantProvider } from "@/contexts/TenantContext";
import {
  isEnterpriseRoute,
  isPublicAuthRoute,
  isRealtimeCompatibilityRoute,
  isRegistrationRoute,
} from "@/routing/route-ownership";

export function PublicAuthProviders({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

export function RegistrationRouteProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <RegistrationProvider>{children}</RegistrationProvider>
    </AuthProvider>
  );
}

export function PlatformProviders({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

export function EnterpriseProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ChatAuthProvider>
        <TenantProvider>
          <CurrentEnterpriseProvider>{children}</CurrentEnterpriseProvider>
        </TenantProvider>
      </ChatAuthProvider>
    </AuthProvider>
  );
}

export function RealtimeCompatibilityProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ChatAuthProvider>
        <AdminSocketProvider>{children}</AdminSocketProvider>
      </ChatAuthProvider>
    </AuthProvider>
  );
}

function RouteScopedProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (isRegistrationRoute(pathname)) {
    return <RegistrationRouteProviders>{children}</RegistrationRouteProviders>;
  }

  if (isRealtimeCompatibilityRoute(pathname)) {
    return <RealtimeCompatibilityProviders>{children}</RealtimeCompatibilityProviders>;
  }

  if (isEnterpriseRoute(pathname)) {
    return <EnterpriseProviders>{children}</EnterpriseProviders>;
  }

  if (isPublicAuthRoute(pathname)) {
    return <PublicAuthProviders>{children}</PublicAuthProviders>;
  }

  return <PlatformProviders>{children}</PlatformProviders>;
}

export default function AppProviders({ children }: { children: ReactNode }) {
  return <RouteScopedProviders>{children}</RouteScopedProviders>;
}
