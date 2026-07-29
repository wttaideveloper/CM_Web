"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { AuthProvider } from "@ihp/auth";
import { AdminSocketProvider } from "@/contexts/AdminSocketContext";
import { ChatAuthProvider } from "@/contexts/ChatAuthContext";
import { CurrentEnterpriseProvider } from "@/contexts/CurrentEnterpriseContext";
import { RegistrationProvider } from "@/contexts/RegistrationContext";
import { TenantProvider } from "@/contexts/TenantContext";

const REALTIME_COMPATIBILITY_PATHS = new Set([
  "/admin/messages",
  "/admin/notifications",
  "/notifications",
]);

function isRealtimeCompatibilityRoute(pathname: string) {
  return REALTIME_COMPATIBILITY_PATHS.has(pathname);
}

export function PublicAuthProviders({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

export function RegistrationRouteProviders({ children }: { children: ReactNode }) {
  return <RegistrationProvider>{children}</RegistrationProvider>;
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

  if (pathname === "/auth/register") {
    return <RegistrationRouteProviders>{children}</RegistrationRouteProviders>;
  }

  if (isRealtimeCompatibilityRoute(pathname)) {
    return <RealtimeCompatibilityProviders>{children}</RealtimeCompatibilityProviders>;
  }

  if (pathname.startsWith("/admin")) {
    return <EnterpriseProviders>{children}</EnterpriseProviders>;
  }

  if (pathname.startsWith("/auth") || pathname === "/" || pathname.startsWith("/internal")) {
    return <PublicAuthProviders>{children}</PublicAuthProviders>;
  }

  return <PlatformProviders>{children}</PlatformProviders>;
}

export default function AppProviders({ children }: { children: ReactNode }) {
  return <RouteScopedProviders>{children}</RouteScopedProviders>;
}
