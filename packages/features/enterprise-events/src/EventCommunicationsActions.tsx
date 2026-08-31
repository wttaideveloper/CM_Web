"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import {
  EventsApiError,
  sendEventAnnouncement,
  sendEventReminder,
  type Event,
  type SendEventAnnouncementPayload,
} from "./events.service";

type DialogKind = "announcement" | "reminder" | null;
type AnnouncementChannel = NonNullable<SendEventAnnouncementPayload["channels"]>[number];

const announcementChannels: ReadonlyArray<{ value: AnnouncementChannel; label: string }> = [
  { value: "in_app", label: "In-app" },
  { value: "push", label: "Push" },
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
];

/** Event detail actions for backend-authoritative announcements and immediate reminders. */
export default function EventCommunicationsActions({ event, onSuccess }: { event: Event; onSuccess: (message: string) => void }) {
  const queryClient = useQueryClient();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [recipientType, setRecipientType] = useState<"all" | "registered">("all");
  const [channels, setChannels] = useState<AnnouncementChannel[]>(["in_app"]);
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["events", "list"] }),
    queryClient.invalidateQueries({ queryKey: ["events", "detail", event.id] }),
  ]);
  const closeDialog = () => {
    setDialog(null);
    setError(null);
  };
  const announcementMutation = useMutation({
    mutationFn: (payload: SendEventAnnouncementPayload) => sendEventAnnouncement(event.id, payload),
    onSuccess: async () => {
      await invalidate();
      closeDialog();
      setTitle("");
      setMessage("");
      setRecipientType("all");
      setChannels(["in_app"]);
      onSuccess("Announcement sent.");
    },
    onError: (mutationError) => setError(getCommunicationErrorMessage(mutationError, "send the announcement")),
  });
  const reminderMutation = useMutation({
    mutationFn: () => sendEventReminder(event.id),
    onSuccess: async () => {
      await invalidate();
      closeDialog();
      onSuccess("Event reminder sent.");
    },
    onError: (mutationError) => setError(getCommunicationErrorMessage(mutationError, "send the reminder")),
  });
  const isPending = announcementMutation.isPending || reminderMutation.isPending;

  useEffect(() => {
    if (dialog) closeButtonRef.current?.focus();
  }, [dialog]);

  const openDialog = (kind: Exclude<DialogKind, null>) => {
    if (isPending) return;
    setError(null);
    setDialog(kind);
  };
  const submitAnnouncement = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      setError("Enter an announcement message.");
      return;
    }
    if (channels.length === 0) {
      setError("Select at least one delivery channel.");
      return;
    }
    announcementMutation.mutate({
      message: trimmedMessage,
      ...(title.trim() ? { title: title.trim() } : {}),
      recipient_type: recipientType,
      channels,
    });
  };

  return <>
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => openDialog("announcement")} disabled={isPending} className="inline-flex h-11 items-center justify-center rounded-full border border-[#d7e5df] px-4 text-sm font-bold text-[#31594d] disabled:cursor-not-allowed disabled:opacity-60">Send announcement</button>
      <button type="button" onClick={() => openDialog("reminder")} disabled={isPending} className="inline-flex h-11 items-center justify-center rounded-full border border-[#d7e5df] px-4 text-sm font-bold text-[#31594d] disabled:cursor-not-allowed disabled:opacity-60">Send reminder</button>
    </div>
    {dialog ? <div className="fixed inset-0 z-50 flex items-end bg-[#06201c]/35 p-0 sm:items-center sm:justify-center sm:p-5" role="presentation"><div role="dialog" aria-modal="true" aria-labelledby="event-communication-title" aria-describedby="event-communication-description" onKeyDown={(eventKey) => { if (eventKey.key === "Escape" && !isPending) closeDialog(); trapDialogFocus(eventKey); }} className="w-full rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-2xl"><h2 id="event-communication-title" className="text-lg font-bold text-[#06201c]">{dialog === "announcement" ? "Send announcement" : "Send event reminder"}</h2><p id="event-communication-description" className="mt-2 text-sm leading-6 text-[#52736a]">{dialog === "announcement" ? "Send an update using the selected backend-supported delivery channels." : "Send the backend-defined immediate reminder for this event."}</p>{dialog === "announcement" ? <div className="mt-5 space-y-4"><label className="block text-sm font-bold text-[#06201c]">Title <span className="font-normal text-[#52736a]">(optional)</span><input value={title} onChange={(eventChange) => setTitle(eventChange.target.value)} disabled={isPending} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal outline-none focus:border-[#1f6a58] focus:ring-2 focus:ring-[#1f6a58]/20 disabled:opacity-60" /></label><label className="block text-sm font-bold text-[#06201c]">Message <textarea value={message} onChange={(eventChange) => setMessage(eventChange.target.value)} disabled={isPending} rows={4} className="mt-1 w-full rounded-xl border border-[#d7e5df] p-3 font-normal outline-none focus:border-[#1f6a58] focus:ring-2 focus:ring-[#1f6a58]/20 disabled:opacity-60" /></label><label className="block text-sm font-bold text-[#06201c]">Recipients <select value={recipientType} onChange={(eventChange) => setRecipientType(eventChange.target.value as "all" | "registered")} disabled={isPending} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 font-normal outline-none focus:border-[#1f6a58] focus:ring-2 focus:ring-[#1f6a58]/20 disabled:opacity-60"><option value="all">All</option><option value="registered">Registered attendees</option></select></label><fieldset><legend className="text-sm font-bold text-[#06201c]">Delivery channels</legend><div className="mt-2 grid grid-cols-2 gap-2">{announcementChannels.map((channel) => <label key={channel.value} className="flex items-center gap-2 rounded-lg border border-[#d7e5df] px-3 py-2 text-sm font-semibold text-[#31594d]"><input type="checkbox" checked={channels.includes(channel.value)} disabled={isPending} onChange={() => setChannels((current) => current.includes(channel.value) ? current.filter((value) => value !== channel.value) : [...current, channel.value])} />{channel.label}</label>)}</div></fieldset></div> : null}{error ? <p role="alert" className="mt-4 text-sm font-semibold text-[#b42318]">{error}</p> : null}<div className="mt-6 flex justify-end gap-3"><button ref={closeButtonRef} type="button" onClick={closeDialog} disabled={isPending} className="h-10 rounded-full border border-[#d7e5df] px-4 text-sm font-semibold text-[#52736a] disabled:opacity-60">Cancel</button><button type="button" onClick={() => dialog === "announcement" ? submitAnnouncement() : reminderMutation.mutate()} disabled={isPending} className="h-10 rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white disabled:opacity-60">{isPending ? "Sending..." : dialog === "announcement" ? "Send announcement" : "Send reminder"}</button></div></div></div> : null}
  </>;
}

function getCommunicationErrorMessage(error: unknown, action: string): string {
  if (!(error instanceof EventsApiError)) return `Unable to ${action}. Please try again.`;
  if (error.status === 401 || error.status === 403) return "You do not have permission to perform this action.";
  if (error.status === 404) return "This event no longer exists.";
  if (error.status === 409) return "This action is not available for the event's current state.";
  if (error.status === 422) return error.fieldErrors.message?.[0] ?? "Please correct the announcement details.";
  return `Unable to ${action}. Please try again.`;
}

function trapDialogFocus(event: React.KeyboardEvent<HTMLDivElement>) {
  if (event.key !== "Tab") return;
  const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])"));
  const currentIndex = focusable.findIndex((element) => element === document.activeElement);
  const nextIndex = event.shiftKey ? (currentIndex - 1 + focusable.length) % focusable.length : (currentIndex + 1) % focusable.length;
  focusable[nextIndex]?.focus();
  event.preventDefault();
}
