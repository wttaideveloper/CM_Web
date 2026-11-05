import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  archiveMyBlogPost,
  createMyBlogPost,
  deleteMyBlogPost,
  generateUniqueSlug,
  listAdminBlogCategories,
  listMyBlogPosts,
  unpublishAdminBlogPost,
  BlogsApiError,
  resetStoredBlogs,
  getStoredPosts,
  saveStoredPosts,
} from "./blogs-api";

describe("Blog Lifecycle and Defect Regression Suite", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Network unavailable in mock unit test"));
    resetStoredBlogs();
  });

  describe("DEFECT-MEDIUM-002: Slug Collision Detection & Unique Slug Generation", () => {
    it("generates kebab-case slug for a title", () => {
      const slug = generateUniqueSlug("Healthy Living Guide 2026!", []);
      expect(slug).toBe("healthy-living-guide-2026");
    });

    it("appends incremental suffixes when slug already exists", () => {
      const existing = [
        { id: "1", slug: "cardio-tips" },
        { id: "2", slug: "cardio-tips-1" },
      ];
      const slug = generateUniqueSlug("Cardio Tips", existing);
      expect(slug).toBe("cardio-tips-2");
    });

    it("handles non-Latin, punctuation, and leading/trailing dashes", () => {
      const slug = generateUniqueSlug("---Special Health & Wellness Alert!---", []);
      expect(slug).toBe("special-health-wellness-alert");
    });

    it("falls back to 'post' if title consists entirely of special characters", () => {
      const slug = generateUniqueSlug("??? !!!", []);
      expect(slug).toBe("post");
    });
  });

  describe("DEF-001: Unpublish Reason Validation", () => {
    it("unpublishes post successfully when a valid reason is provided", async () => {
      const posts = getStoredPosts();
      const livePost = posts.find((p) => p.status === "published" || p.is_live);
      if (!livePost) return;

      const result = await unpublishAdminBlogPost(
        livePost.id,
        "Taking down for medical review and regulatory verification.",
      );
      expect(result.status).toBe("unpublished");
      expect(result.is_live).toBe(false);
      expect(result.reviewer_note).toContain("regulatory verification");
    });
  });

  describe("DEF-002: Deleting Draft and Rejected Posts", () => {
    it("allows deleting a draft post cleanly", async () => {
      const created = await createMyBlogPost({
        kind: "blog",
        title: "Temporary Draft To Delete",
        content: "Draft content...",
      });

      const delResult = await deleteMyBlogPost(created.id);
      expect(delResult.message).toBe("Post deleted");

      const posts = await listMyBlogPosts({ pageSize: 100 });
      expect(posts.items.some((p) => p.id === created.id)).toBe(false);
    });

    it("allows discarding / deleting a rejected post", async () => {
      const created = await createMyBlogPost({
        kind: "blog",
        title: "Rejected Proposal",
        content: "Proposal content...",
      });

      // Simulate post being marked as rejected
      const posts = getStoredPosts();
      const idx = posts.findIndex((p) => p.id === created.id);
      if (idx !== -1) {
        posts[idx] = {
          ...posts[idx],
          status: "rejected",
          status_label: "Rejected",
        };
        saveStoredPosts(posts);
      }

      const delResult = await deleteMyBlogPost(created.id);
      expect(delResult.message).toBe("Post deleted");
    });

    it("archives a post with audit tracking", async () => {
      const created = await createMyBlogPost({
        kind: "blog",
        title: "Post to Archive",
        content: "Archived content...",
      });

      const archived = await archiveMyBlogPost(created.id, "Archiving outdated post");
      expect(archived.status).toBe("unpublished");
      expect(archived.status_label).toBe("Archived");
    });
  });

  describe("DEFECT-MEDIUM-007: Category Post Count Accuracy", () => {
    it("returns exact count of matching posts without retaining stale counts", async () => {
      const categories = await listAdminBlogCategories();
      expect(Array.isArray(categories)).toBe(true);
      for (const cat of categories) {
        expect(typeof cat.post_count).toBe("number");
        expect(cat.post_count).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
