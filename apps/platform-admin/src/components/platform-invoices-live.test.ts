import assert from "node:assert/strict";
import test from "node:test";

test("invoice list uses only deployed filters and UTC date boundaries", async () => {
  const { buildInvoiceListParams } = await import(new URL("./platform-invoices-live.ts", import.meta.url).href);
  assert.deepEqual(buildInvoiceListParams({ search: "INV-10", paymentId: "pay-id", tenantId: "tenant-id", documentType: "credit_note", from: "2026-10-01", to: "2026-10-31" }, 2, 20), {
    search: "INV-10", payment_id: "pay-id", tenant_id: "tenant-id", doc_type: "credit_note",
    date_from: "2026-10-01T00:00:00.000Z", date_to: "2026-10-31T23:59:59.999Z", page: 2, page_size: 20,
  });
});

test("invoice pagination falls back safely when response metadata is missing", async () => {
  const { getInvoicePagination } = await import(new URL("./platform-invoices-live.ts", import.meta.url).href);
  assert.deepEqual(getInvoicePagination({ items: [], total: 41 }, 3, 20), { page: 3, pageSize: 20, total: 41, pageCount: 3 });
  assert.deepEqual(getInvoicePagination({ items: [], total: 0, page: 1, page_size: 20 }, 1, 20), { page: 1, pageSize: 20, total: 0, pageCount: 1 });
});

test("invoice action labels preserve unknown backend values", async () => {
  const { invoiceActionLabel } = await import(new URL("./platform-invoices-live.ts", import.meta.url).href);
  assert.equal(invoiceActionLabel("download_pdf"), "Download PDF");
  assert.equal(invoiceActionLabel("future_action"), "future action");
});

test("invoice failures map to safe status-specific messages", async () => {
  const { invoiceErrorKey } = await import(new URL("./platform-invoices-live.ts", import.meta.url).href);
  assert.equal(invoiceErrorKey(401), "sessionExpired");
  assert.equal(invoiceErrorKey(403), "accessDenied");
  assert.equal(invoiceErrorKey(404), "resourceNotFound");
  assert.equal(invoiceErrorKey(422), "invalidRequest");
  assert.equal(invoiceErrorKey(502), "dataUnavailable");
  assert.equal(invoiceErrorKey(undefined), "dataUnavailable");
});

test("all invoice resource keys resolve through the Platform Admin i18n instance", async () => {
  const [{ createInstance, default: sharedI18n }, { initReactI18next }, { default: messages }] = await Promise.all([
    import("i18next"),
    import("react-i18next"),
    import(new URL("../i18n/locales/en/platform.ts", import.meta.url).href),
  ]);
  await sharedI18n.init({ resources: { en: { unrelated: { loaded: "Loaded" } } }, lng: "en", defaultNS: "unrelated" });
  const i18n = createInstance();
  const initialized = i18n.use(initReactI18next).init({ resources: { en: { platform: messages } }, lng: "en", fallbackLng: "en", defaultNS: "platform", initAsync: false, interpolation: { escapeValue: false }, react: { useSuspense: false } });
  assert.equal(i18n.isInitialized, true, "inline locale resources initialize synchronously");
  await initialized;
  for (const key of Object.keys(messages.commerceInvoices)) {
    const translationKey = `commerceInvoices.${key}`;
    const resolved = i18n.t(translationKey, { ns: "platform", id: "invoice-id", label: "Invoices", page: 1, pages: 1, count: 0 });
    assert.notEqual(resolved, translationKey, `${translationKey} must resolve`);
    assert.equal(resolved.includes("commerceInvoices."), false, `${translationKey} must not render as a raw key`);
  }
});

test("invoice table keeps the concise priority columns and preserves returned amount text", async () => {
  const { getInvoiceListDisplayValues, invoiceDocumentTypeKey, invoiceListColumnKeys } = await import(new URL("./platform-invoices-live.ts", import.meta.url).href);
  assert.deepEqual(invoiceListColumnKeys, ["number", "type", "total", "status", "issued"]);
  assert.deepEqual(getInvoiceListDisplayValues({ number: "INV-1", doc_type: "credit_note", total: "0.10", currency: "INR", status: "issued", issued_at: "2026-11-02T10:00:00Z" }), {
    number: "INV-1", type: "credit_note", total: "0.10 INR", status: "issued", issued: "2026-11-02T10:00:00Z",
  });
  assert.equal(invoiceDocumentTypeKey("credit_note"), "creditNote");
  assert.equal(invoiceDocumentTypeKey("future_note"), null);
});
