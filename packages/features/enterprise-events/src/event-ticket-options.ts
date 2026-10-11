import type { Event, EventTicketType } from "./events.service";

export type EventTicketOptionSource = Pick<
  Event,
  "ticket_types" | "default_ticket_type_id" | "price" | "currency"
>;

/**
 * Adds the backend-owned Event base ticket to the existing configured ticket
 * options when the API supplies a real ticket identifier.
 */
export function getEventTicketOptions(
  event: EventTicketOptionSource,
): EventTicketType[] {
  const defaultTicketTypeId = event.default_ticket_type_id?.trim();

  if (
    !defaultTicketTypeId ||
    event.ticket_types.some((ticket) => ticket.id === defaultTicketTypeId)
  ) {
    return event.ticket_types;
  }

  return [
    {
      id: defaultTicketTypeId,
      name: "Default Ticket",
      price: event.price ?? "",
      currency: event.currency,
      capacity: "",
    },
    ...event.ticket_types,
  ];
}

export function formatEventTicketOptionLabel(ticket: EventTicketType): string {
  const price = ticket.price.trim();
  const currency = ticket.currency.trim();
  const amount = [price, currency].filter(Boolean).join(" ");
  return amount ? `${ticket.name} \u2014 ${amount}` : ticket.name;
}
