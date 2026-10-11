import assert from "node:assert/strict";
import test from "node:test";
import { deriveEventPurchaseWindow, syncPurchaseWindow, syncPurchaseWindows } from "./event-service-purchase-window.ts";

test("uses registration opening and the earliest available closing value", () => {
  assert.deepEqual(
    deriveEventPurchaseWindow("2026-10-10T09:00", "2026-10-12T18:00", "2026-10-11T18:00"),
    { start: "2026-10-10T09:00", end: "2026-10-11T18:00" },
  );
});

test("falls back to registration close when cutoff is missing", () => {
  assert.deepEqual(
    deriveEventPurchaseWindow("2026-10-10T09:00", "2026-10-12T18:00", ""),
    { start: "2026-10-10T09:00", end: "2026-10-12T18:00" },
  );
});

test("leaves missing registration values empty without inventing dates", () => {
  assert.deepEqual(deriveEventPurchaseWindow("", "", ""), { start: "", end: "" });
});

test("synchronizes existing options without changing service fields", () => {
  const option = { name: "Lunch", service_start_at: "2026-10-13T09:00", price: "10" };
  assert.deepEqual(
    syncPurchaseWindow(option, { start: "2026-10-10T09:00", end: "2026-10-11T18:00" }),
    { ...option, purchase_start_at: "2026-10-10T09:00", purchase_end_at: "2026-10-11T18:00" },
  );
});

test("synchronizes meals and accommodation option collections", () => {
  const window = { start: "2026-10-10T09:00", end: "2026-10-12T18:00" };
  assert.deepEqual(
    syncPurchaseWindows([{ name: "Meal" }, { name: "Room" }], window),
    [
      { name: "Meal", purchase_start_at: "2026-10-10T09:00", purchase_end_at: "2026-10-12T18:00" },
      { name: "Room", purchase_start_at: "2026-10-10T09:00", purchase_end_at: "2026-10-12T18:00" },
    ],
  );
});
