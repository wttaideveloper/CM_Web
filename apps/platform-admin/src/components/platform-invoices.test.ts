import assert from "node:assert/strict";
import test from "node:test";

test("invoice document types and actions cover the Phase 8 UI", async () => {
  const { getInvoiceActionLabel, invoiceActionNames, invoiceDocumentTypes } = await import(new URL("./platform-invoices.ts", import.meta.url).href);

  assert.deepEqual(invoiceDocumentTypes, ["Invoice", "Credit Note", "Debit Note"]);
  assert.deepEqual(invoiceActionNames, ["view_invoice", "download_pdf", "email_invoice", "generate_invoice", "create_debit_note", "view_credit_notes"]);
  assert.equal(getInvoiceActionLabel("download_pdf"), "Download PDF");
  assert.equal(getInvoiceActionLabel("create_debit_note"), "Create debit note");
});

test("invoice filtering does not invent invoice numbers or payment records", async () => {
  const { filterInvoices, invoicePreviews } = await import(new URL("./platform-invoices.ts", import.meta.url).href);

  assert.equal(invoicePreviews.length, 0);
  assert.equal(filterInvoices(invoicePreviews, { search: "", enterprise: "", documentType: "" }).length, 0);
});
