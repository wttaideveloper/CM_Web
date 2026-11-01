import assert from "node:assert/strict";
import test from "node:test";

import {
  isCommerceNavigationPath,
  isPlatformNavigationGroupExpanded,
  platformNavigationGroups,
} from "./platform-navigation.ts";

test("Platform navigation exposes the complete Commerce Management section", () => {
  const commerce = platformNavigationGroups.find((group) => group.title === "COMMERCE MANAGEMENT");

  assert.ok(commerce);
  assert.equal(commerce.collapsible, true);
  assert.equal(commerce.icon, "chart");
  assert.deepEqual(commerce.items.map((item) => item.href), [
    "/commerce",
    "/commerce/payment-settings",
    "/commerce/currencies",
    "/commerce/tax",
    "/commerce/transactions",
    "/commerce/refunds",
    "/commerce/settlements",
    "/commerce/invoices",
    "/commerce/reports",
  ]);

  assert.equal(isCommerceNavigationPath("/dashboard"), false);
  assert.equal(isCommerceNavigationPath("/commerce"), true);
  assert.equal(isCommerceNavigationPath("/commerce/reports"), true);
  assert.equal(isCommerceNavigationPath("/commercehouse"), false);
  assert.equal(isPlatformNavigationGroupExpanded(commerce, "/dashboard", {}), false);
  assert.equal(isPlatformNavigationGroupExpanded(commerce, "/commerce", {}), true);
  assert.equal(isPlatformNavigationGroupExpanded(commerce, "/commerce/reports", { [commerce.title]: false }), false);
});
