import { describe, expect, it } from "vitest";

import { auditTimestampValue, formatAuditDateTime, normalizeUtcAuditDate } from "./audit-date-formatters";

describe("Platform audit timestamp formatting", () => {
  it("converts an offset-less UTC timestamp to the viewer timezone", () => {
    expect(formatAuditDateTime("2026-10-12T08:48:28.677826", "Asia/Kolkata")).toBe(
      new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date("2026-10-12T08:48:28.677826Z")),
    );
  });

  it("preserves explicit UTC and non-UTC offsets", () => {
    expect(normalizeUtcAuditDate("2026-10-12T08:48:28.677826Z")).toBe("2026-10-12T08:48:28.677826Z");
    expect(normalizeUtcAuditDate("2026-10-12T08:48:28.677826+05:30")).toBe("2026-10-12T08:48:28.677826+05:30");
  });

  it("formats the same instant correctly outside IST without double conversion", () => {
    const timestamp = "2026-10-12T08:48:28.677826Z";
    expect(formatAuditDateTime(timestamp, "America/New_York")).toBe(
      new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" }).format(new Date(timestamp)),
    );
    expect(formatAuditDateTime(timestamp, "Asia/Kolkata")).toBe(
      new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(timestamp)),
    );
  });

  it("handles fractional seconds, empty values, and invalid values safely", () => {
    expect(normalizeUtcAuditDate("2026-10-12T08:48:28.677826")).toBe("2026-10-12T08:48:28.677826Z");
    expect(formatAuditDateTime(null)).toBe("Not provided");
    expect(formatAuditDateTime("   ")).toBe("Not provided");
    expect(formatAuditDateTime("not-a-date")).toBe("Date unavailable");
    expect(auditTimestampValue("not-a-date")).toBe(Number.NEGATIVE_INFINITY);
  });
});
