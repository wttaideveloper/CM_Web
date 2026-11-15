"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCurrentEnterprise } from "@ihp/enterprise-runtime";
import {
  BlogManageItem,
  BlogPostFields,
  BlogForm,
  BlogCategory,
  BlogCustomFieldValue,
  BlogFormField,
  BlogManageDetail,
  getMyBlogPost,
  getMyBlogForm,
  getAdminBlogFormVersion,
  listMyBlogPosts,
  listBlogCategories,
  createMyBlogPost,
  updateMyBlogPost,
  deleteMyBlogPost,
  unpublishMyBlogPost,
  submitMyBlogPost,
  uploadBlogAsset,
  isBlogModuleEnabled,
  type BlogModuleKey,
  type BlogLinkedEntity,
} from "@ihp/shared";

export type PostType = "blog" | "news" | "both";
export type PostStatus = "draft" | "pending_review" | "changes_requested" | "rejected" | "published" | "unpublished";
export type PostFields = BlogPostFields;
export type Post = PostFields & {
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
type AuthoringContext = { module: "events" | "trainings" | "products" | "services"; entityId: string; entityTitle: string };

const EMPTY_FORM: PostFields = {
  type: "blog", title: "", summary: "", content: "", category: "", coverImageUrl: "", tags: "",
};
const SYSTEM_FIELD_KEYS = new Set(["post_type", "title", "post_title_slug", "excerpt", "short_summary", "content", "article_content", "category", "category_id", "cover_image", "cover_image_url", "cover_image_file", "tags", "article_tags"]);
const MAX_BLOG_TAG_LENGTH = 30;
const STATUS_LABEL: Record<PostStatus, string> = { draft: "Draft", pending_review: "Pending approval", changes_requested: "Changes requested", rejected: "Rejected", published: "Published", unpublished: "Unpublished" };

function postTypeLabel(value: PostType): string { return value === "both" ? "Blog & News" : value === "blog" ? "Blog" : "News"; }
function plainTextFromRichText(value: string): string { return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(); }
function isAuthoringModule(value: unknown): value is AuthoringContext["module"] { return value === "events" || value === "trainings" || value === "products" || value === "services"; }

export function useBlogManagement() {
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
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
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
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingKeys, setUploadingKeys] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; message: string; confirmLabel: string; destructive?: boolean; isPending?: boolean; onConfirm: () => Promise<void> } | null>(null);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeForm, setActiveForm] = useState<BlogForm | null>(null);
  const [activeFormLoading, setActiveFormLoading] = useState(false);
  const [activeFormError, setActiveFormError] = useState("");
  const [customFields, setCustomFields] = useState<Record<string, BlogCustomFieldValue>>({});
  const [initialCustomFields, setInitialCustomFields] = useState<Record<string, BlogCustomFieldValue>>({});
  const [authoringContext, setAuthoringContext] = useState<AuthoringContext | null>(null);

  const detailsBasePath = typeof window !== "undefined" && window.location.pathname.startsWith("/admin/blogs") ? "/admin/blogs" : "/admin/my-blogs";
  const enterpriseUnavailable = Boolean(enterpriseError) && !isLoadingEnterprise;
  const enterpriseErrorMessage = enterpriseError ?? "";

  const mapPost = (item: BlogManageItem): Post => {
    const postKind: PostType = item.kind === "both" ? "both" : (item as unknown as { custom_fields?: { post_type?: string } }).custom_fields?.post_type === "both" ? "both" : item.kind;
    return {
      id: item.id, type: postKind, title: item.title, summary: item.excerpt ?? "", content: "",
      category: item.category_id ?? "", coverImageUrl: item.cover_image_url ?? "", tags: item.tags.join(", "),
      status: item.status === "pending_approval" ? "pending_review" : item.status === "deleted" ? "unpublished" : item.status,
      createdAt: item.created_at, updatedAt: item.updated_at, author: item.author_name ?? "Enterprise Admin",
      enterprise: item.business_name ?? "Current enterprise", pinned: item.is_pinned, feedback: item.reviewer_note ?? undefined,
      enterpriseId: item.enterprise_id, tenantId: item.tenant_id, version: item.version, module: item.module ?? null, linkedEntity: item.linked_entity ?? null,
    };
  };

  const configuredField = (...keys: string[]) => activeForm?.sections.flatMap((s) => s.fields).find((f) => keys.includes(f.key));
  const isConfiguredFieldVisible = (keys: string[], fallback = true) => {
    if (!activeForm) return fallback;
    return configuredField(...keys)?.visible === true;
  };

  useEffect(() => {
    if (isLoadingEnterprise || !enterpriseId) { if (!isLoadingEnterprise) setIsLoading(false); return; }
    let cancelled = false;
    void Promise.all([listMyBlogPosts({ page: 1, pageSize: 100, enterpriseId }), listBlogCategories()])
      .then(([pr, cr]) => { if (!cancelled) { setPosts(pr.items.map(mapPost)); setCategories(cr); } })
      .catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Unable to load your posts."); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [enterpriseId, isLoadingEnterprise]);

  const visiblePosts = useMemo(() => posts.filter((post) => {
    if (isLoadingEnterprise || !enterpriseId) return false;
    if (post.enterpriseId && post.enterpriseId !== enterpriseId) return false;
    const matchesStatus = activeFilter === "all" || post.status === activeFilter;
    const matchesType = typeFilter === "all" || post.type === typeFilter || (typeFilter !== "both" && post.type === "both");
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [post.title, post.summary, post.category].some((v) => v.toLowerCase().includes(query));
    const matchesCategory = selectedCategory === "all" || post.category === selectedCategory;
    return matchesStatus && matchesType && matchesCategory && matchesSearch;
  }), [enterpriseId, isLoadingEnterprise, posts, activeFilter, typeFilter, search, selectedCategory]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: posts.length };
    (["draft", "pending_review", "changes_requested", "rejected", "published", "unpublished"] as PostStatus[]).forEach((s) => { c[s] = posts.filter((p) => p.status === s).length; });
    return c;
  }, [posts]);

  const loadActiveForm = async (kind: PostType) => {
    setActiveFormLoading(true); setActiveFormError("");
    try { const resolved = await getMyBlogForm(kind, enterpriseId ?? undefined); setActiveForm(resolved); setActiveFormError(""); }
    catch (reason: unknown) {
      setActiveForm(null);
      let msg = reason instanceof Error ? reason.message : "";
      if (msg.trim().startsWith("[") || msg.trim().startsWith("{")) {
        try { const parsed = JSON.parse(msg); if (Array.isArray(parsed) && parsed[0]?.msg) msg = parsed.map((p: { msg?: string }) => p.msg).filter(Boolean).join("; "); else if (parsed && typeof parsed === "object" && "detail" in parsed) msg = typeof parsed.detail === "string" ? parsed.detail : ""; } catch { /* keep */ }
      }
      if (!msg || msg.includes("literal_error") || msg.includes("Failed to fetch") || msg.includes("NetworkError")) msg = `There is no active form configured for ${postTypeLabel(kind)}.`;
      setActiveFormError(msg);
    } finally { setActiveFormLoading(false); }
  };

  useEffect(() => { if (!isDrawerOpen) return; if (editing) return; void loadActiveForm(form.type); }, [form.type, isDrawerOpen, enterpriseId, editing]);

  const openCreate = (context: AuthoringContext | null = null) => {
    if (isLoadingEnterprise || !enterpriseId) { setError(enterpriseError ?? "Your enterprise could not be identified yet."); return; }
    const nextForm = { ...EMPTY_FORM };
    setEditing(null); setForm(nextForm); setInitialForm(nextForm); setCustomFields({}); setInitialCustomFields({}); setAuthoringContext(context); setError(""); setNotice(""); setIsDrawerOpen(true);
  };

  const openEdit = async (post: Post) => {
    if (post.status === "pending_review") { setError("This post is pending approval and cannot be edited."); return; }
    let editable = post; let loadedCustomFields: Record<string, BlogCustomFieldValue> = {}; let loadedContext: AuthoringContext | null = null; let postFormId: string | null = null; let postFormVersion: number | null = null;
    try {
      const detail = await getMyBlogPost(post.id, enterpriseId ?? undefined);
      editable = { ...post, content: detail.content, summary: detail.excerpt ?? post.summary, category: detail.category_id ?? post.category, coverImageUrl: detail.cover_image_url ?? post.coverImageUrl, version: detail.version ?? post.version };
      if (detail.custom_fields) loadedCustomFields = detail.custom_fields;
      if (detail.supporting_documents?.length && loadedCustomFields.supporting_documents === undefined) loadedCustomFields.supporting_documents = detail.supporting_documents.map((d) => (typeof d === "string" ? d : d.url));
      if (detail.linked_entity && isAuthoringModule(detail.module) && typeof detail.linked_entity.id === "string") loadedContext = { module: detail.module, entityId: detail.linked_entity.id, entityTitle: "Linked item" };
      postFormId = detail.form_id ?? null; postFormVersion = detail.form_version ?? null;
    } catch { /* keep list data */ }
    const nextForm = { type: editable.type, title: editable.title, summary: editable.summary, content: editable.content, category: editable.category, coverImageUrl: editable.coverImageUrl, tags: editable.tags };
    setEditing(editable); setForm(nextForm); setInitialForm(nextForm); setCustomFields(loadedCustomFields); setInitialCustomFields(loadedCustomFields); setAuthoringContext(loadedContext);
    if (postFormId && postFormVersion) {
      setActiveFormLoading(true); setActiveFormError("");
      try { const originalForm = await getAdminBlogFormVersion(postFormId, postFormVersion); setActiveForm(originalForm); setActiveFormError(""); }
      catch { await loadActiveForm(editable.type); } finally { setActiveFormLoading(false); }
    } else { await loadActiveForm(editable.type); }
    setError(""); setNotice(""); setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    const hasChanges = JSON.stringify(form) !== JSON.stringify(initialForm) || JSON.stringify(customFields) !== JSON.stringify(initialCustomFields);
    if (hasChanges && !window.confirm("Discard your unsaved changes?")) return;
    setEditing(null); setIsDrawerOpen(false); setForm(EMPTY_FORM); setInitialForm(EMPTY_FORM); setCustomFields({}); setInitialCustomFields({}); setAuthoringContext(null); setError("");
  };

  const unpublish = (post: Post) => {
    setConfirmDialog({ isOpen: true, title: "Unpublish post?", message: `Unpublish “${post.title}”? It will no longer be visible to readers.`, confirmLabel: "Unpublish", destructive: true, isPending: false, onConfirm: async () => {
      try { const updated = await unpublishMyBlogPost(post.id); setPosts((c) => c.map((i) => (i.id === post.id ? mapPost(updated) : i))); setNotice("Post unpublished."); setConfirmDialog(null); }
      catch (reason: unknown) { setError(reason instanceof Error ? reason.message : "Unable to unpublish this post."); setConfirmDialog(null); }
    } });
  };

  const removeDraft = (post: Post) => {
    setConfirmDialog({ isOpen: true, title: "Delete draft?", message: `Delete draft “${post.title}”? This action cannot be undone.`, confirmLabel: "Delete draft", destructive: true, isPending: false, onConfirm: async () => {
      try { await deleteMyBlogPost(post.id); setPosts((c) => c.filter((i) => i.id !== post.id)); setNotice("Draft deleted."); setConfirmDialog(null); }
      catch (reason: unknown) { setError(reason instanceof Error ? reason.message : "Unable to delete this draft."); setConfirmDialog(null); }
    } });
  };

  const save = async (submit: boolean) => {
    if (editing?.status === "pending_review") { setError("This post is pending approval and cannot be edited."); return; }
    if (!editing && !activeForm) { setError(activeFormError || `Creation unavailable. No active ${postTypeLabel(form.type)} form configuration has been assigned to your enterprise. Please contact your platform administrator.`); return; }
    if (submit && !activeForm) { setError(activeFormError || `Creation unavailable. No active ${postTypeLabel(form.type)} form configuration is assigned to this enterprise.`); return; }
    if (!editing && !isBlogModuleEnabled("general")) { setError("General Blog and News post creation is currently paused by Super Admin governance."); return; }
    if (!form.title.trim()) { setError("Enter a post title."); return; }
    if (submit && (!form.summary.trim() || !plainTextFromRichText(form.content).trim() || !form.category.trim() || !form.coverImageUrl.trim())) { setError("Add a summary, post content, category, and cover image before submitting."); return; }
    if (submit && activeForm?.sections) {
      for (const section of activeForm.sections) {
        if (section.visible === false) continue;
        for (const field of section.fields) {
          if (!field.visible || !field.required) continue;
          if (SYSTEM_FIELD_KEYS.has(field.key)) continue;
          const val = customFields[field.key];
          if (val === undefined || val === null || String(val).trim() === "") {
            const isFieldAdmin = section.visibility_scope === "admin_only" || section.type === "admin_notes" || field.visibility_scope === "admin_only";
            setError(isFieldAdmin ? `Please complete required internal field “${field.label}” before submitting for approval.` : `Please complete required field “${field.label}” before submitting for approval.`);
            return;
          }
        }
      }
    }
    if (submit && !window.confirm(editing?.status === "changes_requested" || editing?.status === "rejected" ? "Resubmit this post for Super Admin approval?" : "Submit this post for Super Admin approval?")) return;
    setIsSaving(true);
    try {
      const listValue = (...keys: string[]) => { const value = keys.map((key) => customFields[key]).find((item) => item !== undefined); if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string"); if (typeof value !== "string") return []; return value.split(",").map((item) => item.trim()).filter(Boolean); };
      const documentValues = listValue("supporting_documents", "supporting_document").map((url) => ({ url, name: url.split("/").pop() || "Supporting document" }));
      const normalizedCustomFields: Record<string, BlogCustomFieldValue> = {};
      if (!form.type) { setError("Select Blog or News before saving this post."); setIsSaving(false); return; }
      normalizedCustomFields.post_type = form.type;
      for (const section of activeForm?.sections ?? []) {
        for (const field of section.fields) {
          if (field.key === "supporting_documents") continue;
          const rawValue = customFields[field.key];
          if (rawValue === undefined) continue;
          if (field.type === "number") {
            if (rawValue === "" || rawValue === null) { normalizedCustomFields[field.key] = null; continue; }
            const numericValue = typeof rawValue === "number" ? rawValue : Number(rawValue);
            if (!Number.isFinite(numericValue)) { setError(`${field.label} must be a number.`); setIsSaving(false); return; }
            normalizedCustomFields[field.key] = numericValue;
          } else if (field.type === "multi_select" || field.type === "multiselect") {
            const selectedValues = listValue(field.key);
            const allowedValues = typeof field.validation?.options === "string" ? field.validation.options.split(",").map((item) => item.trim()).filter(Boolean) : Array.isArray(field.validation?.options) ? field.validation.options.map(String) : [];
            const invalidValue = allowedValues.length > 0 && selectedValues.find((value) => !allowedValues.includes(value));
            if (invalidValue) { setError(`${field.label}: pick from ${allowedValues.join(", ")}.`); setIsSaving(false); return; }
            normalizedCustomFields[field.key] = selectedValues;
          } else if (field.type === "checkbox") {
            normalizedCustomFields[field.key] = rawValue === true || rawValue === "true";
          } else if (field.type === "media_upload" || field.type === "image" || field.type === "image_list") {
            const imageValues = listValue(field.key);
            normalizedCustomFields[field.key] = imageValues.length > 1 ? imageValues : imageValues[0] ?? "";
          } else {
            if (field.type === "select" || field.type === "radio") {
              const allowedValues = typeof field.validation?.options === "string" ? field.validation.options.split(",").map((item) => item.trim()).filter(Boolean) : Array.isArray(field.validation?.options) ? field.validation.options.map(String) : [];
              if (allowedValues.length > 0 && typeof rawValue === "string" && rawValue && !allowedValues.includes(rawValue)) { setError(`${field.label}: pick from ${allowedValues.join(", ")}.`); setIsSaving(false); return; }
            }
            normalizedCustomFields[field.key] = rawValue;
          }
        }
      }
      const authorTags = form.tags.split(",").map((tag) => tag.trim()).filter(Boolean);
      const invalidTag = (configuredField("tags", "article_tags") ? authorTags.find((tag) => tag.length > MAX_BLOG_TAG_LENGTH) : undefined);
      if (invalidTag) { setError(`The tag “${invalidTag}” is too long. Tags must be 30 characters or fewer.`); setIsSaving(false); return; }
      const payload = {
        kind: form.type === "both" ? "blog" : form.type,
        title: form.title.trim(),
        excerpt: form.summary.trim() || null,
        content: form.content,
        category_id: form.category || null,
        cover_image_url: form.coverImageUrl.trim() || null,
        ...(configuredField("tags", "article_tags") ? { tags: authorTags } : {}),
        ...(configuredField("additional_images", "image_list", "additional_image") ? { additional_images: listValue("additional_images") } : {}),
        ...(configuredField("reference_url", "reference_urls") ? { reference_urls: listValue("reference_url") } : {}),
        ...(configuredField("supporting_document", "supporting_documents") ? { supporting_documents: documentValues } : {}),
        custom_fields: { ...normalizedCustomFields, post_type: form.type },
        form_id: activeForm?.id ?? null,
        form_version: activeForm?.version ?? null,
        module: authoringContext?.module ?? ("general" as const),
        ...(authoringContext ? { linked_entity: { type: ({ events: "event", trainings: "training", products: "product", services: "service" } as const)[authoringContext.module], id: authoringContext.entityId } } : {}),
        ...(editing?.version ? { base_version: editing.version } : {}),
      };
      const saved = editing ? await updateMyBlogPost(editing.id, payload) : await createMyBlogPost(payload);
      const submitted = submit ? await submitMyBlogPost(saved.id) : saved;
      setPosts((current) => [mapPost(submitted), ...current.filter((post) => post.id !== submitted.id)]);
      setNotice(submit ? "Post submitted for Super Admin review." : "Draft saved.");
      setEditing(null); setForm(EMPTY_FORM); setInitialForm(EMPTY_FORM); setCustomFields({}); setInitialCustomFields({}); setAuthoringContext(null); setError(""); setIsDrawerOpen(false);
      if (submit) router.push(`${detailsBasePath}/${encodeURIComponent(saved.id)}`);
      setIsSaving(false);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Unable to save this post.");
      setIsSaving(false);
    }
  };

  useEffect(() => { if (!isDrawerOpen) return; const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") closeDrawer(); }; window.addEventListener("keydown", handleKeyDown); return () => window.removeEventListener("keydown", handleKeyDown); }, [isDrawerOpen, form, initialForm, customFields, initialCustomFields]);
  useEffect(() => { if (!requestedEditId || isLoading || autoOpenedEditId.current === requestedEditId) return; const post = posts.find((item) => item.id === requestedEditId); if (!post) return; autoOpenedEditId.current = requestedEditId; if (post.status === "pending_review") { setError("This post is pending approval and cannot be edited."); router.replace(detailsBasePath); return; } void openEdit(post).then(() => router.replace(detailsBasePath)); }, [isLoading, posts, requestedEditId, router]);
  useEffect(() => { if (isLoadingEnterprise || !enterpriseId || isLoading || requestedEditId || !contextualModule || !contextualEntityId || !contextualEntityTitle) return; if (!Object.hasOwn({ events: true, trainings: true, products: true, services: true }, contextualModule)) return; const contextKey = `${contextualModule}:${contextualEntityId}`; if (autoOpenedContext.current === contextKey) return; autoOpenedContext.current = contextKey; openCreate({ module: contextualModule, entityId: contextualEntityId, entityTitle: contextualEntityTitle }); router.replace(detailsBasePath); }, [contextualEntityId, contextualEntityTitle, contextualModule, enterpriseId, isLoading, isLoadingEnterprise, requestedEditId, router]);

  const handleUploadMedia = async (field: BlogFormField, files: FileList | null) => {
    const fileArray = Array.from(files ?? []);
    if (fileArray.length === 0) return;
    const maxSizeMb = Number(field.validation?.max_file_size_mb ?? 25);
    const oversized = fileArray.find((f) => f.size > maxSizeMb * 1024 * 1024);
    if (oversized) { setError(`${oversized.name} exceeds the ${maxSizeMb}MB file limit.`); return; }
    setUploadingKeys((prev) => new Set(prev).add(field.key));
    setError("");
    try {
      const isImage = ["media_upload", "additional_images", "image", "image_list"].includes(field.type);
      const purpose = isImage ? "image" : "document";
      const uploaded = await Promise.all(fileArray.map((f) => uploadBlogAsset(f, purpose)));
      const urls = uploaded.map((asset, i) => asset.url || fileArray[i]?.name).filter(Boolean);
      const existing = String(customFields[field.key] ?? "").split(",").map((item) => item.trim()).filter(Boolean);
      setCustomFields((current) => ({ ...current, [field.key]: [...existing, ...urls].join(", ") }));
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Unable to upload the selected file.");
    } finally {
      setUploadingKeys((prev) => { const next = new Set(prev); next.delete(field.key); return next; });
    }
  };
  const handleRemoveMedia = (fieldKey: string, urlToRemove: string) => {
    const current = String(customFields[fieldKey] ?? "").split(",").map((item) => item.trim()).filter(Boolean);
    setCustomFields((prev) => ({ ...prev, [fieldKey]: current.filter((url) => url !== urlToRemove).join(", ") }));
  };

  return {
    posts, categories, isLoading, isLoadingEnterprise, enterpriseId, enterpriseUnavailable, enterpriseErrorMessage, error, setError, notice, setNotice,
    counts, search, setSearch, activeFilter, setActiveFilter, typeFilter, setTypeFilter, selectedCategory, setSelectedCategory,
    detailsBasePath, openCreate, openEdit, unpublish, removeDraft, isDrawerOpen, closeDrawer, editing, form, setForm, activeForm, activeFormLoading, authoringContext, customFields, setCustomFields, handleUploadMedia, handleRemoveMedia, uploadingKeys, save, isSaving, isPreviewOpen, setIsPreviewOpen, confirmDialog, setConfirmDialog, visiblePosts,
  };
}
