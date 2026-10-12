import { afterEach, describe, expect, it, vi } from "vitest";
import { getPlatformReviewsAudit, listPlatformReviewsManage, moderatePlatformReview, normalizeUtcDate, parsePlatformReviewItem, parsePlatformReviewsManageResponse, sanitizePlatformReviewerName, validateComment, validateRating } from "./platform-reviews.service";

afterEach(() => vi.unstubAllGlobals());

describe("Platform review parsing and rules", () => {
  it("accepts only whole number ratings from 1 to 5", () => {
    [1, 2, 3, 4, 5].forEach((value) => expect(() => validateRating(value)).not.toThrow());
    [0, 6, 3.5, "5"].forEach((value) => expect(() => validateRating(value)).toThrow());
  });
  it("enforces the optional 2,000 character comment maximum", () => {
    expect(() => validateComment(null)).not.toThrow();
    expect(() => validateComment("x".repeat(2000))).not.toThrow();
    expect(() => validateComment("x".repeat(2001))).toThrow();
  });
  it("uses module-specific safe fallbacks for blank or email-like names", () => {
    expect(sanitizePlatformReviewerName(" ", "training")).toBe("Learner");
    expect(sanitizePlatformReviewerName("person@example.com", "event")).toBe("Attendee");
    expect(sanitizePlatformReviewerName(null, "product")).toBe("Customer");
    expect(sanitizePlatformReviewerName(" Jane ", "service")).toBe("Jane");
  });
  it("normalizes UTC dates without altering explicit offsets", () => {
    expect(normalizeUtcDate("2026-10-08T10:20:00")).toBe("2026-10-08T10:20:00Z");
    expect(normalizeUtcDate("2026-10-08T10:20:00+05:30")).toBe("2026-10-08T10:20:00+05:30");
  });
  it("normalizes managed review response fields and status counts", () => {
    const result = parsePlatformReviewsManageResponse({ items: [{ module: "event", review_id: "review-1", item_id: "event-1", item_name: "Event", business_name: "Acme", rating: 5, reviewer_name: "", reviewer_email: "person@example.com", is_verified: true, moderation_status: "pending", created_at: "2026-10-08T10:20:00" }], counts: { pending: 1, approved: 2, rejected: 0 }, pagination: { page: 1, page_size: 20, total: 3, total_pages: 1 } });
    expect(result.items[0].reviewer_name).toBe("Attendee");
    expect(result.items[0].created_at).toBe("2026-10-08T10:20:00Z");
    expect(result.counts.all).toBe(3);
    expect(result.pagination.total_pages).toBe(1);
  });
  it("rejects malformed managed responses and unknown modules", () => {
    expect(() => parsePlatformReviewsManageResponse({ items: [{ module: "unknown" }] })).toThrow();
    expect(() => parsePlatformReviewItem({ review_id: "r", item_id: "i", module: "other" })).toThrow();
  });
  it("accepts successful moderation responses without parsing a response body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    await expect(moderatePlatformReview("event", "review-1", "approved")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith("/api/platform-super-admin/reviews/event/review-1/moderate", expect.objectContaining({ method: "PATCH", credentials: "include" }));
  });
  it("sends the trimmed search term to the managed reviews API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [], counts: {}, pagination: {} }) });
    vi.stubGlobal("fetch", fetchMock);

    await listPlatformReviewsManage({ module: "training", itemId: "89580d23-6a70-4dff-8a97-3c2c1dc25893", q: "  privacy  " });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/platform-super-admin/reviews/manage?module=training&page=1&page_size=20&item_id=89580d23-6a70-4dff-8a97-3c2c1dc25893&q=privacy",
      expect.objectContaining({ credentials: "include", cache: "no-store" }),
    );
  });
  it("parses direct and enveloped audit lists while skipping invalid entries", async () => {
    const valid = { review_id: "review-1", item_id: "item-1", to_status: "approved", created_at: "2026-10-08T10:20:00" };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [null, valid] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ items: [valid] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ audit: [valid] }) });
    vi.stubGlobal("fetch", fetchMock);

    const direct = await getPlatformReviewsAudit("event");
    const itemsEnvelope = await getPlatformReviewsAudit("event");
    const auditEnvelope = await getPlatformReviewsAudit("event");

    expect(direct).toHaveLength(1);
    expect(direct[0].id).toBe("audit-1");
    expect(direct[0].created_at).toBe("2026-10-08T10:20:00Z");
    expect(itemsEnvelope).toHaveLength(1);
    expect(auditEnvelope).toHaveLength(1);
  });
});
