export type EventTimeFilter = "all" | "ongoing" | "finished";

type EventSchedule = {
  start_date: string;
  end_date: string;
  time_zone: string;
};

type LocalDateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
};

/** Returns whether an Event's schedule matches the client-side time filter. */
export function matchesEventTimeFilter(event: EventSchedule, filter: EventTimeFilter, now: Date = new Date()): boolean {
  if (filter === "all") return true;
  const start = eventDateTimeToEpoch(event.start_date, event.time_zone);
  const end = eventDateTimeToEpoch(event.end_date, event.time_zone);
  const nowValue = now.getTime();
  if (start === null || end === null || !Number.isFinite(nowValue)) return false;
  if (filter === "ongoing") return start <= nowValue && nowValue < end;
  return end < nowValue;
}

function eventDateTimeToEpoch(value: string, timeZone: string): number | null {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(value)) return parsed;

  const local = parseLocalDateTime(value);
  if (!local) return null;
  const naiveEpoch = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second, local.millisecond);
  if (!Number.isFinite(naiveEpoch)) return null;

  let candidate = naiveEpoch;
  try {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const represented = timeZoneParts(candidate, timeZone);
      const representedAsUtc = Date.UTC(represented.year, represented.month - 1, represented.day, represented.hour, represented.minute, represented.second, represented.millisecond);
      const next = naiveEpoch - (representedAsUtc - candidate);
      if (next === candidate) return candidate;
      candidate = next;
    }
  } catch {
    return null;
  }
  return candidate;
}

function parseLocalDateTime(value: string): LocalDateTimeParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute, second = "0", milliseconds = ""] = match;
  return { year: Number(year), month: Number(month), day: Number(day), hour: Number(hour), minute: Number(minute), second: Number(second), millisecond: Number(milliseconds.padEnd(3, "0") || "0") };
}

function timeZoneParts(epoch: number, timeZone: string): LocalDateTimeParts {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(epoch));
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
  return { year: values.year, month: values.month, day: values.day, hour: values.hour, minute: values.minute, second: values.second, millisecond: 0 };
}
