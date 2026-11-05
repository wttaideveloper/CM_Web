"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BlogConfirmationModal } from "./BlogConfirmationModal";
import { useCurrentEnterprise } from "@ihp/enterprise-runtime";
import {
  createMyBlogPost,
  isBlogModuleEnabled,
  deleteMyBlogPost,
  getAdminBlogFormVersion,
  getMyBlogForm,
  getMyBlogPost,
  listBlogCategories,
  listMyBlogPosts,
  submitMyBlogPost,
  unpublishMyBlogPost,
  updateMyBlogPost,
  uploadBlogAsset,
  sanitizeBlogPostHtml,
  plainTextFromHtml,
  type BlogCategory,
  type BlogCustomFieldValue,
  type BlogForm,
  type BlogLinkedEntity,
  type BlogModuleKey,
  type BlogManageItem,
  type BlogPostFields,
  type BlogKind,
} from "@ihp/shared";

type PostType = BlogKind;
const postTypeLabel = (value: PostType): string =>
  value === "both" ? "Blog & News" : value === "blog" ? "Blog" : "News";
type PostStatus =
  | "draft"
  | "pending_review"
  | "changes_requested"
  | "rejected"
  | "published"
  | "unpublished";
type PostFields = BlogPostFields;
type AuthoringContext = {
  module: "events" | "trainings" | "products" | "services";
  entityId: string;
  entityTitle: string;
};

const AUTHORING_CONTEXT_LABELS: Record<AuthoringContext["module"], string> = {
  events: "Event",
  trainings: "Training",
  products: "Product",
  services: "Service",
};

const MAX_BLOG_TAG_LENGTH = 30;

function isAuthoringModule(value: unknown): value is AuthoringContext["module"] {
  return value === "events" || value === "trainings" || value === "products" || value === "services";
}
type Post = PostFields & {
  id: string;
  status: PostStatus;
  createdAt: string;
  updatedAt: string;
  author: string;
  enterprise: string;
  pinned: boolean;
  feedback?: string;
  liveVersion?: PostFields;
  enterpriseId: string | null;
  tenantId: string | null;
  version?: number;
  module?: BlogModuleKey | null;
  linkedEntity?: BlogLinkedEntity | null;
};

const EMPTY_FORM: PostFields = {
  type: "blog",
  title: "",
  summary: "",
  content: "",
  category: "",
  coverImageUrl: "",
  tags: "",
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
  const normalized = /^\d{4}-\d{2}-\d{2}T/.test(value) && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? `${value}Z` : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
const SYSTEM_FIELD_KEYS = new Set([
  "title",
  "post_title_slug",
  "excerpt",
  "short_summary",
  "content",
  "article_content",
  "category",
  "category_id",
  "cover_image",
  "cover_image_url",
  "cover_image_file",
  "post_type",
  "tags",
  "article_tags",
]);

function sanitizeRichText(value: string): string {
  if (typeof window === "undefined" || !value) return value;
  const documentFragment = new DOMParser().parseFromString(value, "text/html");
  documentFragment.querySelectorAll("script, style, iframe, object, embed").forEach((node) => node.remove());
  documentFragment.querySelectorAll("*").forEach((node) => {
    Array.from(node.attributes).forEach((attribute) => {
      if (attribute.name.toLowerCase().startsWith("on")) node.removeAttribute(attribute.name);
      if (["href", "src"].includes(attribute.name.toLowerCase()) && attribute.value.trim().toLowerCase().startsWith("javascript:")) {
        node.removeAttribute(attribute.name);
      }
    });
  });
  return documentFragment.body.innerHTML;
}

function plainTextFromRichText(value: string): string {
  if (!value) return "";
  if (typeof window === "undefined") return value.replace(/<[^>]*>/g, " ");
  const parsed = new DOMParser().parseFromString(value, "text/html");
  return parsed.body.textContent ?? "";
}

function previewRichTextHtml(value: string, fallback: string): string {
  return sanitizeRichText(value || `<p>${fallback}</p>`);
}

function getRenderableBlogAssetUrl(value: string): string {
  if (typeof window === "undefined" || !value) return value;
  try {
    const parsed = new URL(value, window.location.origin);
    if (parsed.pathname.startsWith("/api/v1/cms/blogs/") && parsed.origin !== window.location.origin) {
      return `${window.location.origin}${parsed.pathname}${parsed.search}`;
    }
  } catch {
    return value;
  }
  return value;
}

function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeightClass = "min-h-[132px]",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  minHeightClass?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = sanitizeRichText(value);
    }
  }, [value]);

  const applyFormat = (command: string, commandValue?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    if (editorRef.current) onChange(sanitizeRichText(editorRef.current.innerHTML));
  };

  return (
    <div className="mt-1.5 overflow-hidden rounded-xl border border-[#d7e5df] bg-white focus-within:border-teal-600">
      <div className="flex flex-wrap items-center gap-1 border-b border-[#e7efeb] bg-[#f7faf8] px-2.5 py-2">
        {[
          ["Bold", "bold", "B"],
          ["Italic", "italic", "I"],
          ["Underline", "underline", "U"],
        ].map(([label, command, text, commandValue]) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyFormat(command, commandValue)}
            className="rounded-md border border-[#d7e5df] bg-white px-2 py-1 text-xs font-semibold text-[#365b52] transition-colors hover:bg-[#e8f4ee]"
          >
            {text}
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-multiline="true"
        spellCheck={false}
        data-placeholder={placeholder}
        suppressContentEditableWarning
        onInput={(event) => onChange(sanitizeRichText(event.currentTarget.innerHTML))}
        className={`${minHeightClass} px-3 py-3 text-sm leading-6 text-slate-800 outline-none empty:before:pointer-events-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)]`}
      />
    </div>
  );
}

/** Enterprise Admin workspace for authoring, submitting, and managing Blog and News posts. */
export default function EnterpriseMyBlogsScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedEditId = searchParams.get("edit");
  const contextualModule = searchParams.get("context_module") as AuthoringContext["module"] | null;
  const contextualEntityId = searchParams.get("context_entity_id");
  const contextualEntityTitle = searchParams.get("context_entity_title");
  const autoOpenedEditId = useRef<string | null>(null);
  const autoOpenedContext = useRef<string | null>(null);
  const { enterpriseId, isLoadingEnterprise, enterpriseError } = useCurrentEnterprise();
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeFilter, setActiveFilter] = useState<"all" | PostStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | PostType>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Post | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [form, setForm] = useState<PostFields>(EMPTY_FORM);
  const [initialForm, setInitialForm] = useState<PostFields>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeForm, setActiveForm] = useState<BlogForm | null>(null);
  const [activeFormLoading, setActiveFormLoading] = useState(false);
  const [activeFormError, setActiveFormError] = useState("");
  const [customFields, setCustomFields] = useState<
    Record<string, BlogCustomFieldValue>
  >({});
  const [initialCustomFields, setInitialCustomFields] = useState<
    Record<string, BlogCustomFieldValue>
  >({});
  const [authoringContext, setAuthoringContext] = useState<AuthoringContext | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isCoverPreviewOpen, setIsCoverPreviewOpen] = useState(false);
  const [customImagePreviewUrl, setCustomImagePreviewUrl] = useState<string | null>(null);
  const [failedCustomImageUrls, setFailedCustomImageUrls] = useState<Set<string>>(new Set());
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "desktop">("mobile");
  const [openActionPostId, setOpenActionPostId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
    isPending?: boolean;
    onConfirm: () => void | Promise<void>;
  } | null>(null);
  const [actionMenuPosition, setActionMenuPosition] = useState<{
    top?: number;
    bottom?: number;
    left?: number;
  } | null>(null);
  const detailsBasePath =
    typeof window !== "undefined" && window.location.pathname.startsWith("/admin/blogs")
      ? "/admin/blogs"
      : "/admin/my-blogs";

  const mapPost = (item: BlogManageItem): Post => {
    const postKind: PostType =
      item.kind === "both"
        ? "both"
        : (item as unknown as { custom_fields?: { post_type?: string } }).custom_fields?.post_type === "both"
        ? "both"
        : item.kind;
    return {
      id: item.id,
      type: postKind,
      title: item.title,
      summary: item.excerpt ?? "",
    content: "",
    category: item.category_id ?? "",
    coverImageUrl: item.cover_image_url ?? "",
    tags: item.tags.join(", "),
    status:
      item.status === "pending_approval"
        ? "pending_review"
        : item.status === "deleted"
          ? "unpublished"
          : item.status,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    author: item.author_name ?? "Enterprise Admin",
    enterprise: item.business_name ?? "Current enterprise",
    pinned: item.is_pinned,
    feedback: item.reviewer_note ?? undefined,
    enterpriseId: item.enterprise_id,
    tenantId: item.tenant_id,
    version: item.version,
    module: item.module ?? null,
    linkedEntity: item.linked_entity ?? null,
    };
  };

  const configuredField = (...keys: string[]) =>
    activeForm?.sections
      .flatMap((section) => section.fields)
      .find((field) => keys.includes(field.key));
  const isConfiguredFieldVisible = (keys: string[], fallback = true) => {
    if (!activeForm) return fallback;
    return configuredField(...keys)?.visible === true;
  };
  const titleField = configuredField("title", "post_title_slug");
  const postTypeField = configuredField("post_type");
  const summaryField = configuredField("excerpt", "short_summary");
  const contentField = configuredField("content", "article_content");
  const categoryField = configuredField("category", "category_id");
  const coverField = configuredField("cover_image", "cover_image_url", "cover_image_file");
  const tagsField = configuredField("tags", "article_tags");

  useEffect(() => {
    if (isLoadingEnterprise || !enterpriseId) {
      if (!isLoadingEnterprise) setIsLoading(false);
      return;
    }
    let cancelled = false;
    void Promise.all([
      listMyBlogPosts({ page: 1, pageSize: 100, enterpriseId }),
      listBlogCategories(),
    ])
      .then(([postResponse, categoryResponse]) => {
        if (!cancelled) {
          setPosts(postResponse.items.map(mapPost));
          setCategories(categoryResponse);
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled)
          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to load your posts.",
          );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enterpriseId, isLoadingEnterprise]);

  useEffect(() => {
    if (!requestedEditId || isLoading || autoOpenedEditId.current === requestedEditId) return;
    const post = posts.find((item) => item.id === requestedEditId);
    if (!post) return;
    autoOpenedEditId.current = requestedEditId;
    if (post.status === "pending_review") {
      setError("This post is pending approval and cannot be edited.");
      router.replace(detailsBasePath);
      return;
    }
    void openEdit(post).then(() => router.replace(detailsBasePath));
  }, [isLoading, posts, requestedEditId, router]);

  useEffect(() => {
    if (isLoadingEnterprise || !enterpriseId || isLoading || requestedEditId || !contextualModule || !contextualEntityId || !contextualEntityTitle) return;
    if (!Object.hasOwn({ events: true, trainings: true, products: true, services: true }, contextualModule)) return;
    const contextKey = `${contextualModule}:${contextualEntityId}`;
    if (autoOpenedContext.current === contextKey) return;
    autoOpenedContext.current = contextKey;
    openCreate({ module: contextualModule, entityId: contextualEntityId, entityTitle: contextualEntityTitle });
    router.replace(detailsBasePath);
  }, [contextualEntityId, contextualEntityTitle, contextualModule, enterpriseId, isLoading, isLoadingEnterprise, requestedEditId, router]);

  const visiblePosts = useMemo(
    () =>
      posts.filter((post) => {
        if (isLoadingEnterprise || !enterpriseId) return false;
        if (post.enterpriseId && post.enterpriseId !== enterpriseId) return false;
        const matchesStatus =
          activeFilter === "all" || post.status === activeFilter;
        const matchesType =
          typeFilter === "all" ||
          post.type === typeFilter ||
          (typeFilter !== "both" && post.type === "both");
        const query = search.trim().toLowerCase();
        const matchesSearch =
          !query ||
          [post.title, post.summary, post.category].some((value) =>
            value.toLowerCase().includes(query),
          );
        return matchesStatus && matchesType && matchesSearch;
      }),
    [enterpriseId, isLoadingEnterprise, posts, activeFilter, typeFilter, search],
  );

  const toggleActionMenu = (event: React.MouseEvent<HTMLButtonElement>, postId: string) => {
    event.stopPropagation();
    if (openActionPostId === postId) {
      setOpenActionPostId(null);
      setActionMenuPosition(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const menuHeight = 220;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpwards = spaceBelow < menuHeight;
    setActionMenuPosition(
      openUpwards
        ? {
            left: Math.max(8, rect.right - 190),
            bottom: Math.max(8, window.innerHeight - rect.top + 6),
          }
        : {
            left: Math.max(8, rect.right - 190),
            top: Math.min(window.innerHeight - menuHeight, rect.bottom + 6),
          }
    );
    setOpenActionPostId(postId);
  };

  const loadActiveForm = async (kind: PostType) => {
    setActiveFormLoading(true);
    setActiveFormError("");
    try {
      const resolved = await getMyBlogForm(kind, enterpriseId ?? undefined);
      setActiveForm(resolved);
      setActiveFormError("");
    } catch (reason: unknown) {
      setActiveForm(null);
      let msg = "";
      if (reason instanceof Error) {
        msg = reason.message;
        if (msg.trim().startsWith("[") || msg.trim().startsWith("{")) {
          try {
            const parsed = JSON.parse(msg);
            if (Array.isArray(parsed) && parsed[0]?.msg) {
              msg = parsed.map((p: { msg?: string }) => p.msg).filter(Boolean).join("; ");
            } else if (parsed && typeof parsed === "object" && "detail" in parsed) {
              msg = typeof parsed.detail === "string" ? parsed.detail : "";
            }
          } catch {
            // keep msg
          }
        }
      }
      if (!msg || msg.includes("literal_error") || msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
        msg = `Creation unavailable. No active ${postTypeLabel(kind)} form configuration has been assigned to your enterprise. Please contact your platform administrator.`;
      }
      setActiveFormError(msg);
    } finally {
      setActiveFormLoading(false);
    }
  };

  useEffect(() => {
    if (!isDrawerOpen) return;
    // Existing Content Rule: When editing an existing draft or article, retain its original form configuration!
    if (editing) return;
    void loadActiveForm(form.type);
  }, [form.type, isDrawerOpen, enterpriseId, editing]);

  const openCreate = (context: AuthoringContext | null = null) => {
    if (isLoadingEnterprise || !enterpriseId) {
      setError(enterpriseError ?? "Your enterprise could not be identified yet.");
      return;
    }
    const nextForm = { ...EMPTY_FORM };
    setEditing(null);
    setForm(nextForm);
    setInitialForm(nextForm);
    setCustomFields({});
    setInitialCustomFields({});
    setAuthoringContext(context);
    setError("");
    setNotice("");
    setIsDrawerOpen(true);
  };
  const openEdit = async (post: Post) => {
    if (post.status === "pending_review") {
      setError("This post is pending approval and cannot be edited.");
      return;
    }
    let editable = post;
    let loadedCustomFields: Record<string, BlogCustomFieldValue> = {};
    let loadedContext: AuthoringContext | null = null;
    let postFormId: string | null = null;
    let postFormVersion: number | null = null;
    try {
      const detail = await getMyBlogPost(post.id, enterpriseId ?? undefined);
      editable = {
        ...post,
        content: detail.content,
        summary: detail.excerpt ?? post.summary,
        category: detail.category_id ?? post.category,
        coverImageUrl: detail.cover_image_url ?? post.coverImageUrl,
        version: detail.version ?? post.version,
      };
      if (detail.custom_fields) {
        loadedCustomFields = detail.custom_fields;
      }
      if (detail.supporting_documents?.length && loadedCustomFields.supporting_documents === undefined) {
        loadedCustomFields.supporting_documents = detail.supporting_documents.map((document) =>
          typeof document === "string" ? document : document.url,
        );
      }
      if (detail.linked_entity && isAuthoringModule(detail.module) && typeof detail.linked_entity.id === "string") {
        loadedContext = { module: detail.module, entityId: detail.linked_entity.id, entityTitle: "Linked item" };
      }
      postFormId = detail.form_id ?? null;
      postFormVersion = detail.form_version ?? null;
    } catch {
      /* keep list data if detail fetch fails */
    }
    const nextForm = {
      type: editable.type,
      title: editable.title,
      summary: editable.summary,
      content: editable.content,
      category: editable.category,
      coverImageUrl: editable.coverImageUrl,
      tags: editable.tags,
    };
    setEditing(editable);
    setForm(nextForm);
    setInitialForm(nextForm);
    setCustomFields(loadedCustomFields);
    setInitialCustomFields(loadedCustomFields);
    setAuthoringContext(loadedContext);

    // Existing Content Rules:
    // Existing Enterprise Draft & Changes Requested Article retain original form configuration!
    // Do not automatically migrate existing drafts to a newly activated form version.
    if (postFormId && postFormVersion) {
      setActiveFormLoading(true);
      setActiveFormError("");
      try {
        const originalForm = await getAdminBlogFormVersion(postFormId, postFormVersion);
        setActiveForm(originalForm);
        setActiveFormError("");
      } catch {
        await loadActiveForm(editable.type);
      } finally {
        setActiveFormLoading(false);
      }
    } else {
      await loadActiveForm(editable.type);
    }

    setError("");
    setNotice("");
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    const hasChanges =
      JSON.stringify(form) !== JSON.stringify(initialForm) ||
      JSON.stringify(customFields) !== JSON.stringify(initialCustomFields);
    if (hasChanges && !window.confirm("Discard your unsaved changes?")) return;
    setEditing(null);
    setIsDrawerOpen(false);
    setForm(EMPTY_FORM);
    setInitialForm(EMPTY_FORM);
    setCustomFields({});
    setInitialCustomFields({});
    setAuthoringContext(null);
    setError("");
  };

  useEffect(() => {
    if (!isDrawerOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDrawerOpen, form, initialForm, customFields, initialCustomFields]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest("[data-post-action-menu]")) {
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
    const handleScrollOrResize = () => {
      setOpenActionPostId(null);
      setActionMenuPosition(null);
    };
    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      document.removeEventListener("click", handleDocumentClick);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, []);

  const save = async (submit: boolean) => {
    if (editing?.status === "pending_review") {
      setError("This post is pending approval and cannot be edited.");
      return;
    }
    if (!editing && !activeForm) {
      setError(
        activeFormError ||
          `Creation unavailable. No active ${postTypeLabel(form.type)} form configuration has been assigned to your enterprise. Please contact your platform administrator.`,
      );
      return;
    }
    if (submit && !activeForm) {
      setError(
        activeFormError ||
          `Creation unavailable. No active ${postTypeLabel(form.type)} form configuration is assigned to this enterprise.`,
      );
      return;
    }
    if (!editing && !isBlogModuleEnabled("general")) {
      setError("General Blog and News post creation is currently paused by Super Admin governance.");
      return;
    }
    if (!form.title.trim()) {
      setError("Enter a post title.");
      return;
    }
    if (
      submit &&
      (!form.summary.trim() ||
        !plainTextFromRichText(form.content).trim() ||
        !form.category.trim() ||
        !form.coverImageUrl.trim())
    ) {
      setError(
        "Add a summary, post content, category, and cover image before submitting.",
      );
      return;
    }
    if (submit && activeForm?.sections) {
      for (const section of activeForm.sections) {
        if (section.visible === false) continue;
        for (const field of section.fields) {
          if (!field.visible || !field.required) continue;
          if (SYSTEM_FIELD_KEYS.has(field.key)) continue;
          const val = customFields[field.key];
          if (val === undefined || val === null || String(val).trim() === "") {
            const isFieldAdmin =
              section.visibility_scope === "admin_only" ||
              section.type === "admin_notes" ||
              field.visibility_scope === "admin_only";
            setError(
              isFieldAdmin
                ? `Please complete required internal field “${field.label}” before submitting for approval.`
                : `Please complete required field “${field.label}” before submitting for approval.`
            );
            return;
          }
        }
      }
    }
    if (submit && !window.confirm(editing?.status === "changes_requested" || editing?.status === "rejected"
      ? "Resubmit this post for Super Admin approval?"
      : "Submit this post for Super Admin approval?")) return;
    try {
      const listValue = (...keys: string[]) => {
        const value = keys.map((key) => customFields[key]).find((item) => item !== undefined);
        if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
        if (typeof value !== "string") return [];
        return value.split(",").map((item) => item.trim()).filter(Boolean);
      };
      const documentValues = listValue("supporting_documents", "supporting_document").map((url) => ({
        url,
        name: url.split("/").pop() || "Supporting document",
      }));
      const normalizedCustomFields: Record<string, BlogCustomFieldValue> = {};
      // The backend validates Post Type as a required custom field even though
      // the authoring UI stores it as the form's fixed `kind` selector.
      // Always mirror that selector into custom_fields for create, draft update,
      // and approval submission payloads.
      if (!form.type) {
        setError("Select Blog or News before saving this post.");
        return;
      }
      normalizedCustomFields.post_type = form.type;
      for (const section of activeForm?.sections ?? []) {
        for (const field of section.fields) {
          if (field.key === "supporting_documents") continue;
          const rawValue = customFields[field.key];
          if (rawValue === undefined) continue;
          if (field.type === "number") {
            if (rawValue === "" || rawValue === null) {
              normalizedCustomFields[field.key] = null;
              continue;
            }
            const numericValue = typeof rawValue === "number" ? rawValue : Number(rawValue);
            if (!Number.isFinite(numericValue)) {
              setError(`${field.label} must be a number.`);
              return;
            }
            normalizedCustomFields[field.key] = numericValue;
          } else if (field.type === "multi_select" || field.type === "multiselect") {
            const selectedValues = listValue(field.key);
            const allowedValues = typeof field.validation?.options === "string"
              ? field.validation.options.split(",").map((item) => item.trim()).filter(Boolean)
              : Array.isArray(field.validation?.options)
                ? field.validation.options.map(String)
                : [];
            const invalidValue = allowedValues.length > 0 && selectedValues.find((value) => !allowedValues.includes(value));
            if (invalidValue) {
              setError(`${field.label}: pick from ${allowedValues.join(", ")}.`);
              return;
            }
            normalizedCustomFields[field.key] = selectedValues;
          } else if (field.type === "checkbox") {
            normalizedCustomFields[field.key] = rawValue === true || rawValue === "true";
          } else if (field.type === "media_upload" || field.type === "image" || field.type === "image_list") {
            const imageValues = listValue(field.key);
            normalizedCustomFields[field.key] = imageValues.length > 1 ? imageValues : imageValues[0] ?? "";
          } else {
            if (field.type === "select" || field.type === "radio") {
              const allowedValues = typeof field.validation?.options === "string"
                ? field.validation.options.split(",").map((item) => item.trim()).filter(Boolean)
                : Array.isArray(field.validation?.options)
                  ? field.validation.options.map(String)
                  : [];
              if (allowedValues.length > 0 && typeof rawValue === "string" && rawValue && !allowedValues.includes(rawValue)) {
                setError(`${field.label}: pick from ${allowedValues.join(", ")}.`);
                return;
              }
            }
            normalizedCustomFields[field.key] = rawValue;
          }
        }
      }
      const authorTags = form.tags.split(",").map((tag) => tag.trim()).filter(Boolean);
      const invalidTag = tagsField && authorTags.find((tag) => tag.length > MAX_BLOG_TAG_LENGTH);
      if (invalidTag) {
        setError(`The tag “${invalidTag}” is too long. Tags must be 30 characters or fewer.`);
        return;
      }
      const payload = {
        kind: form.type === "both" ? "blog" : form.type,
        title: form.title.trim(),
        excerpt: form.summary.trim() || null,
        content: form.content,
        category_id: form.category || null,
        cover_image_url: form.coverImageUrl.trim() || null,
        ...(tagsField ? { tags: authorTags } : {}),
        ...(configuredField("additional_images", "image_list", "additional_image") ? { additional_images: listValue("additional_images") } : {}),
        ...(configuredField("reference_url", "reference_urls") ? { reference_urls: listValue("reference_url") } : {}),
        ...(configuredField("supporting_document", "supporting_documents") ? { supporting_documents: documentValues } : {}),
        custom_fields: {
          ...normalizedCustomFields,
          post_type: form.type,
        },
        form_id: activeForm?.id ?? null,
        form_version: activeForm?.version ?? null,
        module: authoringContext?.module ?? ("general" as const),
        ...(authoringContext ? { linked_entity: { type: ({ events: "event", trainings: "training", products: "product", services: "service" } as const)[authoringContext.module], id: authoringContext.entityId } } : {}),
        ...(editing?.version ? { base_version: editing.version } : {}),
      };
      const saved = editing
        ? await updateMyBlogPost(editing.id, payload)
        : await createMyBlogPost(payload);
      const submitted = submit ? await submitMyBlogPost(saved.id) : saved;
      setPosts((current) => [
        mapPost(submitted),
        ...current.filter((post) => post.id !== submitted.id),
      ]);
      setNotice(
        submit ? "Post submitted for Super Admin review." : "Draft saved.",
      );
      setEditing(null);
      setForm(EMPTY_FORM);
      setInitialForm(EMPTY_FORM);
      setCustomFields({});
      setInitialCustomFields({});
      setAuthoringContext(null);
      setError("");
      setIsDrawerOpen(false);
      if (submit) router.push(`${detailsBasePath}/${encodeURIComponent(saved.id)}`);
    } catch (reason: unknown) {
      setError(
        reason instanceof Error ? reason.message : "Unable to save this post.",
      );
    }
  };

  const unpublish = async (post: Post) => {
    if (
      !window.confirm(
        `Unpublish “${post.title}”? It will no longer be visible to readers.`,
      )
    )
      return;
    try {
      const updated = await unpublishMyBlogPost(post.id);
      setPosts((current) =>
        current.map((item) => (item.id === post.id ? mapPost(updated) : item)),
      );
      setNotice("Post unpublished.");
    } catch (reason: unknown) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to unpublish this post.",
      );
    }
  };

  const removeDraft = async (post: Post) => {
    if (!window.confirm(`Delete draft “${post.title}”?`)) return;
    try {
      await deleteMyBlogPost(post.id);
      setPosts((current) => current.filter((item) => item.id !== post.id));
      setNotice("Draft deleted.");
    } catch (reason: unknown) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to delete this draft.",
      );
    }
  };

  const counts: Record<"all" | PostStatus, number> = {
    all: posts.length,
    draft: posts.filter((post) => post.status === "draft").length,
    pending_review: posts.filter((post) => post.status === "pending_review")
      .length,
    changes_requested: posts.filter(
      (post) => post.status === "changes_requested",
    ).length,
    rejected: posts.filter((post) => post.status === "rejected").length,
    published: posts.filter((post) => post.status === "published").length,
    unpublished: posts.filter((post) => post.status === "unpublished").length,
  };
  const enterpriseUnavailable = Boolean(enterpriseError) && !isLoadingEnterprise;
  const enterpriseErrorMessage = /not authenticated|unauthorized|session/i.test(enterpriseError ?? "")
    ? "Your session has expired. Please sign in again to manage your posts."
    : enterpriseError;

  return (
    <main className="min-h-screen bg-[#f8fafc] p-5 text-[#06201c] sm:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7f9d94]">
              Content management
            </p>
            <h1 className="mt-1 text-3xl font-bold">My Posts</h1>
            <p className="mt-2 text-sm text-[#52736a]">
              Create Blog and News posts, save drafts, and submit them for Super
              Admin review.
            </p>
          </div>
          <button
            type="button"
            disabled={isLoadingEnterprise || !enterpriseId}
            onClick={() => openCreate()}
            className="rounded-xl bg-[#1f6a58] px-5 py-3 text-sm font-semibold text-white hover:bg-[#175245] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create post
          </button>
        </header>
        {enterpriseErrorMessage && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{enterpriseErrorMessage}</p>
        )}
        {error && !isDrawerOpen && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}
        {notice && (
          <div
            role="status"
            className="rounded-xl border border-[#b6dfce] bg-[#eff8f3] px-4 py-3 text-sm text-[#175245]"
          >
            {notice}
          </div>
        )}
        <section className="rounded-2xl border border-[#e1ebe6] bg-white shadow-sm">
          <div className="space-y-4 border-b border-[#edf3f0] p-5">
            <div
              className="flex flex-wrap gap-2"
              role="tablist"
              aria-label="Post status"
            >
              {(
                [
                  "all",
                  "draft",
                  "pending_review",
                  "changes_requested",
                  "rejected",
                  "published",
                  "unpublished",
                ] as const
              ).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  role="tab"
                  aria-selected={activeFilter === filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    activeFilter === filter
                      ? "bg-[#e8f6ee] text-[#175245] font-semibold"
                      : "border border-[#d7e5df] text-[#52736a] hover:bg-[#f8fafc]"
                  }`}
                >
                  <span>{filter === "all" ? "All posts" : STATUS_LABEL[filter]}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      activeFilter === filter
                        ? "bg-[#1f6a58] text-white"
                        : "bg-[#edf3f0] text-[#52736a]"
                    }`}
                  >
                    {counts[filter]}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[240px] flex-1">
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search title, summary, or category..."
                  aria-label="Search posts"
                  className="w-full rounded-xl border border-[#d7e5df] bg-white px-4 py-2.5 text-sm text-[#06201c] placeholder-[#7f9d94] outline-none transition-colors focus:border-[#1f6a58] focus:ring-2 focus:ring-[#1f6a58]/20"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#52736a] whitespace-nowrap">Content type:</span>
                <select
                  value={typeFilter}
                  onChange={(event) =>
                    setTypeFilter(event.target.value as typeof typeFilter)
                  }
                  aria-label="Filter by content type"
                  className="rounded-xl border border-[#d7e5df] bg-white px-3 py-2.5 text-xs font-semibold text-[#175245] outline-none transition-colors focus:border-[#1f6a58] focus:ring-2 focus:ring-[#1f6a58]/20 cursor-pointer"
                >
                  <option value="all">All Content</option>
                  <option value="blog">Blog Articles</option>
                  <option value="news">News Bulletins</option>
                  <option value="both">Blog &amp; News</option>
                </select>
              </div>
            </div>
          </div>
          {isLoading || isLoadingEnterprise ? (
            <div role="status" className="grid gap-3 p-5">
              {[1, 2, 3].map((row) => <div key={row} className="h-16 animate-pulse rounded-xl bg-[#f1f6f3]" />)}
            </div>
          ) : enterpriseUnavailable ? (
            <div className="px-6 py-16 text-center">
              <h2 className="text-lg font-semibold">Enterprise unavailable</h2>
              <p className="mt-2 text-sm text-[#52736a]">We could not securely identify your enterprise, so your posts are not being displayed.</p>
            </div>
          ) : visiblePosts.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <h2 className="text-lg font-semibold">
                {posts.length ? "No posts match these filters" : "No posts yet"}
              </h2>
              <p className="mt-2 text-sm text-[#52736a]">
                Create a draft to get started. Submit it for review when it is
                ready.
              </p>
              {!posts.length && (
                <button
                  type="button"
                  onClick={() => openCreate()}
                  className="mt-5 rounded-xl border border-[#1f6a58] px-4 py-2.5 text-sm font-semibold text-[#175245]"
                >
                  Create your first post
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {visiblePosts.map((post) => {
                const category = categories.find((item) => item.id === post.category)?.name ?? post.category ?? "General";
                const imageUrl = post.coverImageUrl ? getRenderableBlogAssetUrl(post.coverImageUrl) : "";
                return (
                  <article
                    key={post.id}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#e1ebe6] bg-white shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[#b6dfce] hover:shadow-md"
                  >
                    {/* Media Thumbnail Container */}
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

                      {/* Floating Badges & Action Dropdown */}
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
                              onClick={(event) => {
                                toggleActionMenu(event, post.id);
                              }}
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
                                        : void openEdit(post);
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
                                      void openEdit(post);
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
                                      void unpublish(post);
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
                                      void removeDraft(post);
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

                    {/* Card Content */}
                    <div className="flex flex-1 flex-col p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                            post.type === "news"
                              ? "bg-blue-50 text-blue-800 border-blue-200"
                              : post.type === "both"
                              ? "bg-purple-50 text-purple-800 border-purple-200"
                              : "bg-teal-50 text-teal-800 border-teal-200"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${post.type === "news" ? "bg-blue-600" : post.type === "both" ? "bg-purple-600" : "bg-teal-600"}`} />
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
                            onClick={() => void openEdit(post)}
                            className="rounded-lg bg-[#1f6a58] px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#175245] transition-colors"
                          >
                            Edit &amp; resubmit
                          </button>
                        )}
                        {post.status === "draft" && (
                          <button
                            type="button"
                            onClick={() => void openEdit(post)}
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
          )}
        </section>
      </div>

      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-40 flex justify-end bg-[#06201c]/35"
          role="dialog"
          aria-modal="true"
          aria-label={editing ? "Edit post" : "Create post"}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDrawer();
          }}
        >
          <section className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
            <header className="flex items-start justify-between border-b border-[#edf3f0] p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#7f9d94]">
                  {editing ? "Edit post" : "New post"}
                </p>
                <h2 className="mt-1 text-xl font-bold">
                  {editing?.status === "changes_requested" || editing?.status === "rejected"
                    ? "Edit and resubmit your post"
                    : editing ? "Update your post" : "Create a Blog or News post"}
                </h2>
                {authoringContext && !editing && (
                  <div className="mt-3 rounded-xl border border-[#b6dfce] bg-[#eff8f3] px-3.5 py-3 text-sm text-[#175245]">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#52736a]">Linked content</p>
                    <p className="mt-1 font-semibold">
                      {AUTHORING_CONTEXT_LABELS[authoringContext.module]}: {authoringContext.entityTitle}
                    </p>
                    <p className="mt-1 text-xs text-[#52736a]">This article will remain associated with this item after submission.</p>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                aria-label="Close"
                className="rounded-lg px-3 py-2 text-[#52736a] hover:bg-[#f4faf7]"
              >
                Close
              </button>
            </header>
            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              {error && (
                <p
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                  {error}
                </p>
              )}
              {editing?.feedback && (editing.status === "changes_requested" || editing.status === "rejected") && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="font-semibold">Reviewer feedback</p>
                  <p className="mt-1 whitespace-pre-wrap">{editing.feedback}</p>
                </div>
              )}
              {isConfiguredFieldVisible(["post_type"]) && <label className="block text-sm font-medium">
                {postTypeField?.label ?? "Post type"}
                <select
                  value={form.type}
                  disabled={Boolean(editing)}
                  onChange={(event) => {
                    const nextType = event.target.value as PostType;
                    setForm({ ...form, type: nextType });
                    void loadActiveForm(nextType);
                  }}
                  className="mt-2 w-full rounded-xl border border-[#d7e5df] bg-white px-3 py-3 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                >
                  <option value="blog">Blog</option>
                  <option value="news">News</option>
                  <option value="both">Blog &amp; News</option>
                </select>
                {editing && (
                  <span className="mt-1 block text-xs text-[#7f9d94]">
                    Post type is fixed to the original draft configuration.
                  </span>
                )}
              </label>}

              {/* Form Resolution Status Indicator */}
              {activeFormLoading ? (
                <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-3 text-xs text-teal-800 text-center animate-pulse">
                  Checking active form configuration for {postTypeLabel(form.type)}…
                </div>
              ) : activeForm ? (
                <div className="flex flex-col gap-1.5 rounded-xl border border-teal-200/80 bg-teal-50/60 px-3.5 py-2.5 text-xs text-teal-950 font-medium">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-teal-800 block">
                        {editing ? "Form Configuration" : "Active Template"}
                      </span>
                      <span className="font-semibold truncate block">
                        {activeForm.name} (v{activeForm.version})
                      </span>
                    </div>
                    <span className="rounded bg-teal-100 px-2 py-0.5 text-[10px] font-bold uppercase text-teal-900 border border-teal-200 shrink-0">
                      {editing
                        ? `Original Form v${activeForm.version}`
                        : activeForm.scope === "selected"
                        ? "Custom Enterprise Form"
                        : "Global Default"}
                    </span>
                  </div>
                  {editing && (
                    <p className="text-[11px] text-teal-800/90 font-normal">
                      This {editing.status === "draft" ? "draft" : "article"} retains its original form configuration (v{activeForm.version}). Existing drafts are not automatically migrated to newly activated forms.
                    </p>
                  )}
                </div>
              ) : !editing && activeFormError ? (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950 flex flex-col gap-1.5" role="alert">
                  <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
                    Creation Unavailable
                  </div>
                  <p className="leading-relaxed font-medium">{activeFormError}</p>
                  <p className="text-[11px] text-amber-800">
                    Your enterprise cannot author or submit new {postTypeLabel(form.type)} posts until an active form configuration is assigned by your platform administrator.
                  </p>
                </div>
              ) : null}
              {isConfiguredFieldVisible(["title", "post_title_slug"]) && <label className="block text-sm font-medium">
                {titleField?.label ?? "Title"}
                <input
                  value={form.title}
                  onChange={(event) =>
                    setForm({ ...form, title: event.target.value })
                  }
                  maxLength={200}
                  className="mt-2 w-full rounded-xl border border-[#d7e5df] px-3 py-3"
                  placeholder={titleField?.placeholder?.trim() || "Enter a clear post title"}
                />
                {titleField?.help_text && <span className="mt-1 block text-xs text-[#7f9d94]">{titleField.help_text}</span>}
              </label>}
              {isConfiguredFieldVisible(["excerpt", "short_summary"]) && <label className="block text-sm font-medium">
                {summaryField?.label ?? "Summary"}
                <textarea
                  value={form.summary}
                  onChange={(event) =>
                    setForm({ ...form, summary: event.target.value })
                  }
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-[#d7e5df] px-3 py-3"
                  placeholder={summaryField?.placeholder?.trim() || "Briefly describe what readers will learn"}
                />
                {summaryField?.help_text && <span className="mt-1 block text-xs text-[#7f9d94]">{summaryField.help_text}</span>}
              </label>}
              {isConfiguredFieldVisible(["content", "article_content"]) && <label className="block text-sm font-medium">
                {contentField?.label ?? "Post content"}
                <RichTextEditor
                  value={form.content}
                  onChange={(value) => setForm({ ...form, content: value })}
                  placeholder={contentField?.placeholder?.trim() || "Write the post content..."}
                  minHeightClass="min-h-[260px]"
                />
                {contentField?.help_text && <span className="mt-1 block text-xs text-[#7f9d94]">{contentField.help_text}</span>}
              </label>}
              {isConfiguredFieldVisible(["category", "category_id"]) && <label className="block text-sm font-medium">
                {categoryField?.label ?? "Category"}
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm({ ...form, category: event.target.value })
                  }
                  className="mt-2 w-full rounded-xl border border-[#d7e5df] bg-white px-3 py-3"
                >
                  <option value="">Choose a category</option>
                  {Boolean(
                    form.category &&
                      !categories.some(
                        (c) => c.is_active && c.id === form.category,
                      ),
                  ) && (
                    <option value={form.category} disabled>
                      {editing?.category || "Current Category"} (Inactive)
                    </option>
                  )}
                  {categories
                    .filter((category) => category.is_active)
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                </select>
                <span className="mt-1 block text-xs text-[#7f9d94]">
                  {categoryField?.help_text ?? "Choose an active category set by your Super Admin."}
                </span>
              </label>}
              {isConfiguredFieldVisible(["cover_image", "cover_image_url", "cover_image_file"]) && <div className="block text-sm font-medium">
                {coverField?.label ?? "Cover image"}
                <div className="mt-2 rounded-xl border border-dashed border-[#b6dfce] bg-[#f8fbf9] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#175245]">Upload a cover image</p>
                      <p className="mt-1 text-xs text-[#52736a]">PNG, JPG, WEBP or GIF · Recommended 1200 × 675px</p>
                    </div>
                    <label className="cursor-pointer rounded-lg bg-[#1f6a58] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#175245]">
                      {uploading ? "Uploading…" : "Upload image"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="sr-only"
                        disabled={uploading}
                        onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) {
                      setError("Cover image must be 5MB or smaller.");
                      return;
                    }
                    const localPreview = URL.createObjectURL(file);
                    setForm((current) => ({
                      ...current,
                      coverImageUrl: localPreview,
                    }));
                    setUploading(true);
                    setError("");
                    try {
                      const uploaded = await uploadBlogAsset(
                        file,
                        "cover_image",
                      );
                      if (uploaded.url) {
                        setForm((current) => ({
                          ...current,
                          coverImageUrl: uploaded.url,
                        }));
                      }
                    } catch (reason: unknown) {
                      setForm((current) => ({
                        ...current,
                        coverImageUrl: "",
                      }));
                      setError(
                        reason instanceof Error
                          ? reason.message
                          : "Unable to upload the cover image.",
                      );
                    } finally {
                      setUploading(false);
                    }
                        }}
                      />
                    </label>
                  </div>
                </div>
                {form.coverImageUrl && (
                  <div className="mt-2 overflow-hidden rounded-xl border border-[#d7e5df] bg-slate-50 p-2">
                    <div className="flex items-center gap-3">
                      <img
                        src={getRenderableBlogAssetUrl(form.coverImageUrl)}
                        alt="Cover preview"
                        className="h-14 w-20 rounded-lg object-cover border border-slate-200"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                      <span className="truncate text-xs text-[#52736a]">
                        {form.coverImageUrl}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsCoverPreviewOpen(true)}
                        className="ml-auto rounded-lg border border-[#d7e5df] bg-white px-3 py-1.5 text-xs font-semibold text-[#1f6a58] hover:bg-[#f4faf7] transition-colors"
                      >
                        Preview
                      </button>
                    </div>
                  </div>
                )}
                {isCoverPreviewOpen && form.coverImageUrl ? (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="presentation" onClick={() => setIsCoverPreviewOpen(false)}>
                    <div className="relative max-h-[90vh] max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between border-b border-[#d7e5df] px-4 py-3">
                        <h3 className="text-sm font-bold text-[#06201c]">Cover Image Preview</h3>
                        <button type="button" onClick={() => setIsCoverPreviewOpen(false)} className="rounded-lg px-2 py-1 text-sm font-bold text-[#52736a] hover:bg-[#eaf4ef]">Close</button>
                      </div>
                      <div className="p-4">
                        <img src={getRenderableBlogAssetUrl(form.coverImageUrl)} alt="Cover preview" className="max-h-[70vh] w-full rounded-xl object-contain" />
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>}
              {isConfiguredFieldVisible(["tags", "article_tags"], false) && <label className="block text-sm font-medium">
                {tagsField?.label ?? "Tags"}{" "}
                <span className="font-normal text-[#7f9d94]">(optional)</span>
                <input
                  value={form.tags}
                  onChange={(event) =>
                    setForm({ ...form, tags: event.target.value })
                  }
                  className="mt-2 w-full rounded-xl border border-[#d7e5df] px-3 py-3"
                  placeholder={tagsField?.placeholder?.trim() || "Separate tags with commas"}
                />
                {tagsField?.help_text && <span className="mt-1 block text-xs text-[#7f9d94]">{tagsField.help_text}</span>}
              </label>}
              {/* Dynamic Configured Sections & Custom Fields per Section 5 */}
              {activeForm?.sections
                .filter((section) => section.visible !== false)
                .map((section) => {
                  const sectionCustomFields = section.fields.filter(
                    (field) =>
                      field.visible &&
                      !SYSTEM_FIELD_KEYS.has(field.key),
                  );

                  if (sectionCustomFields.length === 0) return null;

                  const isSectionAdminOnly =
                    section.visibility_scope === "admin_only" ||
                    section.type === "admin_notes";

                  return (
                    <div
                      key={section.id}
                      className={`rounded-2xl border p-4.5 ${
                        isSectionAdminOnly
                          ? "border-purple-200 bg-purple-50/40"
                          : "border-[#d7e5df] bg-[#fbfdfc]"
                      }`}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-[#06201c]">
                            {section.title}
                          </h3>
                          {section.description ? (
                            <p className="mt-0.5 text-xs text-[#52736a]">
                              {section.description}
                            </p>
                          ) : null}
                        </div>
                        {isSectionAdminOnly ? (
                          <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                            Enterprise Admin Only
                          </span>
                        ) : (
                          <span className="rounded-md bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700 border border-teal-200">
                            Customer-Visible
                          </span>
                        )}
                      </div>

                      <div className="space-y-3.5">
                        {sectionCustomFields.map((field) => {
                          const isFieldAdminOnly =
                            isSectionAdminOnly ||
                            field.visibility_scope === "admin_only";

                          return (
                            <label
                              key={field.id}
                              className="block text-sm font-medium text-slate-800"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span>
                                  {field.label}
                                  {field.required && (
                                    <span className="text-red-600 font-bold"> *</span>
                                  )}
                                </span>
                                {isFieldAdminOnly ? (
                                  <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-800">
                                    Enterprise Admin Only
                                  </span>
                                ) : (
                                  <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold text-teal-700">
                                    Customer-Visible
                                  </span>
                                )}
                              </div>

                              {field.type === "rich_text" || field.type === "richtext" ? (
                                <RichTextEditor
                                  value={String(customFields[field.key] ?? "")}
                                  onChange={(value) => setCustomFields((current) => ({ ...current, [field.key]: value }))}
                                  placeholder={field.placeholder?.trim() || "Write formatted content..."}
                                />
                              ) : field.type === "textarea" ? (
                                <textarea
                                  rows={3}
                                  value={String(customFields[field.key] ?? "")}
                                  onChange={(event) =>
                                    setCustomFields((current) => ({
                                      ...current,
                                      [field.key]: event.target.value,
                                    }))
                                  }
                                  className="mt-1.5 w-full rounded-xl border border-[#d7e5df] bg-white px-3 py-2.5 text-sm focus:border-teal-600 focus:outline-none"
                                  placeholder={field.placeholder?.trim() || "Enter value"}
                                />
                              ) : field.type === "multi_select" || field.type === "multiselect" ? (
                                <div className="mt-1.5 space-y-2 rounded-xl border border-[#d7e5df] bg-white p-3">
                                  {(typeof field.validation?.options === "string"
                                    ? field.validation.options.split(",")
                                    : Array.isArray(field.validation?.options)
                                      ? field.validation.options.map(String)
                                      : []
                                  ).map((option) => {
                                    const selected = String(customFields[field.key] ?? "").split(",").map((item) => item.trim()).filter(Boolean);
                                    return (
                                      <label key={option} className="flex items-center gap-2 text-sm font-normal">
                                        <input
                                          type="checkbox"
                                          checked={selected.includes(option.trim())}
                                          onChange={(event) => {
                                            const next = event.target.checked
                                              ? [...selected, option.trim()]
                                              : selected.filter((item) => item !== option.trim());
                                            setCustomFields((current) => ({ ...current, [field.key]: next.join(", ") }));
                                          }}
                                          className="h-4 w-4 accent-[#1f6a58]"
                                        />
                                        {option.trim()}
                                      </label>
                                    );
                                  })}
                                </div>
                              ) : field.type === "checkbox" ? (
                                <label className="mt-1.5 flex items-center gap-2 rounded-xl border border-[#d7e5df] bg-white px-3 py-2.5 text-sm font-normal">
                                  <input
                                    type="checkbox"
                                    checked={customFields[field.key] === true || customFields[field.key] === "true"}
                                    onChange={(event) => setCustomFields((current) => ({ ...current, [field.key]: event.target.checked }))}
                                    className="h-4 w-4 accent-[#1f6a58]"
                                  />
                                  <span>{field.placeholder ?? `Enable ${field.label.toLowerCase()}`}</span>
                                </label>
                              ) : field.type === "radio" ? (
                                <div className="mt-1.5 space-y-2 rounded-xl border border-[#d7e5df] bg-white p-3">
                                  {(typeof field.validation?.options === "string"
                                    ? field.validation.options.split(",")
                                    : Array.isArray(field.validation?.options)
                                      ? field.validation.options.map(String)
                                      : []
                                  ).map((option) => (
                                    <label key={option} className="flex items-center gap-2 text-sm font-normal">
                                      <input
                                        type="radio"
                                        name={field.key}
                                        value={option.trim()}
                                        checked={String(customFields[field.key] ?? "") === option.trim()}
                                        onChange={(event) => setCustomFields((current) => ({ ...current, [field.key]: event.target.value }))}
                                        className="h-4 w-4 accent-[#1f6a58]"
                                      />
                                      {option.trim()}
                                    </label>
                                  ))}
                                </div>
                              ) : field.type === "select" || field.type === "category" ? (
                                <select
                                  value={String(customFields[field.key] ?? "")}
                                  onChange={(event) =>
                                    setCustomFields((current) => ({
                                      ...current,
                                      [field.key]: event.target.value,
                                    }))
                                  }
                                  className="mt-1.5 w-full rounded-xl border border-[#d7e5df] bg-white px-3 py-2.5 text-sm focus:border-teal-600 focus:outline-none"
                                >
                                  <option value="">Select an option...</option>
                                  {typeof field.validation?.options === "string"
                                    ? field.validation.options
                                        .split(",")
                                        .map((opt) => opt.trim())
                                        .filter(Boolean)
                                        .map((opt) => (
                                          <option key={opt} value={opt}>
                                            {opt}
                                          </option>
                                        ))
                                    : Array.isArray(field.validation?.options)
                                      ? (field.validation.options as string[]).map((opt) => (
                                          <option key={opt} value={opt}>
                                            {opt}
                                          </option>
                                        ))
                                      : null}
                                </select>
                              ) : field.type === "date" ? (
                                <input
                                  type="date"
                                  value={String(customFields[field.key] ?? "")}
                                  onChange={(event) =>
                                    setCustomFields((current) => ({
                                      ...current,
                                      [field.key]: event.target.value,
                                    }))
                                  }
                                  className="mt-1.5 w-full rounded-xl border border-[#d7e5df] bg-white px-3 py-2.5 text-sm focus:border-teal-600 focus:outline-none"
                                />
                              ) : field.type === "time" ? (
                                <input
                                  type="time"
                                  value={String(customFields[field.key] ?? "")}
                                  onChange={(event) => setCustomFields((current) => ({ ...current, [field.key]: event.target.value }))}
                                  className="mt-1.5 w-full rounded-xl border border-[#d7e5df] bg-white px-3 py-2.5 text-sm focus:border-teal-600 focus:outline-none"
                                />
                              ) : field.type === "number" ? (
                                <input
                                  type="number"
                                  value={String(customFields[field.key] ?? "")}
                                  onChange={(event) =>
                                    setCustomFields((current) => ({
                                      ...current,
                                      [field.key]: event.target.value,
                                    }))
                                  }
                                  className="mt-1.5 w-full rounded-xl border border-[#d7e5df] bg-white px-3 py-2.5 text-sm focus:border-teal-600 focus:outline-none"
                                  placeholder={field.placeholder?.trim() || "0"}
                                />
                              ) : field.type === "url" || field.type === "email" ? (
                                <input
                                  type={field.type === "email" ? "email" : "url"}
                                  value={String(customFields[field.key] ?? "")}
                                  onChange={(event) => setCustomFields((current) => ({ ...current, [field.key]: event.target.value }))}
                                  className="mt-1.5 w-full rounded-xl border border-[#d7e5df] bg-white px-3 py-2.5 text-sm focus:border-teal-600 focus:outline-none"
                                  placeholder={field.placeholder?.trim() || (field.type === "email" ? "name@example.com" : "https://example.com")}
                                />
                              ) : field.type === "file_upload" || field.type === "media_upload" || field.type === "image" || field.type === "image_list" ? (
                                <div className="mt-1.5 flex flex-col gap-2 rounded-xl border border-dashed border-[#b6dfce] bg-[#f8fbf9] p-3.5">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex flex-col">
                                      <span className="text-xs font-semibold text-slate-800">
                                        {customFields[field.key]
                                          ? (field.type === "media_upload" || field.type === "image" || field.type === "image_list" ? "Attached images" : "Attached document")
                                          : field.placeholder || (field.type === "media_upload" || field.type === "image" || field.type === "image_list" ? "Select images" : "Select internal file (PDF, DOCX, ZIP)")}
                                      </span>
                                      <span className="text-[11px] text-[#52736a]">
                                        {isFieldAdminOnly
                                          ? "Private document — visible only to administrators"
                                          : "Maximum file size: 25MB"}
                                      </span>
                                    </div>
                                    <label className="cursor-pointer rounded-lg border border-[#d7e5df] bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs">
                                      {field.type === "media_upload" || field.type === "image" || field.type === "image_list"
                                        ? (customFields[field.key] ? "Add another image" : "Browse image")
                                        : (customFields[field.key] ? "Add another document" : "Browse File")}
                                      <input
                                        type="file"
                                        multiple
                                        accept={field.type === "media_upload" || field.type === "image" || field.type === "image_list" ? "image/jpeg,image/png,image/webp,image/gif" : ".pdf,.doc,.docx,.zip"}
                                        className="sr-only"
                                        onChange={async (e) => {
                                          const files = Array.from(e.target.files ?? []);
                                          if (files.length === 0) return;
                                          const maxSizeMb = Number(field.validation?.max_file_size_mb ?? 25);
                                          const oversized = files.find((file) => file.size > maxSizeMb * 1024 * 1024);
                                          if (oversized) {
                                            setError(`${oversized.name} exceeds the ${maxSizeMb}MB file limit.`);
                                            return;
                                          }
                                          setUploading(true);
                                          setError("");
                                          try {
                                            const purpose = field.type === "media_upload" || field.type === "image" || field.type === "image_list" ? "image" : "document";
                                            const uploaded = await Promise.all(files.map((file) => uploadBlogAsset(file, purpose)));
                                            const urls = uploaded.map((asset, index) => asset.url || files[index]?.name).filter(Boolean);
                                            const existingUrls = String(customFields[field.key] ?? "")
                                              .split(",")
                                              .map((item) => item.trim())
                                              .filter(Boolean);
                                            const nextUrls = [...existingUrls, ...urls];
                                            setCustomFields((current) => ({
                                              ...current,
                                              [field.key]: nextUrls.join(", "),
                                            }));
                                          } catch (reason: unknown) {
                                            setError(reason instanceof Error ? reason.message : "Unable to upload the selected file.");
                                          } finally {
                                            setUploading(false);
                                          }
                                        }}
                                      />
                                    </label>
                                  </div>
                                  {customFields[field.key] ? (
                                    <div className="flex items-center justify-between rounded-lg bg-white border border-[#d7e5df] px-3 py-2 text-xs">
                                      <div className="flex min-w-0 flex-1 items-center gap-2 truncate">
                                        {field.type === "media_upload" || field.type === "image" || field.type === "image_list" ? (
                                          <div className="grid grid-cols-3 gap-2">
                                            {String(customFields[field.key]).split(",").map((url) => url.trim()).filter(Boolean).map((url) => (
                                              <div key={url} className="relative">
                                                {failedCustomImageUrls.has(url) ? (
                                                  <div className="flex h-16 w-20 items-center justify-center rounded-lg border border-[#d7e5df] bg-slate-50 px-1 text-center text-[10px] font-semibold text-slate-500">
                                                    Preview unavailable
                                                  </div>
                                                ) : (
                                                  <button type="button" onClick={() => setCustomImagePreviewUrl(getRenderableBlogAssetUrl(url))} className="overflow-hidden rounded-lg border border-[#d7e5df] bg-slate-50 hover:border-teal-600">
                                                    <img
                                                      src={getRenderableBlogAssetUrl(url)}
                                                      alt="Additional image preview"
                                                      className="h-16 w-20 object-cover"
                                                      onError={() => setFailedCustomImageUrls((current) => new Set(current).add(url))}
                                                    />
                                                  </button>
                                                )}
                                                <button
                                                  type="button"
                                                  aria-label="Remove image"
                                                  onClick={() => setCustomFields((current) => ({ ...current, [field.key]: String(current[field.key] ?? "").split(",").map((item) => item.trim()).filter((item) => item && item !== url).join(", ") }))}
                                                  className="absolute -right-1.5 -top-1.5 rounded-full bg-white px-1.5 py-0.5 text-xs font-bold text-rose-600 shadow hover:bg-rose-50"
                                                >
                                                  ×
                                                </button>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="flex min-w-0 flex-col gap-1.5">
                                            {String(customFields[field.key]).split(",").map((url) => url.trim()).filter(Boolean).map((documentUrl) => (
                                              <div key={documentUrl} className="flex min-w-0 items-center gap-2">
                                                <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-teal-800">FILE</span>
                                                <span className="max-w-[220px] truncate font-mono text-slate-800">{documentUrl}</span>
                                                <a href={getRenderableBlogAssetUrl(documentUrl)} target="_blank" rel="noreferrer" className="shrink-0 font-semibold text-teal-700 hover:text-teal-900">Preview</a>
                                                <button
                                                  type="button"
                                                  aria-label="Remove document"
                                                  onClick={() => setCustomFields((current) => ({ ...current, [field.key]: String(current[field.key] ?? "").split(",").map((item) => item.trim()).filter((item) => item && item !== documentUrl).join(", ") }))}
                                                  className="shrink-0 font-semibold text-rose-600 hover:text-rose-800"
                                                >
                                                  ×
                                                </button>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setCustomFields((current) => ({
                                            ...current,
                                            [field.key]: "",
                                          }))
                                        }
                                        className="text-xs font-semibold text-rose-600 hover:text-rose-800 ml-2"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  ) : (
                                    <input
                                      value={String(customFields[field.key] ?? "")}
                                      onChange={(event) =>
                                        setCustomFields((current) => ({
                                          ...current,
                                          [field.key]: event.target.value,
                                        }))
                                      }
                                      className="w-full rounded-lg border border-[#d7e5df] bg-white px-3 py-2 text-xs focus:border-teal-600 focus:outline-none"
                                      placeholder="Or enter file path / URL directly..."
                                    />
                                  )}
                                  {customImagePreviewUrl && (field.type === "media_upload" || field.type === "image" || field.type === "image_list") ? (
                                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="presentation" onClick={() => setCustomImagePreviewUrl(null)}>
                                      <div className="relative max-h-[90vh] max-w-3xl overflow-hidden rounded-2xl bg-white p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
                                        <button type="button" onClick={() => setCustomImagePreviewUrl(null)} className="absolute right-3 top-3 rounded-lg bg-white/90 px-2 py-1 text-sm font-bold text-slate-700 shadow">Close</button>
                                        <img src={customImagePreviewUrl} alt="Additional image preview" className="max-h-[75vh] max-w-full rounded-xl object-contain" />
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              ) : (
                                <input
                                  value={String(customFields[field.key] ?? "")}
                                  onChange={(event) =>
                                    setCustomFields((current) => ({
                                      ...current,
                                      [field.key]: event.target.value,
                                    }))
                                  }
                                  className="mt-1.5 w-full rounded-xl border border-[#d7e5df] bg-white px-3 py-2.5 text-sm focus:border-teal-600 focus:outline-none"
                                  placeholder={field.placeholder?.trim() || "Enter value"}
                                />
                              )}

                              {field.help_text && (
                                <p className="mt-1 text-xs text-[#52736a]">
                                  {field.help_text}
                                </p>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
            <footer className="flex flex-wrap justify-between gap-3 border-t border-[#edf3f0] p-5">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                className="rounded-xl border border-[#d7e5df] px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
              >
                {editing?.status === "changes_requested" || editing?.status === "rejected" ? "Preview changes" : "Preview"}
              </button>
              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  disabled={(!editing && !activeForm) || activeFormLoading}
                  onClick={() => save(false)}
                  className="rounded-xl border border-[#d7e5df] px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save draft
                </button>
                <button
                  type="button"
                  disabled={(!editing && !activeForm) || activeFormLoading}
                  onClick={() => save(true)}
                  className="rounded-xl bg-[#1f6a58] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#185345] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {editing?.status === "changes_requested" || editing?.status === "rejected" ? "Resubmit for approval" : "Submit for approval"}
                </button>
              </div>
            </footer>
          </section>
        </div>
      )}

      {isPreviewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#06201c]/45 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label="Post preview"
        >
          <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4 border-b border-[#edf3f0] pb-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Article Preview</h2>
                <p className="text-xs text-[#52736a] mt-0.5">
                  Live preview of the published article layout. Enterprise Admin Only fields are not shown.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("mobile")}
                    className={`rounded-md px-2.5 py-1 transition-colors ${
                      previewDevice === "mobile"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Customer Mobile
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("desktop")}
                    className={`rounded-md px-2.5 py-1 transition-colors ${
                      previewDevice === "desktop"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Customer Web
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="rounded-lg border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Privacy Alert */}
            <div className="rounded-xl bg-teal-50 border border-teal-200 p-2.5 text-xs text-teal-900 flex items-center justify-between">
              <span className="font-medium">
                Public Reader View: Only approved public article content is rendered below.
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-white px-2 py-0.5 rounded border border-teal-200">
                Admin-Only Hidden
              </span>
            </div>

            {previewDevice === "mobile" ? (
              /* Mobile Smartphone Frame */
              <div className="w-full max-w-[375px] mx-auto rounded-[32px] border-4 border-slate-800 bg-white shadow-xl p-4 overflow-hidden flex flex-col gap-3">
                <div className="flex items-center justify-between px-1 text-[10px] font-semibold text-slate-500 border-b border-slate-100 pb-1.5">
                  <span>9:41</span>
                  <div className="w-12 h-2.5 bg-slate-800 rounded-full" />
                  <span>5G</span>
                </div>
                <div>
                  <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold uppercase text-teal-800">
                    {postTypeLabel(form.type)}
                  </span>
                  <h1 className="mt-1.5 text-base font-bold text-slate-900 leading-snug">
                    {form.title || "Post title preview"}
                  </h1>
                  <p className="mt-1 text-xs text-[#52736a]">
                    {form.category || "General"}
                  </p>
                </div>
                {form.coverImageUrl && (
                  <img
                    src={form.coverImageUrl}
                    alt="Post cover preview"
                    className="max-h-48 w-full rounded-xl object-cover"
                  />
                )}
                {form.summary && (
                  <p className="text-xs text-[#365b52] italic border-l-2 border-teal-500 pl-2">
                    {form.summary}
                  </p>
                )}
                <div
                  className="prose prose-sm max-w-none text-xs leading-relaxed text-[#365b52] [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                  dangerouslySetInnerHTML={{ __html: previewRichTextHtml(form.content, "Post content preview") }}
                />

                {/* Customer-Visible Custom Fields - Defined Display Layout */}
                {activeForm?.sections
                  .filter(
                    (sec) =>
                      sec.visible !== false &&
                      sec.visibility_scope !== "admin_only" &&
                      sec.type !== "admin_notes",
                  )
                  .flatMap((sec) =>
                    sec.fields.filter(
                      (f) =>
                        f.visible &&
                        f.visibility_scope !== "admin_only" &&
                        !SYSTEM_FIELD_KEYS.has(f.key) &&
                        customFields[f.key] !== undefined &&
                        customFields[f.key] !== "" &&
                        customFields[f.key] !== null,
                    ),
                  )
                  .map((field) => {
                    const val = customFields[field.key];
                    if (field.type === "textarea" || field.type === "rich_text" || field.type === "richtext") {
                      return (
                        <div
                          key={field.id}
                          className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50"
                        >
                          <span className="text-[11px] font-bold text-slate-900 block">
                            {field.label}
                          </span>
                          <p className="mt-1 text-xs text-slate-600 leading-relaxed italic whitespace-pre-wrap">
                            {String(val)}
                          </p>
                        </div>
                      );
                    }
                    if (field.type === "media_upload" || field.type === "image" || field.type === "image_list") {
                      const imageUrls = Array.isArray(val) ? val : String(val).split(",").map((item) => item.trim()).filter(Boolean);
                      return (
                        <div key={field.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800">{field.label}</span>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {imageUrls.map((url) => <img key={String(url)} src={String(url)} alt={field.label} className="h-16 w-16 rounded-lg border border-slate-200 object-cover" />)}
                          </div>
                        </div>
                      );
                    }
                    if (field.type === "file_upload" || field.type === "document") {
                      return (
                        <div
                          key={field.id}
                          className="p-2 rounded-lg border border-slate-200 bg-white flex items-center justify-between shadow-2xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-bold text-teal-800 uppercase">
                              DOC
                            </span>
                            <span className="text-xs font-semibold text-slate-800 truncate">
                              {String(val)}
                            </span>
                          </div>
                          <span className="text-[11px] font-semibold text-teal-700 shrink-0">
                            Download
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div
                        key={field.id}
                        className="rounded-lg bg-teal-50/40 border border-teal-100 p-2 text-xs flex flex-col gap-0.5"
                      >
                        <span className="font-semibold text-teal-900 block text-[10px] uppercase tracking-wider">
                          {field.label}
                        </span>
                        <span className="text-slate-800 text-xs font-medium">
                          {String(val)}
                        </span>
                      </div>
                    );
                  })}
              </div>
            ) : (
              /* Desktop Reader View */
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#7f9d94]">
                    {postTypeLabel(form.type)}
                  </p>
                  <h2 className="mt-1 text-2xl font-bold">
                    {form.title || "Post title preview"}
                  </h2>
                  <p className="mt-2 text-sm text-[#52736a]">
                    {form.category || "Category"}
                  </p>
                </div>
                {form.coverImageUrl && (
                  <img
                    src={form.coverImageUrl}
                    alt="Post cover preview"
                    className="max-h-72 w-full rounded-xl object-cover"
                  />
                )}
                {form.summary && (
                  <p className="whitespace-pre-wrap text-sm leading-6 text-[#365b52] italic border-l-3 border-teal-500 pl-3">
                    {form.summary}
                  </p>
                )}
                <div
                  className="prose prose-sm max-w-none text-sm leading-7 text-[#365b52] [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                  dangerouslySetInnerHTML={{ __html: previewRichTextHtml(form.content, "Post content preview") }}
                />

                {/* Customer-Visible Custom Fields - Defined Display Layout */}
                <div className="flex flex-col gap-3 pt-3 border-t border-[#edf3f0]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#175245]">
                      Additional Information
                    </span>
                    <span className="text-xs text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full font-medium border border-teal-100">
                      Approved Display Layout
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeForm?.sections
                      .filter(
                        (sec) =>
                          sec.visible !== false &&
                          sec.visibility_scope !== "admin_only" &&
                          sec.type !== "admin_notes",
                      )
                      .flatMap((sec) =>
                        sec.fields.filter(
                          (f) =>
                            f.visible &&
                            f.visibility_scope !== "admin_only" &&
                            !SYSTEM_FIELD_KEYS.has(f.key) &&
                            customFields[f.key] !== undefined &&
                            customFields[f.key] !== "" &&
                            customFields[f.key] !== null,
                        ),
                      )
                      .map((field) => {
                        const val = customFields[field.key];
                        if (field.type === "textarea" || field.type === "rich_text" || field.type === "richtext") {
                          return (
                            <div
                              key={field.id}
                              className="sm:col-span-2 rounded-xl border border-[#d7e5df] bg-[#fbfdfc] p-4"
                            >
                              <span className="block text-xs font-bold uppercase tracking-wider text-[#175245]">
                                {field.label}
                              </span>
                              <p className="mt-1 text-sm text-slate-700 leading-relaxed italic whitespace-pre-wrap">
                                {String(val)}
                              </p>
                            </div>
                          );
                        }
                        if (field.type === "media_upload" || field.type === "image" || field.type === "image_list") {
                          const imageUrls = Array.isArray(val) ? val : String(val).split(",").map((item) => item.trim()).filter(Boolean);
                          return (
                            <div key={field.id} className="rounded-xl border border-[#d7e5df] bg-white p-3 shadow-2xs">
                              <span className="block text-xs font-bold uppercase tracking-wider text-[#175245]">{field.label}</span>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {imageUrls.map((url) => <img key={String(url)} src={String(url)} alt={field.label} className="h-20 w-20 rounded-lg border border-[#d7e5df] object-cover" />)}
                              </div>
                            </div>
                          );
                        }
                        if (field.type === "file_upload" || field.type === "document") {
                          return (
                            <div
                              key={field.id}
                              className="rounded-xl border border-[#d7e5df] bg-white p-3 flex items-center justify-between shadow-2xs"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="rounded bg-teal-100 px-2 py-0.5 text-xs font-bold text-teal-800 uppercase">
                                  DOC
                                </span>
                                <span className="text-sm font-semibold text-slate-800 truncate">
                                  {String(val)}
                                </span>
                              </div>
                              <span className="text-xs font-semibold text-teal-700 shrink-0">
                                Download
                              </span>
                            </div>
                          );
                        }
                        return (
                          <div
                            key={field.id}
                            className="rounded-xl border border-[#d7e5df] bg-[#fbfdfc] p-3 flex flex-col gap-1"
                          >
                            <span className="block text-xs font-semibold text-[#175245]">
                              {field.label}
                            </span>
                            <span className="text-sm text-slate-700 font-medium">
                              {String(val)}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
