import assert from "node:assert/strict";
import test from "node:test";
import { resolveCustomerDisplayName } from "./conversation-name.ts";

test("uses the backend customer_name for one-to-one conversations", () => {
  assert.equal(resolveCustomerDisplayName("Suresh Inti1"), "Suresh Inti1");
  assert.equal(resolveCustomerDisplayName("Emily -"), "Emily -");
});

test("falls back safely when customer_name is absent or blank", () => {
  assert.equal(resolveCustomerDisplayName(null), "Customer");
  assert.equal(resolveCustomerDisplayName(""), "Customer");
  assert.equal(resolveCustomerDisplayName("   "), "Customer");
  assert.equal(resolveCustomerDisplayName(undefined), "Customer");
  assert.equal(resolveCustomerDisplayName({}), "Customer");
});

test("uses a named participant for older responses", () => {
  assert.equal(resolveCustomerDisplayName(null, "Legacy customer"), "Legacy customer");
});

test("does not replace the conversation subject or unread count", () => {
  const response = {
    subject: "Personalized Health & Wellness Coaching",
    customer_name: "Suresh Inti1",
    unread_count: 1,
  };

  assert.equal(resolveCustomerDisplayName(response.customer_name), "Suresh Inti1");
  assert.equal(response.subject, "Personalized Health & Wellness Coaching");
  assert.equal(response.unread_count, 1);
});
