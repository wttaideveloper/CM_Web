import assert from "node:assert/strict";
import test from "node:test";

const { buildPlatformCommerceUrl } = await import("./platform-commerce-route.ts");

test("builds a Platform Admin URL for the Commerce root and nested routes", () => {
  assert.equal(
    buildPlatformCommerceUrl("http://localhost:3002", undefined),
    "http://localhost:3002/commerce",
  );
  assert.equal(
    buildPlatformCommerceUrl("http://localhost:3002", ["payment-settings"]),
    "http://localhost:3002/commerce/payment-settings",
  );
});

test("preserves Commerce query parameters during the cross-app redirect", () => {
  assert.equal(
    buildPlatformCommerceUrl("https://platform.example.test", ["overview"], { currency: "USD", module: ["products", "services"] }),
    "https://platform.example.test/commerce/overview?currency=USD&module=products&module=services",
  );
});
