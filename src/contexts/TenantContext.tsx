"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { getTenantMe, type TenantDetails } from "@/services/tenant.service";

type TenantContextValue = {
  tenant: TenantDetails | null;
  tenantId: string | null;
  isLoadingTenant: boolean;
  tenantError: string | null;
  refreshTenant: () => Promise<void>;
};

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { authenticated } = useAuth();
  const [tenant, setTenant] = useState<TenantDetails | null>(null);
  const [isLoadingTenant, setIsLoadingTenant] = useState(false);
  const [tenantError, setTenantError] = useState<string | null>(null);

  const refreshTenant = useCallback(async () => {
    if (!authenticated) {
      setTenant(null);
      setTenantError(null);
      setIsLoadingTenant(false);
      return;
    }

    setIsLoadingTenant(true);
    setTenantError(null);

    try {
      const response = await getTenantMe();
      setTenant(response.data);
    } catch (error) {
      setTenant(null);
      setTenantError(error instanceof Error ? error.message : "Unable to load tenant.");
    } finally {
      setIsLoadingTenant(false);
    }
  }, [authenticated]);

  useEffect(() => {
    // Tenant loading intentionally synchronizes after Web Auth session restoration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshTenant();
  }, [refreshTenant]);

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

export function useTenant() {
  const context = useContext(TenantContext);

  if (!context) {
    throw new Error("useTenant must be used within TenantProvider.");
  }

  return context;
}
