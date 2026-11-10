import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error Node's native TypeScript test runner loads this module by its .ts filename.
import { enterpriseNavigationGroups } from "./enterprise-navigation.ts";

test("Finance navigation exposes Enterprise Payments, Refunds, Invoices, Settlements, Reports and Tax Profile", () => {
  const finance = enterpriseNavigationGroups.find((group) => group.title === "FINANCE");
  assert.deepEqual(finance?.items.map(({ label, href, owner }) => ({ label, href, owner })), [
    { label: "Payments", href: "/admin/finance/payments", owner: "enterprise-admin" },
    { label: "Refunds", href: "/admin/finance/refunds", owner: "enterprise-admin" },
    { label: "Invoices", href: "/admin/finance/invoices", owner: "enterprise-admin" },
    { label: "Settlements", href: "/admin/finance/settlements", owner: "enterprise-admin" },
    { label: "Reports", href: "/admin/finance/reports", owner: "enterprise-admin" },
    { label: "Tax Profile", href: "/admin/finance/tax-profile", owner: "enterprise-admin" },
  ]);
});

test("Finance navigation retains Enterprise Blogs & News navigation", () => {
  const content = enterpriseNavigationGroups.find((group) => group.title === "CONTENT MANAGEMENT");
  assert.deepEqual(content?.items.map(({ label, href }) => ({ label, href })), [
    { label: "My Posts", href: "/admin/my-blogs" },
  ]);
});
