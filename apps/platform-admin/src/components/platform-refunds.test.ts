import assert from "node:assert/strict";
import test from "node:test";

test("refund action labels cover the Phase 6 confirmation surface", async () => {
  const { getRefundActionLabel, refundActionNames } = await import(new URL("./platform-refunds.ts", import.meta.url).href);

  assert.deepEqual(refundActionNames, ["full_refund", "partial_refund", "approve", "reject", "retry", "record_manual_completion"]);
  assert.equal(getRefundActionLabel("partial_refund"), "Partial refund");
  assert.equal(getRefundActionLabel("reject"), "Reject");
  assert.equal(getRefundActionLabel("record_manual_completion"), "Record manual completion");
});

test("refund filtering does not fabricate records or calculate eligibility", async () => {
  const { filterRefunds, refundPreviews } = await import(new URL("./platform-refunds.ts", import.meta.url).href);

  assert.equal(refundPreviews.length, 0);
  assert.equal(filterRefunds(refundPreviews, { search: "", enterprise: "", module: "", currency: "", status: "" }).length, 0);
});
