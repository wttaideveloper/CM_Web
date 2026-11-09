import assert from "node:assert/strict";
import test from "node:test";

test("settlement states and operations remain extensible and disabled-safe", async () => {
  const { getSettlementActionLabel, getSettlementStatusLabel, settlementActionNames, settlementStatusPreviewStates } = await import(new URL("./platform-settlements.ts", import.meta.url).href);

  assert.deepEqual(settlementStatusPreviewStates, ["pending", "processing", "completed", "failed", "cancelled"]);
  assert.equal(getSettlementStatusLabel("processing"), "Processing");
  assert.equal(getSettlementStatusLabel("backend_review"), "backend_review");
  assert.equal(settlementActionNames.length, 7);
  assert.equal(getSettlementActionLabel("dry_run"), "Dry run");
});

test("settlement filtering does not invent records or perform calculations", async () => {
  const { filterSettlements, settlementPreviews } = await import(new URL("./platform-settlements.ts", import.meta.url).href);

  assert.equal(settlementPreviews.length, 0);
  assert.equal(filterSettlements(settlementPreviews, { search: "", enterprise: "", currency: "", status: "" }).length, 0);
});
