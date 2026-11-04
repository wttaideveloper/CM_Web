import type { SettlementListParams, SettlementResponse } from "@ihp/commerce";

export const ENTERPRISE_SETTLEMENT_PAGE_SIZE = 25;

export type EnterpriseSettlementFilters = { status: string; dateFrom: string; dateTo: string };

/** Builds the deployed page-based list request; tenant scope is always session-derived. */
export function buildEnterpriseSettlementParams(filters: EnterpriseSettlementFilters, page: number): SettlementListParams {
  return {
    page,
    page_size: ENTERPRISE_SETTLEMENT_PAGE_SIZE,
    status: filters.status.trim() || undefined,
    date_from: filters.dateFrom || undefined,
    date_to: filters.dateTo || undefined,
  };
}

export function normalizeEnterpriseSettlementPage(value: unknown, requestedPage: number): { items: readonly SettlementResponse[]; total: number; page: number; page_size: number } {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("The Settlement service returned an invalid list response.");
  const response = value as Record<string, unknown>;
  if (!Array.isArray(response.items) || typeof response.total !== "number" || !Number.isFinite(response.total) || response.total < 0) {
    throw new Error("The Settlement service returned an invalid list response.");
  }
  const page = positiveInteger(response.page) ? response.page : requestedPage;
  const pageSize = positiveInteger(response.page_size) ? response.page_size : ENTERPRISE_SETTLEMENT_PAGE_SIZE;
  return { items: response.items as SettlementResponse[], total: response.total, page, page_size: pageSize };
}

/** Settlement caches cannot be shared across signed-in accounts or selected enterprises. */
export function enterpriseSettlementQueryKeys(accountId: string, tenantId: string, enterpriseId: string) {
  const root = ["enterprise-commerce", accountId, tenantId, enterpriseId, "settlements"] as const;
  return {
    list: (params: SettlementListParams) => [...root, "list", params] as const,
    detail: (settlementId: string) => [...root, "detail", settlementId] as const,
    config: [...root, "config"] as const,
  };
}

export function settlementConfigMatchesTenant(config: { tenant_id?: string | null } | null | undefined, authenticatedTenantId: string | null): boolean {
  return Boolean(authenticatedTenantId && config?.tenant_id && config.tenant_id === authenticatedTenantId);
}

export function assertSettlementTenant<T extends { tenant_id: string }>(settlement: T, authenticatedTenantId: string): T {
  if (settlement.tenant_id !== authenticatedTenantId) throw new Error("The settlement response did not match the authenticated tenant scope.");
  return settlement;
}

export function assertSettlementListTenant<T extends { items: readonly { tenant_id: string }[] }>(response: T, authenticatedTenantId: string): T {
  return { ...response, items: response.items.map((item) => assertSettlementTenant(item, authenticatedTenantId)) };
}

export function hasEnterpriseSettlementScope(accountId: string | null, tenantId: string | null, enterpriseId: string | null): boolean {
  return Boolean(accountId && tenantId && enterpriseId);
}

export function settlementStatusLabel(status: string): string {
  return status.replace(/[_-]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

/** Uses the backend display reference, falling back to the resource ID without changing detail routing. */
export function settlementListReference(reference: string | null | undefined, id: string): string {
  return reference?.trim() || id;
}

function positiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}
