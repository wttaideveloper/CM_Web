"use client";

import type { RefObject } from "react";

interface TrainingLessonQrCheckInProps {
  value: string;
  isPending: boolean;
  hasUnsavedChanges: boolean;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onValueChange: (value: string) => void;
  onOpenScanner: () => void;
  onSubmit: () => void;
}

/** Provides camera and manual QR submission controls for the currently selected lesson. */
export default function TrainingLessonQrCheckIn({
  value,
  isPending,
  hasUnsavedChanges,
  triggerRef,
  onValueChange,
  onOpenScanner,
  onSubmit,
}: TrainingLessonQrCheckInProps) {
  return (
    <div className="mt-4 rounded-xl border border-[#d7e5df] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-bold text-[#06201c]">QR check-in for this lesson</p>
          <p className="mt-1 text-sm text-[#52736a]">A successful scan records attendance for this lesson immediately.</p>
        </div>
        <button
          ref={triggerRef}
          type="button"
          onClick={onOpenScanner}
          disabled={isPending || hasUnsavedChanges}
          title={hasUnsavedChanges ? "Save or discard attendance changes before scanning." : undefined}
          className="h-10 rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          Scan QR
        </button>
      </div>
      <form
        className="mt-4 flex flex-col gap-3 border-t border-[#edf3f0] pt-4 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label className="flex-1">
          <span className="mb-1 block text-sm font-semibold text-[#31594d]">Or enter QR code manually</span>
          <input
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            placeholder="Enter enrolment QR code..."
            className="h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm text-[#06201c] outline-none focus:border-[#1f6a58]"
          />
        </label>
        <button
          type="submit"
          disabled={!value.trim() || isPending || hasUnsavedChanges}
          className="h-10 rounded-full border border-[#1f6a58] px-4 text-sm font-bold text-[#1f6a58] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Checking in..." : hasUnsavedChanges ? "Save changes to check in" : "Check in"}
        </button>
      </form>
    </div>
  );
}
