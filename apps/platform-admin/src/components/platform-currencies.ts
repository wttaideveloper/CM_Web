export type CurrencyPreviewStatus = "preview-only";
export type CurrencyStatusFilter = "all" | CurrencyPreviewStatus;

export type CurrencyPreview = {
  code: string;
  name: string;
  decimalPrecision: string;
  minimumPayment: string;
  maximumPayment: string;
  status: CurrencyPreviewStatus;
};

export type ExchangeRatePreview = {
  baseCurrency: string;
  targetCurrency: string;
  rate: string;
  source: string;
  lastUpdated: string;
};

export type ExchangeRateHistoryPreview = ExchangeRatePreview & {
  effectiveDate: string;
  updatedBy: string;
  override: string;
};

/** Illustrative catalog rows only; these do not represent configured platform state. */
export const currencyPreviews: readonly CurrencyPreview[] = [
  {
    code: "INR",
    name: "Indian Rupee",
    decimalPrecision: "Not confirmed",
    minimumPayment: "Not confirmed",
    maximumPayment: "Not confirmed",
    status: "preview-only",
  },
  {
    code: "USD",
    name: "US Dollar",
    decimalPrecision: "Not confirmed",
    minimumPayment: "Not confirmed",
    maximumPayment: "Not confirmed",
    status: "preview-only",
  },
  {
    code: "EUR",
    name: "Euro",
    decimalPrecision: "Not confirmed",
    minimumPayment: "Not confirmed",
    maximumPayment: "Not confirmed",
    status: "preview-only",
  },
  {
    code: "GBP",
    name: "British Pound Sterling",
    decimalPrecision: "Not confirmed",
    minimumPayment: "Not confirmed",
    maximumPayment: "Not confirmed",
    status: "preview-only",
  },
  {
    code: "AED",
    name: "United Arab Emirates Dirham",
    decimalPrecision: "Not confirmed",
    minimumPayment: "Not confirmed",
    maximumPayment: "Not confirmed",
    status: "preview-only",
  },
];

export const exchangeRatePreview: ExchangeRatePreview = {
  baseCurrency: "Not configured",
  targetCurrency: "Not configured",
  rate: "Not available",
  source: "Unknown",
  lastUpdated: "Unknown",
};

export const exchangeRateHistoryPreviews: readonly ExchangeRateHistoryPreview[] = [];

export const commercePreviewMutationsDisabled = true;

export const currencySectionHeadingIds = {
  base: "base-currency-title",
  supported: "supported-currencies-title",
  exchangeRates: "exchange-rates-title",
  history: "exchange-rate-history-title",
  provider: "provider-settings-title",
  enterprise: "enterprise-currency-title",
} as const;

export function filterCurrencyPreviews(
  currencies: readonly CurrencyPreview[],
  search: string,
  status: CurrencyStatusFilter,
) {
  const normalizedSearch = search.trim().toLowerCase();
  return currencies.filter((currency) => {
    const matchesSearch = !normalizedSearch || `${currency.code} ${currency.name}`.toLowerCase().includes(normalizedSearch);
    const matchesStatus = status === "all" || currency.status === status;
    return matchesSearch && matchesStatus;
  });
}

export function filterExchangeRateHistory(
  history: readonly ExchangeRateHistoryPreview[],
  pair: string,
) {
  return history.filter((item) => pair === "all" || `${item.baseCurrency}/${item.targetCurrency}` === pair);
}

export function togglePreviewPanel(isOpen: boolean) {
  return !isOpen;
}
