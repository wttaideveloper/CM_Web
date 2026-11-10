import assert from "node:assert/strict";
import test from "node:test";
import type { PaymentGatewayPreview } from "./platform-payment-settings";

test("Commerce route resolution selects the Payment Settings screen and rejects invalid sections", async () => {
  const { resolvePlatformCommerceSection } = await import(new URL("../lib/platform-commerce-routes.ts", import.meta.url).href);
  assert.equal(resolvePlatformCommerceSection(undefined), "overview");
  assert.equal(resolvePlatformCommerceSection(["payment-settings"]), "payment-settings");
  assert.equal(resolvePlatformCommerceSection(["currencies"]), "currencies");
  assert.equal(resolvePlatformCommerceSection(["tax"]), "tax");
  assert.equal(resolvePlatformCommerceSection(["transactions"]), "transactions");
  assert.equal(resolvePlatformCommerceSection(["refunds"]), "refunds");
  assert.equal(resolvePlatformCommerceSection(["settlements"]), "settlements");
  assert.equal(resolvePlatformCommerceSection(["invoices"]), "invoices");
  assert.equal(resolvePlatformCommerceSection(["reports"]), "reports");
  assert.equal(resolvePlatformCommerceSection(["reports"]), "reports");
  assert.equal(resolvePlatformCommerceSection(["payment-settings", "unexpected"]), null);
});

test("payment settings exposes only API-safe gateway previews", async () => {
  const { getPaymentGatewayPreview, paymentGatewayPreviews } = await import(new URL("./platform-payment-settings.ts", import.meta.url).href);
  const previews = paymentGatewayPreviews as readonly PaymentGatewayPreview[];

  assert.deepEqual(previews.map((gateway) => gateway.id), ["razorpay", "stripe", "paypal"]);
  assert.equal(getPaymentGatewayPreview("razorpay")?.availability, "preview-only");
  assert.equal(getPaymentGatewayPreview("stripe")?.availability, "preview-only");
  assert.equal(getPaymentGatewayPreview("paypal")?.availability, "unsupported");
  assert.equal(getPaymentGatewayPreview("razorpay")?.environment, "Unknown");
});
