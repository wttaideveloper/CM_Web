export type PaymentGatewayId = "razorpay" | "stripe" | "paypal";

export type PaymentGatewayPreview = {
  id: PaymentGatewayId;
  name: string;
  availability: "preview-only" | "unsupported";
  summary: string;
  environment: "Unknown";
};

/** Static, API-safe gateway presentation metadata for the Phase 2 settings preview. */
export const paymentGatewayPreviews: readonly PaymentGatewayPreview[] = [
  {
    id: "razorpay",
    name: "Razorpay",
    availability: "preview-only",
    summary: "Gateway configuration will be available when the documented management API is provided.",
    environment: "Unknown",
  },
  {
    id: "stripe",
    name: "Stripe",
    availability: "preview-only",
    summary: "Gateway configuration will be available when the documented management API is provided.",
    environment: "Unknown",
  },
  {
    id: "paypal",
    name: "PayPal",
    availability: "unsupported",
    summary: "PayPal is not currently supported by the documented backend contract.",
    environment: "Unknown",
  },
];

export function getPaymentGatewayPreview(id: PaymentGatewayId) {
  return paymentGatewayPreviews.find((gateway) => gateway.id === id) ?? null;
}
