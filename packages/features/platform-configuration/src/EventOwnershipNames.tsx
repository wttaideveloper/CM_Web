"use client";

import { useQuery } from "@tanstack/react-query";
import { getEnterpriseById, type EnterpriseDto } from "@ihp/enterprises";

type NameProps = {
  enterpriseId: string;
  eventEnterpriseName?: string | null;
};

function hasText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function enterpriseDisplayName(enterprise: EnterpriseDto): string | null {
  return enterprise.business_legal_name || enterprise.business_short_name || enterprise.name || null;
}

function tenantItems(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  return Array.isArray(record.data) ? record.data : Array.isArray(record.items) ? record.items : Array.isArray(record.tenants) ? record.tenants : [];
}

function tenantNameFromResponse(value: unknown, tenantId: string): string | null {
  for (const item of tenantItems(value)) {
    if (!item || typeof item !== "object") continue;
    const tenant = item as Record<string, unknown>;
    const id = tenant.id ?? tenant.tenant_id ?? tenant.tenantId;
    const name = tenant.name ?? tenant.tenant_name ?? tenant.tenantName ?? tenant.organizationName;
    if (id === tenantId && typeof name === "string" && name.trim()) return name;
  }
  return null;
}

async function getTenantName(tenantId: string): Promise<string | null> {
  const response = await fetch("/api/v1/auth/tenants", { credentials: "include" });
  if (!response.ok) return null;
  return tenantNameFromResponse(await response.json(), tenantId);
}

/** Displays the authoritative legal Enterprise name, with a safe backend-name fallback. */
export function EnterpriseDisplayName({ enterpriseId, eventEnterpriseName }: NameProps) {
  const enterpriseQuery = useQuery({
    queryKey: ["platform", "enterprise-display-name", enterpriseId],
    queryFn: () => getEnterpriseById(enterpriseId),
    staleTime: 5 * 60_000,
    retry: 1,
  });
  const resolvedName = enterpriseQuery.data ? enterpriseDisplayName(enterpriseQuery.data) : null;
  if (resolvedName) return <>{resolvedName}</>;
  if (hasText(eventEnterpriseName)) return <>{eventEnterpriseName}</>;
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
