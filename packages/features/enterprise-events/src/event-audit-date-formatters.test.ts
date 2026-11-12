import { describe, expect, it } from "vitest";

import {
  formatAttendanceAuditDateTime,
  formatAuditDateTime,
  formatEventDate,
  formatEventDateTime,
  formatEventTime,
} from "./event-detail-formatters";

describe("Event audit timestamp formatting", () => {
  it("converts confirmed naive UTC timestamps without changing schedule formatting", () => {
    expect(formatAuditDateTime("2026-10-12T08:48:28.677826", "Asia/Kolkata")).toBe(
      new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date("2026-10-12T08:48:28.677826Z")),
    );
    expect(formatEventDateTime("2026-10-12T08:48:28.677826", "Asia/Kolkata")).toBe("12/10/2026, 08:48 (Asia/Kolkata)");
    expect(formatEventDateTime("2026-10-12T08:48:28.677826", "Asia/Kolkata", false)).toBe("12/10/2026, 08:48");
  });

  it("formats date-only and time-only without time zone suffix", () => {
    expect(formatEventDate("2026-11-14T12:15:00", "America/New_York")).toBe("14/11/2026");
    expect(formatEventTime("2026-11-14T12:15:00", "America/New_York")).toBe("12:15");
  });

  it("keeps explicit zones and handles missing or invalid audit values", () => {
    expect(formatAuditDateTime("2026-10-12T08:48:28.677826Z", "Asia/Kolkata")).toBe(
      new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date("2026-10-12T08:48:28.677826Z")),
    );
    expect(formatAuditDateTime("2026-10-12T08:48:28.677826+05:30", "America/New_York")).toBe(
      new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" }).format(new Date("2026-10-12T08:48:28.677826+05:30")),
    );
    expect(formatAuditDateTime("", "Asia/Kolkata")).toBe("Not provided");
    expect(formatAuditDateTime("invalid", "Asia/Kolkata")).toBe("Date unavailable");
  });

  it("renders attendance audit timestamps in the browser timezone", () => {
    expect(formatAttendanceAuditDateTime("2026-10-12T13:12:00")).toBe(
      new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date("2026-10-12T13:12:00Z")),
    );
  });
});
