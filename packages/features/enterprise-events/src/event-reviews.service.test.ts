import { describe, expect, it } from "vitest";
import { calculateEventRatingSummary, isAttendeeEligibleToReview, normalizeUtcDate, parseEventReview, validateComment, validateRating } from "./event-reviews.service";
import type { EventReview } from "./event-reviews.types";

const review = (id: string, rating: EventReview["rating"], moderation_status: EventReview["moderation_status"]): EventReview => ({ id, event_id: "event-1", event_title: "Event", rating, comment: null, participant_name: "Attendee", participant_email: null, verified: true, moderation_status, created_at: null, updated_at: null });

describe("Event review rules", () => {
  it("accepts only integer ratings from one through five", () => {
    [1, 2, 3, 4, 5].forEach((rating) => expect(() => validateRating(rating)).not.toThrow());
    [0, 6, 3.5, "5"].forEach((rating) => expect(() => validateRating(rating)).toThrow());
  });
  it("limits optional comments to 2,000 characters", () => {
    expect(() => validateComment(null)).not.toThrow();
    expect(() => validateComment("x".repeat(2000))).not.toThrow();
    expect(() => validateComment("x".repeat(2001))).toThrow();
  });
  it("uses Attendee fallback for missing or email-like names and strips identity from display name", () => {
    expect(parseEventReview({ id: "r1", reviewer_name: "  ", reviewer_email: "hidden@example.com", rating: 5 }).participant_name).toBe("Attendee");
    expect(parseEventReview({ id: "r2", reviewer_name: "person@example.com", rating: 4 }).participant_name).toBe("Attendee");
    expect(parseEventReview({ id: "r3", reviewer_name: " Jane Doe ", rating: 4 }).participant_name).toBe("Jane Doe");
  });
  it("allows only confirmed and attended registration statuses", () => {
    expect(isAttendeeEligibleToReview("confirmed")).toBe(true);
    expect(isAttendeeEligibleToReview(" attended ")).toBe(true);
    ["pending", "cancelled", "waitlisted", "no_show", null].forEach((status) => expect(isAttendeeEligibleToReview(status)).toBe(false));
  });
  it("calculates approved-only average and distribution without zero ratings", () => {
    const result = calculateEventRatingSummary([review("a", 5, "approved"), review("b", 4, "approved"), review("c", 1, "pending"), review("d", 2, "rejected")]);
    expect(result.averageRating).toBe(4.5);
    expect(result.totalReviewsCount).toBe(2);
    expect(result.pendingReviewsCount).toBe(1);
    expect(result.starBreakdown[5]).toBe(1);
    expect(calculateEventRatingSummary([]).averageRatingDisplay).toBe("No ratings yet");
  });
  it("normalizes server UTC timestamps that omit a zone", () => {
    expect(normalizeUtcDate("2026-10-08T10:20:00")).toBe("2026-10-08T10:20:00Z");
    expect(normalizeUtcDate("2026-10-08T10:20:00+05:30")).toBe("2026-10-08T10:20:00+05:30");
  });
});
