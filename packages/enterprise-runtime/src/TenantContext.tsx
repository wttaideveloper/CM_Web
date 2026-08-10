"use client";

import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { useAuth } from "@ihp/auth";

import { getTenantMe, type TenantDetails } from "./tenant.service";

type TenantContextValue = {
  tenant: TenantDetails | null;
  tenantId: string | null;
  isLoadingTenant: boolean;
  tenantError: string | null;
  refreshTenant: () => Promise<void>;
};

const TenantContext = createContext<TenantContextValue | null>(null);

function TenantProviderContent({ children }: { children: ReactNode }) {
  const { authenticated, user } = useAuth();
  const tenantQuery = useQuery({
    queryKey: ["tenant", "me", user?.id ?? user?.userId ?? "unauthenticated"],
    queryFn: getTenantMe,
    enabled: authenticated,
    staleTime: 30_000,
    retry: 1,
  });
  const tenant = authenticated ? tenantQuery.data?.data ?? null : null;
  const isLoadingTenant = authenticated && tenantQuery.isFetching;
  const tenantError =
    authenticated && tenantQuery.isError
      ? tenantQuery.error instanceof Error
        ? tenantQuery.error.message
        : "Unable to load tenant."
      : null;
  const { refetch: refetchTenant } = tenantQuery;

  const refreshTenant = useCallback(async () => {
    if (!authenticated) {
      return;
    }

    await refetchTenant();
  }, [authenticated, refetchTenant]);

  const value = useMemo<TenantContextValue>(
    () => ({
      tenant,
      tenantId: tenant?.id ?? null,
      isLoadingTenant,
      tenantError,
      refreshTenant,
    }),
    [isLoadingTenant, refreshTenant, tenant, tenantError],
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <TenantProviderContent>{children}</TenantProviderContent>
    </QueryClientProvider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);

  if (!context) {
    throw new Error("useTenant must be used within TenantProvider.");
  }

  return context;
}
