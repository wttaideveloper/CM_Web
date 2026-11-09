import type { CreateProductPayload } from "./types/product.types";

/** Localized labels used by the Product tax-class selector. */
export interface ProductTaxClassLabels {
  standard: string;
  reduced: string;
  zeroRate: string;
}

/** Select option for a backend tax-class identifier. */
export interface ProductTaxClassOption {
  value: string;
  label: string;
}

/** Preserves an existing class identifier exactly apart from surrounding whitespace. */
export function normalizeProductTaxClass(value?: string | null): string {
  return value?.trim() ?? "";
}

/**
 * Returns the supported Product tax-class identifiers and keeps an unknown
 * existing backend value selectable instead of silently dropping it.
 */
export function getProductTaxClassOptions(
  labels: ProductTaxClassLabels,
  currentValue?: string | null,
): ProductTaxClassOption[] {
  const options: ProductTaxClassOption[] = [
    { value: "standard", label: labels.standard },
    { value: "reduced", label: labels.reduced },
    { value: "zero_rate", label: labels.zeroRate },
  ];
  const normalizedValue = normalizeProductTaxClass(currentValue);

  if (normalizedValue && !options.some((option) => option.value === normalizedValue)) {
    options.push({ value: normalizedValue, label: normalizedValue });
  }

  return options;
}

/** Preserves the existing optional Product tax_class request behavior. */
export function buildProductTaxClassPayload(value?: string | null): Pick<CreateProductPayload, "tax_class"> {
  const normalizedValue = normalizeProductTaxClass(value);
  return normalizedValue ? { tax_class: normalizedValue } : {};
}
