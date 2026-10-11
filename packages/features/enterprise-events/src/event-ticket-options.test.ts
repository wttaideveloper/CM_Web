import assert from "node:assert/strict";
import test from "node:test";

import {
  formatEventTicketOptionLabel,
  getEventTicketOptions,
} from "./event-ticket-options.ts";

const baseEvent = {
  ticket_types: [
    { id: "configured-1", name: "1212", price: "1212", currency: "USD", capacity: "12" },
  ],
  default_ticket_type_id: "default-1",
  price: "1222",
  currency: "USD",
};

test("adds the backend default ticket before configured ticket types", () => {
  const options = getEventTicketOptions(baseEvent);

  assert.deepEqual(options.map((ticket) => ticket.id), ["default-1", "configured-1"]);
  assert.deepEqual(options[0], {
    id: "default-1",
    name: "Default Ticket",
    price: "1222",
    currency: "USD",
    capacity: "",
  });
});

test("does not invent an option when the backend omits the default ID", () => {
  const options = getEventTicketOptions({ ...baseEvent, default_ticket_type_id: null });

  assert.deepEqual(options, baseEvent.ticket_types);
});

test("does not duplicate a default ID already returned as a configured ticket", () => {
  const options = getEventTicketOptions({
    ...baseEvent,
    default_ticket_type_id: "configured-1",
  });

  assert.equal(options.length, 1);
  assert.equal(options[0]?.id, "configured-1");
});

test("formats ticket labels with authoritative price and currency", () => {
  const options = getEventTicketOptions(baseEvent);

  assert.equal(formatEventTicketOptionLabel(options[0]!), "Default Ticket \u2014 1222 USD");
  assert.equal(formatEventTicketOptionLabel(options[1]!), "1212 \u2014 1212 USD");
});
