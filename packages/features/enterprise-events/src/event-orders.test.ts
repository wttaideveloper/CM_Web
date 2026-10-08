import assert from "node:assert/strict";
import { test } from "node:test";

import { parseEventOrdersResponse } from "./event-orders-parser.ts";

test("accepts the production Event order shape with nullable payment fields", () => {
  const orders = parseEventOrdersResponse([{
    id: "order-1",
    status: "confirmed",
    participant_name: "asgaard",
    participant_email: "participant@example.test",
    payment_provider: null,
    refund_reason: null,
    ticket_type_id: "ticket-1",
    ticket_subtotal: "1212.00",
    quantity: "1",
    meal_subtotal: "0.00",
    amount: "1212.00",
    accommodation_subtotal: "0.00",
    currency: "USD",
    payment_status: "pending",
  }]);

  assert.equal(orders.length, 1);
  assert.equal(orders[0]?.payment_provider, null);
  assert.equal(orders[0]?.refund_reason, null);
  assert.equal(orders[0]?.quantity, "1");
  assert.equal(orders[0]?.amount, "1212.00");
});
