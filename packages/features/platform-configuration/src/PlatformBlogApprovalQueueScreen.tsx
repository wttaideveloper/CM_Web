"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useOptionalAuth } from "@ihp/auth";
import {
  getAdminBlogPost,
  getAdminBlogFormVersion,
  listAdminBlogCategories,
  listAdminBlogPosts,
  listAdminBlogQueue,
  reviewAdminBlogPost,
  sanitizeBlogPostHtml,
  type BlogCategory,
  type BlogManageDetail,
  type BlogManageItem,
  type BlogCustomFieldValue,
  type BlogForm,
  type BlogFormField,
} from "@ihp/shared";

type ReviewStatus = "pending_review" | "changes_requested" | "approved" | "rejected";

interface ReviewItem {
  id: string;
  title: string;
  type: "Blog" | "News";
  category: string;
  categoryId?: string | null;
  enterprise: string;
  enterpriseId?: string | null;
  tenantId?: string | null;
  author: string;
  authorType?: string;
  submittedAt: string;
  summary: string;
  content: string;
  coverImageUrl?: string | null;
  tags?: string[];
  status: ReviewStatus;
  feedback?: string;
  reviewerId?: string | null;
  reviewerName?: string | null;
  reviewedAt?: string | null;
  customFields?: Record<string, BlogCustomFieldValue>;
  formId?: string | null;
  formVersion?: number | null;
}

const STATUS_LABEL: Record<ReviewStatus, string> = {
  pending_review: "Pending Review",
  changes_requested: "Changes Requested",
  approved: "Approved",
  rejected: "Rejected",
};

const toReviewItem = (post: BlogManageItem | BlogManageDetail): ReviewItem => ({
  id: post.id,
  title: post.title,
  type: post.kind === "news" ? "News" : "Blog",
  category: post.category ?? "Uncategorized",
  categoryId: "category_id" in post ? post.category_id ?? null : null,
  enterprise: post.business_name ?? "Platform Partner",
  enterpriseId: "enterprise_id" in post ? post.enterprise_id : null,
  tenantId: "tenant_id" in post ? post.tenant_id : null,
  author: post.author_name ?? "Enterprise Admin",
  authorType: "author_type" in post ? post.author_type : "merchant",
  submittedAt: post.submitted_at ?? post.updated_at,
  summary: post.excerpt ?? "",
  content: "content" in post && typeof post.content === "string" ? post.content : "",
  coverImageUrl: post.cover_image_url ?? null,
  tags: post.tags ?? [],
  status:
    post.status === "published" || post.status === "unpublished"
      ? "approved"
      : post.status === "pending_approval"
      ? "pending_review"
      : post.status === "changes_requested"
      ? "changes_requested"
      : post.status === "rejected"
      ? "rejected"
      : "pending_review",
  feedback: post.reviewer_note ?? undefined,
  reviewerId: post.reviewer_id ?? null,
  reviewerName: post.reviewer_name ?? null,
  reviewedAt: post.reviewed_at ?? null,
  customFields: "custom_fields" in post ? (post.custom_fields as Record<string, BlogCustomFieldValue>) : undefined,
  formId: "form_id" in post ? post.form_id ?? null : null,
  formVersion: "form_version" in post ? post.form_version ?? null : null,
});

const SYSTEM_FIELD_KEYS = new Set([
  "post_type", "title", "post_title_slug", "excerpt", "short_summary", "content",
  "article_content", "category", "category_id", "cover_image", "cover_image_url",
  "cover_image_file", "tags", "article_tags",
]);

function isSystemFieldKey(key: string): boolean {
  return SYSTEM_FIELD_KEYS.has(key.replace(/^custom_fields\./, "").toLowerCase());
}

function isProtectedSection(section: { id: string; title: string; type?: string | null }): boolean {
  const title = section.title.trim().toLowerCase();
  const type = section.type?.toLowerCase() ?? "";
  return section.id === "section-core" || title === "main article details" || type.includes("protected") || type === "system";
}

function friendlyFieldName(key: string): string {
  const normalized = key.replace(/^custom_fields\./, "").toLowerCase();
  const inferred = normalized.match(/(?:^|_)((?:rich[_-]?text|multi[_-]?select|file[_-]?upload|media[_-]?upload|textarea|radio|select|number|date|time|url|text))(?:_|$)/)?.[1];
  const labels: Record<string, string> = {
    url: "Reference URL", date: "Date", text: "Short Text", time: "Time", radio: "Radio Button",
    number: "Number", select: "Dropdown", textarea: "Long Text", rich_text: "Rich Text Field",
    richtext: "Rich Text Field", file_upload: "Supporting Document", fileupload: "Supporting Document",
    media_upload: "Additional Images", mediaupload: "Additional Images", multi_select: "Checkbox / Multi-select",
    multiselect: "Checkbox / Multi-select",
  };
  if (inferred && labels[inferred]) return labels[inferred];
  return key.replace(/^custom_fields\./, "").replace(/[_-]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function inferCustomFieldType(key: string): BlogFormField["type"] {
  const normalized = key.replace(/^custom_fields\./, "").toLowerCase();
  if (normalized.includes("media_upload") || normalized.includes("image")) return "media_upload";
  if (normalized.includes("file_upload") || normalized.includes("document")) return "file_upload";
  return "text";
}

function reviewValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value ?? "");
}

function sanitizeReviewHtml(value: string): string {
  return sanitizeBlogPostHtml(value);
}

function renderContentHtml(value: string): string {
  if (!value) return "No body content provided.";
  const hasHtml = /<[a-z][\s\S]*>/i.test(value);
  if (!hasHtml) {
    return value
      .split(/\n{2,}/)
      .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
      .join("");
  }
  return sanitizeReviewHtml(value);
}

function reviewAssetUrl(value: string): string {
  if (typeof window === "undefined" || !value) return value;
  try {
    const parsed = new URL(value, window.location.origin);
    if (parsed.pathname.startsWith("/api/v1/cms/blogs/")) {
      return `${window.location.origin}/api/platform-super-admin/blogs${parsed.pathname.replace(/^\/api\/v1/, "")}${parsed.search}`;
    }
  } catch {
    // Keep original string if parsing fails.
  }
  return value;
}

function reviewChoiceLabel(field: BlogFormField | undefined, value: unknown): string {
  const raw = reviewValue(value);
  const options = field?.validation?.options;
  if (typeof options !== "string") return raw;
  const allowed = new Set(options.split(",").map((option) => option.trim()).filter(Boolean));
  return raw.split(", ").map((item) => allowed.has(item) ? item : item).join(", ");
}

const formatDate = (isoString: string): string => {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return isoString || "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

/**
 * Super Admin Blog & News Approval Queue Screen.
 * Implements Section 15: Approval Queue Workflow end-to-end.
 * Navigation: Content Management -> Blogs & News -> Blog Approvals
 */
export default function PlatformBlogApprovalQueueScreen() {
  const router = useRouter();
  const authContext = useOptionalAuth();
  const authUser = authContext?.user;
  const [platformUser, setPlatformUser] = useState<{ id?: string; fullName?: string; email?: string } | null>(null);

  useEffect(() => {
    if (authUser) return;
    let isMounted = true;
    fetch("/api/platform-super-admin/session", { credentials: "include", cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: unknown) => {
        if (!isMounted || !body || typeof body !== "object") return;
        if ("user" in body && body.user && typeof body.user === "object") {
          const u = body.user as Record<string, unknown>;
          const id = typeof u.id === "string" ? u.id : undefined;
          const fullName =
            typeof u.fullName === "string"
              ? u.fullName
              : typeof u.name === "string"
              ? u.name
              : undefined;
          const email = typeof u.email === "string" ? u.email : undefined;
          setPlatformUser({ id, fullName, email });
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [authUser]);

  const searchParams = useSearchParams();
  const requestedPostId = searchParams?.get("post_id");

  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [allItems, setAllItems] = useState<ReviewItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | ReviewStatus>("pending_review");
  const [typeFilter, setTypeFilter] = useState<"all" | "Blog" | "News">("all");
  const [search, setSearch] = useState("");

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeItemDetail, setActiveItemDetail] = useState<ReviewItem | null>(null);
  const [activeForm, setActiveForm] = useState<BlogForm | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Decision state
  const [decision, setDecision] = useState<"approve" | "request_changes" | "reject">("approve");
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Helper to resolve category name
  const getCategoryName = (item: ReviewItem): string => {
    if (item.categoryId) {
      const found = categories.find((c) => c.id === item.categoryId);
      if (found) return found.name;
    }
    const byName = categories.find((c) => c.id === item.category || c.name === item.category);
    if (byName) return byName.name;
    return item.category || "General";
  };

  // Load Queue items & categories
  const loadQueue = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [postsRes, queueRes, categoriesRes] = await Promise.all([
        listAdminBlogPosts({ page: 1, pageSize: 500 }).catch(() => ({ items: [], total: 0 })),
        listAdminBlogQueue({ page: 1, pageSize: 100 }).catch(() => ({ items: [], total: 0 })),
        listAdminBlogCategories().catch(() => []),
      ]);

      setCategories(categoriesRes);

      const postMap = new Map<string, ReviewItem>();

      // 1. Pending queue items
      queueRes.items.forEach((item) => {
        postMap.set(item.id, toReviewItem(item));
      });

      // 2. All submitted posts (exclude drafts which have not been submitted for review)
      postsRes.items
        .filter((item) => item.status !== "draft")
        .forEach((item) => {
          postMap.set(item.id, toReviewItem(item));
        });

      const combinedItems = Array.from(postMap.values()).sort((a, b) => {
        const timeA = new Date(a.submittedAt).getTime() || 0;
        const timeB = new Date(b.submittedAt).getTime() || 0;
        return timeB - timeA;
      });

      setAllItems(combinedItems);

      // Deep link support: If requestedPostId is present in URL
      if (requestedPostId) {
        const found = combinedItems.find((item) => item.id === requestedPostId);
        if (found) {
          setActiveId(requestedPostId);
          setActiveItemDetail(found);
        } else {
          void getAdminBlogPost(requestedPostId)
            .then((detail) => {
              const directItem = toReviewItem(detail);
              setActiveId(directItem.id);
              setActiveItemDetail(directItem);
            })
            .catch(() => {});
        }
      }
    } catch (reasonErr: unknown) {
      setError(reasonErr instanceof Error ? reasonErr.message : "Unable to load approval queue.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadQueue();
  }, [requestedPostId]);

  // Fetch full details and custom fields when an item is selected for review
  useEffect(() => {
    if (!activeId) {
      setActiveItemDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    void getAdminBlogPost(activeId)
      .then((detail) => {
        if (!cancelled && detail) {
          const mapped = toReviewItem(detail);
          setActiveItemDetail(mapped);
          setReason(mapped.feedback ?? "");
        }
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load full post details.");
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  useEffect(() => {
    if (!activeItemDetail?.formId || !activeItemDetail.formVersion) {
      setActiveForm(null);
      return;
    }
    void getAdminBlogFormVersion(activeItemDetail.formId, activeItemDetail.formVersion)
      .then(setActiveForm)
      .catch(() => setActiveForm(null));
  }, [activeItemDetail?.formId, activeItemDetail?.formVersion]);

  // Escape key listener for review drawer/modal
  useEffect(() => {
    if (!activeId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        if (confirmModalOpen) {
          setConfirmModalOpen(false);
          return;
        }
        handleCloseReview();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeId, confirmModalOpen, isSubmitting]);

  // Accurate counts derived across all submissions
  const counts = useMemo(() => ({
    pending_review: allItems.filter((item) => item.status === "pending_review").length,
    changes_requested: allItems.filter((item) => item.status === "changes_requested").length,
    approved: allItems.filter((item) => item.status === "approved").length,
    rejected: allItems.filter((item) => item.status === "rejected").length,
    all: allItems.length,
  }), [allItems]);

  // Fast client-side filter
  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allItems.filter((item) => {
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesType = typeFilter === "all" || item.type === typeFilter;
      const categoryName = getCategoryName(item).toLowerCase();
      const matchesSearch =
        !query ||
        [item.title, item.author, item.enterprise, categoryName].some((val) =>
          val.toLowerCase().includes(query),
        );
      return matchesStatus && matchesType && matchesSearch;
    });
  }, [allItems, search, statusFilter, typeFilter, categories]);

  const handleOpenReview = (item: ReviewItem) => {
    setActiveId(item.id);
    setActiveItemDetail(item);
    setDecision("approve");
    setReason(item.feedback ?? "");
    setReasonError("");
  };

  const handleCloseReview = () => {
    setActiveId(null);
    setActiveItemDetail(null);
    setActiveForm(null);
    setConfirmModalOpen(false);
    setReasonError("");
    router.replace("/blog-approval-queue");
  };

  const handleInitiateDecision = () => {
    if (decision !== "approve" && reason.trim().length < 5) {
      setReasonError("Please provide an editorial reason of at least 5 characters for the author.");
      return;
    }
    setReasonError("");
    setConfirmModalOpen(true);
  };

  const handleConfirmDecision = async () => {
    if (!activeItemDetail || isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    try {
      const reviewerId =
        authUser?.id ||
        (authUser as { userId?: string } | null)?.userId ||
        platformUser?.id ||
        "platform-super-admin";
      const reviewerName =
        authUser?.fullName ||
        platformUser?.fullName ||
        authUser?.email ||
        platformUser?.email ||
        "Platform Super Admin";
      await reviewAdminBlogPost(
        activeItemDetail.id,
        decision,
        reason.trim() || undefined,
        { id: reviewerId, name: reviewerName },
      );

      const decisionText =
        decision === "approve"
          ? `Post "${activeItemDetail.title}" approved and published.`
          : decision === "request_changes"
          ? `Changes requested for "${activeItemDetail.title}". Enterprise Admin has been notified.`
          : `Post "${activeItemDetail.title}" rejected. Enterprise Admin has been notified.`;

      setNotice(decisionText);
      setConfirmModalOpen(false);
      setActiveId(null);
      setActiveItemDetail(null);
      setReason("");

      router.replace("/blog-approval-queue");
      await loadQueue();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Unable to record the decision.";
      setError(`Approval action failed: ${errMsg}. The post remains Pending Approval.`);
      setConfirmModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeItem = activeItemDetail || allItems.find((i) => i.id === activeId) || null;

  return (
    <main className="min-h-screen bg-[#f8fafc] p-5 text-[#06201c] sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Navigation Breadcrumb & Header */}
        <header>
          <nav aria-label="Breadcrumb" className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7f9d94]">
            <span>Content Management</span>
            <span className="mx-2 text-slate-300">/</span>
            <span>Blogs &amp; News</span>
            <span className="mx-2 text-slate-300">/</span>
            <span className="text-[#175245]">Blog Approvals</span>
          </nav>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#06201c]">
            Blog &amp; News Approval Queue
          </h1>
          <p className="mt-1 text-sm text-[#52736a]">
            Review submitted articles, inspect enterprise identity and internal records, and approve or request revisions.
          </p>
        </header>

        {notice && (
          <div
            role="status"
            className="flex items-center justify-between rounded-xl border border-[#b6dfce] bg-[#eff8f3] px-4 py-3 text-sm text-[#175245]"
          >
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice("")}
              className="text-xs font-bold uppercase tracking-wider text-[#175245] hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              className="text-xs font-bold uppercase tracking-wider text-red-700 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Queue Container */}
        <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#edf3f0] pb-5">
            <div>
              <h2 className="text-lg font-bold text-[#06201c]">Review Submissions</h2>
              <p className="mt-0.5 text-xs text-[#52736a]">
                {counts.pending_review} article{counts.pending_review === 1 ? "" : "s"} awaiting review
                {counts.changes_requested > 0 && ` · ${counts.changes_requested} in revision`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              {/* Type filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#52736a] whitespace-nowrap">Content type:</span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
                  aria-label="Filter by content type"
                  className="h-10 rounded-xl border border-[#d7e5df] bg-white px-3 py-2 text-xs font-semibold text-[#175245] outline-none transition-colors focus:border-[#1f6a58] focus:ring-2 focus:ring-[#1f6a58]/20 cursor-pointer"
                >
                  <option value="all">Blog and News</option>
                  <option value="Blog">Blog Articles</option>
                  <option value="News">News Bulletins</option>
                </select>
              </div>

              {/* Search Bar */}
              <div className="relative min-w-[240px] flex-1 sm:w-72">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#7f9d94]">
                  <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search title, enterprise, author..."
                  aria-label="Search submissions"
                  className="h-10 w-full rounded-xl border border-[#d7e5df] bg-white pl-9 pr-8 py-2 text-xs text-[#06201c] placeholder-[#7f9d94] outline-none transition-colors focus:border-[#1f6a58] focus:ring-2 focus:ring-[#1f6a58]/20"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#7f9d94] hover:text-[#06201c]"
                  >
                    <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Filter submissions">
            {(["pending_review", "changes_requested", "approved", "rejected", "all"] as const).map((status) => {
              const countForStatus = counts[status];
              const isActive = statusFilter === status;
              return (
                <button
                  key={status}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setStatusFilter(status)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                    isActive
                      ? "bg-[#1f6a58] text-white shadow-xs"
                      : "border border-[#d7e5df] text-[#52736a] hover:bg-[#f8fafc]"
                  }`}
                >
                  <span>{status === "all" ? "All Submissions" : STATUS_LABEL[status]}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      isActive ? "bg-white/25 text-white" : "bg-[#edf3f0] text-[#52736a]"
                    }`}
                  >
                    {countForStatus}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Queue List */}
          {isLoading ? (
            <div className="mt-6 space-y-3 py-6" aria-busy="true">
              {[1, 2, 3].map((row) => (
                <div key={row} className="h-28 animate-pulse rounded-2xl bg-[#f4faf7]" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-[#cdded5] bg-[#f8fbf9] px-6 py-14 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e8f6ee] text-[#1f6a58]">
                <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="mt-3 text-base font-bold text-[#06201c]">
                {allItems.length ? "No submissions match these filters" : "No posts waiting for review"}
              </h3>
              <p className="mx-auto mt-1 max-w-md text-xs text-[#52736a]">
                New submissions from Enterprise Admins will appear here with full enterprise verification details and editorial controls.
              </p>
              {(search || statusFilter !== "pending_review" || typeFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("pending_review");
                    setTypeFilter("all");
                  }}
                  className="mt-4 rounded-xl border border-[#d7e5df] bg-white px-4 py-2 text-xs font-bold text-[#175245] hover:bg-[#f4faf7] transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {filteredItems.map((item) => {
                const categoryDisplay = getCategoryName(item);
                const hasCover = Boolean(item.coverImageUrl);
                const imageUrl = hasCover ? reviewAssetUrl(item.coverImageUrl ?? "") : "";

                return (
                  <article
                    key={item.id}
                    className={`rounded-2xl border bg-white p-4 sm:p-5 transition-all duration-200 hover:border-[#b6dfce] hover:shadow-sm ${
                      activeId === item.id
                        ? "border-[#1f6a58] bg-[#f0f8f4] ring-2 ring-[#1f6a58]/20"
                        : "border-[#e1ebe6]"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                      {/* Media Thumbnail */}
                      <div className="relative h-28 w-full sm:h-28 sm:w-36 shrink-0 overflow-hidden rounded-xl border border-[#edf3f0] bg-[#f4faf7]">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={item.title || "Post thumbnail"}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#f4faf7] via-[#e8f6ee] to-[#d8ede3] text-[#1f6a58]/60">
                            <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                            <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#1f6a58]/70">
                              {item.type}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Content Details */}
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Badges Row */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                              item.type === "News"
                                ? "bg-sky-50 text-sky-800 border-sky-200"
                                : "bg-teal-50 text-teal-800 border-teal-200"
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${item.type === "News" ? "bg-sky-600" : "bg-teal-600"}`} />
                            {item.type === "News" ? "News Bulletin" : "Blog Article"}
                          </span>

                          <span className="inline-flex items-center rounded-full bg-[#f4faf7] px-2.5 py-0.5 text-xs font-semibold text-[#175245] border border-[#dceee5]">
                            {categoryDisplay}
                          </span>

                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider border ${
                              item.status === "approved"
                                ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                                : item.status === "pending_review"
                                ? "bg-sky-50 text-sky-900 border-sky-300"
                                : item.status === "changes_requested"
                                ? "bg-amber-50 text-amber-900 border-amber-300"
                                : "bg-rose-50 text-rose-900 border-rose-300"
                            }`}
                          >
                            {STATUS_LABEL[item.status]}
                          </span>
                        </div>

                        {/* Title */}
                        <button
                          type="button"
                          onClick={() => handleOpenReview(item)}
                          className="text-left text-base sm:text-lg font-bold text-[#06201c] hover:text-[#1f6a58] transition-colors leading-snug line-clamp-2"
                        >
                          {item.title || "Untitled submission"}
                        </button>

                        {/* Attribution Metadata */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#52736a]">
                          <span className="inline-flex items-center gap-1">
                            <span className="text-[#7f9d94] font-medium">Enterprise:</span>
                            <strong className="font-semibold text-[#06201c]">{item.enterprise}</strong>
                          </span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1">
                            <span className="text-[#7f9d94] font-medium">Author:</span>
                            <strong className="font-semibold text-[#06201c]">{item.author}</strong>
                            <span className="text-[#7f9d94]">(Enterprise Admin)</span>
                          </span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1">
                            <span className="text-[#7f9d94] font-medium">Submitted:</span>
                            <time className="font-medium text-[#06201c]">{formatDate(item.submittedAt)}</time>
                          </span>
                        </div>

                        {/* Summary / Excerpt */}
                        {item.summary && (
                          <p className="line-clamp-2 text-xs leading-relaxed text-[#52736a] max-w-3xl">
                            {item.summary}
                          </p>
                        )}

                        {/* Recorded Reviewer Feedback Callout */}
                        {item.feedback && (item.status === "changes_requested" || item.status === "rejected") && (
                          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
                            <span className="block font-bold text-[10px] uppercase tracking-wider text-amber-800 mb-0.5">
                              Recorded Reviewer Feedback
                            </span>
                            <p className="line-clamp-2 leading-relaxed text-xs">{item.feedback}</p>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <div className="self-end sm:self-center shrink-0 pt-2 sm:pt-0">
                        <button
                          type="button"
                          onClick={() => handleOpenReview(item)}
                          className="rounded-xl bg-[#1f6a58] px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#175245] transition-colors inline-flex items-center gap-1.5"
                        >
                          <span>{item.status === "pending_review" ? "Review Post" : "Inspect Post"}</span>
                          <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* =======================================================================
          FULL POST REVIEW DRAWER / MODAL
          ======================================================================= */}
      {activeItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#06201c]/45 p-4 backdrop-blur-xs"
          onClick={handleCloseReview}
          role="dialog"
          aria-modal="true"
          aria-label="Review Post"
        >
          <section
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <header className="flex items-start justify-between border-b border-[#edf3f0] p-6 bg-white">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider border ${
                      activeItem.type === "News"
                        ? "bg-sky-50 text-sky-800 border-sky-200"
                        : "bg-teal-50 text-teal-800 border-teal-200"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${activeItem.type === "News" ? "bg-sky-600" : "bg-teal-600"}`} />
                    {activeItem.type === "News" ? "News Bulletin" : "Blog Article"}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-[#f4faf7] px-2.5 py-0.5 text-xs font-semibold text-[#175245] border border-[#dceee5]">
                    {getCategoryName(activeItem)}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider border ${
                      activeItem.status === "approved"
                        ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                        : activeItem.status === "pending_review"
                        ? "bg-sky-50 text-sky-900 border-sky-300"
                        : activeItem.status === "changes_requested"
                        ? "bg-amber-50 text-amber-900 border-amber-300"
                        : "bg-rose-50 text-rose-900 border-rose-300"
                    }`}
                  >
                    {STATUS_LABEL[activeItem.status]}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-[#06201c]">{activeItem.title}</h2>
              </div>
              <button
                type="button"
                onClick={handleCloseReview}
                aria-label="Close review dialog"
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#52736a] hover:bg-[#f4faf7] hover:text-[#06201c] transition-colors"
              >
                <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </header>

            {/* Scrollable Body */}
            <div className="flex-1 space-y-5 overflow-y-auto p-6 text-sm">
              {/* 1. ENTERPRISE IDENTITY VERIFICATION */}
              <div className="rounded-xl border border-teal-100 bg-[#f4faf7] p-4 text-xs space-y-2">
                <div className="flex items-center justify-between border-b border-teal-100/70 pb-2">
                  <span className="font-bold uppercase tracking-wider text-teal-900">
                    Enterprise Identity &amp; Submitter Credentials
                  </span>
                  <span className="rounded-full bg-teal-100 px-2.5 py-0.5 font-bold text-teal-900">
                    Verified Enterprise
                  </span>
                </div>
                <dl className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <dt className="text-slate-500 font-medium">Enterprise Name:</dt>
                    <dd className="font-bold text-[#06201c]">{activeItem.enterprise}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 font-medium">Author / Submitter:</dt>
                    <dd className="font-bold text-[#06201c]">
                      {activeItem.author}{" "}
                      <span className="text-[11px] font-normal text-slate-500">(Enterprise Admin)</span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 font-medium">Submitted At:</dt>
                    <dd className="font-semibold text-slate-800">{formatDate(activeItem.submittedAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 font-medium">Tenant ID:</dt>
                    <dd className="font-mono text-slate-600">{activeItem.tenantId || activeItem.enterpriseId || "tenant-verified"}</dd>
                  </div>
                </dl>
              </div>

              {/* 2. CUSTOMER-FACING ARTICLE PREVIEW */}
              <article className="overflow-hidden rounded-2xl border border-[#dfe9e4] bg-white shadow-sm">
                {activeItem.coverImageUrl && (
                  <img
                    src={reviewAssetUrl(activeItem.coverImageUrl)}
                    alt={activeItem.title || "Article cover"}
                    className="max-h-64 w-full object-cover"
                  />
                )}
                <div className="p-5">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-[#52736a]">
                    <span className="rounded-full bg-[#e8f6ee] px-2.5 py-1 text-[#26705d]">{activeItem.type}</span>
                    <span>{getCategoryName(activeItem)}</span>
                    <span>·</span>
                    <span>{activeItem.author}</span>
                    <span>·</span>
                    <span>{formatDate(activeItem.submittedAt)}</span>
                  </div>
                  {activeItem.summary && (
                    <div className="mt-4 rounded-xl border border-[#dceee5] bg-[#f5fbf7] p-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#52736a]">At a glance</h3>
                      <p className="mt-2 text-sm leading-6 text-[#35544b]">{activeItem.summary}</p>
                    </div>
                  )}
                  <div className="mt-6">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#7f9d94]">Article</h3>
                    <div
                      className="prose prose-sm mt-3 max-w-none leading-7 text-[#35544b]"
                      dangerouslySetInnerHTML={{
                        __html: renderContentHtml(detailLoading ? "Loading full post body..." : activeItem.content || "No body content provided."),
                      }}
                    />
                  </div>
                </div>
              </article>

              {/* 3. CONFIGURED FIELD VALUES */}
              {activeItem.customFields && Object.keys(activeItem.customFields).length > 0 && (
                <div className="rounded-2xl border border-[#dfe9e4] bg-white p-5 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#52736a]">Submitted details</h3>
                  <div className="mt-4 space-y-5">
                    {(() => {
                      const configuredSections = (activeForm?.sections ?? []).filter((section) => !isProtectedSection(section));
                      const configuredKeys = new Set(configuredSections.flatMap((section) => section.fields.map((field) => field.key)));
                      const fallbackFields: BlogFormField[] = Object.keys(activeItem.customFields ?? {})
                        .filter((key) => !isSystemFieldKey(key) && !configuredKeys.has(key))
                        .map((key, index) => ({ id: key, key, label: friendlyFieldName(key), type: inferCustomFieldType(key), required: false, visible: true, order: index }));
                      const sections = [...configuredSections, ...(fallbackFields.length ? [{ id: "custom-fallback", title: "", description: null, order: 999, fields: fallbackFields }] : [])];
                      const seenKeys = new Set<string>();
                      return sections.map((section) => {
                        const fields = section.fields.filter((field) => {
                          if (isSystemFieldKey(field.key) || seenKeys.has(field.key)) return false;
                          seenKeys.add(field.key);
                          const value = activeItem.customFields?.[field.key];
                          return value !== "" && value !== null && value !== undefined;
                        });
                        if (!fields.length) return null;
                        return (
                          <section key={section.id}>
                            {section.title && <h4 className="text-base font-semibold text-[#06201c]">{section.title}</h4>}
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              {fields.map((field) => {
                                const value = activeItem.customFields?.[field.key];
                                const type = field.type.toLowerCase();
                                const displayValue = reviewChoiceLabel(field, value);
                                const isRichText = type === "rich_text" || type === "richtext" || type === "html";
                                const isImage = type === "media_upload" || type === "image" || type === "image_list";
                                const isFile = type === "file_upload" || type === "document";
                                const values = Array.isArray(value) ? value : value ? [value] : [];
                                return (
                                  <div
                                    key={field.key}
                                    className={`rounded-xl border p-4 ${
                                      field.visibility_scope === "admin_only"
                                        ? "border-purple-200 bg-purple-50/40"
                                        : "border-[#edf3f0] bg-[#f8fbf9]"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <h5 className="font-semibold text-[#175245]">{field.label || friendlyFieldName(field.key)}</h5>
                                      {field.visibility_scope === "admin_only" && (
                                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                                          Internal
                                        </span>
                                      )}
                                    </div>
                                    {isRichText ? (
                                      <div
                                        className="prose prose-sm mt-3 max-w-none text-[#35544b]"
                                        dangerouslySetInnerHTML={{ __html: sanitizeReviewHtml(displayValue) }}
                                      />
                                    ) : isImage ? (
                                      <div className="mt-3 flex flex-wrap gap-2">
                                        {values.map((item) => {
                                          const url = reviewAssetUrl(String(item));
                                          return (
                                            <a key={url} href={url} target="_blank" rel="noreferrer">
                                              <img src={url} alt={field.label} className="h-20 w-20 rounded-lg border border-[#d7e5df] object-cover" />
                                            </a>
                                          );
                                        })}
                                      </div>
                                    ) : isFile ? (
                                      <div className="mt-3 space-y-1">
                                        {values.map((item) => (
                                          <a
                                            key={String(item)}
                                            href={reviewAssetUrl(String(item))}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="block truncate text-sm font-semibold text-[#1f6a58] hover:underline"
                                          >
                                            Open attached document
                                          </a>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-[#35544b]">
                                        {displayValue}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </section>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {/* 4. SELECT APPROVE, REQUEST CHANGES, OR REJECT */}
              {activeItem.status === "pending_review" ? (
                <div className="rounded-xl border border-[#edf3f0] bg-[#fbfdfc] p-4 space-y-4">
                  <span className="block text-xs font-bold uppercase tracking-wider text-[#175245]">
                    Select Editorial Action
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* APPROVE */}
                    <button
                      type="button"
                      onClick={() => {
                        setDecision("approve");
                        setReasonError("");
                      }}
                      className={`rounded-xl border p-3.5 text-left transition-all ${
                        decision === "approve"
                          ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/20"
                          : "border-[#d7e5df] bg-white hover:bg-slate-50"
                      }`}
                    >
                      <span className="block text-xs font-bold uppercase tracking-wider text-emerald-900">
                        Approve &amp; Publish
                      </span>
                      <p className="mt-1 text-[11px] text-emerald-800 leading-relaxed">
                        Approve immediately. The article becomes visible to customers.
                      </p>
                    </button>

                    {/* REQUEST CHANGES */}
                    <button
                      type="button"
                      onClick={() => {
                        setDecision("request_changes");
                        setReasonError("");
                      }}
                      className={`rounded-xl border p-3.5 text-left transition-all ${
                        decision === "request_changes"
                          ? "border-amber-600 bg-amber-50/70 ring-2 ring-amber-600/20"
                          : "border-[#d7e5df] bg-white hover:bg-slate-50"
                      }`}
                    >
                      <span className="block text-xs font-bold uppercase tracking-wider text-amber-900">
                        Request Changes
                      </span>
                      <p className="mt-1 text-[11px] text-amber-800 leading-relaxed">
                        Return to Enterprise Admin with required revisions.
                      </p>
                    </button>

                    {/* REJECT */}
                    <button
                      type="button"
                      onClick={() => {
                        setDecision("reject");
                        setReasonError("");
                      }}
                      className={`rounded-xl border p-3.5 text-left transition-all ${
                        decision === "reject"
                          ? "border-rose-600 bg-rose-50/70 ring-2 ring-rose-600/20"
                          : "border-[#d7e5df] bg-white hover:bg-slate-50"
                      }`}
                    >
                      <span className="block text-xs font-bold uppercase tracking-wider text-rose-900">
                        Reject Submission
                      </span>
                      <p className="mt-1 text-[11px] text-rose-800 leading-relaxed">
                        Decline publication with reasons for the enterprise author.
                      </p>
                    </button>
                  </div>

                  {/* REASON TEXTAREA (MANDATORY FOR REQUEST CHANGES & REJECT) */}
                  <div>
                    <label className="block">
                      <span className="block text-xs font-bold uppercase tracking-wider text-[#52736a]">
                        {decision === "approve"
                          ? "Approval Note (Optional)"
                          : decision === "request_changes"
                          ? "Revision Instructions for Enterprise Admin (Required) *"
                          : "Rejection Reason for Enterprise Admin (Required) *"}
                      </span>
                      <textarea
                        value={reason}
                        onChange={(e) => {
                          setReason(e.target.value);
                          if (reasonError) setReasonError("");
                        }}
                        rows={3}
                        placeholder={
                          decision === "approve"
                            ? "Optional editorial approval note..."
                            : decision === "request_changes"
                            ? "Clearly explain what adjustments or clinical references are required before approval..."
                            : "Provide a clear rationale explaining why this article cannot be published..."
                        }
                        className={`mt-1.5 w-full rounded-xl border p-3 text-xs leading-relaxed ${
                          reasonError ? "border-red-400 bg-red-50/30" : "border-[#d7e5df]"
                        }`}
                      />
                    </label>
                    {reasonError && (
                      <p className="mt-1 text-xs text-red-600 font-medium">{reasonError}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-[#f8fbf9] p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#edf3f0] pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#175245]">
                      Recorded Editorial Decision
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider border ${
                        activeItem.status === "approved"
                          ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                          : activeItem.status === "changes_requested"
                          ? "bg-amber-50 text-amber-900 border-amber-300"
                          : "bg-rose-50 text-rose-900 border-rose-200"
                      }`}
                    >
                      {STATUS_LABEL[activeItem.status]}
                    </span>
                  </div>

                  <dl className="grid gap-2 sm:grid-cols-2 text-xs">
                    <div>
                      <dt className="text-slate-500 font-medium">Reviewer Identity:</dt>
                      <dd className="font-bold text-[#06201c]">
                        {activeItem.reviewerName || "Super Admin"}{" "}
                        <span className="text-slate-500 font-normal">(Platform Administrator)</span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500 font-medium">Reviewed At:</dt>
                      <dd className="font-semibold text-slate-800">
                        {activeItem.reviewedAt ? formatDate(activeItem.reviewedAt) : "Recorded in Audit Trail"}
                      </dd>
                    </div>
                  </dl>

                  {activeItem.feedback && (
                    <div className="rounded-lg bg-white p-3 border border-slate-200/80 text-xs text-slate-800">
                      <span className="font-bold text-slate-600 block mb-1">Recorded Feedback / Reason:</span>
                      <p className="whitespace-pre-wrap">{activeItem.feedback}</p>
                    </div>
                  )}

                  <div className="rounded-lg bg-amber-50/70 border border-amber-200/80 p-2.5 text-[11px] text-amber-950 font-medium">
                    Duplicate Moderation Safeguard: This article has already been moderated. Re-moderation is disabled to preserve audit integrity.
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf3f0] p-4 bg-white">
              <button
                type="button"
                onClick={handleCloseReview}
                className="rounded-xl border border-[#d7e5df] px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Close
              </button>

              {activeItem.status === "pending_review" && (
                <button
                  type="button"
                  onClick={handleInitiateDecision}
                  className={`rounded-xl px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors ${
                    decision === "approve"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : decision === "request_changes"
                      ? "bg-amber-600 hover:bg-amber-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {decision === "approve"
                    ? "Approve & Publish Immediately"
                    : decision === "request_changes"
                    ? "Submit Revision Request"
                    : "Confirm Rejection"}
                </button>
              )}
            </footer>
          </section>
        </div>
      )}

      {/* =======================================================================
          CONFIRM DECISION MODAL
          ======================================================================= */}
      {confirmModalOpen && activeItem && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-[#06201c]/50 p-4 backdrop-blur-xs"
          onClick={() => {
            if (!isSubmitting) setConfirmModalOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Confirm Action"
        >
          <section
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider border ${
                  decision === "approve"
                    ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                    : decision === "request_changes"
                    ? "bg-amber-50 text-amber-900 border-amber-200"
                    : "bg-rose-50 text-rose-900 border-rose-200"
                }`}
              >
                Confirm {decision === "approve" ? "Approval" : decision === "request_changes" ? "Revision Request" : "Rejection"}
              </span>
            </div>

            <h3 className="mt-2 text-xl font-bold text-[#06201c]">
              {decision === "approve"
                ? "Approve and Publish Post?"
                : decision === "request_changes"
                ? "Request Changes from Enterprise Admin?"
                : "Reject Post Submission?"}
            </h3>

            <p className="mt-1 text-xs text-[#52736a]">
              Post: <strong>&ldquo;{activeItem.title}&rdquo;</strong> · Enterprise: <strong>{activeItem.enterprise}</strong>
            </p>

            {reason && (
              <div className="mt-3 rounded-xl border border-[#edf3f0] bg-[#fbfdfc] p-3 text-xs text-slate-800">
                <span className="font-bold text-slate-500 block mb-0.5">Author Notification Note:</span>
                <p className="whitespace-pre-wrap">{reason}</p>
              </div>
            )}

            <div className="mt-4 rounded-xl border border-[#edf3f0] bg-[#f8fbf9] p-3 text-xs text-[#365b52]">
              <strong>Workflow Notification:</strong> System will record the decision in the audit trail and send an in-app notification to the Enterprise Admin.
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setConfirmModalOpen(false)}
                className="rounded-xl border border-[#d7e5df] px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Back to Review
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void handleConfirmDecision()}
                className={`rounded-xl px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors disabled:opacity-50 ${
                  decision === "approve"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : decision === "request_changes"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {isSubmitting ? "Recording Decision..." : "Confirm & Record Decision"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
