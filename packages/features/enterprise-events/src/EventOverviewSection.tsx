"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getEventAttendance,
  getEventOrders,
  getEventRegistrations,
  getEventWaitlist,
  type Event,
  type EventOrder,
  type EventRegistration,
} from "./events.service";

type EventOverviewSectionProps = {
  event: Event;
  timeZone: string;
  operationalDataEnabled: boolean;
  onViewDetails: () => void;
  onViewRegistrations: () => void;
};

/** Renders the Event Detail overview from existing Event, registration, attendance, waitlist, and order data. */
export default function EventOverviewSection({
  event,
  timeZone,
  operationalDataEnabled,
  onViewDetails,
  onViewRegistrations,
}: EventOverviewSectionProps) {
  const registrationsQuery = useQuery({
    queryKey: ["events", "overview", "registrations", event.id],
    queryFn: () => getEventRegistrations(event.id),
    enabled: operationalDataEnabled && Boolean(event.id),
    staleTime: 30_000,
    retry: 1,
  });
  const attendanceQuery = useQuery({
    queryKey: ["events", "overview", "attendance", event.id],
    queryFn: () => getEventAttendance(event.id),
    enabled: operationalDataEnabled && Boolean(event.id),
    staleTime: 30_000,
    retry: 1,
  });
  const waitlistQuery = useQuery({
    queryKey: ["events", "overview", "waitlist", event.id],
    queryFn: () => getEventWaitlist(event.id),
    enabled: operationalDataEnabled && Boolean(event.id),
    staleTime: 30_000,
    retry: 1,
  });
  const ordersQuery = useQuery({
    queryKey: ["events", "overview", "orders", event.id],
    queryFn: () => getEventOrders(event.id),
    enabled: operationalDataEnabled && Boolean(event.id),
    staleTime: 30_000,
    retry: 1,
  });

  const registrations = registrationsQuery.data ?? [];
  const checkedIn = attendanceQuery.data?.total_attended;
  const waitlistCount = waitlistQuery.data?.length;
  const revenue = ordersQuery.data ? calculateRevenue(ordersQuery.data) : null;
  const orderSummary = ordersQuery.data ? getOrderSummary(ordersQuery.data) : null;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard icon="◎" label="Registrations" value={registrationsQuery.isError ? "—" : registrations.length} supporting="Total registered" />
        <MetricCard icon="✓" label="Checked In" value={attendanceQuery.isError ? "—" : checkedIn ?? "—"} supporting={checkedIn !== undefined && registrations.length > 0 ? `${Math.round((checkedIn / registrations.length) * 100)}% attendance` : "Attendance recorded"} />
        <MetricCard icon="□" label="Available Seats" value={event.available_seats ?? "—"} supporting={event.capacity ? `${event.capacity} total capacity` : "Capacity unavailable"} />
        <MetricCard icon="♡" label="Waitlist" value={waitlistQuery.isError ? "—" : waitlistCount ?? "—"} supporting={waitlistCount === 0 ? "No attendees waiting" : "Waiting for confirmation"} />
        <MetricCard icon="¤" label="Revenue" value={ordersQuery.isError ? "—" : revenue ?? "—"} supporting="Confirmed revenue" />
      </div>
      {event.lifecycle_state ? <p className="rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-4 py-3 text-sm font-semibold text-[#52736a]">{event.lifecycle_state === "upcoming" ? "Event has not started yet." : event.lifecycle_state === "ongoing" ? "Event is currently in progress." : "Event has ended."}</p> : null}

      <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7f9d94]">Event summary</p>
            <h2 className="mt-1 text-lg font-bold text-[#06201c]">Registration and attendance</h2>
          </div>
          <button type="button" onClick={onViewRegistrations} className="text-sm font-semibold text-[#1f6a58] underline">
            View all registrations
          </button>
        </div>
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          <AttendanceVisual total={registrations.length} checkedIn={checkedIn} unavailable={registrationsQuery.isError || attendanceQuery.isError} />
          <RegistrationStatusVisual registrations={registrations} unavailable={registrationsQuery.isError} />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <RecentRegistrations registrations={registrations.slice(0, 5)} ticketTypes={event.ticket_types} unavailable={registrationsQuery.isError} onViewAll={onViewRegistrations} />
        <SessionsSummary event={event} timeZone={timeZone} onViewDetails={onViewDetails} />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <CapacityVisual event={event} registrations={registrations.length} unavailable={registrationsQuery.isError} />
        <OrderSummary summary={orderSummary} unavailable={ordersQuery.isError} />
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, supporting }: { icon: string; label: string; value: string | number; supporting: string }) {
  return <article className="rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm"><div className="flex items-center gap-2"><span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#e8f6ee] text-sm font-bold text-[#1f6a58]">{icon}</span><p className="text-xs font-bold uppercase tracking-[0.1em] text-[#7f9d94]">{label}</p></div><p className="mt-3 text-2xl font-bold text-[#1f6a58]">{typeof value === "number" ? value.toLocaleString() : value}</p><p className="mt-1 text-xs text-[#52736a]">{supporting}</p></article>;
}

function SummaryItem({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl bg-[#f9fcfa] p-4"><p className="text-xs font-bold uppercase tracking-[0.08em] text-[#7f9d94]">{label}</p><p className="mt-1 text-xl font-bold text-[#06201c]">{value}</p></div>;
}

function RecentRegistrations({ registrations, ticketTypes, unavailable, onViewAll }: { registrations: readonly EventRegistration[]; ticketTypes: Event["ticket_types"]; unavailable: boolean; onViewAll: () => void }) {
  const ticketNames = new Map(ticketTypes.map((ticket) => [ticket.id, ticket.name]));
  return <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7f9d94]">Registrations</p><h2 className="mt-1 text-lg font-bold text-[#06201c]">Recent registrations</h2></div><button type="button" onClick={onViewAll} className="text-sm font-semibold text-[#1f6a58] underline">View all</button></div>{unavailable ? <p className="mt-5 text-sm font-semibold text-[#52736a]">Registration data unavailable.</p> : registrations.length === 0 ? <p className="mt-5 text-sm font-semibold text-[#52736a]">No registrations yet.</p> : <div className="mt-4 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-[#edf3f0] text-xs font-bold uppercase tracking-[.08em] text-[#7f9d94]"><tr><th className="px-2 py-2">Attendee</th><th className="px-2 py-2">Ticket</th><th className="px-2 py-2">Status</th><th className="px-2 py-2">Check-in</th></tr></thead><tbody>{registrations.map((registration) => <tr key={registration.id} className="border-b border-[#edf3f0] last:border-0"><td className="px-2 py-3 font-semibold text-[#06201c]">{registration.participant_name}</td><td className="px-2 py-3 text-[#52736a]">{ticketNames.get(registration.ticket_type_id ?? "") ?? registration.ticket_type_id ?? "—"}</td><td className="px-2 py-3"><StatusBadge value={registration.status} /></td><td className="px-2 py-3 text-[#52736a]">{registration.checked_in_at ? "Checked in" : "Not checked in"}</td></tr>)}</tbody></table></div>}</section>;
}

function SessionsSummary({ event, timeZone, onViewDetails }: { event: Event; timeZone: string; onViewDetails: () => void }) {
  return <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7f9d94]">Sessions</p><h2 className="mt-1 text-lg font-bold text-[#06201c]">Sessions summary</h2></div><button type="button" onClick={onViewDetails} className="text-sm font-semibold text-[#1f6a58] underline">View all</button></div>{event.sessions.length === 0 ? <p className="mt-5 text-sm font-semibold text-[#52736a]">No sessions configured.</p> : <div className="mt-4 space-y-3">{event.sessions.slice(0, 5).map((session, index) => <div key={"id" in session && session.id ? session.id : `${session.title}-${index}`} className="rounded-xl border border-[#edf3f0] bg-[#f9fcfa] p-3"><p className="font-semibold text-[#06201c]">{session.title}</p><p className="mt-1 text-sm text-[#52736a]">{formatSessionTime(session.session_date, session.start_time, session.end_time, timeZone)}</p><p className="mt-1 text-sm text-[#52736a]">{session.location || "Location not provided"}{session.speaker ? ` · ${session.speaker}` : ""}</p></div>)}</div>}</section>;
}

function formatSessionTime(date: string | null | undefined, start: string | null | undefined, end: string | null | undefined, timeZone: string) {
  const parts = [date, start && end ? `${start}–${end}` : start || end].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : `Time unavailable (${timeZone})`;
}

function AttendanceVisual({ total, checkedIn, unavailable }: { total: number; checkedIn: number | undefined; unavailable: boolean }) {
  if (unavailable) return <DashboardPanel title="Registration / attendance"><p className="text-sm font-semibold text-[#52736a]">Attendance data unavailable.</p></DashboardPanel>;
  const attended = checkedIn ?? 0;
  const notCheckedIn = Math.max(total - attended, 0);
  const rate = total > 0 ? Math.round((attended / total) * 100) : 0;
  return <DashboardPanel title="Registration / attendance"><div className="flex items-center gap-5"><div className="relative h-24 w-24 shrink-0 rounded-full" style={{ background: `conic-gradient(#1f6a58 ${rate}%, #e8efeb ${rate}% 100%)` }}><div className="absolute inset-3 flex items-center justify-center rounded-full bg-white text-sm font-bold text-[#06201c]">{rate}%</div></div><div className="space-y-2 text-sm"><p><span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#1f6a58]" />Checked in <strong>{attended}</strong></p><p><span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#d7e5df]" />Not checked in <strong>{notCheckedIn}</strong></p><p className="text-xs text-[#52736a]">Total registrations: {total}</p></div></div></DashboardPanel>;
}

function RegistrationStatusVisual({ registrations, unavailable }: { registrations: readonly EventRegistration[]; unavailable: boolean }) {
  const counts = registrations.reduce<Record<string, number>>((result, registration) => { const key = registration.status.trim() || "Unknown"; result[key] = (result[key] ?? 0) + 1; return result; }, {});
  return <DashboardPanel title="Registration status">{unavailable ? <p className="text-sm font-semibold text-[#52736a]">Registration data unavailable.</p> : Object.keys(counts).length === 0 ? <p className="text-sm font-semibold text-[#52736a]">No registration statuses yet.</p> : <div className="space-y-3">{Object.entries(counts).map(([status, count]) => <div key={status}><div className="flex justify-between text-sm"><StatusBadge value={status} /><strong className="text-[#06201c]">{count}</strong></div><div className="mt-1 h-2 rounded-full bg-[#edf3f0]"><div className="h-2 rounded-full bg-[#6cae88]" style={{ width: `${(count / registrations.length) * 100}%` }} /></div></div>)}</div>}</DashboardPanel>;
}

function CapacityVisual({ event, registrations, unavailable }: { event: Event; registrations: number; unavailable: boolean }) {
  const capacity = Number(event.capacity);
  const valid = Number.isFinite(capacity) && capacity > 0 && !unavailable;
  const percentage = valid ? Math.min(100, Math.round((registrations / capacity) * 100)) : null;
  return <DashboardPanel title="Capacity"><p className="text-sm text-[#52736a]">{valid ? `${registrations} / ${capacity} registered` : "Capacity data unavailable"}</p>{percentage !== null ? <><div className="mt-3 h-3 rounded-full bg-[#edf3f0]"><div className="h-3 rounded-full bg-[#6cae88]" style={{ width: `${percentage}%` }} /></div><p className="mt-2 text-xs font-semibold text-[#52736a]">{percentage}% capacity used</p></> : null}</DashboardPanel>;
}

function OrderSummary({ summary, unavailable }: { summary: OrderSummaryData | null; unavailable: boolean }) {
  return <DashboardPanel title="Revenue / orders">{unavailable || !summary ? <p className="text-sm font-semibold text-[#52736a]">Revenue data unavailable.</p> : <div className="grid grid-cols-3 gap-3 text-sm"><div><p className="text-xs text-[#7f9d94]">Confirmed revenue</p><p className="mt-1 font-bold text-[#06201c]">{summary.revenue}</p></div><div><p className="text-xs text-[#7f9d94]">Orders</p><p className="mt-1 font-bold text-[#06201c]">{summary.orderCount}</p></div><div><p className="text-xs text-[#7f9d94]">Average order</p><p className="mt-1 font-bold text-[#06201c]">{summary.average}</p></div></div>}</DashboardPanel>;
}

function DashboardPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm"><h2 className="text-lg font-bold text-[#06201c]">{title}</h2><div className="mt-4">{children}</div></section>;
}

function StatusBadge({ value }: { value: string }) {
  return <span className="inline-flex rounded-full bg-[#e8f6ee] px-2.5 py-1 text-xs font-semibold capitalize text-[#1f6a58]">{value.replace(/[_-]+/g, " ")}</span>;
}

type OrderSummaryData = { revenue: string; orderCount: number; average: string };

function getOrderSummary(orders: readonly EventOrder[]): OrderSummaryData | null {
  const successfulOrders = orders.filter(isSuccessfulOrder);
  if (successfulOrders.length === 0) return orders.length === 0 ? { revenue: formatCurrency(0, null), orderCount: 0, average: formatCurrency(0, null) } : null;
  const currencies = new Set(successfulOrders.map((order) => order.currency.trim().toUpperCase()).filter(Boolean));
  if (currencies.size > 1) return null;
  const total = successfulOrders.reduce((sum, order) => sum + Number(order.amount), 0);
  if (!Number.isFinite(total)) return null;
  return { revenue: formatCurrency(total, successfulOrders[0]?.currency ?? null), orderCount: successfulOrders.length, average: formatCurrency(total / successfulOrders.length, successfulOrders[0]?.currency ?? null) };
}

function isSuccessfulOrder(order: EventOrder): boolean {
  const payment = normalizeStatus(order.payment_status);
  const status = normalizeStatus(order.status);
  const failed = /failed|cancelled|canceled|unpaid|pending|refunded|refund/.test(payment) || /failed|cancelled|canceled|refunded|refund/.test(status);
  return !failed && /confirmed|paid|completed|succeeded|success/.test(payment) && /confirmed|paid|completed|succeeded|success/.test(status);
}

function normalizeStatus(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ");
}

function formatCurrency(value: number, currency: string | null): string {
  if (!currency) return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(value); } catch { return `${currency} ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`; }
}

function calculateRevenue(orders: readonly EventOrder[]): string | null {
  const summary = getOrderSummary(orders);
  return summary?.revenue ?? null;
}
