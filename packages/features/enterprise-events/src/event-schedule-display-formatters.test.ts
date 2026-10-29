import { describe, expect, it } from "vitest";

import { formatEventScheduleDateTime } from "./event-detail-formatters";

describe("Event schedule display formatting", () => {
  it("keeps offset-less Event-local wall-clock values unchanged", () => {
    const formatted = formatEventScheduleDateTime("2026-10-13T14:16:00", "Asia/Kolkata");

    expect(formatted).toContain("13 Oct 2026");
    expect(formatted).toContain("2:16 PM");
  });

  it("formats multi-day end values and safely handles missing or invalid values", () => {
    expect(formatEventScheduleDateTime("2026-10-15T18:00:00", "Asia/Kolkata")).toContain("15 Oct 2026");
    expect(formatEventScheduleDateTime(null, "Asia/Kolkata")).toBe("Not specified");
    expect(formatEventScheduleDateTime("invalid", "Asia/Kolkata")).toBe("Not specified");
  });
});
