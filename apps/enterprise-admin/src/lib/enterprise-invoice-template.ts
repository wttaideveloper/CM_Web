import type { InvoiceTemplateResponse } from "@ihp/commerce";

/** Opens the read-only template section by default so its query loads on page entry. */
export const INVOICE_TEMPLATE_PANEL_DEFAULT_EXPANDED = true;

/** Translation-resource keys for the read-only invoice template display. */
export type InvoiceTemplateDisplayFieldKey =
  | "displayName"
  | "numberPrefix"
  | "locale"
  | "accentColor"
  | "logo"
  | "address"
  | "footerText"
  | "terms"
  | "exchangeRateShown"
  | "defaultTemplate";

export interface InvoiceTemplateDisplayField {
  key: InvoiceTemplateDisplayFieldKey;
  value: string | boolean | null;
  imageUrl?: string;
  swatchColor?: string;
  unsafeLogo?: boolean;
}

/**
 * Converts only fields present in the shared invoice-template contract into
 * read-only display data; absent backend values remain null.
 */
export function buildInvoiceTemplateDisplayFields(template: InvoiceTemplateResponse): InvoiceTemplateDisplayField[] {
  const logoUrl = getSafeInvoiceLogoUrl(template.logo_url);
  const accentColor = template.accent_color ?? null;

  return [
    { key: "displayName", value: displayText(template.display_name) },
    { key: "numberPrefix", value: displayText(template.number_prefix) },
    { key: "locale", value: displayText(template.locale) },
    { key: "accentColor", value: displayText(accentColor), swatchColor: accentColor && isHexColor(accentColor) ? accentColor : undefined },
    { key: "logo", value: logoUrl ? "provided" : null, imageUrl: logoUrl ?? undefined, unsafeLogo: Boolean(template.logo_url && !logoUrl) },
    { key: "address", value: displayText(template.address) },
    { key: "footerText", value: displayText(template.footer_text) },
    { key: "terms", value: displayText(template.terms) },
    { key: "exchangeRateShown", value: template.show_exchange_rate ?? null },
    { key: "defaultTemplate", value: template.is_default ?? null },
  ];
}

/** Enables the template request only when authenticated Enterprise scope and the panel are present. */
export function isInvoiceTemplateQueryEnabled(accountId: string | null, enterpriseId: string, expanded: boolean): boolean {
  return Boolean(accountId && enterpriseId && expanded);
}

/** Accepts same-origin root-relative paths or credential-free HTTPS logo URLs. */
export function getSafeInvoiceLogoUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const candidate = value.trim();
  if (!candidate || candidate.includes("\\") || /[\u0000-\u001f]/.test(candidate) || candidate.startsWith("//")) return null;

  if (candidate.startsWith("/")) return candidate;

  try {
    const url = new URL(candidate);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

function isHexColor(value: string): boolean {
  return /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(value);
}

function displayText(value: string | null | undefined): string | null {
  return value && value.trim() ? value : null;
}
