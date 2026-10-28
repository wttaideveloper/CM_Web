import type { ProductMode } from "./types/product-screen-config.types";

/** Local form values retained for navigation recovery during the current app session. */
export interface ProductCreateDraft {
  activeTab: string;
  enterpriseId: string;
  productName: string;
  productDescription: string;
  productCategory: string;
  productPrice: string;
  productImages: string;
  locationId: string;
  providerUserId: string;
  providerName: string;
  sku: string;
  barcodeUpc: string;
  weight: string;
  dimensions: string;
  salePrice: string;
  costPrice: string;
  taxClass: string;
  stockQuantity: string;
  lowStockAlertThreshold: string;
  stockManagement: string;
  currency: string;
  publishStatus: string;
  customAttributes: Array<{
    id: string;
    attribute_name: string;
    attribute_value: string;
    attribute_type: string;
  }>;
}

const productCreateDrafts = new Map<string, ProductCreateDraft>();

/** Returns a tenant-scoped in-memory key for an Enterprise Admin's unfinished product form. */
export function productCreateDraftKey(mode: ProductMode, tenantId?: string, enterpriseId?: string): string | null {
  if (mode !== "enterprise-admin" || !tenantId?.trim() || !enterpriseId?.trim()) return null;
  return `${tenantId.trim()}:${enterpriseId.trim()}`;
}

/** Reads a copy of an unfinished product form without exposing the stored mutable object. */
export function getProductCreateDraft(key: string): ProductCreateDraft | null {
  const draft = productCreateDrafts.get(key);
  return draft ? { ...draft, customAttributes: draft.customAttributes.map((attribute) => ({ ...attribute })) } : null;
}

/** Keeps an unfinished product form available while navigating within the current app session. */
export function saveProductCreateDraft(key: string, draft: ProductCreateDraft): void {
  productCreateDrafts.set(key, {
    ...draft,
    customAttributes: draft.customAttributes.map((attribute) => ({ ...attribute })),
  });
}

/** Removes the in-memory product draft after a successful create or explicit reset. */
export function clearProductCreateDraft(key: string): void {
  productCreateDrafts.delete(key);
}
