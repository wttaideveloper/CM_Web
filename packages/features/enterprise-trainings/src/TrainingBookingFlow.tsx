"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";

import { formatTrainingDate, formatTrainingPrice, humanizeLabel } from "./detail-formatters";
import {
  checkoutTraining,
  enrolInTraining,
  getTrainingById,
  joinTrainingWaitlist,
  TrainingsApiError,
} from "./trainings.service";
import { addToWishlist, isInWishlist, removeFromWishlist } from "./wishlist-storage";

type BookingStep = "review" | "details" | "confirm" | "done";

const steps: ReadonlyArray<{ id: BookingStep; label: string }> = [
  { id: "review", label: "Review" },
  { id: "details", label: "Your details" },
  { id: "confirm", label: "Confirm" },
  { id: "done", label: "Done" },
];

/** Full booking flow: review → details → confirm (enrol / checkout / waitlist) → done. */
export default function TrainingBookingFlow({ trainingId: trainingIdProp }: { trainingId?: string }) {
  const params = useParams<{ trainingId: string }>();
  const trainingId = trainingIdProp ?? params.trainingId;
  const queryClient = useQueryClient();
  const [step, setStep] = useState<BookingStep>("review");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isGroup, setIsGroup] = useState(false);
  const [groupSize, setGroupSize] = useState("");
  const [coupon, setCoupon] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const wishlistToggleMutation = useMutation({
    mutationFn: async () => {
      if (saved) {
        await removeFromWishlist(trainingId);
        setSaved(false);
      } else {
        await addToWishlist(trainingId);
        setSaved(true);
      }
    },
    onError: (error) =>
      setFeedback(
        error instanceof TrainingsApiError ? `${saved ? "Unable to remove from" : "Unable to add to"} wishlist: ${error.message}` : "Unable to update wishlist.",
      ),
  });

  useEffect(() => {
    if (trainingId) {
      void isInWishlist(trainingId).then(setSaved).catch(() => setSaved(false));
    }
  }, [trainingId]);

  const trainingQuery = useQuery({
    queryKey: ["trainings", "detail", trainingId],
    queryFn: () => getTrainingById(trainingId),
    enabled: Boolean(trainingId),
    retry: 1,
  });

  const bookMutation = useMutation({
    mutationFn: async (mode: "enrol" | "checkout" | "waitlist") => {
      if (mode === "waitlist") {
        return joinTrainingWaitlist(trainingId, {
          participant_name: name.trim(),
          participant_email: email.trim(),
        });
      }
      if (mode === "checkout") {
        return checkoutTraining(trainingId, {
          participant_name: name.trim(),
          participant_email: email.trim(),
          quantity: isGroup && groupSize.trim() ? Number(groupSize) || 1 : 1,
          coupon_code: coupon.trim() || undefined,
        });
      }
      return enrolInTraining(trainingId, {
        participant_name: name.trim(),
        participant_email: email.trim(),
        group_enrol: isGroup || undefined,
        max_group_size: groupSize.trim() || undefined,
      });
    },
    onSuccess: (_data, mode) => {
      setDoneMessage(
        mode === "waitlist"
          ? "You are on the waitlist. We will notify you when a seat opens."
          : mode === "checkout"
            ? "Checkout initiated. Complete payment to confirm your seat."
            : "Booking confirmed. Check your email for details.",
      );
      setStep("done");
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "enrolments"] }),
        queryClient.invalidateQueries({ queryKey: ["trainings", "list"] }),
      ]);
    },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to complete booking."),
  });

  if (!trainingId) return <p role="alert" className="text-sm font-semibold text-[#b42318]">Training id is missing.</p>;
  if (trainingQuery.isLoading) return <p className="text-sm text-[#52736a]">Loading training...</p>;
  if (trainingQuery.isError || !trainingQuery.data) {
    return <p role="alert" className="text-sm font-semibold text-[#b42318]">{(trainingQuery.error as Error)?.message ?? "Unable to load this training."}</p>;
  }

  const training = trainingQuery.data;
  const record = training as unknown as Record<string, unknown>;
  const availableSlots = typeof record.available_slots === "number" ? record.available_slots : null;
  const soldOut = availableSlots !== null && availableSlots <= 0;
  const priceNumeric = Number(training.price);
  const isPaid = training.price != null && String(training.price).trim() !== "" && Number.isFinite(priceNumeric) && priceNumeric > 0;
  const mode: "enrol" | "checkout" | "waitlist" = soldOut ? "waitlist" : isPaid ? "checkout" : "enrol";
  const detailsValid = name.trim().length > 0 && /.+@.+\..+/.test(email.trim());
  const stepIndex = steps.findIndex((s) => s.id === step);

  return (
    <div className="w-full">
      <header>
        <Link href={`/admin/trainings/${trainingId}`} className="text-sm font-semibold text-[#1f6a58]">Back to Training</Link>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">BOOK TRAINING</p>
        <h1 className="mt-2 text-2xl font-bold text-[#06201c] sm:text-3xl">{training.title}</h1>
      </header>

      <ol className="mt-6 flex gap-2" aria-label="Booking steps">
        {steps.map((s, i) => (
          <li key={s.id} className={`flex-1 rounded-xl px-3 py-2 text-center text-xs font-bold ${i <= stepIndex ? "bg-[#e8f6ee] text-[#1f6a58]" : "bg-[#f4faf7] text-[#7f9d94]"}`}>
            {i + 1}. {s.label}
          </li>
        ))}
      </ol>

      <main className="mt-6 rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm sm:p-7">
        {feedback ? <div role="alert" className="mb-4 rounded-xl border border-[#f3d0cb] bg-[#fff6f5] px-4 py-3 text-sm font-semibold text-[#b42318]">{feedback}</div> : null}

        {step === "review" ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-[#06201c]">Review</h2>
              <button
                type="button"
                onClick={() => wishlistToggleMutation.mutate()}
                disabled={wishlistToggleMutation.isPending}
                className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-bold text-[#1f6a58] hover:bg-[#e8f6ee] disabled:opacity-60"
              >
                {wishlistToggleMutation.isPending ? "Saving..." : saved ? "Saved for later" : "Save for later"}
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <p className="text-sm text-[#52736a]">Price: <span className="font-bold text-[#06201c]">{formatTrainingPrice(training.price, training.currency)}</span></p>
              <p className="text-sm text-[#52736a]">Seats left: <span className="font-bold text-[#06201c]">{availableSlots ?? "—"}</span></p>
              <p className="text-sm text-[#52736a]">Starts: <span className="font-bold text-[#06201c]">{typeof record.start_date === "string" ? formatTrainingDate(record.start_date) : "—"}</span></p>
              <p className="text-sm text-[#52736a]">Mode: <span className="font-bold text-[#06201c]">{typeof training.delivery_mode === "string" ? humanizeLabel(training.delivery_mode) : "—"}</span></p>
            </div>
            {soldOut ? <p className="rounded-xl bg-[#fff7e5] px-4 py-3 text-sm font-semibold text-[#b7791f]">Sold out — you can join the waitlist on the next step.</p> : null}
          </section>
        ) : null}

        {step === "details" ? (
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-[#06201c]">Your details</h2>
            <label className="block text-sm font-semibold text-[#06201c]">Full name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="mt-1.5 h-11 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm outline-none focus:border-[#1f6a58]" /></label>
            <label className="block text-sm font-semibold text-[#06201c]">Email<input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" className="mt-1.5 h-11 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm outline-none focus:border-[#1f6a58]" /></label>
            <label className="flex items-center gap-3 text-sm font-semibold text-[#06201c]"><input type="checkbox" checked={isGroup} onChange={(e) => setIsGroup(e.target.checked)} className="h-4 w-4 rounded border-[#d7e5df] text-[#1f6a58]" />Group booking</label>
            {isGroup ? <label className="block text-sm font-semibold text-[#06201c]">Group size<input value={groupSize} onChange={(e) => setGroupSize(e.target.value)} placeholder="e.g. 4" type="number" min={1} className="mt-1.5 h-11 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm outline-none focus:border-[#1f6a58]" /></label> : null}
            {isPaid && !soldOut ? <label className="block text-sm font-semibold text-[#06201c]">Coupon code (optional)<input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="EARLY20" className="mt-1.5 h-11 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm outline-none focus:border-[#1f6a58]" /></label> : null}
          </section>
        ) : null}

        {step === "confirm" ? (
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#06201c]">Confirm</h2>
            <div className="rounded-xl bg-[#f9fcfa] border border-[#e1ebe6] p-4 text-sm text-[#52736a]">
              <p><span className="font-bold text-[#06201c]">{training.title}</span></p>
              <p className="mt-1">{name} · {email}{isGroup && groupSize.trim() ? ` · Group of ${groupSize.trim()}` : ""}</p>
              <p className="mt-1">Total: <span className="font-bold text-[#06201c]">{soldOut ? "Free (waitlist)" : formatTrainingPrice(training.price, training.currency)}</span></p>
            </div>
          </section>
        ) : null}

        {step === "done" ? (
          <section className="space-y-3 text-center">
            <h2 className="text-xl font-bold text-[#06201c]">{mode === "waitlist" ? "Waitlisted" : mode === "checkout" ? "Checkout started" : "Booked"}</h2>
            <p role="status" className="mx-auto max-w-md rounded-xl border border-[#bce8d1] bg-[#effaf4] px-4 py-3 text-sm font-semibold text-[#167550]">{doneMessage}</p>
            <div className="flex justify-center gap-3">
              <Link href={`/admin/trainings/${trainingId}`} className="h-11 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white inline-flex items-center">View training</Link>
            </div>
          </section>
        ) : null}

        {step !== "done" ? (
          <div className="mt-8 flex justify-between border-t border-[#edf3f0] pt-5">
            <button type="button" onClick={() => setStep(steps[Math.max(0, stepIndex - 1)].id)} disabled={stepIndex === 0 || bookMutation.isPending} className="h-11 rounded-full border border-[#d7e5df] px-5 text-sm font-semibold text-[#52736a] disabled:opacity-50">Back</button>
            {step === "confirm" ? (
              <button type="button" onClick={() => { setFeedback(null); bookMutation.mutate(mode); }} disabled={bookMutation.isPending} className="h-11 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white disabled:opacity-60">
                {bookMutation.isPending ? "Processing..." : soldOut ? "Join waitlist" : isPaid ? "Pay & Book" : "Confirm booking"}
              </button>
            ) : (
              <button type="button" onClick={() => { setFeedback(null); setStep(steps[stepIndex + 1].id); }} disabled={step === "details" && !detailsValid} className="h-11 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white disabled:opacity-60">Continue</button>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}
