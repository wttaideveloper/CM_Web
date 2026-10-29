"use client";

import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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
  ROUTE_PATHS,
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
        <AdminSocketProvider>
          <TenantProvider>
            <CurrentEnterpriseProvider>{children}</CurrentEnterpriseProvider>
          </TenantProvider>
        </AdminSocketProvider>
      </ChatAuthProvider>
    </AuthProvider>
  );
}

export function RealtimeCompatibilityProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const content = (
    <AuthProvider>
      <ChatAuthProvider>
        <AdminSocketProvider>{children}</AdminSocketProvider>
      </ChatAuthProvider>
    </AuthProvider>
  );

  if (pathname !== ROUTE_PATHS.enterprise.messages) {
    return content;
  }

  return <MessagingQueryProvider>{content}</MessagingQueryProvider>;
}

function MessagingQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1 } } }));

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
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
