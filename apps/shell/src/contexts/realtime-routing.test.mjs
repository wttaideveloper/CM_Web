import assert from "node:assert/strict";
import test from "node:test";

const { shouldUseNormalEnterpriseRealtimeAuth } = await import("./realtime-routing.ts");

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
