import { parseGroupChatMessageTimestamp } from "./group-chat-models.ts";

export type GroupChatMessageTimestampDisplay = {
  fullTime: string;
  compactTime: string;
  date: string;
  valid: boolean;
};

function toDate(value: string | null | undefined): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const timestamp = parseGroupChatMessageTimestamp(value);
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp);
}

function localDateTimeOptions(timeZone?: string): Intl.DateTimeFormatOptions {
  return timeZone ? { timeZone } : {};
}

/** Returns a stable local-calendar key for consecutive Group Chat date grouping. */
export function getGroupChatMessageLocalDateKey(value: string | null | undefined, timeZone?: string): string | null {
  const date = toDate(value);
  if (!date) return null;
  const parts = new Intl.DateTimeFormat("en-US", { ...localDateTimeOptions(timeZone), year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

/** Returns one separator key for each newly encountered local calendar date. */
export function getGroupChatMessageDateSeparatorKeys(values: readonly (string | null | undefined)[], timeZone?: string): (string | null)[] {
  let previousDateKey: string | null = null;
  return values.map((value) => {
    const dateKey = getGroupChatMessageLocalDateKey(value, timeZone);
    if (!dateKey) return null;
    const separatorKey = dateKey === previousDateKey ? null : dateKey;
    previousDateKey = dateKey;
    return separatorKey;
  });
}

/** Formats a Group Chat timestamp using the viewer's browser timezone. */
export function formatGroupChatMessageTimestamp(value: string | null | undefined, timeZone?: string): GroupChatMessageTimestampDisplay {
  const date = toDate(value);
  if (!date) {
    const fallback = typeof value === "string" && value.trim() ? value : "Time unavailable";
    return { fullTime: fallback, compactTime: fallback, date: "Date unavailable", valid: false };
  }

  const options = localDateTimeOptions(timeZone);
  return {
    fullTime: date.toLocaleString(undefined, options),
    compactTime: date.toLocaleTimeString(undefined, { ...options, hour: "numeric", minute: "2-digit" }),
    date: date.toLocaleDateString(undefined, { ...options, day: "numeric", month: "short", year: "numeric" }),
    valid: true,
  };
}

/** Formats an invitation's authoritative created_at value for the viewer's local timezone. */
export function formatGroupChatInvitationReceivedAt(value: string | null | undefined, timeZone?: string): string | null {
  const date = toDate(value);
  if (!date) return null;
  return new Intl.DateTimeFormat(undefined, { ...localDateTimeOptions(timeZone), dateStyle: "medium", timeStyle: "short" }).format(date);
}
