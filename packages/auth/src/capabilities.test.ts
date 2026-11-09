import assert from "node:assert/strict";
import test from "node:test";

import { getEnterpriseHeaderRoleLabel, getEnterpriseSidebarRoleLabel, resolveEnterprisePortalRole } from "./capabilities.ts";

test("Enterprise Owner presentation uses the authoritative tenant_owner role", () => {
  const role = resolveEnterprisePortalRole(" tenant_owner ");
  assert.equal(role, "owner");
  assert.equal(getEnterpriseSidebarRoleLabel(role), "ENTERPRISE OWNER");
  assert.equal(getEnterpriseHeaderRoleLabel(role), "Enterprise Owner");
});

test("internal_user presentation identifies Staff and Providers without changing eligibility", () => {
  const role = resolveEnterprisePortalRole("internal_user");
  assert.equal(role, "staff");
  assert.equal(getEnterpriseSidebarRoleLabel(role), "STAFF / PROVIDER");
  assert.equal(getEnterpriseHeaderRoleLabel(role), "Staff");
});

test("loading, missing and unsupported roles use neutral Enterprise labels", () => {
  for (const value of [null, undefined, "tenant_admin", "unknown_role"]) {
    const role = resolveEnterprisePortalRole(value);
    assert.equal(role, "unknown");
    assert.equal(getEnterpriseSidebarRoleLabel(role), "ENTERPRISE");
    assert.equal(getEnterpriseHeaderRoleLabel(role), "Enterprise");
  }
});
