"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { searchEnterprisesByTenantId } from "@/services/enterprise.service";
import type { EnterpriseDto } from "@/types/enterprise.types";

type CurrentEnterpriseContextValue = {
  currentEnterprise: EnterpriseDto | null;
  enterpriseId: string | null;
  isLoadingEnterprise: boolean;
  enterpriseError: string | null;
  refreshCurrentEnterprise: () => Promise<void>;
};

const CurrentEnterpriseContext = createContext<CurrentEnterpriseContextValue | null>(null);

export function CurrentEnterpriseProvider({ children }: { children: ReactNode }) {
  const { authenticated } = useAuth();
  const { tenantId, isLoadingTenant, tenantError } = useTenant();
  const [currentEnterprise, setCurrentEnterprise] = useState<EnterpriseDto | null>(null);
  const [isLoadingEnterprise, setIsLoadingEnterprise] = useState(true);
  const [enterpriseError, setEnterpriseError] = useState<string | null>(null);

  const refreshCurrentEnterprise = useCallback(async () => {
    if (!authenticated) {
      setCurrentEnterprise(null);
      setEnterpriseError(null);
      setIsLoadingEnterprise(false);
      return;
    }

    if (isLoadingTenant) {
      setCurrentEnterprise(null);
      setEnterpriseError(null);
      setIsLoadingEnterprise(true);
      return;
    }

    if (!tenantId) {
      setCurrentEnterprise(null);
      setEnterpriseError(tenantError ?? "No organization is available for this account.");
      setIsLoadingEnterprise(false);
      return;
    }

    setIsLoadingEnterprise(true);
    setEnterpriseError(null);

    try {
      const enterprises = await searchEnterprisesByTenantId(tenantId);

      if (enterprises.length === 0) {
        setCurrentEnterprise(null);
        setEnterpriseError("No enterprise is linked to this organization yet.");
        return;
      }

      if (enterprises.length > 1) {
        setCurrentEnterprise(null);
        setEnterpriseError("Multiple enterprises are linked to this organization. Enterprise selection is required.");
        return;
      }

      setCurrentEnterprise(enterprises[0]);
    } catch (error) {
      setCurrentEnterprise(null);
      setEnterpriseError(error instanceof Error ? error.message : "Unable to resolve the current enterprise.");
    } finally {
      setIsLoadingEnterprise(false);
    }
  }, [authenticated, isLoadingTenant, tenantError, tenantId]);

  useEffect(() => {
    // Enterprise resolution intentionally follows tenant loading rather than session loading.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshCurrentEnterprise();
  }, [refreshCurrentEnterprise]);

  const value = useMemo<CurrentEnterpriseContextValue>(
    () => ({
      currentEnterprise,
      enterpriseId: currentEnterprise?.id ?? null,
      isLoadingEnterprise,
      enterpriseError,
      refreshCurrentEnterprise,
    }),
    [currentEnterprise, enterpriseError, isLoadingEnterprise, refreshCurrentEnterprise],
  );

  return <CurrentEnterpriseContext.Provider value={value}>{children}</CurrentEnterpriseContext.Provider>;
}

export function useCurrentEnterprise() {
  const context = useContext(CurrentEnterpriseContext);

  if (!context) {
    throw new Error("useCurrentEnterprise must be used within CurrentEnterpriseProvider.");
  }

  return context;
}
