export type BlogPostType = "blog" | "news" | "both";
export type BlogPostStatus =
  | "draft"
  | "pending_review"
  | "changes_requested"
  | "rejected"
  | "published"
  | "unpublished";

export type BlogPostFields = {
  type: BlogPostType;
  title: string;
  summary: string;
  content: string;
  category: string;
  coverImageUrl: string;
  tags: string;
};

export type BlogPost = BlogPostFields & {
  id: string;
  status: BlogPostStatus;
  updatedAt: string;
  author: string;
  enterprise: string;
  pinned: boolean;
  feedback?: string;
  liveVersion?: BlogPostFields;
};

export const BLOG_POSTS_STORAGE_KEY = "ihp.blogs.posts.v1";
const BLOG_POSTS_UPDATED_EVENT = "ihp:blogs-updated";

export function readBlogPosts(): BlogPost[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(BLOG_POSTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is BlogPost => {
      if (!item || typeof item !== "object") return false;
      const post = item as Partial<BlogPost>;
      return typeof post.id === "string" && typeof post.title === "string" &&
        (post.type === "blog" || post.type === "news") &&
        typeof post.status === "string" && typeof post.updatedAt === "string";
    });
  } catch {
    return [];
  }
}

export function writeBlogPosts(posts: BlogPost[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BLOG_POSTS_STORAGE_KEY, JSON.stringify(posts));
  queueMicrotask(() => window.dispatchEvent(new CustomEvent(BLOG_POSTS_UPDATED_EVENT)));
}

export function subscribeToBlogPosts(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onStorage = (event: StorageEvent) => {
    if (event.key === BLOG_POSTS_STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(BLOG_POSTS_UPDATED_EVENT, listener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(BLOG_POSTS_UPDATED_EVENT, listener);
  };
}
