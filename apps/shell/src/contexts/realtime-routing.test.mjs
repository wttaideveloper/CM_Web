import assert from "node:assert/strict";
import test from "node:test";

const { shouldUseGroupRealtimeAuth, shouldUseNormalEnterpriseRealtimeAuth } = await import("./realtime-routing.ts");

test("uses normal Enterprise realtime auth for a ready authenticated messages route", () => {
  assert.equal(
    shouldUseNormalEnterpriseRealtimeAuth("/admin/messages", true, true, true, true),
    true,
  );
});

test("keeps marketplace realtime auth for other compatibility routes", () => {
  assert.equal(
    shouldUseNormalEnterpriseRealtimeAuth("/admin/notifications", true, true, true, true),
    false,
  );
  assert.equal(
    shouldUseNormalEnterpriseRealtimeAuth("/notifications", true, true, true, true),
    false,
  );
});

test("does not select normal realtime auth before Web Auth and chat readiness", () => {
  assert.equal(
    shouldUseNormalEnterpriseRealtimeAuth("/admin/messages", false, true, true, true),
    false,
  );
  assert.equal(
    shouldUseNormalEnterpriseRealtimeAuth("/admin/messages", true, false, true, true),
    false,
  );
  assert.equal(
    shouldUseNormalEnterpriseRealtimeAuth("/admin/messages", true, true, false, true),
    false,
  );
  assert.equal(
    shouldUseNormalEnterpriseRealtimeAuth("/admin/messages", true, true, true, false),
    false,
  );
});

test("selects Group realtime auth for an authenticated Enterprise user without Direct Chat eligibility", () => {
  assert.equal(
    shouldUseGroupRealtimeAuth("/admin/messages", true, true, true, true),
    true,
  );
});

test("keeps Group realtime disabled until authentication and the feature flag are ready", () => {
  assert.equal(
    shouldUseGroupRealtimeAuth("/admin/messages", false, true, true, true),
    false,
  );
  assert.equal(
    shouldUseGroupRealtimeAuth("/admin/messages", true, false, true, true),
    false,
  );
  assert.equal(
    shouldUseGroupRealtimeAuth("/admin/messages", true, true, false, true),
    false,
  );
  assert.equal(
    shouldUseGroupRealtimeAuth("/admin/messages", true, true, true, false),
    false,
  );
});

test("does not change the existing Direct Chat provider eligibility decision", () => {
  assert.equal(
    shouldUseNormalEnterpriseRealtimeAuth("/admin/messages", true, true, false, true),
    false,
  );
  assert.equal(
    shouldUseGroupRealtimeAuth("/admin/messages", true, true, true, true),
    true,
  );
});
