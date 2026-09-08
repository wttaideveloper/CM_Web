"use client";

import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, type ReactNode } from "react";
import { getEnterpriseById, type EnterpriseDto } from "@ihp/enterprises";
import { getPlatformEnterpriseTenants } from "@ihp/platform-enterprises";

type EnterpriseLoader = (enterpriseId: string) => Promise<EnterpriseDto>;

const EnterpriseLoaderContext = createContext<EnterpriseLoader>(getEnterpriseById);

/** Lets the Platform host inject its authenticated Enterprise reader while preserving the shared default. */
export function PlatformEnterpriseReadProvider({ enterpriseLoader, children }: { enterpriseLoader: EnterpriseLoader; children: ReactNode }) {
  return <EnterpriseLoaderContext.Provider value={enterpriseLoader}>{children}</EnterpriseLoaderContext.Provider>;
}

type NameProps = {
  enterpriseId: string | null;
  eventEnterpriseName?: string | null;
};

function hasText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function enterpriseDisplayName(enterprise: EnterpriseDto): string | null {
  return enterprise.business_legal_name || enterprise.business_short_name || enterprise.name || null;
}

async function getTenantName(tenantId: string): Promise<string | null> {
  const response = await getPlatformEnterpriseTenants();
  return response.items.find((tenant) => tenant.id === tenantId)?.name ?? null;
}

/** Displays the authoritative legal Enterprise name, with a safe backend-name fallback. */
export function EnterpriseDisplayName({ enterpriseId, eventEnterpriseName }: NameProps) {
  const enterpriseLoader = useContext(EnterpriseLoaderContext);
  const enterpriseQuery = useQuery({
    queryKey: ["platform", "enterprise-display-name", enterpriseId],
    queryFn: () => enterpriseLoader(enterpriseId ?? ""),
    enabled: Boolean(enterpriseId),
    staleTime: 5 * 60_000,
    retry: 1,
  });
  const resolvedName = enterpriseQuery.data ? enterpriseDisplayName(enterpriseQuery.data) : null;
  if (resolvedName) return <>{resolvedName}</>;
  if (hasText(eventEnterpriseName)) return <>{eventEnterpriseName}</>;
  if (!enterpriseId) return <>Tenant-owned</>;
  if (enterpriseQuery.isPending) return <span className="text-[#7f9d94]">Loading enterprise…</span>;
  return <>Enterprise information unavailable</>;
}

/** Displays a tenant name only when the authenticated tenant catalogue can resolve this Event tenant. */
export function TenantDisplayName({ tenantId }: { tenantId?: string | null }) {
  const tenantQuery = useQuery({
    queryKey: ["platform", "tenant-display-name", tenantId],
    queryFn: () => getTenantName(tenantId ?? ""),
    enabled: Boolean(tenantId),
    staleTime: 5 * 60_000,
    retry: 1,
  });
  if (!tenantId) return <>Tenant information unavailable</>;
  if (tenantQuery.data) return <>{tenantQuery.data}</>;
  if (tenantQuery.isPending) return <span className="text-[#7f9d94]">Loading tenant…</span>;
  return <>Tenant information unavailable</>;
}
