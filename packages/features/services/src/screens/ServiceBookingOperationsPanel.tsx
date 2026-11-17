"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getServicesPage } from "../services/service.service";
import type { ServiceDto } from "../types/service.types";
import {
  createEnterpriseServiceBooking,
  getServiceBookingSettings,
  getServiceBookingSlots,
  serviceBookingCreationErrorMessage,
} from "../service-booking-operations.service";
import type {
  CreateServiceBookingPayload,
  ServiceBookingDeliveryMode,
  ServiceBookingSettings,
  ServiceBookingSlot,
} from "../service-booking-operations.models";
import {
  formatServiceBookingDateHeading,
  formatServiceBookingSlotReason,
  formatServiceBookingSlotTime,
  formatServiceBookingTimezoneLabel,
  validateServiceBookingParticipants,
} from "../service-booking-operations.models";
import { serviceBookingCopy } from "../service-booking-copy.en";

type Props = {
  enterpriseId: string;
  onBookingCreated: (bookingId: string) => void;
};

const servicePageSize = 20;

function today(): string {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatSlotTime(slot: ServiceBookingSlot, timezone: string): string {
  const formatted = formatServiceBookingSlotTime(slot.starts_at, slot.ends_at, timezone);
  if (formatted !== "Time unavailable") return formatted;
  const start = new Date(slot.starts_at);
  const end = new Date(slot.ends_at);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return `${slot.starts_at} – ${slot.ends_at}`;
  try {
    const formatter = new Intl.DateTimeFormat("en-US", { timeStyle: "short", timeZone: timezone });
    return `${formatter.format(start)} – ${formatter.format(end)}`;
  } catch {
    return `${start.toLocaleTimeString()} – ${end.toLocaleTimeString()}`;
  }
}

function getServicePrice(service: ServiceDto | undefined): number | null {
  const value = service?.service_price ?? service?.price;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function createIdempotencyKey(): string {
  return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `ihp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function settingsSummary(settings: ServiceBookingSettings | undefined): string {
  if (!settings) return "";
  return `${settings.booking_enabled ? serviceBookingCopy.yes : serviceBookingCopy.no} · ${settings.time_zone}`;
}

export default function ServiceBookingOperationsPanel({ enterpriseId, onBookingCreated }: Props) {
  const queryClient = useQueryClient();
  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState(today);
  const [deliveryMode, setDeliveryMode] = useState<ServiceBookingDeliveryMode | "">("");
  const [selectedSlotKey, setSelectedSlotKey] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [participants, setParticipants] = useState("1");
  const [notes, setNotes] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const servicesQuery = useQuery({
    queryKey: ["enterprise-bookable-services", enterpriseId, serviceSearch.trim()],
    queryFn: ({ signal }) => getServicesPage({ enterprise_id: enterpriseId, status: "active", search: serviceSearch, page: 1, page_size: servicePageSize }, signal),
    enabled: Boolean(enterpriseId),
    staleTime: 30_000,
    retry: false,
  });
  const services = useMemo(
    () => (servicesQuery.data?.items ?? []).filter((service) => service.enterprise_id === enterpriseId),
    [enterpriseId, servicesQuery.data?.items],
  );
  const selectedService = services.find((service) => service.id === serviceId);

  const settingsQuery = useQuery({
    queryKey: ["service-booking-settings", serviceId],
    queryFn: ({ signal }) => getServiceBookingSettings(serviceId, signal),
    enabled: Boolean(serviceId),
    retry: false,
  });
  const settings = settingsQuery.data;
  const configuredSingleDeliveryMode = settings?.delivery_modes.length === 1 ? settings.delivery_modes[0] : "";
  const effectiveDeliveryMode = settings?.delivery_modes.includes(deliveryMode as ServiceBookingDeliveryMode)
    ? deliveryMode
    : configuredSingleDeliveryMode;

  const slotsQuery = useQuery({
    queryKey: ["service-booking-slots", serviceId, date, effectiveDeliveryMode, settings?.time_zone, settings?.provider_user_id],
    queryFn: ({ signal }) => getServiceBookingSlots(serviceId, {
      date,
      deliveryMode: effectiveDeliveryMode || undefined,
      providerId: settings?.provider_user_id ?? undefined,
      timezone: settings?.time_zone,
    }, signal),
    enabled: Boolean(serviceId && date && !settingsQuery.isPending && !settingsQuery.isError),
    retry: false,
  });
  const slotDay = slotsQuery.data?.days.find((day) => day.date === date);
  const slots = useMemo(
    () => slotDay?.slots ?? [],
    [slotDay],
  );
  const selectedSlot = slots.find((slot) => `${date}:${slot.starts_at}` === selectedSlotKey);
  const serviceCapacity = settings?.max_participants ?? selectedService?.max_participants ?? slotsQuery.data?.capacity ?? null;
  const singleSeatService = serviceCapacity === 1 || selectedSlot?.capacity === 1;
  const participantValidation = validateServiceBookingParticipants(participants, selectedSlot?.available_seats ?? 0);
  const participantError = participantValidation.error === "required"
    ? serviceBookingCopy.participantsRequired
    : participantValidation.error === "integer"
      ? serviceBookingCopy.participantsInteger
      : participantValidation.error === "positive"
        ? serviceBookingCopy.participantsPositive
        : participantValidation.error === "unavailable"
          ? serviceBookingCopy.participantsUnavailable
          : participantValidation.error === "capacity"
            ? serviceBookingCopy.participantsCapacity
            : "";
  const price = getServicePrice(selectedService);
  const isFreeService = price === 0;

  useEffect(() => {
    // Participants are form state tied to backend availability; reset them whenever the authoritative slot context changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setParticipants("1");
  }, [date, selectedService?.id, selectedSlotKey, slotsQuery.data, settings?.max_participants]);

  const bookingMutation = useMutation({
    mutationFn: (payload: CreateServiceBookingPayload) => createEnterpriseServiceBooking(payload, createIdempotencyKey()),
    retry: false,
    onSuccess: (booking) => {
      setSuccessMessage(serviceBookingCopy.bookingCreatedWithStatus.replace("{{id}}", booking.id).replace("{{status}}", booking.status));
      setSelectedSlotKey("");
      void queryClient.invalidateQueries({ queryKey: ["enterprise-service-bookings", enterpriseId] });
      void queryClient.invalidateQueries({ queryKey: ["service-booking-slots", serviceId] });
      onBookingCreated(booking.id);
    },
  });

  const formBlockedReason = !selectedService
    ? serviceBookingCopy.chooseService
    : price === null
      ? serviceBookingCopy.priceUnavailable
      : !isFreeService
        ? serviceBookingCopy.paymentRequired
        : settings?.booking_enabled === false
          ? serviceBookingCopy.bookingDisabled
          : !selectedSlot?.available
            ? serviceBookingCopy.selectSlot
            : !participantValidation.isValid
              ? participantError
              : "";

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (formBlockedReason || !selectedService || !selectedSlot || !customerName.trim()) return;
    if (!participantValidation.isValid || participantValidation.value === null) return;
    bookingMutation.mutate({
      service_id: selectedService.id,
      starts_at: selectedSlot.starts_at,
      delivery_mode: effectiveDeliveryMode || undefined,
      provider_id: settings?.provider_user_id ?? undefined,
      participants: participantValidation.value,
      notes: notes.trim() || undefined,
      customer_name: customerName.trim(),
      customer_email: customerEmail.trim() || undefined,
      customer_phone: customerPhone.trim() || undefined,
    });
  };

  return (
    <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm" aria-labelledby="manual-booking-title">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 id="manual-booking-title" className="text-base font-bold text-[#06201c]">{serviceBookingCopy.manualBooking}</h3>
          <p className="mt-1 text-sm text-[#52736a]">{serviceBookingCopy.manualBookingDescription}</p>
        </div>
        {settings ? <span className="text-xs font-semibold text-[#52736a]">{settingsSummary(settings)}</span> : null}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <label className="block">
          <span className="text-sm font-bold text-[#06201c]">{serviceBookingCopy.chooseService}</span>
          <input aria-label={serviceBookingCopy.serviceSearchPlaceholder} value={serviceSearch} onChange={(event) => setServiceSearch(event.target.value)} placeholder={serviceBookingCopy.serviceSearchPlaceholder} className="mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] px-3 text-sm" />
          <select value={serviceId} onChange={(event) => { setServiceId(event.target.value); setDeliveryMode(""); setSelectedSlotKey(""); setParticipants("1"); setSuccessMessage(""); }} className="mt-2 h-10 w-full rounded-xl border border-[#d7e5df] px-3 text-sm">
            <option value="">{servicesQuery.isPending ? serviceBookingCopy.loadingServices : serviceBookingCopy.chooseService}</option>
            {services.map((service) => <option key={service.id} value={service.id}>{service.service_name}</option>)}
          </select>
          {servicesQuery.isError ? <InlineError onRetry={() => void servicesQuery.refetch()} /> : null}
          {!servicesQuery.isPending && !servicesQuery.isError && services.length === 0 ? <p className="mt-2 text-xs text-[#8f3b2f]">{serviceBookingCopy.noServices}</p> : null}
        </label>
        <label className="block">
          <span className="text-sm font-bold text-[#06201c]">{serviceBookingCopy.chooseDate}</span>
          <input type="date" value={date} onChange={(event) => { setDate(event.target.value); setSelectedSlotKey(""); setParticipants("1"); }} className="mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] px-3 text-sm" />
        </label>
      </div>

      {settingsQuery.isPending ? <p role="status" className="mt-4 text-sm text-[#52736a]">{serviceBookingCopy.loadingSettings}</p> : null}
      {settingsQuery.isError ? <InlineError onRetry={() => void settingsQuery.refetch()} /> : null}
      {settings ? <SettingsSummary settings={settings} /> : null}

      {settings && settings.delivery_modes.length > 0 ? (
        <label className="mt-4 block max-w-md">
          <span className="text-sm font-bold text-[#06201c]">{serviceBookingCopy.chooseDeliveryMode}</span>
          <select value={effectiveDeliveryMode} onChange={(event) => setDeliveryMode(event.target.value as ServiceBookingDeliveryMode)} className="mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] px-3 text-sm">
            <option value="">{serviceBookingCopy.chooseDeliveryMode}</option>
            {settings.delivery_modes.map((mode) => <option key={mode} value={mode}>{mode.replace("_", " ")}</option>)}
          </select>
        </label>
      ) : null}

      <div className="mt-5 rounded-xl border border-[#edf3f0] p-4">
        <h4 className="text-sm font-bold text-[#06201c]">{serviceBookingCopy.slotsTitle}</h4>
        {!serviceId ? <p className="mt-2 text-sm text-[#52736a]">{serviceBookingCopy.selectServiceAndDate}</p> : null}
        {slotsQuery.isPending ? <p role="status" className="mt-2 text-sm text-[#52736a]">{serviceBookingCopy.loadingSlots}</p> : null}
        {slotsQuery.isError ? <InlineError onRetry={() => void slotsQuery.refetch()} /> : null}
        {slotsQuery.data ? <div className="mt-3 rounded-xl bg-[#f8fbf9] p-3 text-sm text-[#52736a]"><p className="font-semibold text-[#06201c]">{formatServiceBookingDateHeading(slotDay?.date ?? date, slotsQuery.data.time_zone)}</p><p className="mt-1">All times in {formatServiceBookingTimezoneLabel(slotsQuery.data.time_zone)}</p></div> : null}
        {slotsQuery.data && !slotsQuery.data.bookable ? <p className="mt-2 text-sm text-[#8f3b2f]">{formatServiceBookingSlotReason(slotsQuery.data.reason)}</p> : null}
        {slotsQuery.data && slots.length === 0 ? <p className="mt-2 text-sm text-[#52736a]">{serviceBookingCopy.noSlots}</p> : null}
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {slots.map((slot) => {
            const key = `${date}:${slot.starts_at}`;
            return <button key={key} type="button" aria-pressed={selectedSlotKey === key} aria-label={`${formatSlotTime(slot, slotsQuery.data?.time_zone ?? settings?.time_zone ?? "UTC")}, ${slot.available ? `${slot.available_seats} of ${slot.capacity} seats available` : formatServiceBookingSlotReason(slot.reason)}`} disabled={!slot.available || !slotsQuery.data?.bookable} onClick={() => { setSelectedSlotKey(key); setParticipants("1"); }} className={`rounded-xl border p-3 text-left text-sm ${selectedSlotKey === key ? "border-[#1f6a58] bg-[#f1faf5]" : "border-[#d7e5df]"} disabled:cursor-not-allowed disabled:opacity-50`}>
              <span className="block font-semibold text-[#06201c]">{formatSlotTime(slot, slotsQuery.data?.time_zone ?? settings?.time_zone ?? "UTC")}</span>
              <span className="mt-1 block text-xs text-[#52736a]">{slot.available ? serviceBookingCopy.availableSeats.replace("{{available}}", String(slot.available_seats)).replace("{{capacity}}", String(slot.capacity)) : formatServiceBookingSlotReason(slot.reason)}</span>
            </button>;
          })}
        </div>
      </div>

      <form onSubmit={submit} className="mt-5 grid gap-4 border-t border-[#edf3f0] pt-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label><span className="text-sm font-bold text-[#06201c]">{serviceBookingCopy.chooseCustomerName}</span><input required value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder={serviceBookingCopy.customerNamePlaceholder} className="mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] px-3 text-sm" /></label>
          <label><span className="text-sm font-bold text-[#06201c]">{serviceBookingCopy.customerEmail}</span><input type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] px-3 text-sm" /></label>
          <label><span className="text-sm font-bold text-[#06201c]">{serviceBookingCopy.customerPhone}</span><input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] px-3 text-sm" /></label>
          <label>
            <span className="text-sm font-bold text-[#06201c]">{serviceBookingCopy.participants}</span>
            {singleSeatService ? (
              <span className="mt-1.5 flex h-10 items-center rounded-xl border border-[#d7e5df] bg-[#f8fbf9] px-3 text-sm text-[#52736a]">1</span>
            ) : (
              <input type="number" min="1" max={selectedSlot?.available_seats || undefined} step="1" value={participants} disabled={!selectedSlot || !selectedSlot.available || bookingMutation.isPending} onChange={(event) => setParticipants(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] px-3 text-sm disabled:cursor-not-allowed disabled:bg-[#f8fbf9]" />
            )}
            <span className="mt-1 block text-xs text-[#52736a]">{singleSeatService ? serviceBookingCopy.participantsSingleSeat : selectedSlot ? `Maximum: ${selectedSlot.available_seats}` : serviceBookingCopy.selectSlot}</span>
          </label>
        </div>
        <label><span className="text-sm font-bold text-[#06201c]">{serviceBookingCopy.notes}</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={serviceBookingCopy.notesPlaceholder} className="mt-1.5 min-h-20 w-full rounded-xl border border-[#d7e5df] px-3 py-2 text-sm" /></label>
        {settings?.requires_approval ? <p className="text-xs text-[#805900]">{serviceBookingCopy.approvalNotice}</p> : null}
        {formBlockedReason ? <p className="text-sm text-[#8f3b2f]" role="alert">{formBlockedReason}</p> : null}
        {bookingMutation.isError ? <p className="text-sm text-[#8f3b2f]" role="alert">{serviceBookingCreationErrorMessage(bookingMutation.error)}</p> : null}
        {successMessage ? <p className="text-sm text-[#1f6a58]" role="status">{successMessage}</p> : null}
        <div className="flex flex-col gap-3 rounded-xl bg-[#f8fbf9] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm font-bold text-[#06201c]">{serviceBookingCopy.bookingSummary}</p><p className="mt-1 text-xs text-[#52736a]">{selectedService?.service_name ?? serviceBookingCopy.chooseService}{selectedSlot ? ` · ${formatSlotTime(selectedSlot, slotsQuery.data?.time_zone ?? "UTC")}` : ""}{customerName.trim() ? ` · ${customerName.trim()}` : ""}</p></div>
          <button type="submit" disabled={Boolean(formBlockedReason) || !customerName.trim() || bookingMutation.isPending} className="h-10 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{bookingMutation.isPending ? serviceBookingCopy.creatingBooking : serviceBookingCopy.createBooking}</button>
        </div>
      </form>
    </section>
  );
}

function InlineError({ onRetry }: { onRetry: () => void }) {
  return <div role="alert" className="mt-2 flex items-center gap-3 text-sm text-[#8f3b2f]"><span>{serviceBookingCopy.operationsError}</span><button type="button" onClick={onRetry} className="font-semibold underline">{serviceBookingCopy.retryBookingInfo}</button></div>;
}

function SettingsSummary({ settings }: { settings: ServiceBookingSettings }) {
  return <div className="mt-4 grid gap-2 rounded-xl bg-[#f8fbf9] p-4 text-xs text-[#52736a] sm:grid-cols-2">
    <span>{serviceBookingCopy.bookingEnabled}: {settings.booking_enabled ? serviceBookingCopy.yes : serviceBookingCopy.no}</span>
    <span>{serviceBookingCopy.requiresApproval}: {settings.requires_approval ? serviceBookingCopy.yes : serviceBookingCopy.no}</span>
    <span>{serviceBookingCopy.provider}: {settings.provider_name ?? serviceBookingCopy.noValue}</span>
    <span>{serviceBookingCopy.timezone}: {settings.time_zone}</span>
    {settings.venue_instructions ? <span className="sm:col-span-2">{serviceBookingCopy.venueInstructions}: {settings.venue_instructions}</span> : null}
    {(settings.meeting_provider || settings.meeting_url || settings.meeting_instructions || settings.meeting_passcode) ? <span className="sm:col-span-2">{serviceBookingCopy.meetingDetails}: {[settings.meeting_provider, settings.meeting_url, settings.meeting_passcode ? `Passcode: ${settings.meeting_passcode}` : null, settings.meeting_instructions].filter(Boolean).join(" · ")}</span> : null}
    {settings.cancellation_policy ? <span className="sm:col-span-2">{serviceBookingCopy.cancellationPolicy}: {settings.cancellation_policy}</span> : null}
  </div>;
}
