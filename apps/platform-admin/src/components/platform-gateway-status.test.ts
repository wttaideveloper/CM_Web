import assert from "node:assert/strict";
import test from "node:test";

async function getGatewayHelpers() {
  return import(new URL("./platform-gateway-status.ts", import.meta.url).href);
}

test("gateway status mapping preserves authoritative provider and webhook fields without secrets", async () => {
  const { mapGatewayStatus } = await getGatewayHelpers();
  const view = mapGatewayStatus({
    editable: false,
    edit_note: "Managed by the platform service",
    active_gateway: "razorpay",
    active_mode: "live",
    base_currency: "INR",
    providers: [{
      provider: "razorpay",
      label: "Razorpay",
      active: true,
      configured: true,
      mode: "live",
      webhook_secret_set: true,
      webhook_url: "https://example.test/webhook",
      webhook_events: ["payment.captured"],
    }],
    warnings: ["Review webhook delivery"],
  });

  assert.equal(view.activeGateway, "razorpay");
  assert.equal(view.activeMode, "live");
  assert.equal(view.editability, "Read-only");
  assert.equal(view.baseCurrency, "INR");
  assert.equal(view.providers[0]?.configured, "Configured");
  assert.equal(view.providers[0]?.webhookSecret, "Configured (secret hidden)");
  assert.deepEqual(view.providers[0]?.webhookEvents, ["payment.captured"]);
  assert.deepEqual(view.warnings, ["Review webhook delivery"]);
});

test("gateway status mapping handles unknown providers and missing optional fields honestly", async () => {
  const { mapGatewayStatus } = await getGatewayHelpers();
  const view = mapGatewayStatus({
    active_gateway: "future_gateway",
    providers: [{ provider: "future_gateway", label: null, active: null, configured: null, webhook_events: null }],
    warnings: null,
  });

  assert.equal(view.activeGateway, "future_gateway");
  assert.equal(view.providers[0]?.name, "future_gateway");
  assert.equal(view.providers[0]?.active, "Not supplied");
  assert.equal(view.providers[0]?.configured, "Not supplied");
  assert.equal(view.providers[0]?.webhookSecret, "Not supplied");
  assert.equal(view.providers[0]?.webhookUrl, "Not supplied");
  assert.deepEqual(view.warnings, []);
});
