import { afterEach, describe, expect, it, vi } from "vitest";
import { getPlatformReviewsAudit, listPlatformReviewsManage, matchesPlatformReviewSearch, moderatePlatformReview, normalizeUtcDate, parsePlatformReviewItem, parsePlatformReviewsManageResponse, platformReviewDisplayTimestamp, sanitizePlatformReviewerName, validateComment, validateRating } from "./platform-reviews.service";

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
  it("searches reviewer names across words, case, and accents", () => {
    expect(matchesPlatformReviewSearch("jose garcia", ["José", "García López", "jose@example.com"])).toBe(true);
    expect(matchesPlatformReviewSearch("smith", ["Jane Smith", "jane@example.com"])).toBe(true);
    expect(matchesPlatformReviewSearch("not found", ["Jane Smith", "jane@example.com"])).toBe(false);
    expect(matchesPlatformReviewSearch("  ", ["Jane Smith"])).toBe(true);
  });
  it("normalizes UTC dates without altering explicit offsets", () => {
    expect(normalizeUtcDate("2026-10-08T10:20:00")).toBe("2026-10-08T10:20:00Z");
    expect(normalizeUtcDate("2026-10-08T10:20:00+05:30")).toBe("2026-10-08T10:20:00+05:30");
  });
  it("shows the latest review edit time without replacing creation time with an older timestamp", () => {
    const created = "2026-10-08T10:20:00Z";
    const updated = "2026-10-09T11:30:00Z";
    expect(platformReviewDisplayTimestamp(created, updated)).toBe(updated);
    expect(platformReviewDisplayTimestamp(created, created)).toBe(created);
    expect(platformReviewDisplayTimestamp(created, "2026-10-07T11:30:00Z")).toBe(created);
    expect(platformReviewDisplayTimestamp(created, null)).toBe(created);
    expect(platformReviewDisplayTimestamp(null, updated)).toBe(updated);
  });
  it("normalizes managed review response fields and status counts", () => {
    const result = parsePlatformReviewsManageResponse({ items: [{ module: "event", review_id: "review-1", item_id: "event-1", item_name: "Event", business_name: "Acme", rating: 5, reviewer_name: "", reviewer_email: "person@example.com", is_verified: true, moderation_status: "rejected", rejection_reason: "Does not meet review guidelines.", created_at: "2026-10-08T10:20:00", updated_at: "2026-10-09T11:30:00" }], counts: { pending: 1, approved: 2, rejected: 0 }, pagination: { page: 1, page_size: 20, total: 3, total_pages: 1 } });
    expect(result.items[0].reviewer_name).toBe("Attendee");
    expect(result.items[0].created_at).toBe("2026-10-08T10:20:00Z");
    expect(result.items[0].updated_at).toBe("2026-10-09T11:30:00Z");
    expect(result.items[0].reason).toBe("Does not meet review guidelines.");
    expect(platformReviewDisplayTimestamp(result.items[0].created_at, result.items[0].updated_at)).toBe("2026-10-09T11:30:00Z");
    expect(result.counts.all).toBe(3);
    expect(result.pagination.total_pages).toBe(1);
  });
  it("reads reviewer names from supported module response aliases", () => {
    const item = parsePlatformReviewItem({ module: "product", id: "review-2", product_id: "product-1", customer_name: "Morgan Customer", reviewer_email: "morgan@example.com" });
    expect(item.reviewer_name).toBe("Morgan Customer");
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
      "/api/platform-super-admin/reviews/manage?module=training&page=1&page_size=20&q=privacy&item_id=89580d23-6a70-4dff-8a97-3c2c1dc25893",
      expect.objectContaining({ credentials: "include", cache: "no-store" }),
    );
  });
  it("parses direct and enveloped audit lists while skipping invalid entries", async () => {
    const valid = { review_id: "review-1", item_id: "item-1", to_status: "rejected", rejection_reason: "Does not meet review guidelines.", created_at: "2026-10-08T10:20:00" };
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
    expect(direct[0].reason).toBe("Does not meet review guidelines.");
    expect(itemsEnvelope).toHaveLength(1);
    expect(auditEnvelope).toHaveLength(1);
  });
});
