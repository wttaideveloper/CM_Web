export interface EventLocalDateTime {
  date: string;
  time: string;
}

export function parseEventLocalDateTime(value: string): EventLocalDateTime | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(value);
  return match ? { date: match[1], time: match[2] } : null;
}

export function getEventSessionDates(startDateTime: string, endDateTime: string): string[] {
  const start = parseEventLocalDateTime(startDateTime)?.date;
  const end = parseEventLocalDateTime(endDateTime)?.date;
  if (!start || !end || start > end) return [];
  const dates: string[] = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const endCursor = new Date(`${end}T00:00:00Z`);
  while (cursor <= endCursor) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export function getSessionTimeBounds(sessionDate: string, startDateTime: string, endDateTime: string) {
  const start = parseEventLocalDateTime(startDateTime);
  const end = parseEventLocalDateTime(endDateTime);
  if (!start || !end) return { min: "00:00", max: "23:59" };
  return { min: sessionDate === start.date ? start.time : "00:00", max: sessionDate === end.date ? end.time : "23:59" };
}

export function formatSessionDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}
