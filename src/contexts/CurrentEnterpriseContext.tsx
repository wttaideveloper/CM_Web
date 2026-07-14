"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "@/contexts/AuthContext";
import { getEnterprises } from "@/services/enterprise.service";
import { getTenantMe, type AuthUser, type TenantDetails } from "@/services/auth.service";
import type { EnterpriseDto } from "@/types/enterprise.types";

type EnterpriseLinkFields = EnterpriseDto & {
  tenant_id?: string;
  tenantId?: string;
  tenant_slug?: string;
  tenantSlug?: string;
  owner_id?: string;
  ownerId?: string;
  user_id?: string;
  userId?: string;
  slug?: string;
};

type CurrentEnterpriseContextValue = {
  currentEnterprise: EnterpriseDto | null;
  enterpriseId: string | null;
  enterpriseName: string;
  enterpriseSlug: string;
  isEnterpriseLoading: boolean;
  enterpriseError: string | null;
  refreshCurrentEnterprise: () => Promise<void>;
};

const ALLOWED_ADMIN_ROLES = new Set(["tenant_owner", "tenant_admin", "admin"]);

const DEFAULT_CONTEXT_VALUE: CurrentEnterpriseContextValue = {
  currentEnterprise: null,
  enterpriseId: null,
  enterpriseName: "",
  enterpriseSlug: "",
  isEnterpriseLoading: false,
  enterpriseError: null,
  refreshCurrentEnterprise: async () => {},
};

const CurrentEnterpriseContext = createContext<CurrentEnterpriseContextValue>(DEFAULT_CONTEXT_VALUE);

function getTenantRole(authenticatedUser: AuthUser | null): string | null {
  return authenticatedUser?.membership?.tenantRole ?? authenticatedUser?.roles?.tenantRole ?? null;
}

function isAllowedAdminRole(tenantRole: string | null) {
  return tenantRole ? ALLOWED_ADMIN_ROLES.has(tenantRole) : false;
}

function formatEnterpriseName(enterprise: EnterpriseDto | null): string {
  if (!enterprise) {
    return "";
  }

  return (
    enterprise.business_legal_name ||
    enterprise.business_short_name ||
    enterprise.name ||
    ""
  ).trim();
}

function formatEnterpriseSlug(enterprise: EnterpriseDto | null): string {
  if (!enterprise) {
    return "";
  }

  return (
    (enterprise as EnterpriseLinkFields).tenant_slug ||
    (enterprise as EnterpriseLinkFields).tenantSlug ||
    ""
  ).trim();
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function getEnterpriseLinkField(enterprise: EnterpriseDto, fields: Array<keyof EnterpriseLinkFields>): string {
  const record = enterprise as EnterpriseLinkFields;

  for (const field of fields) {
    const value = record[field];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function findLinkedEnterprise(
  enterprises: EnterpriseDto[],
  tenant: TenantDetails | null,
  authenticatedUser: AuthUser | null,
): EnterpriseDto | null {
  const tenantId = normalize(tenant?.id ?? undefined);
  const tenantSlug = normalize(tenant?.slug ?? authenticatedUser?.membership?.tenantSlug ?? authenticatedUser?.roles?.tenantSlug);
  const userIds = [
    normalize(authenticatedUser?.id),
    normalize(authenticatedUser?.userId),
  ].filter(Boolean);

  const candidates = enterprises.map((enterprise) => ({
    enterprise,
    tenantId: normalize(getEnterpriseLinkField(enterprise, ["tenant_id", "tenantId"])),
    tenantSlug: normalize(getEnterpriseLinkField(enterprise, ["tenant_slug", "tenantSlug", "slug"])),
    ownerId: normalize(getEnterpriseLinkField(enterprise, ["owner_id", "ownerId"])),
    userId: normalize(getEnterpriseLinkField(enterprise, ["user_id", "userId"])),
  }));

  if (tenantId) {
    const byTenantId = candidates.find((candidate) => candidate.tenantId === tenantId);
    if (byTenantId) {
      return byTenantId.enterprise;
    }
  }

  if (tenantSlug) {
    const byTenantSlug = candidates.find((candidate) => candidate.tenantSlug === tenantSlug);
    if (byTenantSlug) {
      return byTenantSlug.enterprise;
    }
  }

  if (userIds.length > 0) {
    const byOwnerId = candidates.find(
      (candidate) => userIds.includes(candidate.ownerId) || userIds.includes(candidate.userId),
    );

    if (byOwnerId) {
      return byOwnerId.enterprise;
    }
  }

  return null;
}

export function CurrentEnterpriseProvider({ children }: { children: ReactNode }) {
  const { authenticatedUser, isAuthLoading, isAuthenticated } = useAuth();
  const [currentEnterprise, setCurrentEnterprise] = useState<EnterpriseDto | null>(null);
  const [enterpriseError, setEnterpriseError] = useState<string | null>(null);
  const [isEnterpriseLoading, setIsEnterpriseLoading] = useState(true);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const requestIdRef = useRef(0);

  const tenantRole = getTenantRole(authenticatedUser);
  const hasEnterpriseAdminAccess = isAuthenticated && isAllowedAdminRole(tenantRole);

  const clearCurrentEnterprise = useCallback(() => {
    setCurrentEnterprise(null);
    setEnterpriseError(null);
    setIsEnterpriseLoading(false);
  }, []);

  const refreshCurrentEnterprise = useCallback(() => {
    if (inFlightRef.current) {
      return inFlightRef.current;
    }

    const requestId = ++requestIdRef.current;

    const promise = (async () => {
      if (isAuthLoading || !hasEnterpriseAdminAccess) {
        clearCurrentEnterprise();
        return;
      }

      setIsEnterpriseLoading(true);
      setEnterpriseError(null);

      try {
        const [tenantResponse, enterprises] = await Promise.all([getTenantMe(), getEnterprises()]);
        const tenant = tenantResponse.data;
        const linkedEnterprise = findLinkedEnterprise(enterprises, tenant, authenticatedUser);

        if (requestIdRef.current !== requestId) {
          return;
        }

        if (!linkedEnterprise) {
          setCurrentEnterprise(null);
          setEnterpriseError("Enterprise not linked to the authenticated tenant.");
          return;
        }

        setCurrentEnterprise(linkedEnterprise);
      } catch (error) {
        if (requestIdRef.current !== requestId) {
          return;
        }

        setCurrentEnterprise(null);
        setEnterpriseError(
          error instanceof Error ? error.message : "Unable to resolve the authenticated enterprise.",
        );
      } finally {
        if (requestIdRef.current === requestId) {
          setIsEnterpriseLoading(false);
        }
        inFlightRef.current = null;
      }
    })();

    inFlightRef.current = promise;
    return promise;
  }, [authenticatedUser, clearCurrentEnterprise, hasEnterpriseAdminAccess, isAuthLoading]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!hasEnterpriseAdminAccess) {
      clearCurrentEnterprise();
      requestIdRef.current += 1;
      inFlightRef.current = null;
      return;
    }

    void refreshCurrentEnterprise();
  }, [clearCurrentEnterprise, hasEnterpriseAdminAccess, isAuthLoading, refreshCurrentEnterprise]);

  const value = useMemo<CurrentEnterpriseContextValue>(
    () => ({
      currentEnterprise,
      enterpriseId: currentEnterprise?.id ?? null,
      enterpriseName: formatEnterpriseName(currentEnterprise),
      enterpriseSlug: formatEnterpriseSlug(currentEnterprise),
      isEnterpriseLoading,
      enterpriseError,
      refreshCurrentEnterprise,
    }),
    [currentEnterprise, enterpriseError, isEnterpriseLoading, refreshCurrentEnterprise],
  );

  return <CurrentEnterpriseContext.Provider value={value}>{children}</CurrentEnterpriseContext.Provider>;
}

export function useCurrentEnterprise() {
  return useContext(CurrentEnterpriseContext);
}
