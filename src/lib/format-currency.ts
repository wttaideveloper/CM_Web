export function formatCurrency(
  value: number | string | null | undefined,
  currency?: string | null,
): string {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "N/A";
  }

  const normalizedCurrency = currency?.trim().toUpperCase() || "INR";

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: normalizedCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${normalizedCurrency} ${amount.toFixed(2)}`;
  }
}
