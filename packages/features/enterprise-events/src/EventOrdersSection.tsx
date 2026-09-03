"use client";

import { useQuery } from "@tanstack/react-query";

import { formatEventDateTime } from "./event-detail-formatters";
import EventRefundAction from "./EventRefundAction";
import { EventsApiError, getEventOrders, type EventOrder } from "./events.service";

/** Lazy Event-detail view for backend-authoritative order records. */
export default function EventOrdersSection({
  eventId,
  timeZone,
}: {
  eventId: string;
  timeZone: string;
}) {
  const ordersQuery = useQuery({
    queryKey: ["events", "orders", eventId],
    queryFn: () => getEventOrders(eventId),
    enabled: Boolean(eventId),
    staleTime: 30_000,
    retry: 1,
  });

  if (ordersQuery.isLoading) {
    return <OrdersLoadingState />;
  }
  if (ordersQuery.isError) {
    return <OrdersErrorState error={ordersQuery.error} retry={() => void ordersQuery.refetch()} />;
  }
  if (!ordersQuery.data || ordersQuery.data.length === 0) {
    return <OrdersEmptyState />;
  }

  return (
    <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7f9d94]">Event orders</p>
        <h2 className="mt-1 text-lg font-bold text-[#06201c]">Purchase records</h2>
        <p className="mt-1 text-sm text-[#52736a]">Read-only order and payment information for this event.</p>
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="hidden min-w-[1050px] w-full text-left text-sm md:table">
          <thead className="border-b border-[#d7e5df] text-xs font-bold uppercase tracking-[0.08em] text-[#52736a]">
            <tr>
              <th scope="col" className="px-3 py-3">Participant</th>
              <th scope="col" className="px-3 py-3">Email</th>
              <th scope="col" className="px-3 py-3">Quantity</th>
              <th scope="col" className="px-3 py-3">Amount</th>
              <th scope="col" className="px-3 py-3">Currency</th>
              <th scope="col" className="px-3 py-3">Payment status</th>
              <th scope="col" className="px-3 py-3">Order status</th>
              <th scope="col" className="px-3 py-3">Payment provider</th>
              <th scope="col" className="px-3 py-3">Ticket type</th>
              <th scope="col" className="px-3 py-3">Created at</th>
              <th scope="col" className="px-3 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf3f0]">
            {ordersQuery.data.map((order) => <OrderTableRow key={order.id} eventId={eventId} order={order} timeZone={timeZone} />)}
          </tbody>
        </table>
      </div>
      <ul className="mt-5 space-y-3 md:hidden">
        {ordersQuery.data.map((order) => <OrderCard key={order.id} eventId={eventId} order={order} timeZone={timeZone} />)}
      </ul>
    </section>
  );
}

function OrderTableRow({ eventId, order, timeZone }: { eventId: string; order: EventOrder; timeZone: string }) {
  return <tr className="align-top text-[#31594d]"><td className="px-3 py-4 font-semibold text-[#06201c]">{displayOrDash(order.participant_name)}</td><td className="px-3 py-4 break-all">{displayOrDash(order.participant_email)}</td><td className="px-3 py-4">{displayOrDash(order.quantity)}</td><td className="px-3 py-4 font-semibold text-[#06201c]">{formatAmount(order.amount)}</td><td className="px-3 py-4">{displayOrDash(order.currency)}</td><td className="px-3 py-4"><StatusWithRefund status={order.payment_status} refundReason={order.refund_reason} /></td><td className="px-3 py-4">{formatStatus(order.status)}</td><td className="px-3 py-4">{displayOrDash(order.payment_provider)}</td><td className="px-3 py-4 break-all">{displayOrDash(order.ticket_type_id)}</td><td className="px-3 py-4 whitespace-nowrap">{formatEventDateTime(order.created_at, timeZone)}</td><td className="px-3 py-4"><EventRefundAction eventId={eventId} target="order" targetId={order.id} refundState={getRefundState(order.status, order.payment_status)} /></td></tr>;
}

function OrderCard({ eventId, order, timeZone }: { eventId: string; order: EventOrder; timeZone: string }) {
  return <li className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-[#06201c]">{displayOrDash(order.participant_name)}</p><p className="mt-1 break-all text-sm text-[#52736a]">{displayOrDash(order.participant_email)}</p></div><EventRefundAction eventId={eventId} target="order" targetId={order.id} refundState={getRefundState(order.status, order.payment_status)} /></div><dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm"><OrderField label="Quantity" value={displayOrDash(order.quantity)} /><OrderField label="Amount" value={formatAmount(order.amount)} /><OrderField label="Currency" value={displayOrDash(order.currency)} /><OrderField label="Payment status" value={<StatusWithRefund status={order.payment_status} refundReason={order.refund_reason} />} /><OrderField label="Order status" value={formatStatus(order.status)} /><OrderField label="Payment provider" value={displayOrDash(order.payment_provider)} /><OrderField label="Ticket type" value={displayOrDash(order.ticket_type_id)} /><OrderField label="Created at" value={formatEventDateTime(order.created_at, timeZone)} /></dl></li>;
}

function OrderField({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><dt className="text-xs font-bold uppercase tracking-[0.08em] text-[#7f9d94]">{label}</dt><dd className="mt-1 break-all font-semibold text-[#31594d]">{value}</dd></div>;
}

function StatusWithRefund({ status, refundReason }: { status: string; refundReason: string | null }) {
  return <><span>{formatStatus(status)}</span>{refundReason ? <span className="mt-1 block text-xs text-[#52736a]">Refund reason: {refundReason}</span> : null}</>;
}

function getRefundState(orderStatus: string, paymentStatus: string): "refund_requested" | "refunded" | undefined {
  if (orderStatus === "refunded" || paymentStatus === "refunded") return "refunded";
  if (orderStatus === "refund_requested" || paymentStatus === "refund_requested") return "refund_requested";
  return undefined;
}

function OrdersLoadingState() {
  return <section role="status" aria-label="Loading event orders" className="space-y-3"><div className="h-20 animate-pulse rounded-2xl bg-[#edf3f0]" /><div className="h-48 animate-pulse rounded-2xl bg-[#f1f4f3]" /></section>;
}

function OrdersEmptyState() {
  return <section className="rounded-2xl border border-dashed border-[#d7e5df] bg-[#f9fcfa] px-5 py-12 text-center"><p className="font-bold text-[#06201c]">No orders yet.</p><p className="mt-2 text-sm text-[#52736a]">Purchase records for this event will appear here.</p></section>;
}

function OrdersErrorState({ error, retry }: { error: Error; retry: () => void }) {
  return <section className="rounded-2xl border border-[#f3d5d1] bg-[#fff7f6] px-5 py-12 text-center"><p role="alert" className="font-bold text-[#b42318]">{getOrdersErrorMessage(error)}</p><button type="button" onClick={retry} className="mt-3 text-sm font-semibold text-[#1f6a58] underline">Try again</button></section>;
}

function displayOrDash(value: string): string {
  return value.trim() || "—";
}

function formatAmount(amount: string): string {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed)) {
    return displayOrDash(amount);
  }
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(parsed);
}

function formatStatus(value: string): string {
  const normalized = value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").trim();
  return normalized ? normalized.replace(/\b\w/g, (character) => character.toUpperCase()) : "—";
}

function getOrdersErrorMessage(error: Error): string {
  if (!(error instanceof EventsApiError)) return "Unable to load orders. Please try again.";
  if (error.status === 401 || error.status === 403) return "You do not have access to these orders.";
  if (error.status === 404) return "Orders are not available for this event.";
  return "Unable to load orders. Please try again.";
}
