import { serviceBookingCopy } from "../service-booking-copy.en";

/**
 * Read-only placeholders for future booking status and cancellation actions.
 */
export function ServiceBookingActionControls() {
  return (
    <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm" aria-labelledby="service-booking-actions-title">
      <h3 id="service-booking-actions-title" className="text-base font-bold text-[#06201c]">
        {serviceBookingCopy.actionsTitle}
      </h3>
      <p className="mt-2 text-sm text-[#52736a]">{serviceBookingCopy.actionsPending}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" disabled className="h-10 rounded-full border border-[#d7e5df] px-4 text-sm font-semibold text-[#52736a] opacity-60">
          {serviceBookingCopy.updateStatus}
        </button>
        <button type="button" disabled className="h-10 rounded-full border border-[#d7e5df] px-4 text-sm font-semibold text-[#52736a] opacity-60">
          {serviceBookingCopy.reviewCancellation}
        </button>
      </div>
    </section>
  );
}
