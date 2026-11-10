import assert from "node:assert/strict";
import test from "node:test";

test("refund list sends only deployed filters and UTC date boundaries", async () => {
  const { buildRefundListParams } = await import(new URL("./platform-refunds-live.ts", import.meta.url).href);
  assert.deepEqual(buildRefundListParams({ status: "processing", paymentId: "payment-id", tenantId: "tenant-id", overdue: "false", from: "2026-10-01", to: "2026-10-31" }, 2, 20), {
    status: "processing", payment_id: "payment-id", tenant_id: "tenant-id", overdue: false,
    date_from: "2026-10-01T00:00:00.000Z", date_to: "2026-10-31T23:59:59.999Z", page: 2, page_size: 20,
  });
});

test("refund list omits unsupported or unselected filters", async () => {
  const { buildRefundListParams } = await import(new URL("./platform-refunds-live.ts", import.meta.url).href);
  assert.deepEqual(buildRefundListParams({ status: "", paymentId: "", tenantId: "", overdue: "all", from: "", to: "" }, 1, 20), {
    status: undefined, payment_id: undefined, tenant_id: undefined, overdue: undefined,
    date_from: undefined, date_to: undefined, page: 1, page_size: 20,
  });
});

test("refund pagination never produces NaN when response metadata is absent", async () => {
  const { getRefundPagination } = await import(new URL("./platform-refunds-live.ts", import.meta.url).href);
  assert.deepEqual(getRefundPagination({ items: [], total: 41 }, 3, 20), { page: 3, pageSize: 20, total: 41, pageCount: 3 });
  assert.deepEqual(getRefundPagination({ items: [], total: 0, page: 1, page_size: 20 }, 1, 20), { page: 1, pageSize: 20, total: 0, pageCount: 1 });
});

test("unknown backend refund action identifiers remain readable but non-executable", async () => {
  const { refundActionLabel } = await import(new URL("./platform-refunds-live.ts", import.meta.url).href);
  assert.equal(refundActionLabel("approve"), "Approve");
  assert.equal(refundActionLabel("future_backend_action"), "future backend action");
});
