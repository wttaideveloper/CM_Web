"use client";

import { useState } from "react";

import { downloadTrainingCalendar, TrainingsApiError } from "./trainings.service";

/** Adds a Training calendar invite by downloading the backend-generated ICS file. */
export default function TrainingCalendarAction({ trainingId }: { trainingId: string }) {
  const [isPreparing, setIsPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddToCalendar = async () => {
    if (isPreparing) return;

    setIsPreparing(true);
    setError(null);
    try {
      const calendar = await downloadTrainingCalendar(trainingId);
      const objectUrl = URL.createObjectURL(calendar.blob);
      const downloadLink = document.createElement("a");
      downloadLink.href = objectUrl;
      downloadLink.download = calendar.filename || `training-${trainingId}.ics`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    } catch (downloadError) {
      setError(getCalendarErrorMessage(downloadError));
    } finally {
      setIsPreparing(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        disabled={isPreparing}
        onClick={() => void handleAddToCalendar()}
        className="inline-flex h-9 items-center justify-center rounded-full border border-[#1f6a58] px-4 text-xs font-bold text-[#1f6a58] hover:bg-[#e8f6ee] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPreparing ? "Preparing calendar..." : "Add to Calendar"}
      </button>
      {error ? <p role="alert" className="mt-2 max-w-xs text-xs font-semibold text-[#b42318]">{error}</p> : null}
    </div>
  );
}

function getCalendarErrorMessage(error: unknown): string {
  if (!(error instanceof TrainingsApiError)) {
    return "Unable to download the calendar. Please try again.";
  }
  if (error.status === 401 || error.status === 403) {
    return "You do not have access to add this calendar.";
  }
  if (error.status === 404) {
    return "This calendar is no longer available.";
  }
  return "Unable to download the calendar. Please try again.";
}
