"use client";

import { useState, useEffect, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BlogCategory, BlogPostFields, BlogLinkedEntity, BlogModuleKey } from "@ihp/shared";

type PostType = "blog" | "news" | "both";
type PostStatus = "draft" | "pending_review" | "changes_requested" | "rejected" | "published" | "unpublished";

export type Post = BlogPostFields & {
  id: string;
  status: PostStatus;
  createdAt: string;
  updatedAt: string;
  author: string;
  enterprise: string;
  pinned: boolean;
  feedback?: string;
  liveVersion?: BlogPostFields;
  enterpriseId: string | null;
  tenantId: string | null;
  version?: number;
  module?: BlogModuleKey | null;
  linkedEntity?: BlogLinkedEntity | null;
};

const STATUS_LABEL: Record<PostStatus, string> = {
  draft: "Draft",
  pending_review: "Pending approval",
  changes_requested: "Changes requested",
  rejected: "Rejected",
  published: "Published",
  unpublished: "Unpublished",
};

function formatBlogListDate(value: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function getRenderableBlogAssetUrl(value: string): string {
  return value;
}

interface BlogPostCardGridProps {
  posts: Post[];
  visiblePosts: Post[];
  isLoading: boolean;
  isLoadingEnterprise: boolean;
  enterpriseUnavailable: boolean;
  totalCount: number;
  categories: BlogCategory[];
  detailsBasePath: string;
  onOpenEdit: (post: Post) => void;
  onUnpublish: (post: Post) => void;
  onRemoveDraft: (post: Post) => void;
  onOpenCreate: () => void;
}

export function BlogPostCardGrid({
  posts,
  visiblePosts,
  isLoading,
  isLoadingEnterprise,
  enterpriseUnavailable,
  totalCount: _totalCount,
  categories,
  detailsBasePath,
  onOpenEdit,
  onUnpublish,
  onRemoveDraft,
  onOpenCreate,
}: BlogPostCardGridProps) {
  const router = useRouter();
  const [openActionPostId, setOpenActionPostId] = useState<string | null>(null);
  const [actionMenuPosition, setActionMenuPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!openActionPostId) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target?.closest(`[data-post-action-menu="${openActionPostId}"]`)) {
        setOpenActionPostId(null);
        setActionMenuPosition(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenActionPostId(null);
        setActionMenuPosition(null);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openActionPostId]);

  const toggleActionMenu = (event: MouseEvent<HTMLButtonElement>, postId: string) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setActionMenuPosition({ top: rect.bottom + 6, left: Math.max(8, rect.right - 190) });
    setOpenActionPostId((current) => (current === postId ? null : postId));
  };

  if (isLoading || isLoadingEnterprise) {
    return (
      <div role="status" className="grid gap-3 p-5">
        {[1, 2, 3].map((row) => (
          <div key={row} className="h-16 animate-pulse rounded-xl bg-[#f1f6f3]" />
        ))}
      </div>
    );
  }

  if (enterpriseUnavailable) {
    return (
      <div className="px-6 py-16 text-center">
        <h2 className="text-lg font-semibold">Enterprise unavailable</h2>
        <p className="mt-2 text-sm text-[#52736a]">
          We could not securely identify your enterprise, so your posts are not being displayed.
        </p>
      </div>
    );
  }

  if (visiblePosts.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        <h2 className="text-lg font-semibold">
          {posts.length ? "No posts match these filters" : "No posts yet"}
        </h2>
        <p className="mt-2 text-sm text-[#52736a]">
          Create a draft to get started. Submit it for review when it is ready.
        </p>
        {!posts.length && (
          <button
            type="button"
            onClick={onOpenCreate}
            className="mt-5 rounded-xl border border-[#1f6a58] px-4 py-2.5 text-sm font-semibold text-[#175245]"
          >
            Create your first post
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {visiblePosts.map((post) => {
        const category = categories.find((item) => item.id === post.category)?.name ?? post.category ?? "General";
        const imageUrl = post.coverImageUrl ? getRenderableBlogAssetUrl(post.coverImageUrl) : "";
        return (
          <article
            key={post.id}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#e1ebe6] bg-white shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[#b6dfce] hover:shadow-md"
          >
            <div className="relative h-44 w-full shrink-0 overflow-hidden bg-[#f4faf7] border-b border-[#edf3f0]">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={post.title || "Cover image"}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#f4faf7] via-[#e8f6ee] to-[#d8ede3] text-[#1f6a58]/60">
                  <svg aria-hidden="true" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <span className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-[#1f6a58]/70">
                    {post.type === "news" ? "News Bulletin" : post.type === "both" ? "Blog & News" : "Blog Article"}
                  </span>
                </div>
              )}
              <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2 pointer-events-none">
                <span className="truncate max-w-[50%] rounded-full border border-[#d7e5df] bg-white/95 px-2.5 py-1 text-[11px] font-bold text-[#175245] shadow-xs backdrop-blur-xs">
                  {category}
                </span>
                <div className="flex items-center gap-1.5 pointer-events-auto">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold shadow-xs backdrop-blur-xs border ${
                      post.status === "published"
                        ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                        : post.status === "changes_requested"
                        ? "bg-amber-50 text-amber-900 border-amber-300"
                        : post.status === "pending_review"
                        ? "bg-sky-50 text-sky-900 border-sky-300"
                        : post.status === "rejected"
                        ? "bg-rose-50 text-rose-900 border-rose-300"
                        : "bg-slate-100 text-slate-800 border-slate-300"
                    }`}
                  >
                    {STATUS_LABEL[post.status]}
                  </span>
                  <div className="relative inline-block text-left" data-post-action-menu={post.id}>
                    <button
                      type="button"
                      aria-label={`More actions for ${post.title || "post"}`}
                      aria-haspopup="menu"
                      aria-expanded={openActionPostId === post.id}
                      onClick={(event) => toggleActionMenu(event, post.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-[#d7e5df] bg-white/95 text-[#175245] shadow-xs backdrop-blur-xs transition-colors hover:bg-white hover:border-[#b6dfce] focus:outline-none focus:ring-2 focus:ring-[#1f6a58]/30"
                    >
                      <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="5" r="1.75" />
                        <circle cx="12" cy="12" r="1.75" />
                        <circle cx="12" cy="19" r="1.75" />
                      </svg>
                    </button>
                    {openActionPostId === post.id && (
                      <div
                        role="menu"
                        data-post-action-menu={post.id}
                        style={actionMenuPosition ?? undefined}
                        className="fixed z-[70] min-w-[190px] overflow-hidden rounded-xl border border-[#d7e5df] bg-white py-1.5 text-left shadow-xl animate-in fade-in zoom-in-95 duration-100"
                      >
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setOpenActionPostId(null);
                            setActionMenuPosition(null);
                            router.push(`${detailsBasePath}/${encodeURIComponent(post.id)}`);
                          }}
                          className="flex w-full items-center px-4 py-2 text-xs font-semibold text-[#175245] hover:bg-[#f4faf7]"
                        >
                          View details
                        </button>
                        {(post.status === "published" || post.status === "unpublished") && (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setOpenActionPostId(null);
                              setActionMenuPosition(null);
                              post.status === "published"
                                ? router.push(`${detailsBasePath}/edit-revision?id=${encodeURIComponent(post.id)}`)
                                : void onOpenEdit(post);
                            }}
                            className="flex w-full items-center px-4 py-2 text-xs font-semibold text-[#175245] hover:bg-[#f4faf7]"
                          >
                            {post.status === "published" ? "Edit & submit changes" : "Edit & resubmit"}
                          </button>
                        )}
                        {(post.status === "draft" || post.status === "changes_requested" || post.status === "rejected") && (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setOpenActionPostId(null);
                              setActionMenuPosition(null);
                              void onOpenEdit(post);
                            }}
                            className="flex w-full items-center px-4 py-2 text-xs font-semibold text-[#175245] hover:bg-[#e8f6ee]"
                          >
                            {post.status === "draft" ? "Edit" : "Edit & resubmit"}
                          </button>
                        )}
                        {post.status === "published" && (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setOpenActionPostId(null);
                              setActionMenuPosition(null);
                              void onUnpublish(post);
                            }}
                            className="flex w-full items-center px-4 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-50"
                          >
                            Unpublish
                          </button>
                        )}
                        {post.status === "draft" && (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setOpenActionPostId(null);
                              setActionMenuPosition(null);
                              void onRemoveDraft(post);
                            }}
                            className="flex w-full items-center border-t border-[#edf3f0] px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                          >
                            Delete draft
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-1 flex-col p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                    post.type === "news"
                      ? "bg-[#eff8f3] text-[#175245] border-[#b6dfce]"
                      : post.type === "both"
                      ? "bg-[#e8f6ee] text-[#1f6a58] border-[#a3d7c3]"
                      : "bg-[#f4faf7] text-[#2c4e44] border-[#d7e5df]"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${post.type === "news" ? "bg-[#175245]" : post.type === "both" ? "bg-[#1f6a58]" : "bg-[#2c4e44]"}`} />
                  {post.type === "news" ? "News Bulletin" : post.type === "both" ? "Blog & News" : "Blog Article"}
                </span>
                {post.tags && (
                  <span className="text-[11px] text-[#7f9d94] truncate max-w-[150px]">
                    Tags: {post.tags}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => router.push(`${detailsBasePath}/${encodeURIComponent(post.id)}`)}
                className="mt-2.5 text-left text-base font-bold text-[#06201c] hover:text-[#1f6a58] transition-colors line-clamp-2 leading-snug"
              >
                {post.title || "Untitled post"}
              </button>
              <p className="mt-2 line-clamp-2 min-h-[36px] text-xs leading-relaxed text-[#52736a]">
                {post.summary || "No summary provided."}
              </p>
              {post.feedback && (post.status === "changes_requested" || post.status === "rejected") && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900">
                  <span className="block font-bold text-[10px] uppercase tracking-wider text-amber-800 mb-0.5">
                    Reviewer Feedback
                  </span>
                  <p className="line-clamp-2 leading-relaxed text-xs">{post.feedback}</p>
                </div>
              )}
              <div className="mt-auto pt-4 border-t border-[#edf3f0] grid grid-cols-2 gap-3 text-xs text-[#52736a]">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#7f9d94]">Created at</p>
                  <time dateTime={post.createdAt} className="mt-0.5 block truncate font-medium text-[#06201c]">
                    {formatBlogListDate(post.createdAt)}
                  </time>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#7f9d94]">Updated at</p>
                  <time dateTime={post.updatedAt} className="mt-0.5 block truncate font-medium text-[#06201c]">
                    {formatBlogListDate(post.updatedAt)}
                  </time>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-[#edf3f0] flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => router.push(`${detailsBasePath}/${encodeURIComponent(post.id)}`)}
                  className="text-xs font-semibold text-[#1f6a58] hover:text-[#175245] hover:underline"
                >
                  View post details &rarr;
                </button>
                {(post.status === "changes_requested" || post.status === "rejected") && (
                  <button
                    type="button"
                    onClick={() => void onOpenEdit(post)}
                    className="rounded-lg bg-[#1f6a58] px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#175245] transition-colors"
                  >
                    Edit &amp; resubmit
                  </button>
                )}
                {post.status === "draft" && (
                  <button
                    type="button"
                    onClick={() => void onOpenEdit(post)}
                    className="rounded-lg bg-[#1f6a58] px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#175245] transition-colors"
                  >
                    Edit draft
                  </button>
                )}
                {post.status === "published" && (
                  <button
                    type="button"
                    onClick={() => router.push(`${detailsBasePath}/edit-revision?id=${encodeURIComponent(post.id)}`)}
                    className="rounded-lg border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#175245] hover:bg-[#f4faf7] transition-colors"
                  >
                    Edit &amp; submit changes
                  </button>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}