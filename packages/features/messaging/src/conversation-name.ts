const CUSTOMER_FALLBACK_NAME = "Customer";

/**
 * Resolves a conversation's customer label without exposing non-name values.
 *
 * The provider conversation API may return the customer name directly, while
 * older responses may only include a named participant record.
 */
export function resolveCustomerDisplayName(
  customerName: unknown,
  participantName?: unknown,
): string {
  for (const value of [customerName, participantName]) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return CUSTOMER_FALLBACK_NAME;
}
