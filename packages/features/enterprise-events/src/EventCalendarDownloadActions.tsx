"use client";

import { useState } from "react";

import {
  downloadEventCalendar,
  downloadEventSessionCalendar,
  EventsApiError,
  type EventCalendarExport,
} from "./events.service";

type CalendarDownloadActionProps = {
  eventId: string;
};

/** Secondary Event-detail action for downloading the backend-generated ICS file. */
export function EventCalendarDownloadAction({ eventId }: CalendarDownloadActionProps) {
  return (
    <CalendarDownloadAction
      actionLabel="Add to Calendar"
      fallbackFilename={`event-${eventId}.ics`}
      download={() => downloadEventCalendar(eventId)}
    />
  );
}

/** Secondary Session action for downloading the backend-generated ICS file. */
export function SessionCalendarDownloadAction({
  eventId,
  sessionId,
}: CalendarDownloadActionProps & { sessionId: string }) {
  return (
    <CalendarDownloadAction
      actionLabel="Add session to calendar"
      fallbackFilename={`session-${sessionId}.ics`}
      download={() => downloadEventSessionCalendar(eventId, sessionId)}
      compact
    />
  );
}

function CalendarDownloadAction({
  actionLabel,
  compact = false,
  download,
  fallbackFilename,
}: {
  actionLabel: string;
  compact?: boolean;
  download: () => Promise<EventCalendarExport>;
  fallbackFilename: string;
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    if (isDownloading) {
      return;
    }

    setIsDownloading(true);
    setError(null);
    try {
      const calendar = await download();
      const objectUrl = URL.createObjectURL(calendar.blob);
      const downloadLink = document.createElement("a");
      downloadLink.href = objectUrl;
      downloadLink.download = calendar.filename || fallbackFilename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    } catch (downloadError) {
      setError(getCalendarDownloadErrorMessage(downloadError));
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className={compact ? "" : "relative"}>
      <button
        type="button"
        disabled={isDownloading}
        onClick={() => void handleDownload()}
        className={compact
          ? "text-sm font-semibold text-[#1f6a58] underline disabled:cursor-not-allowed disabled:opacity-60"
          : "inline-flex h-11 items-center justify-center rounded-full border border-[#b9d6cb] bg-white px-4 text-sm font-bold text-[#1f6a58] shadow-sm focus-visible:ring-2 focus-visible:ring-[#1f6a58] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"}
      >
        {isDownloading ? "Preparing calendar..." : actionLabel}
      </button>
      {error ? (
        <p role="alert" className="mt-2 max-w-xs text-sm font-semibold text-[#b42318]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function getCalendarDownloadErrorMessage(error: unknown): string {
  if (!(error instanceof EventsApiError)) {
    return "Unable to download the calendar. Please try again.";
  }
  if (error.status === 401 || error.status === 403) {
    return "You do not have access to download this calendar.";
  }
  if (error.status === 404) {
    return "This calendar is no longer available.";
  }
  return "Unable to download the calendar. Please try again.";
}
