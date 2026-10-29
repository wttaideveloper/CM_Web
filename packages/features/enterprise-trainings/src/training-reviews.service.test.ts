import { describe, expect, it } from "vitest";

import {
  calculateRatingSummary,
  isLearnerEligibleToReview,
  normalizeUtcDate,
  parseManagedTrainingReviews,
  parseTrainingReview,
  parseTrainingReviews,
  sanitizeReviewerDisplayName,
  validateComment,
  validateRating,
} from "./training-reviews.service";
import type { TrainingReview, TrainingStarRating } from "./training-reviews.types";

function createReview(rating: TrainingStarRating, status: TrainingReview["moderation_status"] = "approved"): TrainingReview {
  return {
    id: `${rating}-${status}`,
    training_id: "training-1",
    rating,
    comment: null,
    participant_name: "Learner",
    participant_email: null,
    verified: true,
    moderation_status: status,
    created_at: null,
    updated_at: null,
  };
}

describe("Training review rules", () => {
  it("accepts only whole-number ratings from one to five", () => {
    for (const rating of [1, 2, 3, 4, 5]) expect(() => validateRating(rating)).not.toThrow();
    for (const rating of [0, 6, 3.5, "5", "five", null, undefined]) expect(() => validateRating(rating)).toThrow();
  });

  it("accepts optional comments up to 2,000 characters", () => {
    expect(() => validateComment(undefined)).not.toThrow();
    expect(() => validateComment(null)).not.toThrow();
    expect(() => validateComment("")).not.toThrow();
    expect(() => validateComment("x".repeat(2000))).not.toThrow();
    expect(() => validateComment("x".repeat(2001))).toThrow(/2,000/);
    expect(() => validateComment(12)).toThrow();
  });

  it("calculates average and distribution from approved reviews only", () => {
    const result = calculateRatingSummary([
      createReview(5), createReview(4), createReview(1, "pending"), createReview(2, "rejected"),
    ]);
    expect(result.averageRating).toBe(4.5);
    expect(result.averageRatingDisplay).toBe("4.5 ★");
    expect(result.totalReviewsCount).toBe(2);
    expect(result.pendingReviewsCount).toBe(1);
    expect(result.starBreakdown).toEqual({ 1: 0, 2: 0, 3: 0, 4: 1, 5: 1 });
    expect(calculateRatingSummary([createReview(5, "pending")]).averageRatingDisplay).toBe("No ratings yet");
    expect(calculateRatingSummary([]).averageRatingDisplay).toBe("No ratings yet");
  });

  it("uses Learner instead of a missing name or an email-shaped name", () => {
    expect(sanitizeReviewerDisplayName("  Nisha Rao  ")).toBe("Nisha Rao");
    expect(sanitizeReviewerDisplayName("nisha@example.com", "nisha@example.com")).toBe("Learner");
    expect(sanitizeReviewerDisplayName(" ", "nisha@example.com")).toBe("Learner");
    expect(sanitizeReviewerDisplayName(undefined, "nisha@example.com")).toBe("Learner");
  });

  it("normalizes UTC timestamps without changing explicitly zoned timestamps", () => {
    expect(normalizeUtcDate("2026-10-08T12:30:00")).toBe("2026-10-08T12:30:00Z");
    expect(normalizeUtcDate("2026-10-08T12:30:00+05:30")).toBe("2026-10-08T12:30:00+05:30");
    expect(normalizeUtcDate("2026-10-08")).toBe("2026-10-08");
    expect(normalizeUtcDate(null)).toBeNull();
  });

  it("allows review only for enrolled, active, completed, or approved learners", () => {
    for (const status of ["enrolled", "active", "completed", "approved"]) expect(isLearnerEligibleToReview(status)).toBe(true);
    for (const status of ["pending", "rejected", "cancelled", "waitlist", "waitlisted", null]) expect(isLearnerEligibleToReview(status)).toBe(false);
  });

  it("normalizes review fields and sorts the newest first", () => {
    const parsed = parseTrainingReview({ id: "r-1", rating: 5, participant_name: "", participant_email: "person@example.com", created_at: "2026-10-08T12:30:00" });
    expect(parsed.participant_name).toBe("Learner");
    expect(parsed.moderation_status).toBe("approved");
    expect(parsed.created_at).toBe("2026-10-08T12:30:00Z");
    expect(parseTrainingReviews([{ ...parsed, id: "old", created_at: "2026-10-07T12:30:00Z" }, { ...parsed, id: "new", created_at: "2026-10-08T12:30:00Z" }]).map((review) => review.id)).toEqual(["new", "old"]);
    expect(parseTrainingReview({ id: "legacy", rating: null }).rating).toBeNull();
    expect(() => parseTrainingReview({ rating: 3 })).toThrow(/without an ID/);
  });

  it("maps the deployed moderation queue response shape", () => {
    const result = parseManagedTrainingReviews({
      items: [{
        module: "training",
        review_id: "review-1",
        item_id: "training-1",
        item_name: "Mindful Movement",
        rating: 4,
        comment: "Great session",
        reviewer_name: "Jane Doe",
        reviewer_email: "jane@example.com",
        is_verified: true,
        moderation_status: "pending",
        created_at: "2026-10-01T09:00:00",
        updated_at: "2026-10-01T09:00:00",
      }],
      counts: { pending: 3, approved: 10, rejected: 2 },
      pagination: { page: 1, page_size: 20, total: 15, total_pages: 1 },
    });

    expect(result.reviews[0]).toMatchObject({
      id: "review-1",
      training_id: "training-1",
      training_title: "Mindful Movement",
      participant_name: "Jane Doe",
      participant_email: "jane@example.com",
      verified: true,
      moderation_status: "pending",
      created_at: "2026-10-01T09:00:00Z",
    });
    expect(result.counts).toEqual({ pending: 3, approved: 10, rejected: 2, all: 15 });
    expect(result).toMatchObject({ total: 15, page: 1, page_size: 20 });
  });
});
