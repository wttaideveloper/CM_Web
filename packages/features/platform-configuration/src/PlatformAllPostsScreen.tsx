"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createAdminBlogPost,
  deleteAdminBlogPost,
  getAdminBlogForm,
  getAdminBlogHistory,
  getAdminBlogPost,
  listAdminBlogCategories,
  listAdminBlogForms,
  listAdminBlogPosts,
  pinAdminBlogPost,
  publishAdminBlogPost,
  unpublishAdminBlogPost,
  updateAdminBlogPost,
  uploadBlogAsset,
  sanitizeBlogPostHtml,
  type BlogForm,
  type BlogFormField,
  type BlogHistoryItem,
  type BlogKind,
  type BlogCustomFieldValue,
  type BlogManageDetail,
  type BlogManageItem,
} from "@ihp/shared";
import { getPlatformEnterprises } from "@ihp/platform-enterprises";

type PostStatus =
  | "Published"
  | "Draft"
  | "Pending Approval"
  | "Rejected"
  | "Unpublished";
type PostType = "Blog" | "News" | "Blog & News";

interface Post {
  id: string;
  title: string;
  type: PostType;
  category: string;
  categoryId: string | null;
  author: string;
  enterprise: string;
  status: PostStatus;
  summary: string;
  content: string;
  coverImageUrl?: string | null;
  tags?: string[];
  customFields?: Record<string, BlogCustomFieldValue>;
  formId?: string | null;
  formVersion?: number | null;
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
}

interface CreatePostFormState {
  type: PostType;
  title: string;
  category: string;
  summary: string;
  content: string;
  coverImageUrl: string;
  tags: string;
  customFields: Record<string, string>;
}

const EMPTY_CREATE_STATE: CreatePostFormState = {
  type: "Blog",
  title: "",
  category: "",
  summary: "",
  content: "",
  coverImageUrl: "",
  tags: "",
  customFields: {},
};

const toDisplayPost = (post: BlogManageItem | BlogManageDetail): Post => ({
  id: post.id,
  title: post.title,
  type: post.kind === "news" ? "News" : post.kind === "both" ? "Blog & News" : "Blog",
  category: post.category ?? "Uncategorized",
  categoryId: post.category_id ?? null,
  author: post.author_name ?? "Platform Admin",
  enterprise: post.business_name ?? "Platform Super Admin",
  status:
    post.status === "pending_approval"
      ? "Pending Approval"
      : post.status === "changes_requested" || post.status === "rejected"
      ? "Rejected"
      : post.status === "published"
      ? "Published"
      : post.status === "unpublished"
      ? "Unpublished"
      : "Draft",
  summary: post.excerpt ?? "",
  content: "content" in post && typeof post.content === "string" ? post.content : "",
  coverImageUrl: post.cover_image_url ?? null,
  tags: post.tags ?? [],
  customFields: "custom_fields" in post ? (post.custom_fields as Record<string, BlogCustomFieldValue>) : undefined,
  formId: "form_id" in post && typeof post.form_id === "string" ? post.form_id : null,
  formVersion: "form_version" in post && typeof post.form_version === "number" ? post.form_version : null,
  createdAt: "created_at" in post && typeof post.created_at === "string" ? post.created_at : post.updated_at,
  updatedAt: post.updated_at,
  pinned: post.is_pinned,
});

const formatDate = (isoString: string): string => {
  const normalized = /^\d{4}-\d{2}-\d{2}T/.test(isoString) && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(isoString) ? `${isoString}Z` : isoString;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return isoString || "-";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const SYSTEM_FIELD_KEYS = new Set([
  "post_type",
  "type",
  "title",
  "post_title_slug",
  "slug",
  "excerpt",
  "summary",
  "short_summary",
  "content",
  "article_content",
  "category",
  "category_id",
  "cover_image",
  "cover_image_url",
  "cover_image_file",
  "tags",
  "article_tags",
  "status",
  "kind",
  "author",
  "author_name",
  "business_name",
  "created_at",
  "updated_at",
  "published_at",
  "is_pinned",
  "is_live",
]);

function isSystemFieldKey(key: string): boolean {
  return SYSTEM_FIELD_KEYS.has(key.replace(/^custom_fields\./, "").toLowerCase());
}

function friendlyFieldName(key: string): string {
  const normalized = key.replace(/^custom_fields\./, "").toLowerCase();
  const inferred = normalized.match(
    /(?:^|_)((?:rich[_-]?text|multi[_-]?select|file[_-]?upload|media[_-]?upload|textarea|radio|select|number|date|time|url|text))(?:_|$)/
  )?.[1];
  const labels: Record<string, string> = {
    url: "Reference URL",
    date: "Date",
    text: "Short Text",
    time: "Time",
    radio: "Radio Button",
    number: "Number",
    select: "Dropdown",
    textarea: "Long Text",
    rich_text: "Rich Text Field",
    richtext: "Rich Text Field",
    file_upload: "Supporting Document",
    fileupload: "Supporting Document",
    media_upload: "Additional Images",
    mediaupload: "Additional Images",
    multi_select: "Checkbox / Multi-select",
    multiselect: "Checkbox / Multi-select",
  };
  if (inferred && labels[inferred]) return labels[inferred];
  return key
    .replace(/^custom_fields\./, "")
    .replace(/_\d+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function inferCustomFieldType(key: string): BlogFormField["type"] {
  const normalized = key.replace(/^custom_fields\./, "").toLowerCase();
  if (normalized.includes("media_upload") || normalized.includes("image")) return "media_upload";
  if (normalized.includes("file_upload") || normalized.includes("document")) return "file_upload";
  return "text";
}

function serializeConfiguredCustomFields(
  values: Record<string, string>,
  fields: BlogFormField[],
): Record<string, BlogCustomFieldValue> {
  const fieldByKey = new Map(fields.map((field) => [field.key, field]));
  return Object.fromEntries(
    Object.entries(values).filter(([key]) => key !== "supporting_documents" && key !== "supporting_document").map(([key, value]) => {
      const fieldType = fieldByKey.get(key)?.type;
      const isMedia = fieldType === "media_upload" || fieldType === "image" || fieldType === "image_list";
      if (!isMedia) return [key, value];
      const urls = value.split(",").map((item) => item.trim()).filter(Boolean);
      return [key, urls.length > 1 ? urls : urls[0] ?? ""];
    }),
  );
}

function serializeSupportingDocuments(
  values: Record<string, string>,
  fields: BlogFormField[],
): Array<{ url: string; name: string }> | undefined {
  const field = fields.find((item) => item.key === "supporting_documents" || item.key === "supporting_document");
  if (!field) return undefined;
  const raw = values[field.key] ?? values.supporting_documents ?? values.supporting_document ?? "";
  const urls = raw.split(",").map((item) => item.trim()).filter(Boolean);
  return urls.length ? urls.map((url) => ({ url, name: url.split("/").pop() || "Supporting document" })) : undefined;
}

function sanitizeRichText(value: string): string {
  return sanitizeBlogPostHtml(value);
}

function renderContentHtml(value: string): string {
  if (!value) return "<p class='italic text-slate-400'>No body content provided.</p>";
  const hasHtml = /<[a-z][\s\S]*>/i.test(value);
  if (!hasHtml) {
    return value
      .split(/\n{2,}/)
      .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
      .join("");
  }
  return sanitizeRichText(value);
}

/**
 * Super Admin Blog & News Posts Management.
 * Implements Section 13 (All Posts) & Section 14 (Create Platform Blog or News).
 * Navigation: Content Management → Blogs & News → All Posts
 */
function resolveImagePreviewUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;
  // Blog uploads are protected files: fetch them through the Blogs bridge, which allows only `cms/blogs/...` paths on the
  // trusted API origin. (The Event media proxy accepts only `/api/v1/events/media/<asset>` and would refuse them.)
  const blogFile = /^(?:https?:\/\/[^/?#]+)?\/api\/v1\/(cms\/blogs\/files\/[^?#]+)$/i.exec(url);
  if (blogFile?.[1]) {
    return `/api/platform-super-admin/blogs/${blogFile[1]}`;
  }
  if (/^(?:https?:\/\/[^/?#]+)?\/api\/v1\/events\/media\//i.test(url)) {
    return `/api/platform-super-admin/event-media?url=${encodeURIComponent(url)}`;
  }
  return url;
}

export default function PlatformAllPostsScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialDetailsId = searchParams?.get("details");

  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [actionId, setActionId] = useState<string | null>(null);

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [activeForms, setActiveForms] = useState<BlogForm[]>([]);
  const [activeFormsLoading, setActiveFormsLoading] = useState(true);
  const [registeredEnterprises, setRegisteredEnterprises] = useState<string[]>([]);

  // Search and Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | PostType>("all");
  const [enterpriseFilter, setEnterpriseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | PostStatus>("all");

  // Modals & Active Selections
  const [viewingPost, setViewingPost] = useState<Post | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // SECTION 14: CREATE PLATFORM BLOG OR NEWS STATE
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<CreatePostFormState>(EMPTY_CREATE_STATE);
  const [createTab, setCreateTab] = useState<"editor" | "preview">("editor");
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isCoverPreviewOpen, setIsCoverPreviewOpen] = useState(false);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string>("");
  const [previewViewport, setPreviewViewport] = useState<"desktop" | "mobile">("desktop");
  const [coverImageFailed, setCoverImageFailed] = useState(false);

  // Edit Modal State
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editDraft, setEditDraft] = useState<CreatePostFormState>(EMPTY_CREATE_STATE);
  const [editTab, setEditTab] = useState<"editor" | "preview">("editor");
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editCoverPreviewUrl, setEditCoverPreviewUrl] = useState<string>("");
  const [isUploadingEditCover, setIsUploadingEditCover] = useState(false);

  // History & Actions Modals
  const [historyPost, setHistoryPost] = useState<Post | null>(null);
  const [historyItems, setHistoryItems] = useState<BlogHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [deleteTargetPost, setDeleteTargetPost] = useState<Post | null>(null);
  const [unpublishTargetPost, setUnpublishTargetPost] = useState<Post | null>(null);
  const [unpublishReason, setUnpublishReason] = useState("");

  // Actions Kebab Menu
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [actionMenuPosition, setActionMenuPosition] = useState<{
    top?: number;
    bottom?: number;
    left?: number;
  } | null>(null);

  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  // Close Action Kebab Menu on outside click, Escape key, or scroll
  useEffect(() => {
    if (!openActionMenuId) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest("[data-action-menu]")) {
        setOpenActionMenuId(null);
        setActionMenuPosition(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenActionMenuId(null);
        setActionMenuPosition(null);
      }
    };
    const handleScrollOrResize = () => {
      setOpenActionMenuId(null);
      setActionMenuPosition(null);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [openActionMenuId]);

  // Handle URL deep link ?details=id
  useEffect(() => {
    if (!initialDetailsId) return;
    let cancelled = false;
    void getAdminBlogPost(initialDetailsId)
      .then((detail) => {
        if (!cancelled && detail) {
          setViewingPost(toDisplayPost(detail));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [initialDetailsId]);

  const loadPosts = async (targetPage: number) => {
    setIsLoading(true);
    setLoadError("");
    try {
      const kind: BlogKind | undefined =
        typeFilter === "Blog"
          ? "blog"
          : typeFilter === "News"
          ? "news"
          : typeFilter === "Blog & News"
          ? "both"
          : undefined;
      const status =
        statusFilter === "Published"
          ? "published"
          : statusFilter === "Draft"
          ? "draft"
          : statusFilter === "Pending Approval"
          ? "pending_approval"
          : statusFilter === "Rejected"
          ? "rejected"
          : statusFilter === "Unpublished"
          ? "unpublished"
          : undefined;

      const response = await listAdminBlogPosts({
        page: targetPage,
        pageSize: 20,
        search: search.trim() || undefined,
        kind,
        status,
      });

      setPosts(response.items.map(toDisplayPost));
      setPage(response.pagination.page);
      setTotalPages(Math.max(1, response.pagination.total_pages));
      setTotalCount(response.pagination.total);
    } catch (reason: unknown) {
      setLoadError(reason instanceof Error ? reason.message : "Unable to load posts.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPosts(1);

    void listAdminBlogCategories()
      .then((items) =>
        setCategories(
          items
            .filter((item) => item.is_active)
            .map((item) => ({ id: item.id, name: item.name })),
        ),
      )
      .catch(() => setCategories([]));

    const refreshActiveForms = () => {
      setActiveFormsLoading(true);
      void listAdminBlogForms({ pageSize: 100 })
        .then((res) => {
          const activeItems = res.items.filter((f) => f.status === "active" || f.status === "published");
          return Promise.all(activeItems.map((form) => getAdminBlogForm(form.id).catch(() => form)));
        })
        .then(setActiveForms)
        .catch(() => setActiveForms([]))
        .finally(() => setActiveFormsLoading(false));
    };
    refreshActiveForms();

    void getPlatformEnterprises()
      .then((enterprisesList) => {
        const names = enterprisesList.map((e) => {
          if ("business_legal_name" in e && typeof e.business_legal_name === "string" && e.business_legal_name.trim()) {
            return e.business_legal_name;
          }
          if ("name" in e && typeof e.name === "string" && e.name.trim()) {
            return e.name;
          }
          return e.id;
        });
        setRegisteredEnterprises([...new Set(names)].sort());
      })
      .catch(() => setRegisteredEnterprises([]));
  }, [search, typeFilter, statusFilter]);

  // Combined enterprises list for the filter dropdown
  const availableEnterprises = useMemo(() => {
    const fromPosts = posts.map((p) => p.enterprise).filter(Boolean);
    const combined = new Set([...registeredEnterprises, ...fromPosts]);
    return [...combined].sort();
  }, [posts, registeredEnterprises]);

  // Client-side filtering for enterprise filter
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchEnterprise =
        enterpriseFilter === "all" || post.enterprise === enterpriseFilter;
      return matchEnterprise;
    });
  }, [posts, enterpriseFilter]);

  // Resolve applicable form for Section 14 Create Post based on selected PostType
  const applicableForm = useMemo(() => {
    const postKind: BlogKind =
      createDraft.type === "News"
        ? "news"
        : createDraft.type === "Blog & News"
        ? "both"
        : "blog";
    return (
      activeForms.find(
        (f) =>
          (f.status === "active" || f.status === "published") &&
          f.type === postKind &&
          f.scope === "global",
      ) ||
      activeForms.find(
        (f) =>
          (f.status === "active" || f.status === "published") &&
          f.type === postKind,
      ) ||
      null
    );
  }, [activeForms, createDraft.type]);

  // Custom fields in applicable form (excluding standard core fields already in form UI)
  const formCustomFields: BlogFormField[] = useMemo(() => {
    if (!applicableForm) return [];
    const coreKeys = new Set(["post_type", "title", "post_title_slug", "category_id", "category", "excerpt", "summary", "short_summary", "content", "article_content", "cover_image", "cover_image_url", "tags", "article_tags"]);
    return applicableForm.sections
      .flatMap((s) => s.fields)
      .filter((f) => !coreKeys.has(f.key));
  }, [applicableForm]);

  // Resolve applicable form schema for Edit Mode
  const editApplicableForm = useMemo(() => {
    if (!editingPost) return null;
    if (editingPost.formId) {
      const match = activeForms.find((f) => f.id === editingPost.formId);
      if (match) return match;
    }
    const postKind: BlogKind =
      editDraft.type === "News"
        ? "news"
        : editDraft.type === "Blog & News"
        ? "both"
        : "blog";
    return (
      activeForms.find(
        (f) =>
          (f.status === "active" || f.status === "published") &&
          f.type === postKind &&
          f.scope === "global",
      ) ||
      activeForms.find(
        (f) =>
          (f.status === "active" || f.status === "published") &&
          f.type === postKind,
      ) ||
      null
    );
  }, [activeForms, editingPost, editDraft.type]);

  const editFormCustomFields: BlogFormField[] = useMemo(() => {
    if (!editApplicableForm) return [];
    const coreKeys = new Set(["post_type", "title", "post_title_slug", "category_id", "category", "excerpt", "summary", "short_summary", "content", "article_content", "cover_image", "cover_image_url", "tags", "article_tags"]);
    return editApplicableForm.sections
      .flatMap((s) => s.fields)
      .filter((f) => !coreKeys.has(f.key));
  }, [editApplicableForm]);

  // Resolve applicable form schema for Viewing Mode
  const viewingApplicableForm = useMemo(() => {
    if (!viewingPost) return null;
    if (viewingPost.formId) {
      const match = activeForms.find((f) => f.id === viewingPost.formId);
      if (match) return match;
    }
    const postKind: BlogKind =
      viewingPost.type === "News"
        ? "news"
        : viewingPost.type === "Blog & News"
        ? "both"
        : "blog";
    return (
      activeForms.find(
        (f) =>
          (f.status === "active" || f.status === "published") &&
          f.type === postKind &&
          f.scope === "global",
      ) ||
      activeForms.find(
        (f) =>
          (f.status === "active" || f.status === "published") &&
          f.type === postKind,
      ) ||
      null
    );
  }, [activeForms, viewingPost]);

  const viewingFieldMap = useMemo(() => {
    if (!viewingApplicableForm) return new Map<string, BlogFormField>();
    return new Map<string, BlogFormField>(
      viewingApplicableForm.sections.flatMap((s) => s.fields).map((f) => [f.key, f]),
    );
  }, [viewingApplicableForm]);

  // Escape key handler for open modals
  useEffect(() => {
    const hasOpenModal =
      Boolean(viewingPost) ||
      Boolean(editingPost) ||
      isCreateOpen ||
      confirmPublishOpen ||
      Boolean(historyPost) ||
      Boolean(deleteTargetPost) ||
      Boolean(unpublishTargetPost);

    if (!hasOpenModal) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !actionId) {
        if (confirmPublishOpen) {
          setConfirmPublishOpen(false);
          return;
        }
        setViewingPost(null);
        setEditingPost(null);
        setIsCreateOpen(false);
        setHistoryPost(null);
        setDeleteTargetPost(null);
        setUnpublishTargetPost(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    viewingPost,
    editingPost,
    isCreateOpen,
    confirmPublishOpen,
    historyPost,
    deleteTargetPost,
    unpublishTargetPost,
    actionId,
  ]);

  // Fetch full details when viewingPost is selected
  useEffect(() => {
    if (!viewingPost?.id) return;
    let cancelled = false;
    setDetailLoading(true);
    void getAdminBlogPost(viewingPost.id)
      .then((detail) => {
        if (!cancelled && detail) {
          setViewingPost((current) =>
            current && current.id === detail.id
              ? {
                  ...current,
                  summary: detail.excerpt ?? current.summary,
                  content: detail.content || current.content,
                  category: detail.category ?? current.category,
                  categoryId: detail.category_id ?? current.categoryId,
                  coverImageUrl: detail.cover_image_url ?? current.coverImageUrl,
                  customFields: detail.custom_fields ?? current.customFields,
                }
              : current,
          );
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [viewingPost?.id]);

  // Load audit history when historyPost is selected
  useEffect(() => {
    if (!historyPost?.id) return;
    let cancelled = false;
    setHistoryLoading(true);
    setHistoryItems([]);
    void getAdminBlogHistory(historyPost.id)
      .then((res) => {
        if (!cancelled) {
          setHistoryItems(res.items);
        }
      })
      .catch(() => {
        if (!cancelled) setHistoryItems([]);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [historyPost?.id]);

  // ---------------------------------------------------------------------------
  // SECTION 14: CREATE PLATFORM BLOG OR NEWS WORKFLOW FUNCTIONS
  // ---------------------------------------------------------------------------

  const validateForPublication = (): boolean => {
    const errors: Record<string, string> = {};

    if (!createDraft.title.trim()) {
      errors.title = "Post title is required.";
    } else if (createDraft.title.trim().length < 3) {
      errors.title = "Post title must be at least 3 characters.";
    } else if (createDraft.title.trim().length > 200) {
      errors.title = "Post title must be 200 characters or fewer.";
    }

    if (!createDraft.category) {
      errors.category = "Please select a category.";
    }

    if (!createDraft.summary.trim()) {
      errors.summary = "Article summary is required for publication.";
    }

    if (!createDraft.content.trim()) {
      errors.content = "Article body content is required for publication.";
    } else if (createDraft.content.trim().length < 10) {
      errors.content = "Content must be at least 10 characters long.";
    }

    // Validate applicable form custom fields marked as required
    formCustomFields.forEach((field) => {
      if (field.required) {
        const val = createDraft.customFields[field.key];
        if (!val || !String(val).trim()) {
          errors[field.key] = `${field.label} is required.`;
        }
      }
    });

    setCreateErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploadingCover(true);
    setError("");

    try {
      // 1. Instantly read file locally as Base64 Data URL so the UI displays immediately
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Unable to read image file."));
        reader.readAsDataURL(file);
      });

      setCoverImageFailed(false);
      setCoverPreviewUrl(dataUrl);
      setCreateDraft((curr) => ({ ...curr, coverImageUrl: dataUrl }));

      // 2. Upload asset to backend in background
      try {
        const res = await uploadBlogAsset(file, "cover_image");
        if (res.url && !res.url.startsWith("blob:")) {
          // Keep coverPreviewUrl as local dataUrl for guaranteed UI display,
          // while updating createDraft with the remote cloud URL for publication
          setCreateDraft((curr) => ({ ...curr, coverImageUrl: res.url }));
        }
      } catch {
        // In local mode without cloud storage, keep dataUrl
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load selected image.");
    } finally {
      setIsUploadingCover(false);
      if (event.target) event.target.value = "";
    }
  };

  const handleCustomFieldUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    field: BlogFormField,
    target: "create" | "edit",
  ) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    const isImage = field.type === "media_upload" || field.type === "image" || field.type === "image_list";
    setError("");
    try {
      const uploads = await Promise.all(files.map((file) => uploadBlogAsset(file, isImage ? "image" : "document")));
      const urls = uploads.map((upload) => upload.url).filter(Boolean);
      if (urls.length === 0) throw new Error(`Unable to upload ${field.label.toLowerCase()}.`);
      if (target === "create") {
        setCreateDraft((current) => ({
          ...current,
          customFields: {
            ...current.customFields,
            [field.key]: [...String(current.customFields[field.key] ?? "").split(",").map((url) => url.trim()).filter(Boolean), ...urls].join(","),
          },
        }));
      } else {
        setEditDraft((current) => ({
          ...current,
          customFields: {
            ...current.customFields,
            [field.key]: [...String(current.customFields[field.key] ?? "").split(",").map((url) => url.trim()).filter(Boolean), ...urls].join(","),
          },
        }));
      }
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : `Unable to upload ${field.label.toLowerCase()}.`);
    } finally {
      event.target.value = "";
    }
  };

  const handleSaveDraft = async () => {
    if (!createDraft.title.trim()) {
      setCreateErrors({ title: "Please enter a title to save a draft." });
      return;
    }
    if (createDraft.title.trim().length > 200) {
      setCreateErrors({ title: "Post title must be 200 characters or fewer." });
      return;
    }

    setCreateErrors({});
    if (actionId) return;
    setActionId("create-draft");
    setError("");

    try {
      const tagsList = createDraft.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const saved = await createAdminBlogPost({
        kind:
          createDraft.type === "News"
            ? "news"
            : createDraft.type === "Blog & News"
            ? "both"
            : "blog",
        title: createDraft.title.trim(),
        excerpt: createDraft.summary.trim() || null,
        content: createDraft.content.trim(),
        category_id: createDraft.category || null,
        cover_image_url: createDraft.coverImageUrl.trim() || null,
        tags: tagsList,
        ...(serializeSupportingDocuments(createDraft.customFields, formCustomFields) ? { supporting_documents: serializeSupportingDocuments(createDraft.customFields, formCustomFields) } : {}),
        custom_fields: Object.keys(createDraft.customFields).length
          ? serializeConfiguredCustomFields(createDraft.customFields, formCustomFields)
          : undefined,
        form_id: applicableForm?.id ?? null,
        form_version: applicableForm?.version ?? null,
        status: "draft",
      });

      const mapped = toDisplayPost(saved);
      setPosts((current) => [mapped, ...current]);
      setIsCreateOpen(false);
      setCreateDraft(EMPTY_CREATE_STATE);
              setCoverPreviewUrl("");
      setNotice(`Platform draft post “${mapped.title}” saved.`);

      // Redirect to Post Details
      setViewingPost(mapped);
      router.replace(`/blog-posts?details=${encodeURIComponent(mapped.id)}`);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Unable to save draft post.");
    } finally {
      setActionId(null);
    }
  };

  const handleInitiatePublish = () => {
    const isValid = validateForPublication();
    if (!isValid) {
      setCreateTab("editor");
      setError("Please resolve the required fields marked with * before publishing.");
      return;
    }
    setError("");
    setConfirmPublishOpen(true);
  };

  const handleConfirmPublishImmediately = async () => {
    if (actionId) return;
    setActionId("publish-now");
    setError("");

    try {
      const tagsList = createDraft.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      // Super Admin does not need approval to publish platform content.
      // Posts are published immediately: status: "published", is_live: true.
      const saved = await createAdminBlogPost({
        kind:
          createDraft.type === "News"
            ? "news"
            : createDraft.type === "Blog & News"
            ? "both"
            : "blog",
        title: createDraft.title.trim(),
        excerpt: createDraft.summary.trim() || null,
        content: createDraft.content.trim(),
        category_id: createDraft.category || null,
        cover_image_url: createDraft.coverImageUrl.trim() || null,
        tags: tagsList,
        ...(serializeSupportingDocuments(createDraft.customFields, formCustomFields) ? { supporting_documents: serializeSupportingDocuments(createDraft.customFields, formCustomFields) } : {}),
        custom_fields: Object.keys(createDraft.customFields).length
          ? serializeConfiguredCustomFields(createDraft.customFields, formCustomFields)
          : undefined,
        form_id: applicableForm?.id ?? null,
        form_version: applicableForm?.version ?? null,
        status: "published",
      });

      const mapped = toDisplayPost(saved);
      setPosts((current) => [mapped, ...current]);
      setConfirmPublishOpen(false);
      setIsCreateOpen(false);
      setCreateDraft(EMPTY_CREATE_STATE);
      setNotice(`Platform ${mapped.type} “${mapped.title}” published immediately.`);

      // Redirect to Post Details
      setViewingPost(mapped);
      router.replace(`/blog-posts?details=${encodeURIComponent(mapped.id)}`);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Unable to publish post.");
    } finally {
      setActionId(null);
    }
  };

  // ---------------------------------------------------------------------------
  // EXISTING ROW ACTIONS: VIEW, EDIT, PIN, PUBLISH/UNPUBLISH, DELETE
  // ---------------------------------------------------------------------------

  const handlePinToggle = async (post: Post) => {
    if (actionId) return;
    setActionId(post.id);
    setError("");
    try {
      const updated = await pinAdminBlogPost(post.id, !post.pinned);
      const mapped = toDisplayPost(updated);
      setPosts((current) =>
        current.map((item) => (item.id === post.id ? mapped : item)),
      );
      if (viewingPost?.id === post.id) setViewingPost(mapped);
      setNotice(mapped.pinned ? `Post “${post.title}” pinned.` : `Post “${post.title}” unpinned.`);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Unable to toggle pin status.");
    } finally {
      setActionId(null);
    }
  };

  const handlePublishExisting = async (post: Post) => {
    if (actionId) return;
    setActionId(post.id);
    setError("");
    try {
      const updated = await publishAdminBlogPost(post.id);
      const mapped = toDisplayPost(updated);
      setPosts((current) =>
        current.map((item) => (item.id === post.id ? mapped : item)),
      );
      if (viewingPost?.id === post.id) setViewingPost(mapped);
      setNotice(`Post “${post.title}” published successfully.`);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Unable to publish post.");
    } finally {
      setActionId(null);
    }
  };

  const handleConfirmUnpublish = async () => {
    if (!unpublishTargetPost || actionId) return;
    const trimmedReason = unpublishReason.trim();
    if (!trimmedReason || trimmedReason.length < 3 || trimmedReason.length > 500) {
      setError("A reason between 3 and 500 characters is required to take down this post.");
      return;
    }
    setActionId(unpublishTargetPost.id);
    setError("");
    try {
      const updated = await unpublishAdminBlogPost(
        unpublishTargetPost.id,
        trimmedReason,
      );
      const mapped = toDisplayPost(updated);
      setPosts((current) =>
        current.map((item) => (item.id === unpublishTargetPost.id ? mapped : item)),
      );
      if (viewingPost?.id === unpublishTargetPost.id) setViewingPost(mapped);
      setNotice(`Post “${unpublishTargetPost.title}” unpublished.`);
      setUnpublishTargetPost(null);
      setUnpublishReason("");
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Unable to unpublish post.");
    } finally {
      setActionId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetPost || actionId) return;
    setActionId(deleteTargetPost.id);
    setError("");
    try {
      await deleteAdminBlogPost(deleteTargetPost.id, "Removed by Platform Super Admin");
      setPosts((current) => current.filter((item) => item.id !== deleteTargetPost.id));
      if (viewingPost?.id === deleteTargetPost.id) {
        setViewingPost(null);
        router.replace("/blog-posts");
      }
      setNotice(`Post “${deleteTargetPost.title}” deleted successfully.`);
      setDeleteTargetPost(null);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Unable to delete post.");
    } finally {
      setActionId(null);
    }
  };

  const handleOpenEdit = async (post: Post) => {
    setError("");
    setEditErrors({});
    setEditTab("editor");
    setCoverImageFailed(false);

    let fullContent = post.content;
    let fullSummary = post.summary;
    let categoryId = post.categoryId;
    let coverImageUrl = post.coverImageUrl || "";
    let tagsList = post.tags || [];
    let customFields = (post.customFields as Record<string, string>) || {};

    try {
      const detail = await getAdminBlogPost(post.id);
      fullContent = detail.content || fullContent;
      fullSummary = detail.excerpt ?? fullSummary;
      categoryId = detail.category_id ?? categoryId;
      coverImageUrl = detail.cover_image_url ?? coverImageUrl;
      tagsList = detail.tags ?? tagsList;
      customFields = (detail.custom_fields as Record<string, string>) ?? customFields;
    } catch {
      /* use existing post fields */
    }

    setEditingPost(post);
    setEditCoverPreviewUrl(coverImageUrl);
    setEditDraft({
      title: post.title,
      type: post.type,
      category: categoryId ?? "",
      summary: fullSummary,
      content: fullContent,
      coverImageUrl,
      tags: tagsList.join(", "),
      customFields: Object.fromEntries(
        Object.entries(customFields).map(([k, v]) => [k, String(v ?? "")]),
      ),
    });
  };

  const handleEditCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploadingEditCover(true);
    setError("");

    try {
      // 1. Instantly read file locally as Base64 Data URL for guaranteed UI display
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Unable to read image file."));
        reader.readAsDataURL(file);
      });

      setCoverImageFailed(false);
      setEditCoverPreviewUrl(dataUrl);
      setEditDraft((curr) => ({ ...curr, coverImageUrl: dataUrl }));

      // 2. Upload asset to backend in background
      try {
        const res = await uploadBlogAsset(file, "cover_image");
        if (res.url && !res.url.startsWith("blob:")) {
          setEditDraft((curr) => ({ ...curr, coverImageUrl: res.url }));
        }
      } catch {
        // Keep dataUrl in local mode
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load selected image.");
    } finally {
      setIsUploadingEditCover(false);
      if (event.target) event.target.value = "";
    }
  };

  const validateEditForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!editDraft.title.trim()) {
      errors.title = "Post title is required.";
    } else if (editDraft.title.trim().length < 3) {
      errors.title = "Post title must be at least 3 characters.";
    } else if (editDraft.title.trim().length > 200) {
      errors.title = "Post title must be 200 characters or fewer.";
    }

    if (!editDraft.category) {
      errors.category = "Please select a category.";
    }

    if (!editDraft.summary.trim()) {
      errors.summary = "Article summary is required.";
    }

    if (!editDraft.content.trim()) {
      errors.content = "Article body content is required.";
    } else if (editDraft.content.trim().length < 10) {
      errors.content = "Content must be at least 10 characters long.";
    }

    editFormCustomFields.forEach((field) => {
      if (field.required) {
        const val = editDraft.customFields[field.key];
        if (!val || !String(val).trim()) {
          errors[field.key] = `${field.label} is required.`;
        }
      }
    });

    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditSubmit = async (publishImmediately: boolean) => {
    if (!editingPost || actionId) return;

    if (!validateEditForm()) {
      setEditTab("editor");
      setError("Please resolve the required fields marked with * before saving.");
      return;
    }

    const tagsList = editDraft.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    setActionId(editingPost.id);
    setError("");
    try {
      const updated = await updateAdminBlogPost(editingPost.id, {
        title: editDraft.title.trim(),
        kind:
          editDraft.type === "News"
            ? "news"
            : editDraft.type === "Blog & News"
            ? "both"
            : "blog",
        excerpt: editDraft.summary.trim() || null,
        content: editDraft.content.trim(),
        category_id: editDraft.category || null,
        cover_image_url: editDraft.coverImageUrl.trim() || null,
        tags: tagsList,
        ...(serializeSupportingDocuments(editDraft.customFields, editFormCustomFields) ? { supporting_documents: serializeSupportingDocuments(editDraft.customFields, editFormCustomFields) } : {}),
        custom_fields: Object.keys(editDraft.customFields).length
          ? serializeConfiguredCustomFields(editDraft.customFields, editFormCustomFields)
          : undefined,
        form_id: editApplicableForm?.id ?? editingPost.formId ?? null,
        form_version: editApplicableForm?.version ?? editingPost.formVersion ?? null,
      });

      let finalPost = toDisplayPost(updated);

      if (publishImmediately && finalPost.status !== "Published") {
        const publishedDetail = await publishAdminBlogPost(finalPost.id);
        finalPost = toDisplayPost(publishedDetail);
      }

      setPosts((current) =>
        current.map((item) => (item.id === finalPost.id ? finalPost : item)),
      );
      if (viewingPost?.id === finalPost.id) setViewingPost(finalPost);

      setEditingPost(null);
      setNotice(`Post “${finalPost.title}” updated successfully.`);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Unable to save post changes.");
    } finally {
      setActionId(null);
    }
  };

    const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setEnterpriseFilter("all");
    setStatusFilter("all");
  };

  const selectedCategoryName = categories.find((c) => c.id === createDraft.category)?.name || "Uncategorized";
  const effectiveCoverUrl = coverPreviewUrl || resolveImagePreviewUrl(createDraft.coverImageUrl);

  return (
    <main className="min-h-screen bg-[#f8fafc] p-5 text-[#06201c] sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Navigation Breadcrumb and Header */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <nav aria-label="Breadcrumb" className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7f9d94]">
              <span>Content Management</span>
              <span className="mx-2 text-slate-300">/</span>
              <span>Blogs &amp; News</span>
              <span className="mx-2 text-slate-300">/</span>
              <span className="text-[#175245]">All Posts</span>
            </nav>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#06201c]">All Posts</h1>
            <p className="mt-1 text-sm text-[#52736a]">
              Manage, search, and govern platform and enterprise Blog and News articles.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setCreateDraft(EMPTY_CREATE_STATE);
              setCreateErrors({});
              setCreateTab("editor");
              setError("");
              setActiveFormsLoading(true);
              void listAdminBlogForms({ pageSize: 100 })
                .then((res) => {
                  const activeItems = res.items.filter((f) => f.status === "active" || f.status === "published");
                  return Promise.all(activeItems.map((form) => getAdminBlogForm(form.id).catch(() => form)));
                })
                .then(setActiveForms)
                .catch(() => setActiveForms([]))
                .finally(() => setActiveFormsLoading(false));
              setIsCreateOpen(true);
            }}
            className="rounded-xl bg-[#1f6a58] px-5 py-3 text-sm font-semibold text-white hover:bg-[#185345] shadow-xs transition-colors inline-flex items-center gap-2"
          >
            <span>Create a Post</span>
          </button>
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

        {loadError && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <span>{loadError}</span>
            <button
              type="button"
              onClick={() => void loadPosts(page)}
              className="font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}

        {error && !isCreateOpen && !editingPost && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              className="font-semibold underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Filter and Search Bar */}
        <section className="rounded-2xl border border-[#e1ebe6] bg-white shadow-xs">
          <div className="flex flex-wrap items-end gap-3 border-b border-[#edf3f0] p-5">
            <label className="min-w-[240px] flex-1">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#52736a]">
                Search by title
              </span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search post title..."
                className="w-full rounded-xl border border-[#d7e5df] px-4 py-2.5 text-sm focus:border-[#1f6a58] focus:outline-hidden"
              />
            </label>

            <label className="text-sm">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#52736a]">
                Type
              </span>
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}
                className="rounded-xl border border-[#d7e5df] bg-white px-3 py-2.5 text-sm"
              >
                <option value="all">All Types</option>
                <option value="Blog">Blog</option>
                <option value="News">News</option>
                <option value="Blog & News">Blog &amp; News</option>
              </select>
            </label>

            <label className="text-sm">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#52736a]">
                Enterprise
              </span>
              <select
                value={enterpriseFilter}
                onChange={(event) => setEnterpriseFilter(event.target.value)}
                className="min-w-44 rounded-xl border border-[#d7e5df] bg-white px-3 py-2.5 text-sm"
              >
                <option value="all">All Enterprises</option>
                {availableEnterprises.map((enterprise) => (
                  <option key={enterprise} value={enterprise}>
                    {enterprise}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#52736a]">
                Status
              </span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                className="rounded-xl border border-[#d7e5df] bg-white px-3 py-2.5 text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="Published">Published</option>
                <option value="Draft">Draft</option>
                <option value="Pending Approval">Pending Approval</option>
                <option value="Rejected">Rejected</option>
                <option value="Unpublished">Unpublished</option>
              </select>
            </label>

            {(search ||
              typeFilter !== "all" ||
              enterpriseFilter !== "all" ||
              statusFilter !== "all") && (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-xl border border-[#d7e5df] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[#175245] hover:bg-[#f4faf7] transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Table Container */}
          {isLoading ? (
            <div className="px-6 py-16 text-center text-sm text-[#52736a]">
              Loading Blog and News articles...
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <h2 className="text-lg font-semibold text-[#06201c]">
                {posts.length ? "No posts match these filters" : "No posts found"}
              </h2>
              <p className="mx-auto mt-2 max-w-lg text-sm text-[#52736a]">
                Platform and enterprise Blog or News posts will appear here. Create a post using the button above.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto min-h-[360px] pb-24">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="bg-[#f4f8f6] text-[11px] font-bold uppercase tracking-wider text-[#52736a]">
                  <tr>
                    <th className="px-5 py-4">Title</th>
                    <th className="px-4 py-4">Type</th>
                    <th className="px-4 py-4">Enterprise / Author</th>
                    <th className="px-4 py-4">Category</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Created At</th>
                    <th className="px-4 py-4">Updated At</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf3f0]">
                  {filteredPosts.map((post) => (
                    <tr key={post.id} className="hover:bg-[#fbfdfc] transition-colors">
                      {/* Title column */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-[#06201c]">{post.title}</p>
                          {post.pinned && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900 border border-amber-300">
                              Pinned
                            </span>
                          )}
                        </div>
                        {post.summary && (
                          <p className="mt-1 line-clamp-1 max-w-md text-xs text-[#52736a]">
                            {post.summary}
                          </p>
                        )}
                      </td>

                      {/* Type column */}
                      <td className="px-4 py-4">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-semibold ${
                            post.type === "News"
                              ? "bg-sky-50 text-sky-800 border border-sky-200"
                              : post.type === "Blog & News"
                              ? "bg-purple-50 text-purple-800 border border-purple-200"
                              : "bg-teal-50 text-teal-800 border border-teal-200"
                          }`}
                        >
                          {post.type}
                        </span>
                      </td>

                      {/* Enterprise / Author column */}
                      <td className="px-4 py-4">
                        <p className="font-medium text-[#06201c]">{post.enterprise}</p>
                        <p className="mt-0.5 text-xs text-[#52736a]">{post.author}</p>
                      </td>

                      {/* Category column */}
                      <td className="px-4 py-4">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {post.category}
                        </span>
                      </td>

                      {/* Status column */}
                      <td className="px-4 py-4">
                        <span
                          className={`rounded px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${
                            post.status === "Published"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : post.status === "Pending Approval"
                              ? "bg-blue-100 text-blue-800 border border-blue-200"
                              : post.status === "Rejected"
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : post.status === "Unpublished"
                              ? "bg-amber-100 text-amber-900 border border-amber-300"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {post.status}
                        </span>
                      </td>

                      {/* Created At column */}
                      <td className="px-4 py-4 text-xs text-[#52736a] whitespace-nowrap">
                        {formatDate(post.createdAt)}
                      </td>

                      {/* Updated At column */}
                      <td className="px-4 py-4 text-xs text-[#52736a] whitespace-nowrap">
                        {formatDate(post.updatedAt)}
                      </td>

                      {/* Actions column */}
                      <td className="px-5 py-4 text-right">
                        <div className="relative inline-block text-left" data-action-menu>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (openActionMenuId === post.id) {
                                setOpenActionMenuId(null);
                                setActionMenuPosition(null);
                                return;
                              }
                              const rect = e.currentTarget.getBoundingClientRect();
                              const menuHeight = 250;
                              const spaceBelow = window.innerHeight - rect.bottom;
                              const openUpwards = spaceBelow < menuHeight;
                              setActionMenuPosition(
                                openUpwards
                                  ? {
                                      left: Math.max(8, rect.right - 188),
                                      bottom: Math.max(8, window.innerHeight - rect.top + 6),
                                    }
                                  : {
                                      left: Math.max(8, rect.right - 188),
                                      top: Math.min(window.innerHeight - menuHeight, rect.bottom + 6),
                                    }
                              );
                              setOpenActionMenuId(post.id);
                            }}
                            className={`rounded-lg border p-1.5 text-slate-600 transition-colors hover:bg-slate-50 hover:text-[#06201c] focus:outline-hidden ${
                              openActionMenuId === post.id
                                ? "border-[#1f6a58] bg-[#f4faf7] text-[#175245]"
                                : "border-[#d7e5df] bg-white"
                            }`}
                            aria-haspopup="true"
                            aria-expanded={openActionMenuId === post.id}
                            aria-label="Actions menu"
                          >
                            <svg
                              className="h-4 w-4"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                            >
                              <circle cx="12" cy="5" r="1.75" />
                              <circle cx="12" cy="12" r="1.75" />
                              <circle cx="12" cy="19" r="1.75" />
                            </svg>
                          </button>

                          {openActionMenuId === post.id && (
                            <div
                              style={actionMenuPosition ?? undefined}
                              className="fixed z-[70] w-48 rounded-xl border border-[#edf3f0] bg-white py-1.5 shadow-xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100"
                              role="menu"
                              aria-orientation="vertical"
                              data-action-menu
                            >
                              {/* 1. View */}
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  setActionMenuPosition(null);
                                  setViewingPost(post);
                                  router.replace(`/blog-posts?details=${encodeURIComponent(post.id)}`);
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-[#f4faf7] hover:text-[#175245] flex items-center gap-2.5 transition-colors"
                              >
                                <svg className="h-4 w-4 text-[#52736a]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                <span>View</span>
                              </button>

                              {/* 2. Edit */}
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  setActionMenuPosition(null);
                                  void handleOpenEdit(post);
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-[#f4faf7] hover:text-[#175245] flex items-center gap-2.5 transition-colors"
                              >
                                <svg className="h-4 w-4 text-[#52736a]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                <span>Edit</span>
                              </button>

                              {/* 3. Unpublish / Publish */}
                              {post.status === "Published" ? (
                                <button
                                  type="button"
                                  role="menuitem"
                                  disabled={actionId !== null}
                                  onClick={() => {
                                    setOpenActionMenuId(null);
                                    setActionMenuPosition(null);
                                    setUnpublishTargetPost(post);
                                  }}
                                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-50 flex items-center gap-2.5 transition-colors disabled:opacity-50"
                                >
                                  <svg className="h-4 w-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                  </svg>
                                  <span>Unpublish</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  role="menuitem"
                                  disabled={actionId !== null}
                                  onClick={() => {
                                    setOpenActionMenuId(null);
                                    setActionMenuPosition(null);
                                    void handlePublishExisting(post);
                                  }}
                                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-[#175245] hover:bg-[#f4faf7] flex items-center gap-2.5 transition-colors disabled:opacity-50"
                                >
                                  <svg className="h-4 w-4 text-[#1f6a58]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span>Publish</span>
                                </button>
                              )}

                              {/* 4. Pin / Unpin */}
                              <button
                                type="button"
                                role="menuitem"
                                disabled={actionId !== null}
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  setActionMenuPosition(null);
                                  void handlePinToggle(post);
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-[#f4faf7] hover:text-[#175245] flex items-center gap-2.5 transition-colors disabled:opacity-50"
                              >
                                <svg className="h-4 w-4 text-[#52736a]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                </svg>
                                <span>{post.pinned ? "Unpin" : "Pin"}</span>
                              </button>

                              {/* 5. History */}
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  setActionMenuPosition(null);
                                  setHistoryPost(post);
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-[#f4faf7] hover:text-[#175245] flex items-center gap-2.5 transition-colors"
                              >
                                <svg className="h-4 w-4 text-[#52736a]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>History</span>
                              </button>

                              <div className="my-1 border-t border-[#edf3f0]" />

                              {/* 6. Delete */}
                              <button
                                type="button"
                                role="menuitem"
                                disabled={actionId !== null}
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  setActionMenuPosition(null);
                                  setDeleteTargetPost(post);
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors disabled:opacity-50"
                              >
                                <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!isLoading && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf3f0] px-5 py-4 text-xs font-semibold text-[#52736a]">
              <span>
                Showing {filteredPosts.length} of {totalCount} post{totalCount === 1 ? "" : "s"} · Page {page} of {totalPages}
              </span>
              {totalPages > 1 && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1 || actionId !== null}
                    onClick={() => void loadPosts(page - 1)}
                    className="rounded-lg border border-[#d7e5df] px-3 py-2 text-xs font-semibold text-[#175245] hover:bg-slate-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages || actionId !== null}
                    onClick={() => void loadPosts(page + 1)}
                    className="rounded-lg border border-[#d7e5df] px-3 py-2 text-xs font-semibold text-[#175245] hover:bg-slate-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* =======================================================================
          SECTION 14: CREATE PLATFORM BLOG OR NEWS MODAL / DRAWER
          ======================================================================= */}
      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#06201c]/40 p-4"
          onClick={() => {
            if (!actionId && !confirmPublishOpen) setIsCreateOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Create Platform Blog or News"
        >
          <section
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden"
          >
            {/* Header with Editor / Preview tabs */}
            <header className="border-b border-[#edf3f0] p-5 pb-0 bg-white">
              <div className="flex items-start justify-between pb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#7f9d94]">
                    Super Admin Authoring
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-[#06201c]">
                    Create Platform {createDraft.type === "News" ? "News Bulletin" : createDraft.type === "Blog & News" ? "Blog & News Post" : "Blog Article"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl border border-[#d7e5df] p-2 text-[#52736a] hover:bg-slate-50 transition-colors"
                  aria-label="Close authoring dialog"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Compact privilege + schema info - non-intrusive */}
              <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-[#52736a]">
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 font-medium text-teal-900">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Super Admin: no approval needed to publish
                </span>
                {activeFormsLoading ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-mono text-[10px] text-slate-600">
                    Loading active form…
                  </span>
                ) : applicableForm ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-mono text-[10px] text-slate-600" title="Active form schema version">
                    Schema: {applicableForm.name} v{applicableForm.version}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-mono text-[10px] text-amber-800" title="No active form is configured for this content type">
                    No active form configured
                  </span>
                )}
              </div>

              {/* Tabs: Form Editor vs Customer Preview */}
              <div className="flex gap-4 border-b border-[#edf3f0]">
                <button
                  type="button"
                  onClick={() => setCreateTab("editor")}
                  className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                    createTab === "editor"
                      ? "border-[#1f6a58] text-[#175245]"
                      : "border-transparent text-[#7f9d94] hover:text-[#06201c]"
                  }`}
                >
                  Article Form Editor
                </button>
                <button
                  type="button"
                  onClick={() => setCreateTab("preview")}
                  className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                    createTab === "preview"
                      ? "border-[#1f6a58] text-[#175245]"
                      : "border-transparent text-[#7f9d94] hover:text-[#06201c]"
                  }`}
                >
                  Customer Article Preview
                </button>
              </div>
            </header>

            {/* TAB 1: FORM EDITOR */}
            {createTab === "editor" ? (
              <div className="flex-1 space-y-5 overflow-y-auto p-6 text-sm">
                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                    {error}
                  </div>
                )}

                {/* 1. SELECT BLOG, NEWS, OR BOTH */}
                <div>
                  <span className="block text-xs font-bold uppercase tracking-wider text-[#52736a] mb-2">
                    Select Content Type
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setCreateDraft({ ...createDraft, type: "Blog" });
                        setCreateErrors({});
                      }}
                      className={`rounded-xl border p-3 text-left transition-all ${
                        createDraft.type === "Blog"
                          ? "border-[#1f6a58] bg-[#f4faf7] ring-2 ring-[#1f6a58]/20"
                          : "border-[#d7e5df] bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-[#06201c]">Blog Article</span>
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            createDraft.type === "Blog" ? "bg-[#1f6a58]" : "bg-slate-300"
                          }`}
                        />
                      </div>
                      <p className="mt-1 text-xs text-[#52736a]">
                        Clinical insights, wellness education, and healthcare guidance.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCreateDraft({ ...createDraft, type: "News" });
                        setCreateErrors({});
                      }}
                      className={`rounded-xl border p-3 text-left transition-all ${
                        createDraft.type === "News"
                          ? "border-sky-600 bg-sky-50/60 ring-2 ring-sky-600/20"
                          : "border-[#d7e5df] bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-[#06201c]">News Bulletin</span>
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            createDraft.type === "News" ? "bg-sky-600" : "bg-slate-300"
                          }`}
                        />
                      </div>
                      <p className="mt-1 text-xs text-[#52736a]">
                        Platform announcements, medical bulletins, and company releases.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCreateDraft({ ...createDraft, type: "Blog & News" });
                        setCreateErrors({});
                      }}
                      className={`rounded-xl border p-3 text-left transition-all ${
                        createDraft.type === "Blog & News"
                          ? "border-purple-600 bg-purple-50/60 ring-2 ring-purple-600/20"
                          : "border-[#d7e5df] bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-[#06201c]">Blog &amp; News</span>
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            createDraft.type === "Blog & News" ? "bg-purple-600" : "bg-slate-300"
                          }`}
                        />
                      </div>
                      <p className="mt-1 text-xs text-[#52736a]">
                        Hybrid content published across both blog and news channels.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Warning when no active form is configured for the chosen type */}
                {!applicableForm && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950 flex items-start justify-between gap-3" role="alert">
                    <div className="flex items-start gap-2.5">
                      <svg
                        className="h-5 w-5 text-amber-600 shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                      <div>
                        <p className="text-sm font-bold text-amber-900">
                          There is no active form configured for {createDraft.type === "News" ? "News" : createDraft.type === "Blog & News" ? "Blog & News" : "Blog"}.
                        </p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          Activate a template for this type in Form Builder to enable post authoring.
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/blog-forms"
                      className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-50 shadow-xs shrink-0"
                    >
                      Configure Forms
                    </Link>
                  </div>
                )}

                {/* 2. CORE DETAILS */}
                <div className="space-y-4 rounded-xl border border-[#edf3f0] bg-[#fbfdfc] p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#175245]">
                    {createDraft.type === "News" ? "News Bulletin Details" : createDraft.type === "Blog & News" ? "Blog & News Details" : "Blog Article Details"}
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="block text-xs font-bold uppercase tracking-wider text-[#52736a]">
                        Category <span className="text-red-600">*</span>
                      </span>
                      <select
                        value={createDraft.category}
                        onChange={(e) => {
                          setCreateDraft({ ...createDraft, category: e.target.value });
                          if (createErrors.category) {
                            setCreateErrors((prev) => ({ ...prev, category: "" }));
                          }
                        }}
                        className={`mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 text-sm ${
                          createErrors.category ? "border-red-400 bg-red-50/30" : "border-[#d7e5df]"
                        }`}
                      >
                        <option value="">Select a category</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      {createErrors.category && (
                        <p className="mt-1 text-xs text-red-600 font-medium">{createErrors.category}</p>
                      )}
                    </label>

                    <label className="block">
                      <div className="flex items-center justify-between">
                        <span className="block text-xs font-bold uppercase tracking-wider text-[#52736a]">
                          {createDraft.type === "News" ? "News Tags / Keywords" : "Tags / Keywords"}
                        </span>
                        <span className="text-[10px] text-[#7f9d94]">Comma separated</span>
                      </div>
                      <input
                        value={createDraft.tags}
                        onChange={(e) => setCreateDraft({ ...createDraft, tags: e.target.value })}
                        placeholder={
                          createDraft.type === "News"
                            ? "e.g. Announcement, FDA, Advisory, Expansion"
                            : "e.g. Clinical, Cardiology, Wellness"
                        }
                        className="mt-1.5 w-full rounded-xl border border-[#d7e5df] px-3.5 py-2.5 text-sm"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="block text-xs font-bold uppercase tracking-wider text-[#52736a]">
                      {createDraft.type === "News" ? "News Headline" : "Article Title"} <span className="text-red-600">*</span>
                    </span>
                    <input
                      value={createDraft.title}
                      onChange={(e) => {
                        setCreateDraft({ ...createDraft, title: e.target.value });
                        if (createErrors.title) {
                          setCreateErrors((prev) => ({ ...prev, title: "" }));
                        }
                      }}
                      placeholder={
                        createDraft.type === "News"
                          ? "e.g. Invigorate Health Expands Regional Diagnostic Center Network"
                          : "e.g. Advancements in Preventative Diagnostic Healthcare"
                      }
                      className={`mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-sm ${
                        createErrors.title ? "border-red-400 bg-red-50/30" : "border-[#d7e5df]"
                      }`}
                    />
                    {createErrors.title && (
                      <p className="mt-1 text-xs text-red-600 font-medium">{createErrors.title}</p>
                    )}
                  </label>

                  <label className="block">
                    <span className="block text-xs font-bold uppercase tracking-wider text-[#52736a]">
                      {createDraft.type === "News" ? "Bulletin Summary / Lead Paragraph" : "Summary / Excerpt"} <span className="text-red-600">*</span>
                    </span>
                    <textarea
                      value={createDraft.summary}
                      onChange={(e) => {
                        setCreateDraft({ ...createDraft, summary: e.target.value });
                        if (createErrors.summary) {
                          setCreateErrors((prev) => ({ ...prev, summary: "" }));
                        }
                      }}
                      rows={3}
                      placeholder={
                        createDraft.type === "News"
                          ? "A concise, high-impact summary for news feeds and press bulletins..."
                          : "A clear, compelling summary rendered on directory cards and previews..."
                      }
                      className={`mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-sm ${
                        createErrors.summary ? "border-red-400 bg-red-50/30" : "border-[#d7e5df]"
                      }`}
                    />
                    {createErrors.summary && (
                      <p className="mt-1 text-xs text-red-600 font-medium">{createErrors.summary}</p>
                    )}
                  </label>

                  <div className="space-y-2">
                    <span className="block text-xs font-bold uppercase tracking-wider text-[#52736a]">
                      {createDraft.type === "News" ? "News Cover Banner / Press Photo" : "Cover Image Banner"}
                    </span>
                    {createDraft.coverImageUrl ? (
                      <div className="relative overflow-hidden rounded-xl border border-[#d7e5df] bg-slate-50 p-2.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={effectiveCoverUrl}
                            alt="Cover thumbnail"
                            className="h-14 w-20 rounded-lg object-cover border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setIsCoverPreviewOpen(true)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">
                              {createDraft.coverImageUrl.startsWith("data:")
                                ? "Image asset ready for publication"
                                : createDraft.coverImageUrl}
                            </p>
                            <p className="text-[11px] text-[#7f9d94]">Cover banner attached</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setIsCoverPreviewOpen(true)}
                              className="rounded-lg border border-[#1f6a58] bg-white px-3 py-1.5 text-xs font-semibold text-[#175245] hover:bg-[#f4faf7] transition-colors inline-flex items-center gap-1.5 shadow-xs"
                              aria-label="Preview uploaded cover image"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              <span>Preview</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCoverImageFailed(false);
                                setCoverPreviewUrl("");
                                setCreateDraft((curr) => ({ ...curr, coverImageUrl: "" }));
                              }}
                              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
                              aria-label="Remove cover image"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-[#d7e5df] bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors">
                          <svg className="h-4 w-4 text-[#1f6a58]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{isUploadingCover ? "Uploading asset..." : "Upload Image"}</span>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={isUploadingCover}
                            onChange={(e) => void handleCoverUpload(e)}
                            className="sr-only"
                          />
                        </label>
                        <span className="text-xs text-slate-400">or</span>
                        <input
                          value={createDraft.coverImageUrl}
                          onChange={(e) =>
                            (() => {
                            const val = e.target.value;
                            setCoverImageFailed(false);
                            setCoverPreviewUrl(val);
                            setCreateDraft((curr) => ({ ...curr, coverImageUrl: val }));
                          })()
                          }
                          placeholder="Paste image URL (https://...)"
                          className="flex-1 min-w-[200px] rounded-xl border border-[#d7e5df] px-3.5 py-2 text-xs focus:border-[#1f6a58] focus:outline-hidden"
                        />
                      </div>
                    )}
                    {isCoverPreviewOpen && createDraft.coverImageUrl ? (
                      <div
                        className="fixed inset-0 z-70 flex items-center justify-center bg-[#06201c]/70 p-4 backdrop-blur-xs"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Cover Image Preview"
                        onClick={() => setIsCoverPreviewOpen(false)}
                      >
                        <div
                          className="relative max-h-[92vh] max-w-4xl w-full overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col border border-[#edf3f0]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between border-b border-[#edf3f0] px-5 py-4 bg-[#fbfdfc]">
                            <div className="flex items-center gap-2.5">
                              <span className="h-2 w-2 rounded-full bg-[#1f6a58]" />
                              <h3 className="text-sm font-bold text-[#06201c]">Cover Image Preview</h3>
                              <span className="text-xs text-[#7f9d94]">· Full Resolution</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsCoverPreviewOpen(false)}
                              className="rounded-xl border border-[#d7e5df] bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 shadow-xs"
                              aria-label="Close image preview"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              <span>Close</span>
                            </button>
                          </div>
                          <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-900/5">
                            <img
                              src={effectiveCoverUrl}
                              alt="Cover full preview"
                              className="max-h-[72vh] w-auto max-w-full rounded-xl object-contain shadow-md border border-slate-200 bg-white"
                            />
                          </div>
                          <div className="border-t border-[#edf3f0] px-5 py-3 bg-white flex items-center justify-between">
                            <span className="text-xs text-[#52736a] truncate max-w-md">
                              {createDraft.coverImageUrl.startsWith("data:")
                                ? "Embedded image asset"
                                : createDraft.coverImageUrl}
                            </span>
                            <button
                              type="button"
                              onClick={() => setIsCoverPreviewOpen(false)}
                              className="rounded-xl bg-[#1f6a58] px-4 py-2 text-xs font-semibold text-white hover:bg-[#185345] transition-colors"
                            >
                              Close Preview
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                    <span className="block text-[11px] text-[#7f9d94]">
                      Optional cover banner asset displayed at the top of customer articles.
                    </span>
                  </div>
                </div>

                {/* 3. MAIN BODY */}
                <div className="space-y-2 rounded-xl border border-[#edf3f0] bg-[#fbfdfc] p-4">
                  <span className="block text-xs font-bold uppercase tracking-wider text-[#175245]">
                    {createDraft.type === "News" ? "Bulletin Content / Announcement Body" : "Article Content Body"} <span className="text-red-600">*</span>
                  </span>
                  <textarea
                    value={createDraft.content}
                    onChange={(e) => {
                      setCreateDraft({ ...createDraft, content: e.target.value });
                      if (createErrors.content) {
                        setCreateErrors((prev) => ({ ...prev, content: "" }));
                      }
                    }}
                    rows={10}
                    placeholder={
                      createDraft.type === "News"
                        ? "Write the complete announcement, press release, or bulletin..."
                        : "Write the complete article content here (paragraphs, subsections, clinical notes)..."
                    }
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm ${
                      createErrors.content ? "border-red-400 bg-red-50/30" : "border-[#d7e5df]"
                    }`}
                  />
                  {createErrors.content && (
                    <p className="text-xs text-red-600 font-medium">{createErrors.content}</p>
                  )}
                </div>

                {/* 4. HIGH PRIORITY NEWS FLAG */}
                {createDraft.type === "News" ? (
                  <label className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50/60 p-3.5 cursor-pointer transition-colors hover:bg-sky-50">
                    <input
                      type="checkbox"
                      checked={createDraft.customFields.is_urgent === "true"}
                      onChange={(e) =>
                        setCreateDraft({
                          ...createDraft,
                          customFields: {
                            ...createDraft.customFields,
                            is_urgent: e.target.checked ? "true" : "false",
                          },
                        })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    <div>
                      <span className="block text-xs font-bold text-[#06201c]">
                        Flag as High Priority / Urgent News Announcement
                      </span>
                      <span className="block text-[11px] text-[#52736a]">
                        Displays an Urgent Bulletin badge on customer news feeds and previews
                      </span>
                    </div>
                  </label>
                ) : null}

                {/* 5. CUSTOM FIELDS FROM APPLICABLE ACTIVE FORM */}
                {formCustomFields.length > 0 && (
                  <div className="space-y-4 rounded-xl border border-teal-100 bg-teal-50/30 p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-teal-950">
                        Additional Form Fields ({applicableForm?.name})
                      </h3>
                      <span className="text-[11px] text-teal-800">
                        Configured Form Schema
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {formCustomFields.map((field) => (
                        <label key={field.id} className="block">
                          <span className="block text-xs font-bold uppercase tracking-wider text-[#52736a]">
                            {field.label} {field.required && <span className="text-red-600">*</span>}
                          </span>
                          {field.type === "media_upload" || field.type === "image" || field.type === "image_list" || field.type === "file_upload" || field.type === "document" ? (
                            <div className="mt-1 rounded-xl border border-dashed border-[#b6dfce] bg-white p-3">
                              <input
                                type="file"
                                multiple={field.type === "media_upload" || field.type === "image" || field.type === "image_list"}
                                accept={field.type === "media_upload" || field.type === "image" || field.type === "image_list" ? "image/jpeg,image/png,image/webp,image/gif" : ".pdf,.doc,.docx,.zip"}
                                onChange={(event) => void handleCustomFieldUpload(event, field, "create")}
                                className="block w-full text-xs text-[#52736a]"
                              />
                              {createDraft.customFields[field.key] ? <p className="mt-2 truncate text-[11px] text-[#52736a]">{field.type === "file_upload" || field.type === "document" ? "Document attached" : "Image attached"}</p> : null}
                            </div>
                          ) : field.type === "textarea" ? (
                            <textarea
                              value={createDraft.customFields[field.key] || ""}
                              onChange={(e) =>
                                setCreateDraft({
                                  ...createDraft,
                                  customFields: {
                                    ...createDraft.customFields,
                                    [field.key]: e.target.value,
                                  },
                                })
                              }
                              rows={2}
                              placeholder={field.placeholder || `Enter ${field.label}...`}
                              className={`mt-1 w-full rounded-xl border bg-white px-3 py-2 text-xs ${
                                createErrors[field.key] ? "border-red-400 bg-red-50/30" : "border-[#d7e5df]"
                              }`}
                            />
                          ) : field.type === "dropdown" && typeof field.validation?.options === "string" ? (
                            <select
                              value={createDraft.customFields[field.key] || ""}
                              onChange={(e) =>
                                setCreateDraft({
                                  ...createDraft,
                                  customFields: {
                                    ...createDraft.customFields,
                                    [field.key]: e.target.value,
                                  },
                                })
                              }
                              className={`mt-1 w-full rounded-xl border bg-white px-3 py-2 text-xs ${
                                createErrors[field.key] ? "border-red-400 bg-red-50/30" : "border-[#d7e5df]"
                              }`}
                            >
                              <option value="">Select an option</option>
                              {field.validation.options.split(",").map((opt: string) => {
                                const trimmed = opt.trim();
                                return (
                                  <option key={trimmed} value={trimmed}>
                                    {trimmed}
                                  </option>
                                );
                              })}
                            </select>
                          ) : (
                            <input
                              type={field.type === "number" ? "number" : "text"}
                              value={createDraft.customFields[field.key] || ""}
                              onChange={(e) =>
                                setCreateDraft({
                                  ...createDraft,
                                  customFields: {
                                    ...createDraft.customFields,
                                    [field.key]: e.target.value,
                                  },
                                })
                              }
                              placeholder={field.placeholder || `Enter ${field.label}...`}
                              className={`mt-1 w-full rounded-xl border bg-white px-3 py-2 text-xs ${
                                createErrors[field.key] ? "border-red-400 bg-red-50/30" : "border-[#d7e5df]"
                              }`}
                            />
                          )}
                          {createErrors[field.key] && (
                            <p className="mt-1 text-xs text-red-600 font-medium">
                              {createErrors[field.key]}
                            </p>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* TAB 2: CUSTOMER ARTICLE PREVIEW */
              <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6 text-sm bg-[#f8faf9]">
                {/* Viewport & Reader Mode Control Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#d7e5df] bg-white px-4 py-2.5 shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-[#175245]">
                      Live Customer Preview
                    </span>
                    <span className="text-xs text-[#7f9d94]">
                      · How readers will see this published {createDraft.type.toLowerCase()}
                    </span>
                  </div>

                  {/* Desktop / Mobile Device Viewport Switcher */}
                  <div className="inline-flex items-center rounded-lg border border-[#d7e5df] bg-[#fbfdfc] p-0.5 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setPreviewViewport("desktop")}
                      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 transition-all ${
                        previewViewport === "desktop"
                          ? "bg-[#1f6a58] text-white shadow-xs"
                          : "text-[#52736a] hover:text-[#06201c]"
                      }`}
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>Desktop View</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewViewport("mobile")}
                      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 transition-all ${
                        previewViewport === "mobile"
                          ? "bg-[#1f6a58] text-white shadow-xs"
                          : "text-[#52736a] hover:text-[#06201c]"
                      }`}
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span>Mobile App View</span>
                    </button>
                  </div>
                </div>

                {/* Article Reader Container (Constrained for mobile preview) */}
                <div
                  className={`transition-all duration-200 ${
                    previewViewport === "mobile"
                      ? "mx-auto max-w-sm rounded-3xl border-4 border-slate-700 bg-white shadow-2xl p-4 sm:p-5"
                      : "rounded-2xl border border-[#dfe9e4] bg-white p-6 sm:p-8 shadow-xs"
                  }`}
                >
                  {/* Article Badges: Content Type & Category */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                        createDraft.type === "News"
                          ? "bg-sky-50 text-sky-800 border border-sky-200"
                          : createDraft.type === "Blog & News"
                          ? "bg-purple-50 text-purple-800 border border-purple-200"
                          : "bg-teal-50 text-teal-800 border border-teal-200"
                      }`}
                    >
                      {createDraft.type === "News" ? "News Bulletin" : createDraft.type === "Blog & News" ? "Blog & News Post" : "Blog Article"}
                    </span>
                    {createDraft.customFields.is_urgent === "true" && (
                      <span className="rounded px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300">
                        Urgent Bulletin
                      </span>
                    )}
                    <span className="rounded-full bg-[#f1f6f3] px-3 py-0.5 text-xs font-semibold text-[#175245] border border-[#d7e5df]">
                      {selectedCategoryName}
                    </span>
                    {createDraft.customFields.specialty_focus && (
                      <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-800 border border-teal-200">
                        {createDraft.customFields.specialty_focus}
                      </span>
                    )}
                  </div>

                  {/* Cover Image Banner (If attached and valid) */}
                  {effectiveCoverUrl && !coverImageFailed ? (
                    <div className="relative mt-4 group overflow-hidden rounded-2xl border border-[#edf3f0] shadow-xs">
                      <img
                        src={effectiveCoverUrl}
                        alt={createDraft.title || "Cover banner"}
                        className="max-h-72 w-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-[1.01]"
                        onClick={() => setIsCoverPreviewOpen(true)}
                        onError={() => setCoverImageFailed(true)}
                      />
                      <button
                        type="button"
                        onClick={() => setIsCoverPreviewOpen(true)}
                        className="absolute bottom-3 right-3 rounded-xl bg-black/60 backdrop-blur-xs px-3 py-1.5 text-xs font-semibold text-white hover:bg-black/80 transition-colors inline-flex items-center gap-1.5 opacity-90 hover:opacity-100 shadow-sm"
                        aria-label="Preview full resolution image"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>Preview Full Image</span>
                      </button>
                    </div>
                  ) : null}

                  {/* Title */}
                  <h1 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-[#06201c] leading-tight">
                    {createDraft.title ? (
                      createDraft.title
                    ) : (
                      <span className="text-slate-400 font-normal italic">
                        Untitled Article (Enter title in the editor)
                      </span>
                    )}
                  </h1>

                  {/* Publisher & Metadata Bar */}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#52736a] border-b border-[#edf3f0] pb-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1f6a58] text-[10px] font-bold text-white uppercase">
                        IH
                      </div>
                      <span className="font-semibold text-[#06201c]">
                        Invigorate Health Platform
                      </span>
                    </div>
                    <span>·</span>
                    <span>Published by <strong>Super Admin</strong></span>
                    {createDraft.customFields.news_source && (
                      <>
                        <span>·</span>
                        <span className="font-medium text-[#06201c]">Wire: {createDraft.customFields.news_source}</span>
                      </>
                    )}
                    {createDraft.customFields.target_audience && (
                      <>
                        <span>·</span>
                        <span className="text-[#52736a]">For: {createDraft.customFields.target_audience}</span>
                      </>
                    )}
                    <span>·</span>
                    <span>
                      {new Date().toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <span>·</span>
                    <span>
                      {Math.max(
                        1,
                        Math.ceil((createDraft.content || "").split(/\s+/).filter(Boolean).length / 200),
                      )}{" "}
                      min read
                    </span>
                  </div>

                  {/* Tags */}
                  {createDraft.tags.trim() && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {createDraft.tags
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean)
                        .map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-[#f1f6f3] text-[#365b52] px-2.5 py-0.5 text-[11px] font-semibold border border-[#d7e5df]"
                          >
                            #{tag}
                          </span>
                        ))}
                    </div>
                  )}

                  {/* Summary Callout */}
                  {createDraft.summary ? (
                    <div className="mt-5 rounded-2xl border-l-4 border-[#1f6a58] bg-[#f4faf7] p-4 text-sm font-medium leading-relaxed text-[#175245] shadow-xs">
                      {createDraft.summary}
                    </div>
                  ) : (
                    <div className="mt-5 rounded-xl border border-dashed border-[#d7e5df] bg-[#fbfdfc] p-3 text-xs italic text-[#7f9d94]">
                      Summary excerpt not provided yet. Enter an excerpt in the editor to display an article highlight here.
                    </div>
                  )}

                  {/* Main Content Body */}
                  {createDraft.content ? (
                    <div
                      className="mt-6 text-sm sm:text-base leading-relaxed text-[#243c36] prose prose-sm max-w-none [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_li]:mb-1 [&_strong]:font-semibold [&_b]:font-semibold [&_i]:italic [&_em]:italic [&_u]:underline"
                      dangerouslySetInnerHTML={{
                        __html: renderContentHtml(createDraft.content),
                      }}
                    />
                  ) : (
                    <div className="mt-6 rounded-2xl border border-dashed border-[#d7e5df] bg-[#fbfdfc] p-8 text-center text-xs text-[#7f9d94] space-y-2">
                      <p className="font-semibold text-slate-600">Article Content is Empty</p>
                      <p>
                        Switch to the Article Form Editor tab to write the article body paragraphs, clinical insights, and announcements.
                      </p>
                      <button
                        type="button"
                        onClick={() => setCreateTab("editor")}
                        className="mt-2 inline-flex items-center gap-1 font-semibold text-[#1f6a58] hover:underline"
                      >
                        ← Back to Article Form Editor
                      </button>
                    </div>
                  )}

                  {/* Customer-Visible Custom Fields & References */}
                  {(() => {
                    const customerVisibleEntries = Object.entries(createDraft.customFields).filter(
                      ([k, v]) =>
                        v !== "" &&
                        v !== null &&
                        v !== undefined &&
                        !isSystemFieldKey(k) &&
                        !k.startsWith("internal_") &&
                        !k.includes("admin") &&
                        !k.includes("private_"),
                    );
                    if (customerVisibleEntries.length === 0) return null;

                    return (
                      <div className="mt-8 border-t border-[#edf3f0] pt-6">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#175245] mb-3">
                          Article Information &amp; References
                        </h4>
                        <dl className="grid gap-3 sm:grid-cols-2 text-xs">
                          {customerVisibleEntries.map(([k, v]) => {
                            const strVal = String(v);
                            const isUrl = strVal.startsWith("http://") || strVal.startsWith("https://");
                            return (
                              <div
                                key={k}
                                className="rounded-xl bg-[#f8fbf9] p-3 border border-[#edf3f0]"
                              >
                                <dt className="text-[10px] uppercase font-bold text-[#7f9d94]">
                                  {k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                                </dt>
                                <dd className="mt-1 font-semibold text-[#06201c] break-all">
                                  {isUrl ? (
                                    <a
                                      href={strVal}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[#1f6a58] hover:underline inline-flex items-center gap-1 font-semibold"
                                    >
                                      <span>{strVal}</span>
                                      <svg
                                        className="h-3 w-3 shrink-0"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        aria-hidden="true"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                        />
                                      </svg>
                                    </a>
                                  ) : (
                                    strVal
                                  )}
                                </dd>
                              </div>
                            );
                          })}
                        </dl>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* ACTION FOOTER */}
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf3f0] p-4 bg-white">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={actionId !== null}
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl border border-[#d7e5df] px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Save Draft */}
                <button
                  type="button"
                  disabled={actionId !== null || !applicableForm}
                  onClick={() => void handleSaveDraft()}
                  className="rounded-xl border border-[#1f6a58] px-4 py-2.5 text-xs font-semibold text-[#175245] hover:bg-[#f4faf7] transition-colors disabled:opacity-50"
                >
                  Save as Draft
                </button>

                {/* Preview Toggle */}
                <button
                  type="button"
                  onClick={() => setCreateTab((curr) => (curr === "editor" ? "preview" : "editor"))}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  {createTab === "editor" ? "Preview Article" : "Back to Editor"}
                </button>

                {/* Publish Button */}
                <button
                  type="button"
                  disabled={actionId !== null || !applicableForm}
                  onClick={handleInitiatePublish}
                  className="rounded-xl bg-[#1f6a58] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#185345] shadow-xs transition-colors disabled:opacity-50"
                >
                  Publish Article
                </button>
              </div>
            </footer>
          </section>
        </div>
      )}

      {/* CONFIRM PUBLICATION MODAL */}
      {confirmPublishOpen && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-[#06201c]/50 p-4"
          onClick={() => {
            if (!actionId) setConfirmPublishOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Confirm Publication"
        >
          <section
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center gap-2">
              <span className="rounded bg-teal-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-teal-900">
                Confirm Publication
              </span>
            </div>
            <h3 className="mt-2 text-xl font-bold text-[#06201c]">
              Publish Platform {createDraft.type} Immediately?
            </h3>

            {/* Post Summary Card */}
            <div className="mt-3 rounded-xl border border-[#edf3f0] bg-[#fbfdfc] p-3 text-xs space-y-1.5">
              <div>
                <span className="font-semibold text-slate-500">Title: </span>
                <span className="font-bold text-[#06201c]">{createDraft.title}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-500">Category: </span>
                <span className="font-bold text-[#175245]">{selectedCategoryName}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-500">Author: </span>
                <span className="font-bold text-slate-800">Super Admin (Platform)</span>
              </div>
            </div>

            {/* CRUCIAL RULE CALLOUT */}
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-950">
              <span className="font-bold block text-emerald-900 mb-1">
                Direct Super Admin Publishing Privilege
              </span>
              Super Admin does not need approval to publish platform content. This article will be published immediately and made live across all customer portals without entering the approval queue.
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={actionId !== null}
                onClick={() => setConfirmPublishOpen(false)}
                className="rounded-xl border border-[#d7e5df] px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Back to Editor
              </button>
              <button
                type="button"
                disabled={actionId !== null}
                onClick={() => void handleConfirmPublishImmediately()}
                className="rounded-xl bg-[#1f6a58] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#185345] shadow-xs transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {actionId === "publish-now" ? "Publishing Immediately..." : "Confirm & Publish Immediately"}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* VIEW POST MODAL / REDIRECT TO DETAILS */}
      {viewingPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#06201c]/40 p-4"
          onClick={() => {
            setViewingPost(null);
            router.replace("/blog-posts");
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Post details"
        >
          <section
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between border-b border-[#edf3f0] p-6">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${
                      viewingPost.type === "News"
                        ? "bg-sky-50 text-sky-800 border border-sky-200"
                        : viewingPost.type === "Blog & News"
                        ? "bg-purple-50 text-purple-800 border border-purple-200"
                        : "bg-teal-50 text-teal-800 border border-teal-200"
                    }`}
                  >
                    {viewingPost.type}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${
                      viewingPost.status === "Published"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : viewingPost.status === "Pending Approval"
                        ? "bg-blue-100 text-blue-800 border border-blue-200"
                        : viewingPost.status === "Rejected"
                        ? "bg-rose-100 text-rose-800 border border-rose-200"
                        : viewingPost.status === "Unpublished"
                        ? "bg-amber-100 text-amber-900 border border-amber-300"
                        : "bg-slate-100 text-slate-700 border border-slate-200"
                    }`}
                  >
                    {viewingPost.status}
                  </span>
                  {viewingPost.pinned && (
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-900 border border-amber-300">
                      Pinned
                    </span>
                  )}
                </div>
                <h2 className="mt-2 text-xl font-bold text-[#06201c]">{viewingPost.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setViewingPost(null);
                  router.replace("/blog-posts");
                }}
                className="rounded-lg px-2 py-1 text-sm font-semibold text-[#52736a] hover:bg-[#f4faf7]"
              >
                Close
              </button>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto p-6 text-sm">
              <dl className="grid gap-3 sm:grid-cols-2 rounded-xl bg-[#f8fbf9] p-4 text-xs">
                <div>
                  <dt className="font-semibold uppercase tracking-wider text-[#7f9d94]">Enterprise</dt>
                  <dd className="mt-0.5 font-bold text-[#06201c]">{viewingPost.enterprise}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-wider text-[#7f9d94]">Author</dt>
                  <dd className="mt-0.5 font-bold text-[#06201c]">{viewingPost.author}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-wider text-[#7f9d94]">Category</dt>
                  <dd className="mt-0.5 font-bold text-[#06201c]">{viewingPost.category}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-wider text-[#7f9d94]">Created At</dt>
                  <dd className="mt-0.5 font-bold text-[#06201c]">{formatDate(viewingPost.createdAt)}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-wider text-[#7f9d94]">Updated At</dt>
                  <dd className="mt-0.5 font-bold text-[#06201c]">{formatDate(viewingPost.updatedAt)}</dd>
                </div>
              </dl>

              {viewingPost.coverImageUrl && (
                <div className="overflow-hidden rounded-xl border border-[#edf3f0]">
                  <img
                    src={resolveImagePreviewUrl(viewingPost.coverImageUrl)}
                    alt={viewingPost.title}
                    className="max-h-56 w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
              )}

              {detailLoading ? (
                <div className="py-8 text-center text-xs text-[#52736a]">Loading full content...</div>
              ) : (
                <>
                  {viewingPost.summary && (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#7f9d94]">Summary</h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-[#365b52] bg-[#fbfdfc] p-3 rounded-xl border border-[#edf3f0]">
                        {viewingPost.summary}
                      </p>
                    </div>
                  )}

                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#7f9d94]">Content</h3>
                    <div
                      className="mt-1.5 rounded-xl border border-[#edf3f0] bg-[#fbfdfc] p-4 text-xs leading-relaxed text-slate-800 prose prose-sm max-w-none [&_p]:mb-2.5 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_li]:mb-1 [&_strong]:font-semibold [&_b]:font-semibold [&_i]:italic [&_em]:italic [&_u]:underline"
                      dangerouslySetInnerHTML={{
                        __html: renderContentHtml(viewingPost.content),
                      }}
                    />
                  </div>

                  {(() => {
                    if (!viewingPost.customFields) return null;
                    const customEntries = Object.entries(viewingPost.customFields).filter(
                      ([k, v]) =>
                        v !== "" &&
                        v !== null &&
                        v !== undefined &&
                        !isSystemFieldKey(k) &&
                        !k.startsWith("internal_") &&
                        !k.includes("admin_only") &&
                        !k.includes("private_"),
                    );

                    if (customEntries.length === 0) return null;

                    return (
                      <div className="pt-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#7f9d94]">
                          Additional Attributes
                        </h3>
                        <div className="mt-2 space-y-3">
                          {customEntries.map(([k, v]) => {
                            const fieldDef = viewingFieldMap.get(k);
                            const label = fieldDef?.label || friendlyFieldName(k);
                            const strVal = String(v ?? "");
                            const fieldType = fieldDef?.type ?? inferCustomFieldType(k);
                            const isHtml =
                              /<[a-z][\s\S]*>/i.test(strVal) ||
                              fieldType === "rich_text" ||
                              fieldType === "richtext";
                            const isImage = fieldType === "media_upload" || fieldType === "image" || fieldType === "image_list";
                            const isUrl =
                              !isHtml &&
                              !isImage &&
                              (strVal.startsWith("http://") || strVal.startsWith("https://"));

                            if (isHtml) {
                              return (
                                <div
                                  key={k}
                                  className="rounded-xl border border-[#edf3f0] bg-[#f8fbf9] p-3.5"
                                >
                                  <dt className="text-[10px] font-bold uppercase tracking-wider text-[#175245]">
                                    {label}
                                  </dt>
                                  <dd
                                    className="mt-1.5 text-xs leading-relaxed text-[#243c36] prose prose-sm max-w-none [&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-0.5 [&_strong]:font-semibold [&_b]:font-semibold [&_i]:italic [&_u]:underline"
                                    dangerouslySetInnerHTML={{
                                      __html: sanitizeRichText(strVal),
                                    }}
                                  />
                                </div>
                              );
                            }

                            if (isImage) {
                              const imageValues = Array.isArray(v) ? v : [v];
                              return (
                                <div key={k} className="rounded-xl border border-[#edf3f0] bg-[#f8fbf9] p-3">
                                  <dt className="text-[10px] font-bold uppercase tracking-wider text-[#175245]">{label}</dt>
                                  <dd className="mt-2 flex flex-wrap gap-2">
                                    {imageValues.map((item) => {
                                      const imageUrl = resolveImagePreviewUrl(String(item));
                                      return <a key={imageUrl} href={imageUrl} target="_blank" rel="noopener noreferrer"><img src={imageUrl} alt={label} className="h-20 w-20 rounded-lg border border-[#d7e5df] object-cover" /></a>;
                                    })}
                                  </dd>
                                </div>
                              );
                            }

                            if (isUrl) {
                              return (
                                <div
                                  key={k}
                                  className="rounded-xl border border-[#edf3f0] bg-[#f8fbf9] p-3"
                                >
                                  <dt className="text-[10px] font-bold uppercase tracking-wider text-[#175245]">
                                    {label}
                                  </dt>
                                  <dd className="mt-1 text-xs font-semibold text-[#1f6a58] truncate">
                                    <a
                                      href={strVal}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="hover:underline inline-flex items-center gap-1"
                                    >
                                      <span>{strVal}</span>
                                      <svg
                                        className="h-3 w-3 inline shrink-0"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        aria-hidden="true"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                        />
                                      </svg>
                                    </a>
                                  </dd>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={k}
                                className="rounded-xl border border-[#edf3f0] bg-[#f8fbf9] p-3"
                              >
                                <dt className="text-[10px] font-bold uppercase tracking-wider text-[#175245]">
                                  {label}
                                </dt>
                                <dd className="mt-1 text-xs font-medium text-slate-800 break-words whitespace-pre-wrap">
                                  {strVal}
                                </dd>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf3f0] p-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const post = viewingPost;
                    setViewingPost(null);
                    void handleOpenEdit(post);
                  }}
                  className="rounded-xl border border-[#1f6a58] px-3.5 py-2 text-xs font-semibold text-[#175245] hover:bg-[#f4faf7] transition-colors"
                >
                  Edit Post
                </button>
                {viewingPost.status === "Published" ? (
                  <button
                    type="button"
                    onClick={() => {
                      const post = viewingPost;
                      setViewingPost(null);
                      setUnpublishTargetPost(post);
                    }}
                    className="rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors"
                  >
                    Unpublish
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handlePublishExisting(viewingPost)}
                    className="rounded-xl bg-[#1f6a58] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#185345] transition-colors"
                  >
                    Publish
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void handlePinToggle(viewingPost)}
                  className="rounded-xl border border-[#d7e5df] px-3.5 py-2 text-xs font-semibold text-[#52736a] hover:bg-[#f4faf7] transition-colors"
                >
                  {viewingPost.pinned ? "Unpin" : "Pin"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const post = viewingPost;
                    setViewingPost(null);
                    setHistoryPost(post);
                  }}
                  className="rounded-xl border border-[#d7e5df] px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  View History
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setViewingPost(null);
                  router.replace("/blog-posts");
                }}
                className="rounded-xl border border-[#d7e5df] px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </footer>
          </section>
        </div>
      )}

      {/* EDIT POST MODAL */}
      {editingPost && (() => {
        const effectiveEditCoverUrl = editCoverPreviewUrl || resolveImagePreviewUrl(editDraft.coverImageUrl);
        const selectedEditCategoryName =
          categories.find((c) => c.id === editDraft.category)?.name || editingPost.category || "Uncategorized";

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#06201c]/40 p-4"
            onClick={() => {
              if (!actionId && !isCoverPreviewOpen) setEditingPost(null);
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Edit Platform Post"
          >
          <section
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden"
          >
            {/* Header with Editor / Preview tabs */}
            <header className="border-b border-[#edf3f0] p-5 pb-0 bg-white">
              <div className="flex items-start justify-between pb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#7f9d94]">
                    Super Admin Authoring · Edit Mode
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-[#06201c]">
                    Edit Platform {editDraft.type === "News" ? "News Bulletin" : "Blog Article"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingPost(null)}
                  className="rounded-xl border border-[#d7e5df] p-2 text-[#52736a] hover:bg-slate-50 transition-colors"
                  aria-label="Close edit dialog"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Compact status and schema info */}
              <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-[#52736a]">
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 font-medium text-teal-900">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Super Admin: direct publishing applies
                </span>
                {editApplicableForm ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-mono text-[10px] text-slate-600" title="Active form schema version">
                    Schema: {editApplicableForm.name} v{editApplicableForm.version}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-mono text-[10px] text-slate-600" title="Default editorial form schema">
                    Schema: Standard Editorial Form v1
                  </span>
                )}
              </div>

              {/* Tabs: Form Editor vs Customer Preview */}
              <div className="flex gap-4 border-b border-[#edf3f0]">
                <button
                  type="button"
                  onClick={() => setEditTab("editor")}
                  className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                    editTab === "editor"
                      ? "border-[#1f6a58] text-[#175245]"
                      : "border-transparent text-[#7f9d94] hover:text-[#06201c]"
                  }`}
                >
                  Article Form Editor
                </button>
                <button
                  type="button"
                  onClick={() => setEditTab("preview")}
                  className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                    editTab === "preview"
                      ? "border-[#1f6a58] text-[#175245]"
                      : "border-transparent text-[#7f9d94] hover:text-[#06201c]"
                  }`}
                >
                  Customer Article Preview
                </button>
              </div>
            </header>

            {/* TAB 1: EDIT FORM EDITOR */}
            {editTab === "editor" ? (
              <div className="flex-1 space-y-5 overflow-y-auto p-6 text-sm">
                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                    {error}
                  </div>
                )}

                {/* 1. CONTENT TYPE SELECTOR */}
                <div>
                  <span className="block text-xs font-bold uppercase tracking-wider text-[#52736a] mb-2">
                    Content Type
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditDraft({ ...editDraft, type: "Blog" });
                        setEditErrors({});
                      }}
                      className={`rounded-xl border p-3 text-left transition-all ${
                        editDraft.type === "Blog"
                          ? "border-[#1f6a58] bg-[#f4faf7] ring-2 ring-[#1f6a58]/20"
                          : "border-[#d7e5df] bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-[#06201c]">Blog Article</span>
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            editDraft.type === "Blog" ? "bg-[#1f6a58]" : "bg-slate-300"
                          }`}
                        />
                      </div>
                      <p className="mt-1 text-xs text-[#52736a]">
                        Clinical insights, wellness education, and healthcare guidance.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditDraft({ ...editDraft, type: "News" });
                        setEditErrors({});
                      }}
                      className={`rounded-xl border p-3 text-left transition-all ${
                        editDraft.type === "News"
                          ? "border-sky-600 bg-sky-50/60 ring-2 ring-sky-600/20"
                          : "border-[#d7e5df] bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-[#06201c]">News Bulletin</span>
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            editDraft.type === "News" ? "bg-sky-600" : "bg-slate-300"
                          }`}
                        />
                      </div>
                      <p className="mt-1 text-xs text-[#52736a]">
                        Platform announcements, medical bulletins, and company releases.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditDraft({ ...editDraft, type: "Blog & News" });
                        setEditErrors({});
                      }}
                      className={`rounded-xl border p-3 text-left transition-all ${
                        editDraft.type === "Blog & News"
                          ? "border-purple-600 bg-purple-50/60 ring-2 ring-purple-600/20"
                          : "border-[#d7e5df] bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-[#06201c]">Blog &amp; News</span>
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            editDraft.type === "Blog & News" ? "bg-purple-600" : "bg-slate-300"
                          }`}
                        />
                      </div>
                      <p className="mt-1 text-xs text-[#52736a]">
                        Hybrid content published across both blog and news channels.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Warning when no active form is configured for the chosen type */}
                {!editApplicableForm && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950 flex items-start justify-between gap-3" role="alert">
                    <div className="flex items-start gap-2.5">
                      <svg
                        className="h-5 w-5 text-amber-600 shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                      <div>
                        <p className="text-sm font-bold text-amber-900">
                          There is no active form configured for {editDraft.type === "News" ? "News" : editDraft.type === "Blog & News" ? "Blog & News" : "Blog"}.
                        </p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          Activate a template for this type in Form Builder to enable editing.
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/blog-forms"
                      className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-50 shadow-xs shrink-0"
                    >
                      Configure Forms
                    </Link>
                  </div>
                )}

                {/* 2. CORE DETAILS */}
                <div className="space-y-4 rounded-xl border border-[#edf3f0] bg-[#fbfdfc] p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#175245]">
                    {editDraft.type === "News" ? "News Bulletin Details" : editDraft.type === "Blog & News" ? "Blog & News Details" : "Blog Article Details"}
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="block text-xs font-bold uppercase tracking-wider text-[#52736a]">
                        Category <span className="text-red-600">*</span>
                      </span>
                      <select
                        value={editDraft.category}
                        onChange={(e) => {
                          setEditDraft({ ...editDraft, category: e.target.value });
                          if (editErrors.category) {
                            setEditErrors((prev) => ({ ...prev, category: "" }));
                          }
                        }}
                        className={`mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 text-sm ${
                          editErrors.category ? "border-red-400 bg-red-50/30" : "border-[#d7e5df]"
                        }`}
                      >
                        <option value="">Select a category</option>
                        {Boolean(
                          editDraft.category &&
                            !categories.some((c) => c.id === editDraft.category),
                        ) && (
                          <option value={editDraft.category} disabled>
                            {editingPost?.category || "Current Category"} (Inactive)
                          </option>
                        )}
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      {editErrors.category && (
                        <p className="mt-1 text-xs text-red-600 font-medium">{editErrors.category}</p>
                      )}
                    </label>

                    <label className="block">
                      <div className="flex items-center justify-between">
                        <span className="block text-xs font-bold uppercase tracking-wider text-[#52736a]">
                          {editDraft.type === "News" ? "News Tags / Keywords" : "Tags / Keywords"}
                        </span>
                        <span className="text-[10px] text-[#7f9d94]">Comma separated</span>
                      </div>
                      <input
                        value={editDraft.tags}
                        onChange={(e) => setEditDraft({ ...editDraft, tags: e.target.value })}
                        placeholder={
                          editDraft.type === "News"
                            ? "e.g. Announcement, FDA, Advisory, Expansion"
                            : "e.g. Clinical, Cardiology, Wellness"
                        }
                        className="mt-1.5 w-full rounded-xl border border-[#d7e5df] px-3.5 py-2.5 text-sm"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="block text-xs font-bold uppercase tracking-wider text-[#52736a]">
                      {editDraft.type === "News" ? "News Headline" : "Article Title"} <span className="text-red-600">*</span>
                    </span>
                    <input
                      value={editDraft.title}
                      onChange={(e) => {
                        setEditDraft({ ...editDraft, title: e.target.value });
                        if (editErrors.title) {
                          setEditErrors((prev) => ({ ...prev, title: "" }));
                        }
                      }}
                      placeholder={
                        editDraft.type === "News"
                          ? "e.g. Invigorate Health Expands Regional Diagnostic Center Network"
                          : "e.g. Advancements in Preventative Diagnostic Healthcare"
                      }
                      className={`mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-sm ${
                        editErrors.title ? "border-red-400 bg-red-50/30" : "border-[#d7e5df]"
                      }`}
                    />
                    {editErrors.title && (
                      <p className="mt-1 text-xs text-red-600 font-medium">{editErrors.title}</p>
                    )}
                  </label>

                  <label className="block">
                    <span className="block text-xs font-bold uppercase tracking-wider text-[#52736a]">
                      {editDraft.type === "News" ? "Bulletin Summary / Lead Paragraph" : "Summary / Excerpt"} <span className="text-red-600">*</span>
                    </span>
                    <textarea
                      value={editDraft.summary}
                      onChange={(e) => {
                        setEditDraft({ ...editDraft, summary: e.target.value });
                        if (editErrors.summary) {
                          setEditErrors((prev) => ({ ...prev, summary: "" }));
                        }
                      }}
                      rows={3}
                      placeholder={
                        editDraft.type === "News"
                          ? "A concise, high-impact summary for news feeds and press bulletins..."
                          : "A clear, compelling summary rendered on directory cards and previews..."
                      }
                      className={`mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-sm ${
                        editErrors.summary ? "border-red-400 bg-red-50/30" : "border-[#d7e5df]"
                      }`}
                    />
                    {editErrors.summary && (
                      <p className="mt-1 text-xs text-red-600 font-medium">{editErrors.summary}</p>
                    )}
                  </label>

                  {/* Cover Image Banner */}
                  <div className="space-y-2">
                    <span className="block text-xs font-bold uppercase tracking-wider text-[#52736a]">
                      {editDraft.type === "News" ? "News Cover Banner / Press Photo" : "Cover Image Banner"}
                    </span>
                    {editDraft.coverImageUrl ? (
                      <div className="relative overflow-hidden rounded-xl border border-[#d7e5df] bg-slate-50 p-2.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={effectiveEditCoverUrl}
                            alt="Cover thumbnail"
                            className="h-14 w-20 rounded-lg object-cover border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setIsCoverPreviewOpen(true)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">
                              {editDraft.coverImageUrl.startsWith("data:")
                                ? "Image asset ready for publication"
                                : editDraft.coverImageUrl}
                            </p>
                            <p className="text-[11px] text-[#7f9d94]">Cover banner attached</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setIsCoverPreviewOpen(true)}
                              className="rounded-lg border border-[#1f6a58] bg-white px-3 py-1.5 text-xs font-semibold text-[#175245] hover:bg-[#f4faf7] transition-colors inline-flex items-center gap-1.5 shadow-xs"
                              aria-label="Preview cover image"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              <span>Preview</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCoverImageFailed(false);
                                setEditCoverPreviewUrl("");
                                setEditDraft((curr) => ({ ...curr, coverImageUrl: "" }));
                              }}
                              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
                              aria-label="Remove cover image"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-[#d7e5df] bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors">
                          <svg className="h-4 w-4 text-[#1f6a58]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{isUploadingEditCover ? "Uploading asset..." : "Upload Image"}</span>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={isUploadingEditCover}
                            onChange={(e) => void handleEditCoverUpload(e)}
                            className="sr-only"
                          />
                        </label>
                        <span className="text-xs text-slate-400">or</span>
                        <input
                          value={editDraft.coverImageUrl}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCoverImageFailed(false);
                            setEditCoverPreviewUrl(val);
                            setEditDraft((curr) => ({ ...curr, coverImageUrl: val }));
                          }}
                          placeholder="Paste image URL (https://...)"
                          className="flex-1 min-w-[200px] rounded-xl border border-[#d7e5df] px-3.5 py-2 text-xs focus:border-[#1f6a58] focus:outline-hidden"
                        />
                      </div>
                    )}
                    <span className="block text-[11px] text-[#7f9d94]">
                      Cover banner asset displayed at the top of customer articles.
                    </span>
                    {isCoverPreviewOpen && editDraft.coverImageUrl ? (
                      <div
                        className="fixed inset-0 z-70 flex items-center justify-center bg-[#06201c]/70 p-4 backdrop-blur-xs"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Cover Image Preview"
                        onClick={() => setIsCoverPreviewOpen(false)}
                      >
                        <div
                          className="relative max-h-[92vh] max-w-4xl w-full overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col border border-[#edf3f0]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between border-b border-[#edf3f0] px-5 py-4 bg-[#fbfdfc]">
                            <div className="flex items-center gap-2.5">
                              <span className="h-2 w-2 rounded-full bg-[#1f6a58]" />
                              <h3 className="text-sm font-bold text-[#06201c]">Cover Image Preview</h3>
                              <span className="text-xs text-[#7f9d94]">· Full Resolution</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setIsCoverPreviewOpen(false)}
                              className="rounded-xl border border-[#d7e5df] bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 shadow-xs"
                              aria-label="Close image preview"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              <span>Close</span>
                            </button>
                          </div>
                          <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-900/5">
                            <img
                              src={effectiveEditCoverUrl}
                              alt="Cover full preview"
                              className="max-h-[72vh] w-auto max-w-full rounded-xl object-contain shadow-md border border-slate-200 bg-white"
                            />
                          </div>
                          <div className="border-t border-[#edf3f0] px-5 py-3 bg-white flex items-center justify-between">
                            <span className="text-xs text-[#52736a] truncate max-w-md">
                              {editDraft.coverImageUrl.startsWith("data:")
                                ? "Embedded image asset"
                                : editDraft.coverImageUrl}
                            </span>
                            <button
                              type="button"
                              onClick={() => setIsCoverPreviewOpen(false)}
                              className="rounded-xl bg-[#1f6a58] px-4 py-2 text-xs font-semibold text-white hover:bg-[#185345] transition-colors"
                            >
                              Close Preview
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* 3. MAIN BODY */}
                <div className="space-y-2 rounded-xl border border-[#edf3f0] bg-[#fbfdfc] p-4">
                  <span className="block text-xs font-bold uppercase tracking-wider text-[#175245]">
                    {editDraft.type === "News" ? "Bulletin Content / Announcement Body" : "Article Content Body"} <span className="text-red-600">*</span>
                  </span>
                  <textarea
                    value={editDraft.content}
                    onChange={(e) => {
                      setEditDraft({ ...editDraft, content: e.target.value });
                      if (editErrors.content) {
                        setEditErrors((prev) => ({ ...prev, content: "" }));
                      }
                    }}
                    rows={10}
                    placeholder={
                      editDraft.type === "News"
                        ? "Write the complete announcement, press release, or bulletin..."
                        : "Write the complete article content here (paragraphs, subsections, clinical notes)..."
                    }
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-sm ${
                      editErrors.content ? "border-red-400 bg-red-50/30" : "border-[#d7e5df]"
                    }`}
                  />
                  {editErrors.content && (
                    <p className="text-xs text-red-600 font-medium">{editErrors.content}</p>
                  )}
                </div>

                {/* 4. HIGH PRIORITY NEWS FLAG */}
                {editDraft.type === "News" ? (
                  <label className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50/60 p-3.5 cursor-pointer transition-colors hover:bg-sky-50">
                    <input
                      type="checkbox"
                      checked={editDraft.customFields.is_urgent === "true"}
                      onChange={(e) =>
                        setEditDraft({
                          ...editDraft,
                          customFields: {
                            ...editDraft.customFields,
                            is_urgent: e.target.checked ? "true" : "false",
                          },
                        })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    <div>
                      <span className="block text-xs font-bold text-[#06201c]">
                        Flag as High Priority / Urgent News Announcement
                      </span>
                      <span className="block text-[11px] text-[#52736a]">
                        Displays an Urgent Bulletin badge on customer news feeds and previews
                      </span>
                    </div>
                  </label>
                ) : null}

                {/* 5. DYNAMIC CUSTOM FIELDS */}
                {editFormCustomFields.length > 0 && (
                  <div className="space-y-4 rounded-xl border border-teal-100 bg-teal-50/30 p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-teal-950">
                        Additional Form Fields ({editApplicableForm?.name})
                      </h3>
                      <span className="text-[11px] text-teal-800">
                        Configured Form Schema
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {editFormCustomFields.map((field) => (
                        <label key={field.id} className="block">
                          <span className="block text-xs font-bold uppercase tracking-wider text-[#52736a]">
                            {field.label} {field.required && <span className="text-red-600">*</span>}
                          </span>
                          {field.type === "media_upload" || field.type === "image" || field.type === "image_list" || field.type === "file_upload" || field.type === "document" ? (
                            <div className="mt-1 rounded-xl border border-dashed border-[#b6dfce] bg-white p-3">
                              <input
                                type="file"
                                multiple={field.type === "media_upload" || field.type === "image" || field.type === "image_list"}
                                accept={field.type === "media_upload" || field.type === "image" || field.type === "image_list" ? "image/jpeg,image/png,image/webp,image/gif" : ".pdf,.doc,.docx,.zip"}
                                onChange={(event) => void handleCustomFieldUpload(event, field, "edit")}
                                className="block w-full text-xs text-[#52736a]"
                              />
                              {editDraft.customFields[field.key] ? <p className="mt-2 truncate text-[11px] text-[#52736a]">{field.type === "file_upload" || field.type === "document" ? "Document attached" : "Image attached"}</p> : null}
                            </div>
                          ) : field.type === "textarea" ? (
                            <textarea
                              value={editDraft.customFields[field.key] || ""}
                              onChange={(e) =>
                                setEditDraft({
                                  ...editDraft,
                                  customFields: {
                                    ...editDraft.customFields,
                                    [field.key]: e.target.value,
                                  },
                                })
                              }
                              rows={2}
                              placeholder={field.placeholder || `Enter ${field.label}...`}
                              className={`mt-1 w-full rounded-xl border bg-white px-3 py-2 text-xs ${
                                editErrors[field.key] ? "border-red-400 bg-red-50/30" : "border-[#d7e5df]"
                              }`}
                            />
                          ) : field.type === "dropdown" && typeof field.validation?.options === "string" ? (
                            <select
                              value={editDraft.customFields[field.key] || ""}
                              onChange={(e) =>
                                setEditDraft({
                                  ...editDraft,
                                  customFields: {
                                    ...editDraft.customFields,
                                    [field.key]: e.target.value,
                                  },
                                })
                              }
                              className={`mt-1 w-full rounded-xl border bg-white px-3 py-2 text-xs ${
                                editErrors[field.key] ? "border-red-400 bg-red-50/30" : "border-[#d7e5df]"
                              }`}
                            >
                              <option value="">Select an option</option>
                              {field.validation.options.split(",").map((opt: string) => {
                                const trimmed = opt.trim();
                                return (
                                  <option key={trimmed} value={trimmed}>
                                    {trimmed}
                                  </option>
                                );
                              })}
                            </select>
                          ) : (
                            <input
                              type={field.type === "number" ? "number" : "text"}
                              value={editDraft.customFields[field.key] || ""}
                              onChange={(e) =>
                                setEditDraft({
                                  ...editDraft,
                                  customFields: {
                                    ...editDraft.customFields,
                                    [field.key]: e.target.value,
                                  },
                                })
                              }
                              placeholder={field.placeholder || `Enter ${field.label}...`}
                              className={`mt-1 w-full rounded-xl border bg-white px-3 py-2 text-xs ${
                                editErrors[field.key] ? "border-red-400 bg-red-50/30" : "border-[#d7e5df]"
                              }`}
                            />
                          )}
                          {editErrors[field.key] && (
                            <p className="mt-1 text-xs text-red-600 font-medium">
                              {editErrors[field.key]}
                            </p>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* TAB 2: EDIT CUSTOMER ARTICLE PREVIEW */
              <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6 text-sm bg-[#f8faf9]">
                {/* Viewport Control Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#d7e5df] bg-white px-4 py-2.5 shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-semibold text-[#175245]">
                      Live Customer Preview (Editing)
                    </span>
                    <span className="text-xs text-[#7f9d94]">
                      · How readers will see this updated {editDraft.type.toLowerCase()}
                    </span>
                  </div>

                  {/* Desktop / Mobile Switcher */}
                  <div className="inline-flex items-center rounded-lg border border-[#d7e5df] bg-[#fbfdfc] p-0.5 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setPreviewViewport("desktop")}
                      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 transition-all ${
                        previewViewport === "desktop"
                          ? "bg-[#1f6a58] text-white shadow-xs"
                          : "text-[#52736a] hover:text-[#06201c]"
                      }`}
                    >
                      <span>Desktop View</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewViewport("mobile")}
                      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 transition-all ${
                        previewViewport === "mobile"
                          ? "bg-[#1f6a58] text-white shadow-xs"
                          : "text-[#52736a] hover:text-[#06201c]"
                      }`}
                    >
                      <span>Mobile App View</span>
                    </button>
                  </div>
                </div>

                {/* Reader Container */}
                <div
                  className={`transition-all duration-200 ${
                    previewViewport === "mobile"
                      ? "mx-auto max-w-sm rounded-3xl border-4 border-slate-700 bg-white shadow-2xl p-4 sm:p-5"
                      : "rounded-2xl border border-[#dfe9e4] bg-white p-6 sm:p-8 shadow-xs"
                  }`}
                >
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                        editDraft.type === "News"
                          ? "bg-sky-50 text-sky-800 border border-sky-200"
                          : "bg-teal-50 text-teal-800 border border-teal-200"
                      }`}
                    >
                      {editDraft.type === "News" ? "News Bulletin" : "Blog Article"}
                    </span>
                    {editDraft.customFields.is_urgent === "true" && (
                      <span className="rounded px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300">
                        Urgent Bulletin
                      </span>
                    )}
                    <span className="rounded-full bg-[#f1f6f3] px-3 py-0.5 text-xs font-semibold text-[#175245] border border-[#d7e5df]">
                      {selectedEditCategoryName}
                    </span>
                    {editDraft.customFields.specialty_focus && (
                      <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-800 border border-teal-200">
                        {editDraft.customFields.specialty_focus}
                      </span>
                    )}
                  </div>

                  {/* Cover Banner */}
                  {effectiveEditCoverUrl && !coverImageFailed ? (
                    <div className="relative mt-4 group overflow-hidden rounded-2xl border border-[#edf3f0] shadow-xs">
                      <img
                        src={effectiveEditCoverUrl}
                        alt={editDraft.title || "Cover banner"}
                        className="max-h-72 w-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-[1.01]"
                        onClick={() => setIsCoverPreviewOpen(true)}
                        onError={() => setCoverImageFailed(true)}
                      />
                      <button
                        type="button"
                        onClick={() => setIsCoverPreviewOpen(true)}
                        className="absolute bottom-3 right-3 rounded-xl bg-black/60 backdrop-blur-xs px-3 py-1.5 text-xs font-semibold text-white hover:bg-black/80 transition-colors inline-flex items-center gap-1.5 opacity-90 hover:opacity-100 shadow-sm"
                        aria-label="Preview full resolution image"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>Preview Full Image</span>
                      </button>
                    </div>
                  ) : null}

                  {/* Title */}
                  <h1 className="mt-4 text-2xl sm:text-3xl font-bold tracking-tight text-[#06201c] leading-tight">
                    {editDraft.title ? (
                      editDraft.title
                    ) : (
                      <span className="text-slate-400 font-normal italic">
                        Untitled Article
                      </span>
                    )}
                  </h1>

                  {/* Metadata */}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#52736a] border-b border-[#edf3f0] pb-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1f6a58] text-[10px] font-bold text-white uppercase">
                        IH
                      </div>
                      <span className="font-semibold text-[#06201c]">
                        {editingPost.enterprise}
                      </span>
                    </div>
                    <span>·</span>
                    <span>Author: <strong>{editingPost.author}</strong></span>
                    {editDraft.customFields.news_source && (
                      <>
                        <span>·</span>
                        <span className="font-medium text-[#06201c]">Wire: {editDraft.customFields.news_source}</span>
                      </>
                    )}
                    {editDraft.customFields.target_audience && (
                      <>
                        <span>·</span>
                        <span className="text-[#52736a]">For: {editDraft.customFields.target_audience}</span>
                      </>
                    )}
                    <span>·</span>
                    <span>
                      {Math.max(
                        1,
                        Math.ceil((editDraft.content || "").split(/\s+/).filter(Boolean).length / 200),
                      )}{" "}
                      min read
                    </span>
                  </div>

                  {/* Tags */}
                  {editDraft.tags.trim() && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {editDraft.tags
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean)
                        .map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-[#f1f6f3] text-[#365b52] px-2.5 py-0.5 text-[11px] font-semibold border border-[#d7e5df]"
                          >
                            #{tag}
                          </span>
                        ))}
                    </div>
                  )}

                  {/* Summary */}
                  {editDraft.summary ? (
                    <div className="mt-5 rounded-2xl border-l-4 border-[#1f6a58] bg-[#f4faf7] p-4 text-sm font-medium leading-relaxed text-[#175245] shadow-xs">
                      {editDraft.summary}
                    </div>
                  ) : (
                    <div className="mt-5 rounded-xl border border-dashed border-[#d7e5df] bg-[#fbfdfc] p-3 text-xs italic text-[#7f9d94]">
                      No summary excerpt provided.
                    </div>
                  )}

                  {/* Content Body */}
                  {editDraft.content ? (
                    <div
                      className="mt-6 text-sm sm:text-base leading-relaxed text-[#243c36] prose prose-sm max-w-none [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_li]:mb-1 [&_strong]:font-semibold [&_b]:font-semibold [&_i]:italic [&_em]:italic [&_u]:underline"
                      dangerouslySetInnerHTML={{
                        __html: renderContentHtml(editDraft.content),
                      }}
                    />
                  ) : (
                    <div className="mt-6 rounded-2xl border border-dashed border-[#d7e5df] bg-[#fbfdfc] p-8 text-center text-xs text-[#7f9d94]">
                      Article content is empty.
                    </div>
                  )}

                  {/* Customer-Visible Custom Fields */}
                  {(() => {
                    const customerVisibleEntries = Object.entries(editDraft.customFields).filter(
                      ([k, v]) =>
                        v !== "" &&
                        v !== null &&
                        v !== undefined &&
                        !isSystemFieldKey(k) &&
                        !k.startsWith("internal_") &&
                        !k.includes("admin") &&
                        !k.includes("private_"),
                    );
                    if (customerVisibleEntries.length === 0) return null;

                    return (
                      <div className="mt-8 border-t border-[#edf3f0] pt-6">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#175245] mb-3">
                          Article Information &amp; References
                        </h4>
                        <dl className="grid gap-3 sm:grid-cols-2 text-xs">
                          {customerVisibleEntries.map(([k, v]) => {
                            const strVal = String(v);
                            const isUrl = strVal.startsWith("http://") || strVal.startsWith("https://");
                            return (
                              <div
                                key={k}
                                className="rounded-xl bg-[#f8fbf9] p-3 border border-[#edf3f0]"
                              >
                                <dt className="text-[10px] uppercase font-bold text-[#7f9d94]">
                                  {k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                                </dt>
                                <dd className="mt-1 font-semibold text-[#06201c] break-all">
                                  {isUrl ? (
                                    <a
                                      href={strVal}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[#1f6a58] hover:underline inline-flex items-center gap-1 font-semibold"
                                    >
                                      <span>{strVal}</span>
                                    </a>
                                  ) : (
                                    strVal
                                  )}
                                </dd>
                              </div>
                            );
                          })}
                        </dl>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* ACTION FOOTER */}
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf3f0] p-4 bg-white">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={actionId !== null}
                  onClick={() => setEditingPost(null)}
                  className="rounded-xl border border-[#d7e5df] px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Preview Toggle */}
                <button
                  type="button"
                  onClick={() => setEditTab((curr) => (curr === "editor" ? "preview" : "editor"))}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  {editTab === "editor" ? "Preview Article" : "Back to Editor"}
                </button>

                {/* Save Changes */}
                <button
                  type="button"
                  disabled={actionId !== null || !editApplicableForm}
                  onClick={() => void handleEditSubmit(false)}
                  className="rounded-xl border border-[#1f6a58] px-4 py-2.5 text-xs font-semibold text-[#175245] hover:bg-[#f4faf7] transition-colors disabled:opacity-50"
                >
                  Save Changes
                </button>

                {/* Save & Publish if currently a Draft */}
                {editingPost.status !== "Published" && (
                  <button
                    type="button"
                    disabled={actionId !== null || !editApplicableForm}
                    onClick={() => void handleEditSubmit(true)}
                    className="rounded-xl bg-[#1f6a58] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#185345] shadow-xs transition-colors disabled:opacity-50"
                  >
                    Save &amp; Publish
                  </button>
                )}
              </div>
            </footer>
          </section>
        </div>
        );
      })()}

      {/* VIEW HISTORY & AUDIT TRAIL MODAL */}
      {historyPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#06201c]/40 p-4"
          onClick={() => setHistoryPost(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Post History"
        >
          <section
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between border-b border-[#edf3f0] p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#7f9d94]">
                  Audit Trail
                </p>
                <h2 className="mt-1 text-xl font-bold text-[#06201c]">History &amp; Actions</h2>
                <p className="mt-1 text-xs text-[#52736a] line-clamp-1">{historyPost.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryPost(null)}
                className="rounded-lg px-2 py-1 text-sm font-semibold text-[#52736a] hover:bg-[#f4faf7]"
              >
                Close
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 text-sm">
              {historyLoading ? (
                <div className="py-12 text-center text-xs text-[#52736a]">
                  Loading audit events...
                </div>
              ) : historyItems.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#52736a]">
                  No historical entries recorded for this post.
                </div>
              ) : (
                <div className="space-y-4">
                  {historyItems.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="relative rounded-xl border border-[#edf3f0] bg-[#fbfdfc] p-4 text-xs transition-colors hover:border-[#d7e5df]"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-teal-100 px-2 py-0.5 font-bold uppercase tracking-wider text-teal-900">
                            {item.action}
                          </span>
                          {item.from_status && item.to_status && (
                            <span className="text-slate-600">
                              <span className="font-semibold capitalize">{item.from_status}</span>
                              <span className="mx-1 text-slate-400">&rarr;</span>
                              <span className="font-semibold capitalize text-[#175245]">{item.to_status}</span>
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-medium text-[#7f9d94]">
                          {formatDate(item.created_at)}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between text-slate-700">
                        <span className="font-medium">
                          By: <strong>{item.actor_name}</strong>
                          <span className="ml-1 text-slate-500">
                            ({item.actor_role === "platform_super_admin" ? "Platform Admin" : "Enterprise Admin"})
                          </span>
                        </span>
                      </div>

                      {item.reason && (
                        <p className="mt-2 rounded-lg bg-[#f4faf7] p-2.5 text-xs text-[#365b52] border border-[#d7e5df]/60">
                          <strong>Note:</strong> {item.reason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <footer className="flex justify-end border-t border-[#edf3f0] p-4">
              <button
                type="button"
                onClick={() => setHistoryPost(null)}
                className="rounded-xl border border-[#d7e5df] px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
            </footer>
          </section>
        </div>
      )}

      {/* UNPUBLISH REASON MODAL */}
      {unpublishTargetPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#06201c]/40 p-4"
          onClick={() => {
            if (!actionId) setUnpublishTargetPost(null);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Unpublish Post"
        >
          <section
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-[#06201c]">Unpublish Article</h3>
            <p className="mt-2 text-xs leading-relaxed text-[#52736a]">
              Are you sure you want to unpublish <strong>“{unpublishTargetPost.title}”</strong>? It will immediately be hidden from customer portals and returned to an unpublished state.
            </p>

            <label className="mt-4 block text-xs font-bold uppercase tracking-wider text-[#52736a]">
              Reason for Taking Down Post <span className="text-rose-600">*</span>
              <textarea
                value={unpublishReason}
                onChange={(e) => {
                  setUnpublishReason(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Explain why this post is being taken down (minimum 3 to 500 characters)..."
                rows={3}
                maxLength={500}
                aria-required="true"
                className="mt-1.5 w-full rounded-xl border border-[#d7e5df] p-3 text-xs text-slate-800 focus:border-[#1f6a58] focus:ring-1 focus:ring-[#1f6a58]"
              />
            </label>
            <div className="mt-1 flex items-center justify-between text-[11px] text-[#52736a]">
              <span>
                {unpublishReason.trim().length > 0 && unpublishReason.trim().length < 3 ? (
                  <span className="text-rose-600 font-medium">Minimum 3 characters required.</span>
                ) : (
                  <span>A reason (3–500 characters) is required to notify the author.</span>
                )}
              </span>
              <span className={unpublishReason.trim().length > 500 ? "text-rose-600 font-bold" : "text-[#7f9d94]"}>
                {unpublishReason.trim().length} / 500
              </span>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={actionId !== null}
                onClick={() => {
                  setUnpublishTargetPost(null);
                  setUnpublishReason("");
                }}
                className="rounded-xl border border-[#d7e5df] px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionId !== null || unpublishReason.trim().length < 3 || unpublishReason.trim().length > 500}
                onClick={() => void handleConfirmUnpublish()}
                className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                {actionId ? "Taking Down..." : "Confirm Take Down"}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTargetPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#06201c]/40 p-4"
          onClick={() => {
            if (!actionId) setDeleteTargetPost(null);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Delete Post"
        >
          <section
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-red-700">Delete Post</h3>
            <p className="mt-2 text-xs leading-relaxed text-[#52736a]">
              Are you sure you want to delete <strong>“{deleteTargetPost.title}”</strong>?
              This will permanently remove the article. This action cannot be undone.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={actionId !== null}
                onClick={() => setDeleteTargetPost(null)}
                className="rounded-xl border border-[#d7e5df] px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionId !== null}
                onClick={() => void handleConfirmDelete()}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {actionId ? "Deleting..." : "Delete Post"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
