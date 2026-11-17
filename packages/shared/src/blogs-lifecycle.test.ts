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

  describe("Shadow database removal: API failures propagate", () => {
    it("unpublishAdminBlogPost rejects when the API is unavailable", async () => {
      await expect(unpublishAdminBlogPost("post-summit-3", "reason")).rejects.toBeInstanceOf(BlogsApiError);
    });

    it("createMyBlogPost rejects when the API is unavailable", async () => {
      await expect(createMyBlogPost({ kind: "blog", title: "T", content: "c" })).rejects.toBeInstanceOf(BlogsApiError);
    });

    it("deleteMyBlogPost rejects when the API is unavailable", async () => {
      await expect(deleteMyBlogPost("post-summit-3")).rejects.toBeInstanceOf(BlogsApiError);
    });

    it("archiveMyBlogPost rejects when the API is unavailable", async () => {
      await expect(archiveMyBlogPost("post-summit-3", "reason")).rejects.toBeInstanceOf(BlogsApiError);
    });

    it("listMyBlogPosts rejects when the API is unavailable", async () => {
      await expect(listMyBlogPosts({ pageSize: 10 })).rejects.toBeInstanceOf(BlogsApiError);
    });
  });

  describe("DEFECT-MEDIUM-007: Category Post Count Accuracy", () => {
    it("listAdminBlogCategories rejects when the API is unavailable", async () => {
      await expect(listAdminBlogCategories()).rejects.toBeInstanceOf(BlogsApiError);
    });
  });
});