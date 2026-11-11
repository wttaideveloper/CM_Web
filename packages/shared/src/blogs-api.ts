import {
  type BlogModuleKey,
  type BlogGovernanceResponse,
  type BlogGovernanceAuditResponse,
  getBlogGovernance,
  getStoredGovernanceResponse,
  saveStoredGovernanceResponse,
  getStoredGovernanceAudit,
  recordGovernanceAudit,
  DEFAULT_BLOG_GOVERNANCE,
} from "./blogs-governance";
import { authenticatedFetch } from "@ihp/auth";
import {
  buildBlogsApiQuery,
  buildBlogsApiUrl,
  resolveBlogsApiBase,
} from "./blogs-routing";

export { buildBlogsApiQuery, buildBlogsApiUrl, resolveBlogsApiBase } from "./blogs-routing";

export type BlogKind = "blog" | "news" | "both";
export type BlogSource = "platform" | "merchant";
export type BlogStatus =
  | "draft"
  | "pending_approval"
  | "changes_requested"
  | "rejected"
  | "published"
  | "unpublished"
  | "deleted";
export type BlogCustomFieldValue = string | number | boolean | string[] | null;
export type BlogAction =
  | "edit"
  | "submit"
  | "discard_changes"
  | "unpublish"
  | "delete"
  | "publish"
  | "review"
  | "pin"
  | "unpin";

export interface PaginationMeta {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}
export interface BlogCategory {
  id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
  post_count?: number;
}
export interface PublicBlogItem {
  id: string;
  title: string;
  slug: string;
  kind: BlogKind;
  excerpt: string | null;
  cover_image_url: string | null;
  author_name: string | null;
  author_type: BlogSource;
  business_name: string | null;
  business_logo_url: string | null;
  tenant_id: string | null;
  enterprise_id: string | null;
  category: string | null;
  category_id: string | null;
  tags: string[];
  is_pinned: boolean;
  status: "published";
  published_at: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
}
export interface BlogLiveVersion {
  kind: BlogKind;
  title: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  category: string | null;
  category_id: string | null;
  tags: string[];
}
export interface BlogPendingRevision extends BlogLiveVersion {
  custom_fields?: Record<string, BlogCustomFieldValue>;
  form_id?: string | null;
  form_version?: number | null;
  module?: BlogModuleKey | null;
  linked_entity?: BlogLinkedEntity | null;
}
export interface BlogLinkedEntity {
  type: "event" | "training" | "product" | "service";
  id: string;
}
export interface BlogManageItem extends Omit<PublicBlogItem, "status"> {
  status: BlogStatus;
  status_label: string;
  is_live: boolean;
  has_pending_revision: boolean;
  reviewer_id?: string | null;
  reviewer_name?: string | null;
  reviewer_note: string | null;
  reviewed_at: string | null;
  submitted_at: string | null;
  actions: BlogAction[];
  version?: number;
  module?: BlogModuleKey | null;
  linked_entity?: BlogLinkedEntity | null;
}
export interface BlogManageDetail extends BlogManageItem {
  content: string;
  author_id: string | null;
  live_version: BlogLiveVersion | null;
  pending_revision?: BlogPendingRevision | null;
  additional_images?: string[];
  reference_urls?: string[];
  supporting_documents?: Array<string | BlogDocumentValue>;
  custom_fields?: Record<string, BlogCustomFieldValue>;
  form_id?: string | null;
  form_version?: number | null;
}
export interface BlogHistoryItem {
  id: string;
  post_id?: string;
  action: string;
  from_status: BlogStatus | null;
  to_status: BlogStatus | null;
  reason: string | null;
  actor_id: string | null;
  actor_name: string | null;
  actor_role: string | null;
  created_at: string;
}
export interface BlogHistoryResponse {
  items: BlogHistoryItem[];
  total: number;
}
export interface UploadResponse {
  url: string;
  name: string;
  size: number;
  type: string;
  asset_id?: string;
  id?: string;
}
export interface BlogDocumentValue {
  url: string;
  name: string;
}
export interface BlogPostPayload {
  kind: BlogKind;
  title: string;
  excerpt?: string | null;
  content?: string;
  category_id?: string | null;
  cover_image_url?: string | null;
  tags?: string[];
  enterprise_id?: string | null;
  additional_images?: string[];
  reference_urls?: string[];
  supporting_documents?: Array<string | BlogDocumentValue>;
  custom_fields?: Record<string, BlogCustomFieldValue>;
  form_id?: string | null;
  form_version?: number | null;
  base_version?: number | null;
  revision?: boolean;
  change_notes?: string | null;
  module?: BlogModuleKey | null;
  linked_entity?: BlogLinkedEntity | null;
}
export interface BlogFormField {
  id: string;
  key: string;
  label: string;
  type: string;
  required: boolean;
  visible: boolean;
  help_text?: string | null;
  validation?: Record<string, string | number | boolean | null> | null;
  placeholder?: string | null;
  visibility_scope?: string | null;
  order: number;
}
export interface BlogFormSection {
  id: string;
  title: string;
  description?: string | null;
  type?: string | null;
  order: number;
  visible?: boolean;
  visibility_scope?: string | null;
  fields: BlogFormField[];
}
export interface BlogForm {
  id: string;
  name: string;
  type: BlogKind | "both";
  mode: "standard" | "configurable";
  version: number;
  status: "draft" | "published" | "active" | "inactive";
  scope: "global" | "selected" | "unassigned";
  tenant_ids?: string[];
  assigned_count?: number;
  post_count?: number;
  revision?: number;
  has_unpublished_changes?: boolean;
  sections: BlogFormSection[];
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
}
export interface BlogRevision {
  id: string;
  version: number;
  status: BlogStatus;
  created_at: string;
  created_by?: string | null;
  submitted_at?: string | null;
  published_at?: string | null;
  change_summary?: string | null;
}
export interface PublicBlogDetail extends PublicBlogItem {
  content: string;
  additional_images?: string[];
  reference_urls?: string[];
  supporting_documents?: Array<string | BlogDocumentValue>;
  custom_fields?: Record<string, BlogCustomFieldValue>;
}

const API_BASE = resolveBlogsApiBase(
  typeof process !== "undefined" ? process.env.NEXT_PUBLIC_API_BASE_URL : undefined,
);
const apiUrl = (path: string) => buildBlogsApiUrl(API_BASE, path);

/** Uses the platform's server-side Super Admin bridge for protected Blog/News admin reads and writes. */
function requestUrl(path: string): string {
  const isPlatformBlogRoute =
    typeof window !== "undefined" &&
    (window.location.pathname.startsWith("/blog-") ||
      window.location.pathname.startsWith("/module-settings") ||
      window.location.port === "3002") &&
    path.startsWith("/cms/blogs/");
  if (isPlatformBlogRoute) {
    return `/api/platform-super-admin/blogs${path}`;
  }

  // Enterprise Admin must use the app-local proxy so the HttpOnly auth
  // session cookie is forwarded to the protected Blogs API. Calling the
  // chat API origin directly from the browser loses that cookie and makes
  // authenticated Enterprise requests appear as "Not authenticated".
  const isEnterpriseBlogRoute =
    typeof window !== "undefined" &&
    (window.location.pathname.startsWith("/admin/blogs") ||
      window.location.pathname.startsWith("/admin/my-blogs") ||
      window.location.pathname.startsWith("/admin/events") ||
      window.location.pathname.startsWith("/admin/trainings") ||
      window.location.pathname.startsWith("/admin/products") ||
      window.location.pathname.startsWith("/admin/services")) &&
    path.startsWith("/cms/blogs/");
  return isEnterpriseBlogRoute ? `/api/v1${path}` : apiUrl(path);
}

export class BlogsApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = "BlogsApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const response = await authenticatedFetch(requestUrl(path), {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(method !== "GET" ? { "X-Requested-With": "XMLHttpRequest" } : {}),
      ...(init?.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    let detail: unknown;
    try {
      detail = await response.json();
    } catch {
      detail = undefined;
    }
    const record = isRecord(detail) ? detail : null;
    let baseMessage = `Blogs API request failed (${response.status}).`;
    if (record && "detail" in record) {
      if (typeof record.detail === "string") {
        baseMessage = record.detail;
      } else if (Array.isArray(record.detail)) {
        const formatted = record.detail
          .map((item) => {
            if (isRecord(item)) {
              const msg = typeof item.msg === "string" ? item.msg : "";
              const locList = Array.isArray(item.loc)
                ? item.loc.filter((segment) => segment !== "body" && segment !== "query")
                : [];
              const loc = locList.join(".");
              return loc ? `${loc}: ${msg}` : msg;
            }
            return typeof item === "string" ? item : "";
          })
          .filter(Boolean)
          .join("; ");
        baseMessage = formatted || `Request failed (${response.status}).`;
      } else if (isRecord(record.detail) && typeof record.detail.message === "string") {
        baseMessage = record.detail.message;
      } else {
        baseMessage = `Request failed (${response.status}).`;
      }
    }
    const fieldErrors = record && Array.isArray(record.errors)
      ? record.errors
          .filter(isRecord)
          .map((item) => {
            const field = typeof item.field === "string" ? item.field : "Form configuration";
            const message = typeof item.message === "string" ? item.message : "Invalid value";
            return `${field}: ${message}`;
          })
          .filter(Boolean)
      : [];
    const message = fieldErrors.length > 0
      ? `${baseMessage} ${fieldErrors.join(" ")}`
      : baseMessage;
    throw new BlogsApiError(message, response.status, detail);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function query(params: Record<string, string | number | undefined>): string {
  return buildBlogsApiQuery(params);
}

function paginate<T>(
  items: T[],
  page = 1,
  pageSize = 20,
): PaginatedResponse<T> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, pageSize);
  const total = items.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / safePageSize);
  const start = (safePage - 1) * safePageSize;
  return {
    items: items.slice(start, start + safePageSize),
    pagination: {
      total,
      page: safePage,
      page_size: safePageSize,
      total_pages: totalPages,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeCustomFieldValue(value: unknown): BlogCustomFieldValue {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  return String(value);
}

function normalizeCustomFields(value: unknown): Record<string, BlogCustomFieldValue> | undefined {
  if (Array.isArray(value)) {
    const fields: Record<string, BlogCustomFieldValue> = {};
    value.filter(isRecord).forEach((field) => {
      const key = stringValue(field.key || field.field_key);
      if (key) fields[key] = normalizeCustomFieldValue(field.value);
    });
    return Object.keys(fields).length > 0 ? fields : undefined;
  }
  if (!isRecord(value)) return undefined;
  const fields = Object.fromEntries(
    Object.entries(value).map(([key, fieldValue]) => [
      key,
      isRecord(fieldValue) && "value" in fieldValue
        ? normalizeCustomFieldValue(fieldValue.value)
        : normalizeCustomFieldValue(fieldValue),
    ]),
  );
  return Object.keys(fields).length > 0 ? fields : undefined;
}

function normalizeBlogPostFields<T extends { custom_fields?: Record<string, BlogCustomFieldValue> }>(post: T): T {
  return {
    ...post,
    custom_fields: normalizeCustomFields(post.custom_fields),
  };
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function dateStringValue(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    const timestamp = value > 10_000_000_000 ? value : value * 1000;
    return new Date(timestamp).toISOString();
  }
  return fallback;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function unwrapForm(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) return {};
  for (const key of ["item", "form", "data"]) {
    const nested = value[key];
    if (isRecord(nested)) return unwrapForm(nested);
  }
  return value;
}

function parseDefinition(value: unknown): Record<string, unknown> {
  if (isRecord(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return isRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function normalizeForm(value: unknown): BlogForm {
  const raw = unwrapForm(value);
  const rawDefinition = parseDefinition(raw.definition ?? raw.form_definition ?? raw.schema);
  const rawType = stringValue(raw.type || raw.form_type || raw.content_type || raw.kind).toLowerCase();
  const type: BlogForm["type"] = rawType === "blog" ? "blog" : rawType === "news" ? "news" : "both";
  // Blog & News uses one builder: default system fields plus configurable
  // sections and fields. Older records may still carry mode=standard; they
  // are presented through the current unified builder.
  const mode: BlogForm["mode"] = "configurable";
  const rawVersion = raw.version ?? raw.current_version ?? raw.schema_version;
  const parsedVersion = typeof rawVersion === "string" ? Number.parseInt(rawVersion.replace(/^v/i, ""), 10) : rawVersion;
  const version = numberValue(parsedVersion, 1);
  const statuses: BlogForm["status"][] = ["draft", "published", "active", "inactive"];
  const responseStatus = statuses.includes(raw.status as BlogForm["status"])
    ? (raw.status as BlogForm["status"])
    : "draft";
  // The activation endpoint reports lifecycle state through is_active while
  // retaining the published schema status. Active must win in the admin UI so
  // the form is not offered for activation again after a successful action.
  const status: BlogForm["status"] = booleanValue(raw.is_active ?? raw.active, false)
    ? "active"
    : responseStatus;
  const tenantIds = Array.isArray(raw.tenant_ids) ? raw.tenant_ids.filter((id): id is string => typeof id === "string") : [];
  const assignments = Array.isArray(raw.assignments) ? raw.assignments.filter(isRecord) : [];
  const rawScope = stringValue(raw.scope).toLowerCase();
  const scope: BlogForm["scope"] = rawScope.includes("select") ? "selected" : rawScope === "unassigned" ? "unassigned" : tenantIds.length ? "selected" : "global";
  // Active Enterprise responses may include a compact top-level sections
  // summary while the complete configurable schema lives in definition.
  // Prefer the complete definition so custom sections and fields are not lost.
  const sectionsRaw = Array.isArray(rawDefinition.sections)
    ? rawDefinition.sections
    : Array.isArray(raw.sections)
      ? raw.sections
      : Array.isArray(raw.form_sections)
        ? raw.form_sections
        : [];
  const sections = sectionsRaw.filter(isRecord).map((section, sectionIndex): BlogFormSection => {
    const fieldsRaw = Array.isArray(section.fields) ? section.fields : [];
    return {
      id: stringValue(section.id, `section-${sectionIndex + 1}`),
      title: stringValue(section.title || section.name, `Section ${sectionIndex + 1}`),
      description: typeof section.description === "string" ? section.description : null,
      type: typeof section.type === "string" ? section.type : null,
      order: numberValue(section.order, sectionIndex + 1),
      visible: booleanValue(section.visible ?? section.enabled, true),
      visibility_scope: typeof section.visibility_scope === "string" ? section.visibility_scope : null,
      fields: fieldsRaw.filter(isRecord).map((field, fieldIndex): BlogFormField => {
        const key = stringValue(field.key || field.field_key, `field_${fieldIndex + 1}`);
        const rawType = stringValue(field.type || field.field_type, ["category", "category_id"].includes(key) ? "select" : "text");
        const fieldLabel = stringValue(field.label || field.name, `Field ${fieldIndex + 1}`);
        const fieldHelpText = typeof field.help_text === "string" ? field.help_text : "";
        const explicitPresentationType = stringValue(
          field.ui_type || field.presentation_type || field.editor || field.widget,
        ).toLowerCase();
        const typeAliases: Record<string, string> = {
          richtext: "rich_text",
          multiselect: "multi_select",
          image: "media_upload",
          image_list: "media_upload",
          documents: "file_upload",
        };
        const fieldValidation = isRecord(field.validation) ? { ...field.validation } : {};
        const options = Array.isArray(field.options)
          ? field.options.map((option) => isRecord(option) ? stringValue(option.value || option.label) : stringValue(option)).filter(Boolean)
          : Array.isArray(fieldValidation.options)
            ? fieldValidation.options.map((option) => isRecord(option) ? stringValue(option.value || option.label) : stringValue(option)).filter(Boolean)
            : [];
        if (options.length > 0) fieldValidation.options = options.join(",");
        const visibilityScope = typeof field.visibility_scope === "string"
          ? field.visibility_scope
          : field.visibility === "internal" || field.enterprise_only === true ? "admin_only" : "customer_visible";
        const normalizedType = typeAliases[rawType] ?? rawType;
        const searchablePresentationText = `${fieldLabel} ${fieldHelpText}`.toLowerCase();
        const stableKey = key.toLowerCase();
        const isMediaUploadKey = stableKey.includes("media_upload") || stableKey.includes("image_upload") || stableKey.includes("image_list");
        const isFileUploadKey = stableKey.includes("file_upload") || stableKey.includes("document_upload") || stableKey.includes("supporting_document");
        // The CMS accepts textarea/text for several UI controls. Preserve the
        // intended authoring experience when the published schema carries the
        // descriptive label/help text but not a separate presentation type.
        const presentationType = explicitPresentationType.includes("radio") || searchablePresentationText.includes("radio button")
          ? "radio"
          : explicitPresentationType.includes("rich") || searchablePresentationText.includes("rich text") || searchablePresentationText.includes("wysiwyg") || searchablePresentationText.includes("markdown")
          ? "rich_text"
          : isMediaUploadKey || explicitPresentationType.includes("media") || explicitPresentationType.includes("image") || searchablePresentationText.includes("additional images")
            ? "media_upload"
            : isFileUploadKey || explicitPresentationType.includes("document") || explicitPresentationType.includes("file") || searchablePresentationText.includes("supporting document")
              ? "file_upload"
              : explicitPresentationType.includes("time") || (normalizedType === "text" && searchablePresentationText.trim().startsWith("time"))
                ? "time"
                : normalizedType;
        return {
          id: stringValue(field.id, `field-${sectionIndex + 1}-${fieldIndex + 1}`),
          key,
          label: fieldLabel,
          type: presentationType,
          required: booleanValue(field.required, false),
          visible: booleanValue(field.visible ?? field.enabled, true),
          help_text: typeof field.help_text === "string" ? field.help_text : null,
          validation: Object.keys(fieldValidation).length > 0 ? fieldValidation as BlogFormField["validation"] : null,
          placeholder: typeof field.placeholder === "string" ? field.placeholder : null,
          visibility_scope: visibilityScope,
          order: numberValue(field.order, fieldIndex + 1),
        };
      }),
    };
  });
  const created = dateStringValue(raw.created_at ?? raw.createdAt ?? raw.created ?? raw.updated_at);
  const updated = dateStringValue(raw.updated_at ?? raw.updatedAt ?? raw.updated ?? created, created);
  return {
    id: stringValue(raw.id || raw.form_id, `form-${Date.now()}`),
    name: stringValue(raw.name || raw.title, "Blog and News Submission Form"),
    type,
    mode,
    version,
    status,
    scope,
    tenant_ids: tenantIds,
    assigned_count: numberValue(raw.assigned_count, tenantIds.length || assignments.length),
    post_count: numberValue(raw.post_count, 0),
    revision: numberValue(raw.revision, 1),
    has_unpublished_changes: booleanValue(raw.has_unpublished_changes, false),
    sections: sections.map((section) => ({
      ...section,
      visibility_scope: section.visibility_scope ?? (section.type === "admin_notes" ? "admin_only" : "customer_visible"),
    })),
    created_at: created,
    updated_at: updated,
    created_by: typeof raw.created_by === "string" ? raw.created_by : null,
    updated_by: typeof raw.updated_by === "string" ? raw.updated_by : null,
  };
}

function normalizeFormList(value: unknown, page = 1, pageSize = 20): PaginatedResponse<BlogForm> {
  if (Array.isArray(value)) return paginate(value.map(normalizeForm), page, pageSize);
  const raw = isRecord(value) ? value : {};
  const source = Array.isArray(raw.items) ? raw.items : Array.isArray(raw.data) ? raw.data : [];
  const items = source.map(normalizeForm);
  const pagination = isRecord(raw.pagination) ? raw.pagination : {};
  return { items, pagination: { total: numberValue(pagination.total, items.length), page: numberValue(pagination.page, page), page_size: numberValue(pagination.page_size, pageSize), total_pages: numberValue(pagination.total_pages, items.length ? 1 : 0) } };
}

function serializeFormDefinition(sections: BlogFormSection[] | undefined) {
  const sourceSections = sections && sections.length > 0
    ? sections
    : [{
        id: "section-core",
        title: "Main Article Details",
        description: "Required article fields.",
        type: "core_protected",
        order: 1,
        visible: true,
        visibility_scope: "customer_visible",
        fields: STANDARD_CORE_FIELDS,
      }];
  return {
    sections: sourceSections.map((section) => ({
      key: section.id,
      title: section.title,
      description: section.description ?? undefined,
      visibility: section.visibility_scope === "admin_only" ? "internal" : "public",
      fields: section.fields.map((field) => {
        // The API does not support custom file_upload fields. Treat every
        // document upload control as the built-in supporting_documents field
        // when persisting a form version.
        const canonicalKey = field.type === "file_upload"
          ? "supporting_documents"
          : canonicalBlogFormFieldKey(field.key);
        const backendType = canonicalKey === "supporting_documents"
          ? "documents"
          : canonicalBlogFormFieldType(field.type);
        const options = ["select", "multiselect", "checkbox"].includes(backendType) && typeof field.validation?.options === "string"
          ? field.validation.options.split(",").map((option) => option.trim()).filter(Boolean).map((option) => ({ value: option, label: option }))
          : undefined;
        const validation = field.validation && typeof field.validation === "object"
          ? Object.fromEntries(Object.entries(field.validation).filter(([key]) => key !== "options"))
          : undefined;
        const serializedField: Record<string, unknown> = {
          // The builder keeps stable UI keys for backwards-compatible post
          // mapping, while the CMS API expects its documented canonical keys.
          key: canonicalKey,
          label: field.label,
          required: field.required,
          help_text: field.help_text ?? undefined,
          placeholder: field.placeholder ?? undefined,
          visibility: field.visibility_scope === "admin_only" ? "internal" : "public",
          enterprise_only: field.visibility_scope === "admin_only",
          validation,
        };
        if (options) serializedField.options = options;
        // System article fields have fixed backend types. Do not send a type
        // override for them; the API applies the canonical schema. Post Type
        // remains a select because its allowed values are form-configurable.
        if (canonicalKey === "post_type") {
          serializedField.type = "select";
          serializedField.options = [
            { value: "blog", label: "Blog" },
            { value: "news", label: "News" },
          ];
        } else if (!isProtectedBlogFormFieldKey(canonicalKey)) {
          serializedField.type = backendType;
        }
        return serializedField;
      }),
    })),
  };
}

function canonicalBlogFormFieldKey(key: string): string {
  const aliases: Record<string, string> = {
    post_title_slug: "title",
    short_summary: "excerpt",
    article_content: "content",
    category_id: "category",
    cover_image_url: "cover_image",
    supporting_document: "supporting_documents",
    supporting_internal_document: "supporting_documents",
  };
  return aliases[key] ?? key;
}

/** Maps builder presentation types to the field types accepted by the CMS API. */
function canonicalBlogFormFieldType(type: string): string {
  const aliases: Record<string, string> = {
    rich_text: "textarea",
    radio: "select",
    multi_select: "multiselect",
    time: "text",
    // The Blogs API supports media_upload as a first-class custom field type.
    // Preserve it so image fields are not persisted as generic text fields.
    media_upload: "media_upload",
    // Legacy custom file fields remain text for backwards compatibility;
    // new document uploads are serialized through the built-in
    // supporting_documents field above.
    file_upload: "text",
  };
  return aliases[type] ?? type;
}

function isProtectedBlogFormFieldKey(key: string): boolean {
  return new Set(["post_type", "title", "excerpt", "content", "category", "cover_image", "supporting_documents"]).has(key);
}

// -------------------------------------------------------------
// Local cache used only when the API is temporarily unavailable. It starts empty.
// -------------------------------------------------------------
const STORAGE_FORMS_KEY = "ihp.blogs.admin_forms.v2";
const STORAGE_FORM_VERSIONS_KEY = "ihp.blogs.admin_form_versions.v2";
const STORAGE_POSTS_KEY = "ihp.blogs.posts_data.v2";
const STORAGE_BLOG_AUDIT_KEY = "ihp.blogs.audit.v1";
const STORAGE_BLOG_CONFIGURATION_AUDIT_KEY = "ihp.blogs.configuration_audit.v1";
const STORAGE_CATEGORIES_KEY = "ihp.blogs.categories.v2";
export const STORAGE_PLATFORM_NOTIFICATIONS_KEY = "ihp.platform.notifications.v1";
export const STORAGE_ENTERPRISE_NOTIFICATIONS_KEY = "ihp.enterprise.notifications.v1";

export function dispatchBlogNotification(input: {
  recipient: "platform" | "enterprise";
  type: "blog_submitted" | "blog_approved" | "blog_rejected" | "blog_changes_requested";
  title: string;
  message: string;
  postId: string;
  postTitle: string;
  enterpriseId?: string | null;
  reason?: string | null;
}): void {
  if (typeof window === "undefined") return;
  try {
    const key =
      input.recipient === "platform"
        ? STORAGE_PLATFORM_NOTIFICATIONS_KEY
        : STORAGE_ENTERPRISE_NOTIFICATIONS_KEY;
    const raw = window.localStorage.getItem(key);
    const existing = raw ? JSON.parse(raw) : [];
    const items = Array.isArray(existing) ? existing : [];
    items.unshift({
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      notification_id: `notif-${Date.now()}`,
      notification_type: input.type,
      category: "blog",
      title: input.title,
      message: input.message,
      is_read: false,
      read_at: null,
      delivered_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      metadata: {
        post_id: input.postId,
        blog_id: input.postId,
        blog_title: input.postTitle,
        enterprise_id: input.enterpriseId ?? null,
        reason: input.reason ?? null,
      },
    });
    window.localStorage.setItem(key, JSON.stringify(items.slice(0, 100)));
  } catch {
    /* notification storage must not block post action */
  }
}

export const STANDARD_CORE_FIELDS: BlogFormField[] = [
  {
    id: "f-type-00",
    key: "post_type",
    label: "Post Type",
    type: "select",
    required: true,
    visible: true,
    order: 1,
    help_text: "Choose whether this submission is a Blog or News post.",
    placeholder: "Choose Blog or News",
    visibility_scope: "customer_visible",
  },
  {
    id: "f-title-01",
    key: "post_title_slug",
    label: "Blog Title",
    type: "text",
    required: true,
    visible: true,
    order: 2,
    help_text: "The title shown to readers.",
    placeholder: "Enter the post title",
    visibility_scope: "customer_visible",
  },
  {
    id: "f-summary-02",
    key: "short_summary",
    label: "Summary",
    type: "textarea",
    required: true,
    visible: true,
    order: 3,
    help_text: "A short overview shown before readers open the full post.",
    placeholder: "Summarize the post for readers",
    visibility_scope: "customer_visible",
  },
  {
    id: "f-content-05",
    key: "article_content",
    label: "Post Content",
    type: "rich_text",
    required: true,
    visible: true,
    order: 4,
    help_text: "Write the full content readers will see.",
    placeholder: "Write the post content...",
    visibility_scope: "customer_visible",
  },
  {
    id: "f-category-03",
    key: "category_id",
    label: "Category",
    type: "select",
    required: true,
    visible: true,
    order: 5,
    help_text: "Choose the category that best fits the post.",
    placeholder: "Choose a category",
    visibility_scope: "customer_visible",
  },
  {
    id: "f-cover-04",
    key: "cover_image_url",
    label: "Cover Image",
    type: "media_upload",
    required: true,
    visible: true,
    order: 6,
    help_text: "The image shown with the post in listings and previews.",
    placeholder: "Upload cover image",
    visibility_scope: "customer_visible",
  },
];

function enforceProtectedFormFields(sections: BlogFormSection[]): BlogFormSection[] {
  const next = sections.map((section) => ({ ...section, fields: [...section.fields] }));
  if (next.length === 0) {
    next.push({ id: "section-core", title: "Main Article Details", description: "Required article fields.", type: "core_protected", order: 1, visible: true, visibility_scope: "customer_visible", fields: [] });
  }
  const core = next[0];
  for (const protectedField of STANDARD_CORE_FIELDS) {
    const existing = next.flatMap((section) => section.fields).find((field) => field.key === protectedField.key);
    if (existing) {
      existing.required = true;
      existing.visible = true;
      existing.visibility_scope = "customer_visible";
      continue;
    }
    core.fields.push({ ...protectedField, order: core.fields.length + 1 });
  }
  core.type = "core_protected";
  core.visible = true;
  core.visibility_scope = "customer_visible";
  return next.map((section, index) => ({ ...section, order: index + 1 }));
}

const SEED_FORMS: BlogForm[] = [
  {
    id: "form-health-wellness-1",
    name: "Health & Wellness Blog Form",
    type: "both",
    mode: "configurable",
    version: 1,
    status: "active",
    scope: "selected",
    tenant_ids: ["ent-greenlife", "ent-careplus"],
    created_at: "2026-10-26T09:00:00.000Z",
    updated_at: "2026-10-26T11:20:00.000Z",
    created_by: "Super Admin",
    updated_by: "Super Admin",
    sections: [
      {
        id: "sec-info-core",
        title: "1. Main Article Details",
        description: "Required fields used on every Blog and News submission form.",
        order: 1,
        fields: STANDARD_CORE_FIELDS,
      },
      {
        id: "sec-info-topic",
        title: "2. Article Information & Topics",
        description: "Enter the main details of the health and wellness article.",
        order: 2,
        fields: [
          {
            id: "fld-topic",
            key: "health_topic",
            label: "Health Topic",
            type: "dropdown",
            required: true,
            visible: true,
            help_text: "Choose the topic most relevant to your article.",
            order: 1,
            validation: {
              options:
                "Nutrition, Fitness, Mental Health, Preventive Healthcare",
            },
          },
          {
            id: "fld-ref-url",
            key: "reference_url",
            label: "Reference Website (URL)",
            type: "url",
            required: false,
            visible: true,
            order: 2,
          },
        ],
      },
      {
        id: "sec-info-admin",
        title: "3. Internal Information",
        description: "Private internal records and editorial documentation for Enterprise Admins.",
        order: 3,
        visibility_scope: "admin_only",
        fields: [
          {
            id: "fld-ref-num",
            key: "internal_reference_number",
            label: "Internal Reference Number",
            type: "text",
            required: false,
            visible: true,
            order: 1,
            help_text: "Internal reference number for enterprise auditing and tracking.",
            placeholder: "e.g., REF-2026-0891",
            visibility_scope: "admin_only",
          },
          {
            id: "fld-edit-notes",
            key: "editorial_notes",
            label: "Editorial Notes",
            type: "textarea",
            required: false,
            visible: true,
            order: 2,
            help_text: "Editorial notes visible only to enterprise administrators and reviewers.",
            placeholder: "Add editorial review notes, remarks, or revision feedback...",
            visibility_scope: "admin_only",
          },
          {
            id: "fld-supp-doc",
            key: "supporting_internal_document",
            label: "Supporting Internal Document",
            type: "file_upload",
            required: false,
            visible: true,
            order: 3,
            help_text: "Internal documentation for compliance and verification; never published to customers.",
            placeholder: "Upload internal document (PDF, DOCX)",
            visibility_scope: "admin_only",
          },
          {
            id: "fld-admin-notes",
            key: "internal_reviewer_notes",
            label: "Internal Reviewer Notes",
            type: "textarea",
            required: false,
            visible: true,
            order: 4,
            help_text: "Notes visible only to administrators.",
            visibility_scope: "admin_only",
          },
        ],
      },
    ],
  },
  {
    id: "form-clinical-standard-2",
    name: "Standard Clinical Blog Form",
    type: "blog",
    mode: "standard",
    version: 1,
    status: "published",
    scope: "global",
    tenant_ids: [],
    created_at: "2026-10-24T08:00:00.000Z",
    updated_at: "2026-10-25T14:30:00.000Z",
    created_by: "Super Admin",
    updated_by: "Super Admin",
    sections: [
      {
        id: "sec-core-std",
        title: "1. Main Article Details",
        description: "Standard essential sections and fields.",
        order: 1,
        fields: STANDARD_CORE_FIELDS,
      },
      {
        id: "sec-media-std",
        title: "2. Supporting Media & References",
        description: "Optional details that help readers explore or download the post.",
        order: 2,
        fields: [
          {
            id: "fld-std-tags",
            key: "article_tags",
            label: "Tags",
            type: "multi_select",
            required: false,
            visible: true,
            order: 1,
            help_text: "Optional keywords to help readers find the post.",
            visibility_scope: "customer_visible",
          },
          {
            id: "fld-std-ref",
            key: "reference_url",
            label: "Reference Link",
            type: "url",
            required: false,
            visible: true,
            order: 2,
            help_text: "Add an optional link related to the post.",
            visibility_scope: "customer_visible",
          },
        ],
      },
      {
        id: "sec-admin-std",
        title: "3. Internal Information",
        description: "Private internal records and editorial documentation for Enterprise Admins.",
        order: 3,
        visibility_scope: "admin_only",
        fields: [
          {
            id: "fld-std-ref-num",
            key: "internal_reference_number",
            label: "Internal Reference Number",
            type: "text",
            required: false,
            visible: true,
            order: 1,
            help_text: "Internal reference number for enterprise auditing and tracking.",
            placeholder: "e.g., REF-2026-0891",
            visibility_scope: "admin_only",
          },
          {
            id: "fld-std-edit-notes",
            key: "editorial_notes",
            label: "Editorial Notes",
            type: "textarea",
            required: false,
            visible: true,
            order: 2,
            help_text: "Editorial notes visible only to enterprise administrators and reviewers.",
            placeholder: "Add editorial review notes, remarks, or revision feedback...",
            visibility_scope: "admin_only",
          },
          {
            id: "fld-std-supp-doc",
            key: "supporting_internal_document",
            label: "Supporting Internal Document",
            type: "file_upload",
            required: false,
            visible: true,
            order: 3,
            help_text: "Internal documentation for compliance and verification; never published to customers.",
            placeholder: "Upload internal document (PDF, DOCX)",
            visibility_scope: "admin_only",
          },
          {
            id: "fld-std-notes",
            key: "internal_reviewer_notes",
            label: "Internal Reviewer Notes",
            type: "textarea",
            required: false,
            visible: true,
            order: 4,
            help_text: "Notes visible only to administrators.",
            visibility_scope: "admin_only",
          },
        ],
      },
    ],
  },
  {
    id: "form-news-announcements-3",
    name: "Emergency & Event Announcements Form",
    type: "news",
    mode: "standard",
    version: 1,
    status: "draft",
    scope: "unassigned",
    tenant_ids: [],
    created_at: "2026-10-28T10:15:00.000Z",
    updated_at: "2026-10-28T10:15:00.000Z",
    created_by: "Super Admin",
    updated_by: "Super Admin",
    sections: [
      {
        id: "sec-core-news",
        title: "1. Main Article Details",
        description: "Essential article fields.",
        order: 1,
        fields: STANDARD_CORE_FIELDS,
      },
      {
        id: "sec-config-news",
        title: "2. Supporting Media & References",
        description: "Optional details that help readers explore the news item.",
        order: 2,
        fields: [
          {
            id: "fld-news-tags",
            key: "article_tags",
            label: "Tags",
            type: "multi_select",
            required: false,
            visible: true,
            order: 1,
            help_text: "Add tags for this announcement.",
            visibility_scope: "customer_visible",
          },
        ],
      },
      {
        id: "sec-admin-news",
        title: "3. Internal Information",
        description: "Internal administrative metadata and compliance documentation.",
        order: 3,
        visibility_scope: "admin_only",
        fields: [
          {
            id: "fld-news-ref-num",
            key: "internal_reference_number",
            label: "Internal Reference Number",
            type: "text",
            required: false,
            visible: true,
            order: 1,
            help_text: "Internal reference number for enterprise auditing and tracking.",
            placeholder: "e.g., REF-2026-0891",
            visibility_scope: "admin_only",
          },
          {
            id: "fld-news-edit-notes",
            key: "editorial_notes",
            label: "Editorial Notes",
            type: "textarea",
            required: false,
            visible: true,
            order: 2,
            help_text: "Editorial notes visible only to enterprise administrators and reviewers.",
            placeholder: "Add editorial review notes, remarks, or revision feedback...",
            visibility_scope: "admin_only",
          },
          {
            id: "fld-news-supp-doc",
            key: "supporting_internal_document",
            label: "Supporting Internal Document",
            type: "file_upload",
            required: false,
            visible: true,
            order: 3,
            help_text: "Internal documentation for compliance and verification; never published to customers.",
            placeholder: "Upload internal document (PDF, DOCX)",
            visibility_scope: "admin_only",
          },
          {
            id: "fld-news-admin",
            key: "internal_reviewer_notes",
            label: "Internal Reviewer Notes",
            type: "textarea",
            required: false,
            visible: true,
            order: 4,
            help_text: "Notes visible only to administrators.",
            visibility_scope: "admin_only",
          },
        ],
      },
    ],
  },
  {
    id: "form-news-standard-global",
    name: "Standard Platform News Form",
    type: "news",
    mode: "standard",
    version: 1,
    status: "published",
    scope: "global",
    tenant_ids: [],
    created_at: "2026-10-25T08:00:00.000Z",
    updated_at: "2026-10-25T14:30:00.000Z",
    created_by: "Super Admin",
    updated_by: "Super Admin",
    sections: [
      {
        id: "sec-core-news-std",
        title: "1. Main Article Details",
        description: "Essential fields used for platform news bulletins.",
        order: 1,
        fields: STANDARD_CORE_FIELDS,
      },
      {
        id: "sec-news-attributes",
        title: "2. News Attributes & Priority",
        description: "Priority indicators and source references for platform bulletins.",
        order: 2,
        fields: [
          {
            id: "fld-bulletin-priority",
            key: "bulletin_priority",
            label: "Bulletin Priority",
            type: "dropdown",
            required: false,
            visible: true,
            order: 1,
            help_text: "Urgency level of this platform news bulletin.",
            validation: {
              options: "General News, Important Update, Clinical Advisory, Emergency Bulletin",
            },
          },
          {
            id: "fld-source-ref",
            key: "source_reference_link",
            label: "Source Reference Link",
            type: "url",
            required: false,
            visible: true,
            order: 2,
            help_text: "Optional external press release or medical study link.",
          },
        ],
      },
    ],
  },
];

const SEED_CATEGORIES: BlogCategory[] = [
  {
    id: "cat-health-wellness",
    name: "Health & Wellness",
    is_active: true,
    sort_order: 1,
    post_count: 5,
  },
  {
    id: "cat-preventive-health",
    name: "Preventive Healthcare",
    is_active: true,
    sort_order: 2,
    post_count: 3,
  },
  {
    id: "cat-nutrition-diet",
    name: "Nutrition & Diet",
    is_active: true,
    sort_order: 3,
    post_count: 2,
  },
  {
    id: "cat-mental-health",
    name: "Mental Health",
    is_active: true,
    sort_order: 4,
    post_count: 1,
  },
  {
    id: "cat-events-announcements",
    name: "Events & Announcements",
    is_active: true,
    sort_order: 5,
    post_count: 4,
  },
];

const SEED_POSTS: BlogManageDetail[] = [
  {
    id: "post-habits-1",
    title: "5 Simple Habits for a Healthier Life",
    slug: "5-simple-habits-for-a-healthier-life",
    kind: "blog",
    status: "pending_approval",
    status_label: "Pending Approval",
    is_live: false,
    has_pending_revision: false,
    excerpt:
      "Discover five simple daily habits that can improve your physical and mental well-being.",
    content:
      "Maintaining a healthy lifestyle starts with small changes. Drinking enough water, eating balanced meals, staying physically active, getting sufficient sleep and managing stress can support overall health. Practising these habits consistently can improve your daily routine and well-being.",
    category: "Health & Wellness",
    category_id: "cat-health-wellness",
    tags: ["Healthy Living", "Nutrition", "Fitness", "Wellness"],
    cover_image_url: null,
    author_name: "Priya Sharma",
    author_type: "merchant",
    business_name: "GreenLife Wellness Center",
    business_logo_url: null,
    tenant_id: "tenant-greenlife",
    enterprise_id: "ent-greenlife",
    is_pinned: false,
    reviewer_note: null,
    reviewed_at: null,
    submitted_at: "2026-10-26T10:30:00.000Z",
    created_at: "2026-10-26T09:45:00.000Z",
    updated_at: "2026-10-26T10:30:00.000Z",
    published_at: null,
    view_count: 0,
    actions: ["review"],
    author_id: "user-priya",
    live_version: null,
    form_id: "form-health-wellness-1",
    form_version: 1,
    custom_fields: {
      health_topic: "Healthy Living",
      internal_reference_number: "REF-2026-0891",
      editorial_notes: "Author verified clinical sources with Dr. Sharma. Medical review pending final Super Admin sign-off.",
      supporting_internal_document: "clinical-evidence-habits-v1.pdf",
    },
  },
  {
    id: "post-preventive-2",
    title: "Why Preventive Healthcare Matters",
    slug: "why-preventive-healthcare-matters",
    kind: "blog",
    status: "pending_approval",
    status_label: "Pending Approval",
    is_live: false,
    has_pending_revision: false,
    excerpt:
      "Learn how regular health checkups and healthy lifestyle choices can help identify health concerns early.",
    content:
      "Preventive healthcare focuses on maintaining good health and identifying potential health problems before they become serious. Regular medical checkups, recommended screenings, balanced nutrition, physical activity and adequate sleep can support long-term well-being.",
    category: "Preventive Healthcare",
    category_id: "cat-preventive-health",
    tags: ["Preventive Care", "Health Screening", "Healthy Lifestyle"],
    cover_image_url: null,
    author_name: "Dr. Alistair Vance",
    author_type: "merchant",
    business_name: "CarePlus Health Services",
    business_logo_url: null,
    tenant_id: "tenant-careplus",
    enterprise_id: "ent-careplus",
    is_pinned: false,
    reviewer_note: null,
    reviewed_at: null,
    submitted_at: "2026-10-26T09:45:00.000Z",
    created_at: "2026-10-26T08:30:00.000Z",
    updated_at: "2026-10-26T09:45:00.000Z",
    published_at: null,
    view_count: 0,
    actions: ["review"],
    author_id: "user-alistair",
    live_version: null,
    form_id: "form-health-wellness-1",
    form_version: 1,
    custom_fields: {
      health_topic: "Preventive Healthcare",
      internal_reference_number: "REF-2026-0942",
      editorial_notes: "Checked against current regional medical guidelines for preventive screening.",
      supporting_internal_document: "preventive-screening-guidelines.pdf",
    },
  },
  {
    id: "post-summit-3",
    title: "Annual Wellness Summit 2026 Schedule Announced",
    slug: "annual-wellness-summit-2026-schedule-announced",
    kind: "news",
    status: "published",
    status_label: "Published",
    is_live: true,
    has_pending_revision: false,
    excerpt:
      "Join us for the 2026 wellness summit featuring keynote sessions and interactive workshops.",
    content:
      "The annual wellness summit is back. Check out the schedule and prepare for transformative health sessions.",
    category: "Events & Announcements",
    category_id: "cat-events-announcements",
    tags: ["Summit", "Events", "Schedule"],
    cover_image_url: null,
    author_name: "Platform Editorial",
    author_type: "platform",
    business_name: "Invigorate Health",
    business_logo_url: null,
    tenant_id: null,
    enterprise_id: null,
    is_pinned: true,
    reviewer_note: null,
    reviewed_at: "2026-10-25T14:00:00.000Z",
    submitted_at: "2026-10-25T12:00:00.000Z",
    created_at: "2026-10-25T10:00:00.000Z",
    updated_at: "2026-10-25T14:00:00.000Z",
    published_at: "2026-10-25T14:00:00.000Z",
    view_count: 1420,
    actions: ["unpublish", "pin"],
    author_id: "admin-platform",
    live_version: null,
  },
];

function getStoredForms(): BlogForm[] {
  if (typeof window === "undefined") return SEED_FORMS;
  try {
    const raw = window.localStorage.getItem(STORAGE_FORMS_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_FORMS_KEY, JSON.stringify(SEED_FORMS));
      return SEED_FORMS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      window.localStorage.setItem(STORAGE_FORMS_KEY, JSON.stringify(SEED_FORMS));
      return SEED_FORMS;
    }
    // Merge any missing seed forms so newly introduced forms are available immediately
    const existingIds = new Set(parsed.map((f: BlogForm) => f.id));
    const missingSeeds = SEED_FORMS.filter((sf) => !existingIds.has(sf.id));
    const combinedForms = missingSeeds.length > 0 ? [...parsed, ...missingSeeds] : parsed;
    if (missingSeeds.length > 0) {
      window.localStorage.setItem(STORAGE_FORMS_KEY, JSON.stringify(combinedForms));
    }
    // Defensive check: ensure all loaded forms have proper core fields in Section 1
    return combinedForms.map((form: BlogForm) => {
      if (!form.sections || form.sections.length === 0) {
        return {
          ...form,
          sections: [
            {
              id: `sec-${form.id}-core`,
              title: "1. Main Article Details",
              description: "Essential article fields.",
              order: 1,
              fields: STANDARD_CORE_FIELDS,
            },
          ],
        };
      }
      const sections = form.sections.map((sec, idx) => {
        if (idx === 0 && (!sec.fields || sec.fields.length === 0)) {
          return { ...sec, fields: STANDARD_CORE_FIELDS };
        }
        return sec;
      });
      return { ...form, sections };
    });
  } catch {
    return SEED_FORMS;
  }
}

function saveStoredForms(forms: BlogForm[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_FORMS_KEY, JSON.stringify(forms));
  } catch {
    /* ignore quota */
  }
}

function getStoredFormVersions(): BlogForm[] {
  if (typeof window === "undefined") return SEED_FORMS;
  try {
    const raw = window.localStorage.getItem(STORAGE_FORM_VERSIONS_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_FORM_VERSIONS_KEY, JSON.stringify(SEED_FORMS));
      return SEED_FORMS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_FORMS;
  } catch {
    return SEED_FORMS;
  }
}

function saveStoredFormVersions(versions: BlogForm[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_FORM_VERSIONS_KEY, JSON.stringify(versions));
  } catch {
    /* ignore quota */
  }
}

export const ESSENTIAL_FORM_FIELD_GROUPS: ReadonlyArray<{ name: string; keys: string[] }> = [
  { name: "Title", keys: ["title", "post_title_slug"] },
  { name: "Summary / Excerpt", keys: ["excerpt", "short_summary"] },
  { name: "Content", keys: ["content", "article_content"] },
  { name: "Category", keys: ["category", "category_id"] },
  { name: "Cover Image", keys: ["cover_image", "cover_image_url", "cover_image_file"] },
];

export function validateFormEssentialFields(form: BlogForm): string | null {
  const allFields = form.sections.flatMap((s) => s.fields);
  for (const group of ESSENTIAL_FORM_FIELD_GROUPS) {
    const match = allFields.find((f) => group.keys.includes(f.key));
    if (!match) {
      return `Essential system field "${group.name}" is missing from configuration. All essential fields (Title, Summary, Content, Category, Cover Image) must exist before publishing.`;
    }
    if (match.visible === false) {
      return `Essential system field "${match.label || group.name}" is disabled. Essential fields must remain enabled before publishing.`;
    }
  }
  return null;
}

let memoryPosts: BlogManageDetail[] = JSON.parse(JSON.stringify(SEED_POSTS));

export function getStoredPosts(): BlogManageDetail[] {
  if (typeof window === "undefined") {
    return memoryPosts;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_POSTS_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_POSTS_KEY, JSON.stringify(SEED_POSTS));
      return SEED_POSTS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      window.localStorage.setItem(STORAGE_POSTS_KEY, JSON.stringify(SEED_POSTS));
      return SEED_POSTS;
    }
    return parsed as BlogManageDetail[];
  } catch {
    return SEED_POSTS;
  }
}

export function saveStoredPosts(posts: BlogManageDetail[]): void {
  if (typeof window === "undefined") {
    memoryPosts = posts;
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_POSTS_KEY, JSON.stringify(posts));
  } catch {
    /* ignore quota */
  }
}

export function resetStoredBlogs(): void {
  memoryPosts = JSON.parse(JSON.stringify(SEED_POSTS));
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_POSTS_KEY, JSON.stringify(SEED_POSTS));
  } catch {
    /* ignore quota */
  }
}

function recordStoredBlogAudit(input: {
  post: BlogManageDetail;
  action: string;
  fromStatus: BlogStatus | null;
  toStatus: BlogStatus | null;
  reason?: string | null;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
}): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_BLOG_AUDIT_KEY);
    const existing = raw ? JSON.parse(raw) : [];
    const items: BlogHistoryItem[] = Array.isArray(existing) ? existing : [];
    const isPlatform = input.actorRole === "platform_super_admin";
    items.unshift({
      id: `blog-audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      post_id: input.post.id,
      action: input.action,
      from_status: input.fromStatus,
      to_status: input.toStatus,
      reason: input.reason ?? null,
      actor_id: input.actorId ?? (isPlatform ? "sa-admin" : "ea-current"),
      actor_name: input.actorName ?? (isPlatform ? "Super Admin" : "Enterprise Admin"),
      actor_role: input.actorRole ?? (isPlatform ? "platform_super_admin" : "enterprise_admin"),
      created_at: new Date().toISOString(),
    });
    window.localStorage.setItem(STORAGE_BLOG_AUDIT_KEY, JSON.stringify(items.slice(0, 500)));
  } catch {
    /* Audit persistence must not block the content action. */
  }
}

function getStoredBlogAudit(postId: string): BlogHistoryResponse {
  if (typeof window === "undefined") return { items: [], total: 0 };
  try {
    const raw = window.localStorage.getItem(STORAGE_BLOG_AUDIT_KEY);
    const items = raw ? JSON.parse(raw) : [];
    const filtered = Array.isArray(items) ? items.filter((item) => item.post_id === postId) : [];
    if (filtered.length === 0) {
      const post = getStoredPosts().find((p) => p.id === postId);
      if (post) {
        return {
          items: [
            {
              id: `blog-audit-init-${post.id}`,
              post_id: post.id,
              action: "create",
              from_status: null,
              to_status: post.status,
              reason: "Initial article creation",
              actor_id: post.author_type === "platform" ? "sa-admin" : "ea-current",
              actor_name: post.author_name || (post.author_type === "platform" ? "Super Admin" : "Enterprise Admin"),
              actor_role: post.author_type === "platform" ? "platform_super_admin" : "enterprise_admin",
              created_at: post.created_at,
            },
          ],
          total: 1,
        };
      }
    }
    return { items: filtered, total: filtered.length };
  } catch {
    return { items: [], total: 0 };
  }
}

function recordBlogAudit(id: string, action: string, actorRole: string, details: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_BLOG_CONFIGURATION_AUDIT_KEY);
    const entries = raw ? JSON.parse(raw) : [];
    const current = Array.isArray(entries) ? entries : [];
    current.unshift({ id: `blog-config-audit-${Date.now()}`, resource_id: id, action, actor_role: actorRole, details, created_at: new Date().toISOString() });
    window.localStorage.setItem(STORAGE_BLOG_CONFIGURATION_AUDIT_KEY, JSON.stringify(current.slice(0, 500)));
  } catch {
    /* Audit persistence must not block configuration publishing. */
  }
}

/** Returns the staged revision to management screens without changing the public live record. */
function managementPostView(post: BlogManageDetail): BlogManageDetail {
  const revision = post.pending_revision;
  if (!revision) return post;
  return {
    ...post,
    title: revision.title,
    kind: revision.kind,
    excerpt: revision.excerpt,
    content: revision.content,
    cover_image_url: revision.cover_image_url,
    category: revision.category,
    category_id: revision.category_id,
    tags: revision.tags,
    custom_fields: revision.custom_fields ?? post.custom_fields,
    form_id: revision.form_id ?? post.form_id,
    form_version: revision.form_version ?? post.form_version,
  };
}

function liveVersionFor(post: BlogManageDetail): BlogLiveVersion {
  return {
    kind: post.kind,
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    cover_image_url: post.cover_image_url,
    category: post.category,
    category_id: post.category_id,
    tags: post.tags,
  };
}

function getStoredCategories(): BlogCategory[] {
  if (typeof window === "undefined") return SEED_CATEGORIES;
  try {
    const raw = window.localStorage.getItem(STORAGE_CATEGORIES_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_CATEGORIES_KEY, JSON.stringify(SEED_CATEGORIES));
      return SEED_CATEGORIES;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      window.localStorage.setItem(STORAGE_CATEGORIES_KEY, JSON.stringify(SEED_CATEGORIES));
      return SEED_CATEGORIES;
    }
    return parsed as BlogCategory[];
  } catch {
    return SEED_CATEGORIES;
  }
}

function saveStoredCategories(categories: BlogCategory[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_CATEGORIES_KEY,
      JSON.stringify(categories),
    );
  } catch {
    /* ignore quota */
  }
}

async function safeRequest<T>(
  apiFn: () => Promise<T>,
  fallbackFn: () => T | Promise<T>,
): Promise<T> {
  // Never mask an unavailable or misconfigured backend with seeded Blog data
  // in the admin website. Local fallback is opt-in for tests/local development.
  const allowLocalFallback =
    typeof process !== "undefined" &&
    (process.env.NODE_ENV === "test" ||
      process.env.NEXT_PUBLIC_ENABLE_BLOGS_LOCAL_FALLBACK === "true");
  try {
    return await apiFn();
  } catch (err: unknown) {
    if (!allowLocalFallback) {
      throw err;
    }
    if (err instanceof BlogsApiError) {
      // Preserve client-visible validation and state conflicts. Falling back after
      // a conflict would make a failed activation look successful in local dev.
      if (err.status === 409 || err.status === 422) {
        throw err;
      }
      // For unauthenticated sessions (401/403 in local dev), missing endpoints (404),
      // or server errors (5xx), gracefully fall back to local store
      return await fallbackFn();
    }
    return await fallbackFn();
  }
}

// -------------------------------------------------------------
// ENTERPRISE BLOG API FUNCTIONS
// -------------------------------------------------------------
export function listMyBlogPosts(
  params: {
    page?: number;
    pageSize?: number;
    status?: BlogStatus;
    kind?: BlogKind;
    categoryId?: string;
    search?: string;
    enterpriseId?: string;
  } = {},
): Promise<PaginatedResponse<BlogManageItem>> {
  return safeRequest(
    () =>
      request(
        `/cms/blogs/my/posts${query({ page: params.page ?? 1, page_size: params.pageSize ?? 20, status: params.status, kind: params.kind, category_id: params.categoryId, search: params.search, enterprise_id: params.enterpriseId })}`,
      ),
    () => {
      let items = getStoredPosts();
      if (params.enterpriseId) items = items.filter((p) => p.enterprise_id === params.enterpriseId);
      if (params.status)
        items = items.filter((p) => p.status === params.status);
      if (params.kind) items = items.filter((p) => p.kind === params.kind);
      if (params.categoryId)
        items = items.filter((p) => p.category_id === params.categoryId);
      if (params.search?.trim()) {
        const s = params.search.trim().toLowerCase();
        items = items.filter(
          (p) =>
            p.title.toLowerCase().includes(s) ||
            (p.excerpt && p.excerpt.toLowerCase().includes(s)),
        );
      }
      return paginate(items.map(managementPostView), params.page, params.pageSize);
    },
  );
}

export function listPublicBlogPosts(
  params: {
    page?: number;
    pageSize?: number;
    kind?: BlogKind;
    categoryId?: string;
    tag?: string;
    search?: string;
  } = {},
): Promise<PaginatedResponse<PublicBlogItem>> {
  return safeRequest(
    () =>
      request(
        `/cms/blogs${query({ page: params.page ?? 1, page_size: params.pageSize ?? 20, kind: params.kind, category_id: params.categoryId, tag: params.tag, search: params.search })}`,
      ),
    () => {
      const governance = getBlogGovernance();
      let items = getStoredPosts().filter(
        (p) => p.is_live,
      ) as unknown as PublicBlogItem[];
      // Immediately hide articles belonging to disabled modules in Customer Mobile & Public Web
      items = items.filter((p) => {
        const raw = p as unknown as {
          custom_fields?: Record<string, unknown>;
          tags?: string[];
          module?: string;
        };
        const contextualModule = (raw.module ||
          raw.custom_fields?.contextual_module) as BlogModuleKey | undefined;
        if (contextualModule && governance[contextualModule] === false) {
          return false;
        }
        if (raw.tags && Array.isArray(raw.tags)) {
          if (governance.events === false && raw.tags.includes("events")) return false;
          if (governance.trainings === false && raw.tags.includes("trainings")) return false;
          if (governance.products === false && raw.tags.includes("products")) return false;
          if (governance.services === false && raw.tags.includes("services")) return false;
        }
        return true;
      });
      if (params.kind) items = items.filter((p) => p.kind === params.kind);
      if (params.categoryId)
        items = items.filter((p) => p.category_id === params.categoryId);
      if (params.search?.trim()) {
        const s = params.search.trim().toLowerCase();
        items = items.filter((p) => p.title.toLowerCase().includes(s));
      }
      return paginate(items, params.page, params.pageSize);
    },
  );
}

/**
 * Strips all admin-only values, internal notes, and administrative fields from public customer responses.
 * Rule: Admin-only values must not be returned by customer-facing APIs.
 */
export function sanitizePublicBlogDetail(post: BlogManageDetail): PublicBlogDetail {
  const forms = getStoredForms();
  let form = post.form_id ? forms.find((f) => f.id === post.form_id) : null;
  // Historical post compatibility: resolve exact archived form schema version if recorded
  if (post.form_id && post.form_version) {
    const versions = getStoredFormVersions();
    const versionMatch = versions.find(
      (v) => v.id === post.form_id && v.version === post.form_version,
    );
    if (versionMatch) {
      form = versionMatch;
    }
  }
  const adminKeys = new Set<string>();

  if (form) {
    for (const section of form.sections) {
      const isSecAdminOnly = section.visibility_scope === "admin_only" || section.type === "admin_notes";
      for (const field of section.fields) {
        if (isSecAdminOnly || field.visibility_scope === "admin_only") {
          adminKeys.add(field.key);
        }
      }
    }
  }

  // Safety net baseline internal keys
  adminKeys.add("internal_reference_number");
  adminKeys.add("editorial_notes");
  adminKeys.add("supporting_internal_document");
  adminKeys.add("internal_reviewer_notes");

  const sanitizedCustomFields: Record<string, BlogCustomFieldValue> = {};
  if (post.custom_fields && typeof post.custom_fields === "object") {
    for (const [key, value] of Object.entries(post.custom_fields)) {
      if (
        !adminKeys.has(key) &&
        !key.startsWith("internal_") &&
        !key.includes("admin_only") &&
        !key.includes("private_")
      ) {
        sanitizedCustomFields[key] = value;
      }
    }
  }

  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    kind: post.kind,
    excerpt: post.excerpt,
    content: post.content,
    cover_image_url: post.cover_image_url,
    author_name: post.author_name,
    author_type: post.author_type,
    business_name: post.business_name,
    business_logo_url: post.business_logo_url,
    tenant_id: post.tenant_id,
    enterprise_id: post.enterprise_id,
    category: post.category,
    category_id: post.category_id,
    tags: post.tags,
    is_pinned: post.is_pinned,
    status: "published",
    published_at: post.published_at,
    view_count: post.view_count,
    created_at: post.created_at,
    updated_at: post.updated_at,
    custom_fields: Object.keys(sanitizedCustomFields).length > 0 ? sanitizedCustomFields : undefined,
  };
}

export function getPublicBlogPost(slugOrId: string): Promise<PublicBlogDetail> {
  return safeRequest(
    async () => {
      const res = await request<PublicBlogDetail>(`/cms/blogs/${encodeURIComponent(slugOrId)}`);
      if (res && res.custom_fields) {
        const sanitized: Record<string, BlogCustomFieldValue> = {};
        for (const [k, v] of Object.entries(res.custom_fields)) {
          if (!k.startsWith("internal_") && !k.includes("admin") && !k.includes("private_")) {
            sanitized[k] = v;
          }
        }
        res.custom_fields = Object.keys(sanitized).length > 0 ? sanitized : undefined;
      }
      return res;
    },
    () => {
      const post = getStoredPosts().find(
        (p) => p.id === slugOrId || p.slug === slugOrId,
      );
      if (!post || !post.is_live)
        throw new BlogsApiError("Post not found", 404);
      return sanitizePublicBlogDetail(post);
    },
  );
}

export function generateUniqueSlug(
  title: string,
  existingPosts: Array<{ slug?: string; id?: string }>,
  excludeId?: string,
): string {
  const base =
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "post";
  let slug = base;
  let counter = 1;
  const existingSlugs = new Set(
    existingPosts
      .filter((p) => !excludeId || p.id !== excludeId)
      .map((p) => p.slug)
      .filter(Boolean),
  );
  while (existingSlugs.has(slug)) {
    slug = `${base}-${counter}`;
    counter++;
  }
  return slug;
}

export function createMyBlogPost(
  payload: BlogPostPayload,
): Promise<BlogManageDetail> {
  return safeRequest(
    () =>
      request("/cms/blogs/my/posts", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    () => {
      const posts = getStoredPosts();
      const newPost: BlogManageDetail = {
        id: `post-local-${Date.now()}`,
        title: payload.title,
        slug: generateUniqueSlug(payload.title, posts),
        kind: payload.kind,
        status: "draft",
        status_label: "Draft",
        is_live: false,
        has_pending_revision: false,
        excerpt: payload.excerpt ?? null,
        content: payload.content ?? "",
        category: payload.category_id ? "Clinical" : null,
        category_id: payload.category_id ?? null,
        tags: payload.tags ?? [],
        cover_image_url: payload.cover_image_url ?? null,
        author_name: "Enterprise Admin",
        author_type: "merchant",
        business_name: "GreenLife Wellness Center",
        business_logo_url: null,
        tenant_id: "tenant-greenlife",
        enterprise_id: payload.enterprise_id ?? "ent-greenlife",
        is_pinned: false,
        reviewer_note: null,
        reviewed_at: null,
        submitted_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        published_at: null,
        view_count: 0,
        actions: ["edit", "submit", "delete"],
        author_id: "ea-current",
        live_version: null,
        custom_fields: payload.custom_fields ?? undefined,
        form_id: payload.form_id ?? null,
        form_version: payload.form_version ?? null,
        module: payload.module ?? "general",
        linked_entity: payload.linked_entity ?? null,
      };
      posts.unshift(newPost);
      saveStoredPosts(posts);
      recordStoredBlogAudit({
        post: newPost,
        action: "create",
        fromStatus: null,
        toStatus: "draft",
        reason: "Initial enterprise draft creation",
        actorRole: "enterprise_admin",
        actorName: "Enterprise Admin",
      });
      return newPost;
    },
  );
}

export function getMyBlogPost(id: string, enterpriseId?: string): Promise<BlogManageDetail> {
  return safeRequest(
    () => request<BlogManageDetail>(`/cms/blogs/my/posts/${encodeURIComponent(id)}`).then(normalizeBlogPostFields),
    () => {
      const post = getStoredPosts().find((p) => p.id === id);
      if (!post) throw new BlogsApiError("Post not found", 404);
      if (enterpriseId && post.enterprise_id && post.enterprise_id !== enterpriseId) {
        throw new BlogsApiError("You do not have access to this post", 403);
      }
      return managementPostView(post);
    },
  );
}

export function updateMyBlogPost(
  id: string,
  payload: Partial<BlogPostPayload>,
): Promise<BlogManageDetail> {
  return safeRequest(
    () =>
      request(`/cms/blogs/my/posts/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(Object.fromEntries(Object.entries(payload).filter(([key]) => key !== "revision" && key !== "change_notes"))),
      }),
    () => {
      const posts = getStoredPosts();
      const index = posts.findIndex((p) => p.id === id);
      if (index === -1) throw new BlogsApiError("Post not found", 404);
      const current = posts[index];
      if (current.status === "pending_approval") {
        throw new BlogsApiError("Pending approval posts cannot be edited", 409);
      }
      if (current.is_live && !payload.revision) {
        throw new BlogsApiError("Published posts require a staged revision", 409);
      }
      if (payload.revision && current.is_live) {
        const base = current.pending_revision ?? {
          kind: current.kind,
          title: current.title,
          excerpt: current.excerpt,
          content: current.content,
          cover_image_url: current.cover_image_url,
          category: current.category,
          category_id: current.category_id,
          tags: current.tags,
          custom_fields: current.custom_fields,
          form_id: current.form_id,
          form_version: current.form_version,
          module: current.module,
          linked_entity: current.linked_entity,
        };
        const staged = {
          ...base,
          kind: payload.kind ?? base.kind,
          title: payload.title ?? base.title,
          excerpt: payload.excerpt !== undefined ? payload.excerpt : base.excerpt,
          content: payload.content !== undefined ? payload.content : base.content,
          cover_image_url: payload.cover_image_url !== undefined ? payload.cover_image_url : base.cover_image_url,
          category_id: payload.category_id !== undefined ? payload.category_id : base.category_id,
          tags: payload.tags ?? base.tags,
          custom_fields: payload.custom_fields ?? base.custom_fields,
          form_id: payload.form_id ?? base.form_id,
          form_version: payload.form_version ?? base.form_version,
          module: payload.module ?? base.module,
          linked_entity: payload.linked_entity ?? base.linked_entity,
          category: payload.category_id !== undefined ? current.category : base.category,
        };
        const updated: BlogManageDetail = {
          ...current,
          pending_revision: staged,
          has_pending_revision: true,
          updated_at: new Date().toISOString(),
        };
        posts[index] = updated;
        saveStoredPosts(posts);
        return managementPostView(updated);
      }
      const updated: BlogManageDetail = {
        ...current,
        title: payload.title ?? current.title,
        slug: payload.title ? generateUniqueSlug(payload.title, posts, id) : current.slug,
        excerpt:
          payload.excerpt !== undefined
            ? payload.excerpt
            : current.excerpt,
        content:
          payload.content !== undefined
            ? payload.content
            : current.content,
        category_id:
          payload.category_id !== undefined
            ? payload.category_id
            : current.category_id,
        cover_image_url:
          payload.cover_image_url !== undefined
            ? payload.cover_image_url
            : current.cover_image_url,
        tags: payload.tags ?? current.tags,
        custom_fields:
          payload.custom_fields !== undefined
            ? payload.custom_fields
            : current.custom_fields,
        form_id:
          payload.form_id !== undefined
            ? payload.form_id
            : current.form_id,
        form_version:
          payload.form_version !== undefined
            ? payload.form_version
            : current.form_version,
        module: payload.module !== undefined ? payload.module : current.module,
        linked_entity: payload.linked_entity !== undefined ? payload.linked_entity : current.linked_entity,
        updated_at: new Date().toISOString(),
      };
      const prevStatus = posts[index].status;
      posts[index] = updated;
      saveStoredPosts(posts);
      recordStoredBlogAudit({
        post: updated,
        action: "edit",
        fromStatus: prevStatus,
        toStatus: updated.status,
        reason: "Post content and configuration updated by Super Admin",
        actorRole: "platform_super_admin",
        actorName: "Super Admin",
      });
      return managementPostView(updated);
    },
  );
}

export function submitMyBlogPost(id: string, changeNotes?: string): Promise<BlogManageDetail> {
  return safeRequest(
    () =>
      request(`/cms/blogs/my/posts/${encodeURIComponent(id)}/submit`, {
        method: "POST",
        body: "{}",
      }),
    () => {
      const posts = getStoredPosts();
      const index = posts.findIndex((p) => p.id === id);
      if (index === -1) throw new BlogsApiError("Post not found", 404);
      const current = posts[index];
      const canSubmit = current.status === "draft" || current.status === "changes_requested" || current.status === "rejected" || (current.status === "published" && current.has_pending_revision);
      if (!canSubmit) throw new BlogsApiError("This post is not available for submission", 409);
      const previousStatus = current.status;
      const updated: BlogManageDetail = {
        ...current,
        status: "pending_approval",
        status_label: "Pending Approval",
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        reviewer_note: changeNotes?.trim() ? `Revision summary: ${changeNotes.trim()}` : current.reviewer_note,
        is_live: current.is_live,
      };
      posts[index] = updated;
      saveStoredPosts(posts);
      recordStoredBlogAudit({ post: updated, action: previousStatus === "draft" ? "submit" : "resubmit", fromStatus: previousStatus, toStatus: "pending_approval", reason: changeNotes });
      dispatchBlogNotification({
        recipient: "platform",
        type: "blog_submitted",
        title: "New Blog & News submission",
        message: `“${updated.title}” was submitted for review by ${updated.business_name || updated.author_name}.`,
        postId: updated.id,
        postTitle: updated.title,
        enterpriseId: updated.enterprise_id,
      });
      return managementPostView(updated);
    },
  );
}

export function unpublishMyBlogPost(
  id: string,
  reason?: string,
): Promise<BlogManageDetail> {
  return safeRequest(
    () =>
      request(`/cms/blogs/my/posts/${encodeURIComponent(id)}/unpublish`, {
        method: "POST",
        body: JSON.stringify(reason?.trim() ? { reason: reason.trim() } : {}),
      }),
    () => {
      const posts = getStoredPosts();
      const index = posts.findIndex((p) => p.id === id);
      if (index === -1) throw new BlogsApiError("Post not found", 404);
      if (posts[index].status !== "published" || !posts[index].is_live) {
        throw new BlogsApiError("Only a published post can be unpublished", 409);
      }
      const previousStatus = posts[index].status;
      const updated: BlogManageDetail = {
        ...posts[index],
        status: "unpublished",
        status_label: "Unpublished",
        is_live: false,
        pending_revision: null,
        has_pending_revision: false,
        updated_at: new Date().toISOString(),
      };
      posts[index] = updated;
      saveStoredPosts(posts);
      recordStoredBlogAudit({ post: updated, action: "unpublish", fromStatus: previousStatus, toStatus: "unpublished", reason });
      return updated;
    },
  );
}

export function discardMyBlogChanges(id: string): Promise<BlogManageDetail> {
  return safeRequest(
    () =>
      request(`/cms/blogs/my/posts/${encodeURIComponent(id)}/discard-changes`, {
        method: "POST",
        body: "{}",
      }),
    () => {
      const posts = getStoredPosts();
      const index = posts.findIndex((p) => p.id === id);
      if (index === -1) throw new BlogsApiError("Post not found", 404);
      const updated = { ...posts[index], pending_revision: null, has_pending_revision: false, updated_at: new Date().toISOString() };
      posts[index] = updated;
      saveStoredPosts(posts);
      return managementPostView(updated);
    },
  );
}

export function deleteMyBlogPost(id: string): Promise<{ message: string }> {
  return safeRequest(
    () =>
      request(`/cms/blogs/my/posts/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
    () => {
      const posts = getStoredPosts();
      const post = posts.find((p) => p.id === id);
      if (!post) throw new BlogsApiError("Post not found", 404);
      if (post.status !== "draft" && post.status !== "rejected" && post.status !== "changes_requested") {
        throw new BlogsApiError("Only draft or rejected posts can be deleted", 409);
      }
      recordStoredBlogAudit({ post, action: "delete", fromStatus: post.status, toStatus: "deleted" });
      saveStoredPosts(posts.filter((p) => p.id !== id));
      return { message: "Post deleted" };
    },
  );
}

export function archiveMyBlogPost(
  id: string,
  reason?: string,
): Promise<BlogManageDetail> {
  return safeRequest(
    () =>
      request(`/cms/blogs/my/posts/${encodeURIComponent(id)}/archive`, {
        method: "POST",
        body: JSON.stringify(reason?.trim() ? { reason: reason.trim() } : {}),
      }),
    () => {
      const posts = getStoredPosts();
      const index = posts.findIndex((p) => p.id === id);
      if (index === -1) throw new BlogsApiError("Post not found", 404);
      const prevStatus = posts[index].status;
      const updated: BlogManageDetail = {
        ...posts[index],
        status: "unpublished",
        status_label: "Archived",
        is_live: false,
        reviewer_note: reason ?? posts[index].reviewer_note,
        updated_at: new Date().toISOString(),
      };
      posts[index] = updated;
      saveStoredPosts(posts);
      recordStoredBlogAudit({
        post: updated,
        action: "archive",
        fromStatus: prevStatus,
        toStatus: "unpublished",
        reason: reason?.trim() || "Post archived by Enterprise Admin",
      });
      return updated;
    },
  );
}

export function getMyBlogHistory(id: string): Promise<BlogHistoryResponse> {
  return safeRequest(
    () => request(`/cms/blogs/my/posts/${encodeURIComponent(id)}/history`),
    () => getStoredBlogAudit(id),
  );
}

export function listMyBlogRevisions(id: string): Promise<BlogRevision[]> {
  return safeRequest(
    () => request(`/cms/blogs/my/posts/${encodeURIComponent(id)}/revisions`),
    () => [],
  );
}

export function getMyBlogRevision(
  id: string,
  version: number,
): Promise<BlogManageDetail> {
  return safeRequest(
    () =>
      request(
        `/cms/blogs/my/posts/${encodeURIComponent(id)}/revisions/${version}`,
      ),
    () => {
      const post = getStoredPosts().find((p) => p.id === id);
      if (!post) throw new BlogsApiError("Post not found", 404);
      return post;
    },
  );
}

// -------------------------------------------------------------
// SUPER ADMIN QUEUE & POSTS API FUNCTIONS
// -------------------------------------------------------------
export function listAdminBlogQueue(
  params: {
    page?: number;
    pageSize?: number;
    kind?: BlogKind;
    categoryId?: string;
    enterpriseId?: string;
    tenantId?: string;
    search?: string;
  } = {},
): Promise<PaginatedResponse<BlogManageItem>> {
  return safeRequest(
    () =>
      request(
        `/cms/blogs/admin/queue${query({ page: params.page ?? 1, page_size: params.pageSize ?? 20, kind: params.kind, category_id: params.categoryId, enterprise_id: params.enterpriseId, tenant_id: params.tenantId, search: params.search })}`,
      ),
    () => {
      let items = getStoredPosts().filter(
        (p) => p.status === "pending_approval",
      );
      if (params.kind) items = items.filter((p) => p.kind === params.kind);
      if (params.categoryId)
        items = items.filter((p) => p.category_id === params.categoryId);
      if (params.search?.trim()) {
        const s = params.search.trim().toLowerCase();
        items = items.filter(
          (p) =>
            p.title.toLowerCase().includes(s) ||
            (p.business_name && p.business_name.toLowerCase().includes(s)),
        );
      }
      return paginate(items.map(managementPostView), params.page, params.pageSize);
    },
  );
}

export function listAdminBlogPosts(
  params: {
    page?: number;
    pageSize?: number;
    status?: BlogStatus;
    source?: BlogSource;
    kind?: BlogKind;
    categoryId?: string;
    search?: string;
  } = {},
): Promise<PaginatedResponse<BlogManageItem>> {
  return safeRequest(
    () =>
      request(
        `/cms/blogs/admin/posts${query({ page: params.page ?? 1, page_size: params.pageSize ?? 20, status: params.status, source: params.source, kind: params.kind, category_id: params.categoryId, search: params.search })}`,
      ),
    () => {
      let items = getStoredPosts();
      if (params.status)
        items = items.filter((p) => p.status === params.status);
      if (params.source)
        items = items.filter((p) => p.author_type === params.source);
      if (params.kind) items = items.filter((p) => p.kind === params.kind);
      if (params.categoryId)
        items = items.filter((p) => p.category_id === params.categoryId);
      if (params.search?.trim()) {
        const s = params.search.trim().toLowerCase();
        items = items.filter((p) => p.title.toLowerCase().includes(s));
      }
      return paginate(items.map(managementPostView), params.page, params.pageSize);
    },
  );
}

export function getAdminBlogPost(id: string): Promise<BlogManageDetail> {
  return safeRequest(
    () => request<BlogManageDetail>(`/cms/blogs/admin/posts/${encodeURIComponent(id)}`).then(normalizeBlogPostFields),
    () => {
      const post = getStoredPosts().find((p) => p.id === id);
      if (!post) throw new BlogsApiError("Post not found", 404);
      return managementPostView(post);
    },
  );
}

export function createAdminBlogPost(
  payload: BlogPostPayload & { status?: "draft" | "published" },
): Promise<BlogManageDetail> {
  return safeRequest(
    () =>
      request("/cms/blogs/admin/posts", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    () => {
      const posts = getStoredPosts();
      const status = payload.status === "published" ? "published" : "draft";
      const matchedCategory = payload.category_id
        ? getStoredCategories().find((c) => c.id === payload.category_id)?.name ?? "Platform Announcement"
        : null;
      const newPost: BlogManageDetail = {
        id: `post-admin-${Date.now()}`,
        title: payload.title,
        slug: generateUniqueSlug(payload.title, posts),
        kind: payload.kind,
        status,
        status_label: status === "published" ? "Published" : "Draft",
        is_live: status === "published",
        has_pending_revision: false,
        excerpt: payload.excerpt ?? null,
        content: payload.content ?? "",
        category: matchedCategory,
        category_id: payload.category_id ?? null,
        tags: payload.tags ?? [],
        cover_image_url: payload.cover_image_url ?? null,
        author_name: "Super Admin",
        author_type: "platform",
        business_name: "Invigorate Health",
        business_logo_url: null,
        tenant_id: null,
        enterprise_id: null,
        is_pinned: false,
        reviewer_note: null,
        reviewed_at: null,
        submitted_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        published_at: status === "published" ? new Date().toISOString() : null,
        view_count: 0,
        actions:
          status === "published"
            ? ["unpublish", "pin"]
            : ["edit", "publish", "delete"],
        author_id: "admin-current",
        live_version: null,
        custom_fields: payload.custom_fields ?? undefined,
        form_id: payload.form_id ?? null,
        form_version: payload.form_version ?? null,
      };
      posts.unshift(newPost);
      saveStoredPosts(posts);
      recordStoredBlogAudit({
        post: newPost,
        action: "create",
        fromStatus: null,
        toStatus: status,
        reason: status === "published" ? "Created and published platform post" : "Created platform draft post",
        actorRole: "platform_super_admin",
        actorName: "Super Admin",
      });
      return newPost;
    },
  );
}

export function updateAdminBlogPost(
  id: string,
  payload: Partial<BlogPostPayload>,
): Promise<BlogManageDetail> {
  return safeRequest(
    () =>
      request(`/cms/blogs/admin/posts/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    () => {
      const posts = getStoredPosts();
      const index = posts.findIndex((p) => p.id === id);
      if (index === -1) throw new BlogsApiError("Post not found", 404);
      const updated: BlogManageDetail = {
        ...posts[index],
        title: payload.title ?? posts[index].title,
        slug: payload.title ? generateUniqueSlug(payload.title, posts, id) : posts[index].slug,
        excerpt:
          payload.excerpt !== undefined
            ? payload.excerpt
            : posts[index].excerpt,
        content:
          payload.content !== undefined
            ? payload.content
            : posts[index].content,
        category_id:
          payload.category_id !== undefined
            ? payload.category_id
            : posts[index].category_id,
        cover_image_url:
          payload.cover_image_url !== undefined
            ? payload.cover_image_url
            : posts[index].cover_image_url,
        tags: payload.tags ?? posts[index].tags,
        custom_fields:
          payload.custom_fields !== undefined
            ? payload.custom_fields
            : posts[index].custom_fields,
        form_id:
          payload.form_id !== undefined
            ? payload.form_id
            : posts[index].form_id,
        form_version:
          payload.form_version !== undefined
            ? payload.form_version
            : posts[index].form_version,
        updated_at: new Date().toISOString(),
      };
      posts[index] = updated;
      saveStoredPosts(posts);
      return updated;
    },
  );
}

export function reviewAdminBlogPost(
  id: string,
  action: "approve" | "request_changes" | "reject",
  reason?: string,
  reviewer?: { id?: string; name?: string },
): Promise<BlogManageDetail> {
  return safeRequest(
    () =>
      request(`/cms/blogs/admin/posts/${encodeURIComponent(id)}/review`, {
        method: "POST",
        body: JSON.stringify({
          action,
          ...(reason?.trim() ? { reason: reason.trim() } : {}),
          ...(reviewer?.id ? { reviewer_id: reviewer.id } : {}),
          ...(reviewer?.name ? { reviewer_name: reviewer.name } : {}),
        }),
      }),
    () => {
      const posts = getStoredPosts();
      const index = posts.findIndex((p) => p.id === id);
      if (index === -1) throw new BlogsApiError("Post not found", 404);

      const current = posts[index];

      // RULE: Duplicate moderation actions must be prevented
      if (current.status !== "pending_approval") {
        throw new BlogsApiError(
          `Duplicate moderation prevented: This post has already been moderated (current status: ${current.status_label || current.status}) on ${current.reviewed_at ? new Date(current.reviewed_at).toLocaleString() : "a previous review"}. Only posts pending review can be moderated.`,
          409,
        );
      }

      // RULE: Reason validation for Request Changes and Reject
      // RULE: Failed approval → Keep Pending Approval (error thrown before mutating state)
      if ((action === "request_changes" || action === "reject") && (!reason || reason.trim().length < 5)) {
        throw new BlogsApiError(
          `A clear editorial reason (at least 5 characters) is required when ${action === "request_changes" ? "requesting changes" : "rejecting a post"}.`,
          422,
        );
      }

      const reviewTimestamp = new Date().toISOString();
      const reviewerId = reviewer?.id ?? "sa-admin";
      const reviewerName = reviewer?.name ?? "Super Admin";
      const cleanedReason = reason?.trim() ? reason.trim() : (action === "approve" ? "Approved for publication" : null);

      // RULE: Approve → Published. Request Changes → Changes Requested. Reject → Rejected.
      const status: BlogStatus =
        action === "approve"
          ? "published"
          : action === "request_changes"
            ? "changes_requested"
            : "rejected";

      const statusLabel =
        action === "approve"
          ? "Published"
          : action === "request_changes"
            ? "Changes Requested"
            : "Rejected";

      const revision = current.pending_revision;
      const approvedFields = action === "approve" && revision
        ? {
            kind: revision.kind,
            title: revision.title,
            excerpt: revision.excerpt,
            content: revision.content,
            cover_image_url: revision.cover_image_url,
            category: revision.category,
            category_id: revision.category_id,
            tags: revision.tags,
            custom_fields: revision.custom_fields ?? current.custom_fields,
            form_id: revision.form_id ?? current.form_id,
            form_version: revision.form_version ?? current.form_version,
          }
        : {};

      // RULE: Reviewer identity, reason and time must be recorded
      const updated: BlogManageDetail = {
        ...current,
        ...approvedFields,
        status,
        status_label: statusLabel,
        is_live: action === "approve" || current.is_live,
        reviewer_id: reviewerId,
        reviewer_name: reviewerName,
        reviewer_note: cleanedReason,
        reviewed_at: reviewTimestamp,
        published_at:
          action === "approve"
            ? reviewTimestamp
            : current.published_at,
        pending_revision: action === "approve" ? null : revision,
        has_pending_revision: action === "approve" ? false : Boolean(revision),
        actions: action === "approve" ? ["unpublish", "pin"] : ["edit", "submit", "delete"],
        updated_at: reviewTimestamp,
      };

      try {
        posts[index] = updated;
        saveStoredPosts(posts);

        recordStoredBlogAudit({
          post: updated,
          action: action === "approve" ? "approve" : action === "request_changes" ? "request_changes" : "reject",
          fromStatus: current.status,
          toStatus: status,
          reason: cleanedReason,
          actorId: reviewerId,
          actorName: reviewerName,
          actorRole: "platform_super_admin",
        });

        dispatchBlogNotification({
          recipient: "enterprise",
          type:
            action === "approve"
              ? "blog_approved"
              : action === "request_changes"
              ? "blog_changes_requested"
              : "blog_rejected",
          title:
            action === "approve"
              ? "Blog & News approved"
              : action === "request_changes"
              ? "Changes requested"
              : "Blog & News rejected",
          message:
            action === "approve"
              ? `“${updated.title}” has been approved and published.`
              : action === "request_changes"
              ? `Updates are requested for “${updated.title}”. Reason: ${cleanedReason}`
              : `“${updated.title}” was rejected. Reason: ${cleanedReason}`,
          postId: updated.id,
          postTitle: updated.title,
          enterpriseId: updated.enterprise_id,
          reason: cleanedReason,
        });

        return managementPostView(updated);
      } catch (saveError) {
        // RULE: Failed approval → Keep Pending Approval
        // On unexpected storage error, revert post back to pending_approval
        posts[index] = current;
        saveStoredPosts(posts);
        throw saveError;
      }
    },
  );
}

export function publishAdminBlogPost(id: string): Promise<BlogManageDetail> {
  return safeRequest(
    () =>
      request(`/cms/blogs/admin/posts/${encodeURIComponent(id)}/publish`, {
        method: "POST",
        body: "{}",
      }),
    () => {
      const posts = getStoredPosts();
      const index = posts.findIndex((p) => p.id === id);
      if (index === -1) throw new BlogsApiError("Post not found", 404);
      const updated: BlogManageDetail = {
        ...posts[index],
        status: "published",
        status_label: "Published",
        is_live: true,
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const prevStatus = posts[index].status;
      posts[index] = updated;
      saveStoredPosts(posts);
      recordStoredBlogAudit({
        post: updated,
        action: "publish",
        fromStatus: prevStatus,
        toStatus: "published",
        reason: "Published by Super Admin",
        actorRole: "platform_super_admin",
        actorName: "Super Admin",
      });
      return updated;
    },
  );
}

export function unpublishAdminBlogPost(
  id: string,
  reason?: string,
): Promise<BlogManageDetail> {
  return safeRequest(
    () =>
      request(`/cms/blogs/admin/posts/${encodeURIComponent(id)}/unpublish`, {
        method: "POST",
        body: JSON.stringify(reason?.trim() ? { reason: reason.trim() } : {}),
      }),
    () => {
      const posts = getStoredPosts();
      const index = posts.findIndex((p) => p.id === id);
      if (index === -1) throw new BlogsApiError("Post not found", 404);
      const updated: BlogManageDetail = {
        ...posts[index],
        status: "unpublished",
        status_label: "Unpublished",
        is_live: false,
        reviewer_note: reason ?? posts[index].reviewer_note,
        updated_at: new Date().toISOString(),
      };
      const prevStatus = posts[index].status;
      posts[index] = updated;
      saveStoredPosts(posts);
      recordStoredBlogAudit({
        post: updated,
        action: "unpublish",
        fromStatus: prevStatus,
        toStatus: "unpublished",
        reason: reason?.trim() || "Unpublished by Super Admin",
        actorRole: "platform_super_admin",
        actorName: "Super Admin",
      });
      return updated;
    },
  );
}

export function pinAdminBlogPost(
  id: string,
  pinned: boolean,
): Promise<BlogManageDetail> {
  return safeRequest(
    () =>
      request(`/cms/blogs/admin/posts/${encodeURIComponent(id)}/pin`, {
        method: "PUT",
        body: JSON.stringify({ pinned }),
      }),
    () => {
      const posts = getStoredPosts();
      const index = posts.findIndex((p) => p.id === id);
      if (index === -1) throw new BlogsApiError("Post not found", 404);
      const updated: BlogManageDetail = {
        ...posts[index],
        is_pinned: pinned,
        updated_at: new Date().toISOString(),
      };
      posts[index] = updated;
      saveStoredPosts(posts);
      recordStoredBlogAudit({
        post: updated,
        action: pinned ? "pin" : "unpin",
        fromStatus: posts[index].status,
        toStatus: posts[index].status,
        reason: pinned ? "Pinned post to top of directory" : "Unpinned post",
        actorRole: "platform_super_admin",
        actorName: "Super Admin",
      });
      return updated;
    },
  );
}

export function deleteAdminBlogPost(
  id: string,
  _reason?: string,
): Promise<{ message: string }> {
  return safeRequest(
    () =>
      request(
        `/cms/blogs/admin/posts/${encodeURIComponent(id)}${query({ reason: _reason })}`,
        { method: "DELETE" },
      ),
    () => {
      const posts = getStoredPosts().filter((p) => p.id !== id);
      saveStoredPosts(posts);
      return { message: "Post deleted" };
    },
  );
}

export function getAdminBlogHistory(id: string): Promise<BlogHistoryResponse> {
  return safeRequest(
    () => request(`/cms/blogs/admin/posts/${encodeURIComponent(id)}/history`),
    () => getStoredBlogAudit(id),
  );
}

export function listAdminBlogRevisions(id: string): Promise<BlogRevision[]> {
  return safeRequest(
    () => request(`/cms/blogs/admin/posts/${encodeURIComponent(id)}/revisions`),
    () => [],
  );
}

export function getAdminBlogRevision(
  id: string,
  version: number,
): Promise<BlogManageDetail> {
  return safeRequest(
    () =>
      request(
        `/cms/blogs/admin/posts/${encodeURIComponent(id)}/revisions/${version}`,
      ),
    () => {
      const post = getStoredPosts().find((p) => p.id === id);
      if (!post) throw new BlogsApiError("Post not found", 404);
      return post;
    },
  );
}

// -------------------------------------------------------------
// SUPER ADMIN FORM MANAGEMENT API FUNCTIONS
// -------------------------------------------------------------
export async function listAdminBlogForms(
  params: {
    page?: number;
    pageSize?: number;
    type?: BlogKind | "both";
    mode?: "standard" | "configurable";
    status?: BlogForm["status"];
    search?: string;
  } = {},
): Promise<PaginatedResponse<BlogForm>> {
  return safeRequest(
    async () => {
      // The API exposes lifecycle state through `is_active`; its status query
      // only accepts the persisted schema states draft/published. Fetch the
      // published records and apply the UI lifecycle filter after normalizing.
      const apiStatus = params.status === "active" || params.status === "inactive"
        ? undefined
        : params.status;
      const result = await request<PaginatedResponse<BlogForm> | BlogForm[]>(
        `/cms/blogs/admin/forms${query({ page: params.page ?? 1, page_size: params.pageSize ?? 20, form_type: params.type, mode: params.mode, status: apiStatus, search: params.search })}`,
      );
      const normalized = normalizeFormList(result, params.page ?? 1, params.pageSize ?? 20);
      if (params.status !== "active" && params.status !== "inactive") return normalized;
      const items = normalized.items.filter((form) => form.status === params.status);
      return { ...normalized, items, pagination: { ...normalized.pagination, total: items.length, total_pages: items.length ? 1 : 0 } };
    },
    () => {
      let items = getStoredForms();
      if (params.type && params.type !== "both")
        items = items.filter(
          (f) => f.type === params.type || f.type === "both",
        );
      if (params.mode) items = items.filter((f) => f.mode === params.mode);
      if (params.status)
        items = items.filter((f) => f.status === params.status);
      if (params.search?.trim()) {
        const s = params.search.trim().toLowerCase();
        items = items.filter((f) => f.name.toLowerCase().includes(s));
      }
      return paginate(items, params.page, params.pageSize);
    },
  );
}

export function getAdminBlogForm(id: string): Promise<BlogForm> {
  return safeRequest(
    async () => normalizeForm(await request(`/cms/blogs/admin/forms/${encodeURIComponent(id)}`)),
    () => {
      const form = getStoredForms().find((f) => f.id === id);
      if (!form) throw new BlogsApiError("Form not found", 404);
      return form;
    },
  );
}

export function createAdminBlogForm(
  payload: Pick<BlogForm, "name" | "type" | "mode"> &
    Partial<Pick<BlogForm, "sections">>,
): Promise<BlogForm> {
  const isStandard = payload.mode === "standard";
  const initialSections = payload.sections ?? [{
    id: "section-core",
    title: "Main Article Details",
    description: "Required article fields.",
    type: "core_protected",
    order: 1,
    visible: true,
    visibility_scope: "customer_visible",
    fields: STANDARD_CORE_FIELDS,
  }];
  return safeRequest(
    async () =>
      normalizeForm(await request("/cms/blogs/admin/forms", {
        method: "POST",
        body: JSON.stringify({
          name: payload.name,
          form_type: payload.type,
          mode: payload.mode,
          scope: "global",
          tenant_ids: [],
          ...(isStandard ? {} : { definition: serializeFormDefinition(initialSections) }),
        }),
      })),
    () => {
      const forms = getStoredForms();
      const formTimestamp = Date.now();
      const newForm: BlogForm = {
        id: `form-local-${formTimestamp}`,
        name: payload.name,
        type: payload.type,
        mode: payload.mode,
        version: 1,
        status: "draft",
        scope: "unassigned",
        tenant_ids: [],
        sections: payload.sections ?? [
          {
            id: `sec-${formTimestamp}-core`,
            title: "1. Main Article Details",
            description: "Essential article fields.",
            order: 1,
            fields: STANDARD_CORE_FIELDS,
          },
          {
            id: `sec-${formTimestamp}-config`,
            title: "2. Supporting Media & References",
            description: "Optional details that help readers explore or download the post.",
            order: 2,
            fields: [
              {
                id: `f-tags-${formTimestamp}`,
                key: "article_tags",
                label: "Tags",
                type: "multi_select",
                required: false,
                visible: true,
                order: 1,
                help_text: "Optional keywords to help readers find the post.",
                placeholder: "Add tags",
                visibility_scope: "customer_visible",
              },
              {
                id: `f-ref-${formTimestamp}`,
                key: "reference_url",
                label: "Reference Link",
                type: "url",
                required: false,
                visible: true,
                order: 2,
                help_text: "Add an optional link related to the post.",
                placeholder: "https://example.com",
                visibility_scope: "customer_visible",
              },
            ],
          },
          {
            id: `sec-${formTimestamp}-admin`,
            title: "3. Internal Information",
            description: "Private internal records and editorial documentation for Enterprise Admins.",
            order: 3,
            visibility_scope: "admin_only",
            fields: [
              {
                id: `f-ref-${formTimestamp}`,
                key: "internal_reference_number",
                label: "Internal Reference Number",
                type: "text",
                required: false,
                visible: true,
                order: 1,
                help_text: "Internal reference number for enterprise auditing and tracking.",
                placeholder: "e.g., REF-2026-0891",
                visibility_scope: "admin_only",
              },
              {
                id: `f-edit-${formTimestamp}`,
                key: "editorial_notes",
                label: "Editorial Notes",
                type: "textarea",
                required: false,
                visible: true,
                order: 2,
                help_text: "Editorial notes visible only to enterprise administrators and reviewers.",
                placeholder: "Add editorial review notes, remarks, or revision feedback...",
                visibility_scope: "admin_only",
              },
              {
                id: `f-doc-${formTimestamp}`,
                key: "supporting_internal_document",
                label: "Supporting Internal Document",
                type: "file_upload",
                required: false,
                visible: true,
                order: 3,
                help_text: "Internal documentation for compliance and verification; never published to customers.",
                placeholder: "Upload internal document (PDF, DOCX)",
                visibility_scope: "admin_only",
              },
              {
                id: `f-notes-${formTimestamp}`,
                key: "internal_reviewer_notes",
                label: "Internal Reviewer Notes",
                type: "textarea",
                required: false,
                visible: true,
                order: 4,
                help_text: "Notes visible only to administrators.",
                placeholder: "Add an internal note",
                visibility_scope: "admin_only",
              },
            ],
          },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: "Super Admin",
        updated_by: "Super Admin",
      };
      forms.unshift(newForm);
      saveStoredForms(forms);
      return newForm;
    },
  );
}

/**
 * Creates a new configuration draft from an existing published or active form.
 * User Flow:
 * 1. Open Form Management -> 2. Select active form -> 3. Click Edit Configuration -> 4. System creates new configuration draft.
 * The original form remains active in production for existing enterprise authors,
 * while a new version draft (v{version + 1}) is created for the Super Admin to modify, save, preview, review & submit, publish, and activate.
 */
export function createAdminBlogFormDraft(id: string): Promise<BlogForm> {
  return safeRequest(
    async () => {
      try {
        return normalizeForm(
          await request(`/cms/blogs/admin/forms/${encodeURIComponent(id)}/draft`, {
            method: "POST",
            body: "{}",
          }),
        );
      } catch (err: unknown) {
        if (err instanceof BlogsApiError && err.status === 404) {
          return await getAdminBlogForm(id);
        }
        throw err;
      }
    },
    () => {
      const forms = getStoredForms();
      const index = forms.findIndex((f) => f.id === id);
      if (index === -1) throw new BlogsApiError("Form not found", 404);
      const base = forms[index];

      // If already a draft, return it directly
      if (base.status === "draft") {
        return base;
      }

      // Archive current version snapshot for audit & post compatibility if not already present
      const versions = getStoredFormVersions();
      if (!versions.some((v) => v.id === base.id && v.version === base.version)) {
        versions.unshift({ ...base });
        saveStoredFormVersions(versions);
      }

      const nextVersion = base.version + 1;
      const existingWorkingDraft = forms.find(
        (f) =>
          f.status === "draft" &&
          (f.id === `${base.id}-draft` || f.id === `${base.id}-v${nextVersion}-draft`),
      );
      if (existingWorkingDraft) return existingWorkingDraft;

      const newDraft: BlogForm = {
        ...base,
        id: `${base.id}-v${nextVersion}-draft`,
        name: base.name,
        version: nextVersion,
        status: "draft",
        scope: base.scope,
        tenant_ids: base.tenant_ids ? [...base.tenant_ids] : [],
        sections: JSON.parse(JSON.stringify(base.sections)),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      forms.unshift(newDraft);
      saveStoredForms(forms);

      recordBlogAudit(
        newDraft.id,
        "create_draft",
        "platform_super_admin",
        `Created configuration draft v${newDraft.version} branched from “${base.name}” (v${base.version}). Live version remains active for enterprise authors.`,
      );

      return newDraft;
    },
  );
}

export function updateAdminBlogForm(
  id: string,
  payload: Partial<Pick<BlogForm, "name" | "type" | "mode" | "sections">>,
): Promise<BlogForm> {
  const isStandard = payload.mode === "standard";
  return safeRequest(
    async () =>
      normalizeForm(await request(`/cms/blogs/admin/forms/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...(payload.name !== undefined ? { name: payload.name } : {}),
          ...(payload.type !== undefined ? { form_type: payload.type } : {}),
          ...(payload.mode !== undefined ? { mode: payload.mode } : {}),
          ...(payload.sections !== undefined && !isStandard
            ? { definition: serializeFormDefinition(payload.sections) }
            : {}),
        }),
      })),
    () => {
      const forms = getStoredForms();
      const index = forms.findIndex((f) => f.id === id);
      if (index === -1) throw new BlogsApiError("Form not found", 404);
      const updated: BlogForm = {
        ...forms[index],
        name: payload.name ?? forms[index].name,
        type: payload.type ?? forms[index].type,
        mode: payload.mode ?? forms[index].mode,
        sections: payload.sections ? enforceProtectedFormFields(payload.sections) : forms[index].sections,
        version: forms[index].version + 1,
        status:
          forms[index].status === "published" ||
          forms[index].status === "active" ||
          forms[index].status === "inactive"
            ? "draft"
            : forms[index].status,
        updated_at: new Date().toISOString(),
      };
      forms[index] = updated;
      saveStoredForms(forms);
      recordBlogAudit(
        updated.id,
        "update_form",
        "platform_super_admin",
        `Updated form “${updated.name}” configuration.`,
      );
      return updated;
    },
  );
}

export function publishAdminBlogForm(id: string): Promise<BlogForm> {
  return safeRequest(
    async () =>
      normalizeForm(await request(`/cms/blogs/admin/forms/${encodeURIComponent(id)}/publish`, {
        method: "POST",
        body: "{}",
      })),
    () => {
      const forms = getStoredForms();
      const index = forms.findIndex((f) => f.id === id);
      if (index === -1) throw new BlogsApiError("Form not found", 404);
      const formToPublish = forms[index];

      // Important Logic Rule 2: A configuration cannot be published if essential system fields are missing
      const validationError = validateFormEssentialFields(formToPublish);
      if (validationError) {
        throw new BlogsApiError(validationError, 400);
      }

      // Important Logic Rule 3: Published configuration does not automatically become active.
      // Status remains "published" until explicitly assigned and activated.
      const updated: BlogForm = {
        ...formToPublish,
        status: "published",
        updated_at: new Date().toISOString(),
      };
      forms[index] = updated;
      saveStoredForms(forms);

      // Important Logic Rule 4: Published versions should remain available for audit and existing post compatibility
      const versions = getStoredFormVersions();
      const existingVerIndex = versions.findIndex(
        (v) => v.id === updated.id && v.version === updated.version,
      );
      if (existingVerIndex >= 0) {
        versions[existingVerIndex] = updated;
      } else {
        versions.unshift(updated);
      }
      saveStoredFormVersions(versions);

      recordBlogAudit(
        updated.id,
        "publish_configuration",
        "platform_super_admin",
        `Configuration version v${updated.version} published (${updated.name}). Version archived for audit and existing post compatibility. Status remains published (inactive until assigned).`,
      );

      return updated;
    },
  );
}

export function getAdminBlogFormVersion(id: string, version: number): Promise<BlogForm> {
  return safeRequest(
    async () =>
      normalizeForm(
        await request(
          `/cms/blogs/admin/forms/${encodeURIComponent(id)}/versions/${encodeURIComponent(version)}`,
        ),
      ),
    () => {
      const versions = getStoredFormVersions();
      const match = versions.find((v) => v.id === id && v.version === version);
      if (match) return match;
      const current = getStoredForms().find((f) => f.id === id);
      if (current && current.version === version) return current;
      if (current) return current;
      throw new BlogsApiError(`Form version ${version} not found`, 404);
    },
  );
}

export function listAdminBlogFormVersions(id: string): Promise<BlogForm[]> {
  return safeRequest(
    async () => {
      const raw = await request(
        `/cms/blogs/admin/forms/${encodeURIComponent(id)}/versions`,
      );
      return Array.isArray(raw) ? raw.map(normalizeForm) : [];
    },
    () => {
      const versions = getStoredFormVersions().filter((v) => v.id === id);
      const current = getStoredForms().find((f) => f.id === id);
      if (current && !versions.some((v) => v.version === current.version)) {
        return [current, ...versions];
      }
      return versions;
    },
  );
}

export function activateAdminBlogForm(
  id: string,
  scope: "global" | "selected",
  tenantIds: string[] = [],
): Promise<BlogForm> {
  return safeRequest(
    async () => {
      await assertNoActiveBlogFormConflict(id);
      const res = normalizeForm(await request(`/cms/blogs/admin/forms/${encodeURIComponent(id)}/activate`, {
        method: "POST",
        // The activation API promotes a published form; it does not accept
        // the UI-only `active` lifecycle label in its request schema.
        body: JSON.stringify({ status: "published", scope, tenant_ids: tenantIds }),
      }));
      try {
        const forms = getStoredForms();
        const index = forms.findIndex((f) => f.id === id);
        if (index !== -1) {
          applyLocalFormAssignment(forms, index, scope, tenantIds);
          forms[index] = { ...forms[index], ...res, status: "active", scope, tenant_ids: tenantIds };
          saveStoredForms(forms);
        }
      } catch {
        /* storage sync is best-effort */
      }
      return res;
    },
    () => {
      const forms = getStoredForms();
      const index = forms.findIndex((f) => f.id === id);
      if (index === -1) throw new BlogsApiError("Form not found", 404);
      assertNoLocalActiveBlogFormConflict(forms, index);
      applyLocalFormAssignment(forms, index, scope, tenantIds);
      const updated: BlogForm = {
        ...forms[index],
        status: "active",
        scope,
        tenant_ids: tenantIds,
        updated_at: new Date().toISOString(),
      };
      forms[index] = updated;
      saveStoredForms(forms);
      recordBlogAudit(
        updated.id,
        "activate_form",
        "platform_super_admin",
        scope === "global"
          ? `Globally activated form “${updated.name}” (v${updated.version}) as default for ${updated.type}. All enterprises without a specific custom form will use this template.`
          : `Activated form “${updated.name}” (v${updated.version}) for ${tenantIds.length} selected enterprise(s).`,
      );
      return updated;
    },
  );
}

export function deactivateAdminBlogForm(id: string): Promise<BlogForm> {
  return safeRequest(
    () =>
      request(`/cms/blogs/admin/forms/${encodeURIComponent(id)}/deactivate`, {
        method: "POST",
        body: "{}",
      }),
    () => {
      const forms = getStoredForms();
      const index = forms.findIndex((f) => f.id === id);
      if (index === -1) throw new BlogsApiError("Form not found", 404);
      const updated: BlogForm = {
        ...forms[index],
        status: "inactive",
        updated_at: new Date().toISOString(),
      };
      forms[index] = updated;
      saveStoredForms(forms);
      recordBlogAudit(
        updated.id,
        "deactivate_form",
        "platform_super_admin",
        `Deactivated form “${updated.name}”.`,
      );
      return updated;
    },
  );
}

export function deleteAdminBlogForm(id: string): Promise<{ message: string }> {
  return safeRequest(
    () =>
      request(`/cms/blogs/admin/forms/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
    () => {
      const forms = getStoredForms();
      const form = forms.find((item) => item.id === id);
      if (!form) throw new BlogsApiError("Form not found", 404);

      // Rule: Active forms cannot be deleted directly
      if (form.status === "active") {
        throw new BlogsApiError(
          "Active forms cannot be deleted directly. Please deactivate the form first.",
          409,
        );
      }

      // Rule: Published configurations referenced by existing posts must be retained
      const posts = getStoredPosts();
      const isReferencedByPosts = posts.some((p) => p.form_id === form.id);
      if (isReferencedByPosts) {
        throw new BlogsApiError(
          "This form configuration cannot be deleted because it is referenced by existing articles. Published configurations referenced by existing posts must be retained.",
          409,
        );
      }

      // Rule: Draft forms can be deleted after confirmation
      if (form.status !== "draft") {
        throw new BlogsApiError(
          "Only draft forms can be deleted. Published and active configurations must be retained for audit.",
          409,
        );
      }

      // Rule: Deleting a form must not delete enterprise posts created using it.
      // Posts array is completely untouched.
      saveStoredForms(forms.filter((item) => item.id !== id));
      recordBlogAudit(
        form.id,
        "delete_form",
        "platform_super_admin",
        `Deleted draft form “${form.name}” (v${form.version}). Existing enterprise posts remain untouched.`,
      );
      return { message: "Form draft deleted successfully." };
    },
  );
}

function activeFormConflictMessage(activeForm: BlogForm): string {
  const typeLabel = activeForm.type === "both" ? "Blog & News" : activeForm.type === "blog" ? "Blog" : "News";
  return `Another ${typeLabel} form is already active: “${activeForm.name}” (v${activeForm.version}). Please deactivate that form, then try again.`;
}

async function assertNoActiveBlogFormConflict(id: string): Promise<void> {
  const activeForms = await listAdminBlogForms({ status: "active", pageSize: 100 });
  const currentForm = await getAdminBlogForm(id);
  const conflict = activeForms.items.find(
    (form) => form.id !== id && form.type === currentForm.type,
  );
  if (conflict) throw new BlogsApiError(activeFormConflictMessage(conflict), 409, { conflict_form_id: conflict.id });
}

function assertNoLocalActiveBlogFormConflict(
  forms: BlogForm[],
  currentIndex: number,
): void {
  const current = forms[currentIndex];
  const conflict = forms.find(
    (form, index) => index !== currentIndex && form.status === "active" && form.type === current.type,
  );
  if (conflict) throw new BlogsApiError(activeFormConflictMessage(conflict), 409, { conflict_form_id: conflict.id });
}

function applyLocalFormAssignment(
  forms: BlogForm[],
  currentIndex: number,
  scope: "global" | "selected",
  tenantIds: string[],
): void {
  const current = forms[currentIndex];
  for (let index = 0; index < forms.length; index += 1) {
    if (index === currentIndex) continue;
    const other = forms[index];
    if (other.status !== "active") continue;
    if (current.type !== other.type) continue;
    if (scope === "global" && other.scope === "global") {
      forms[index] = { ...other, status: "inactive", updated_at: new Date().toISOString() };
      recordBlogAudit(
        other.id,
        "superseded_by_assignment",
        "platform_super_admin",
        `Superseded and deactivated as global default by “${current.name}” (v${current.version}).`,
      );
      continue;
    }
    if (scope !== "selected" || other.scope !== "selected") continue;
    const remainingTenants = (other.tenant_ids ?? []).filter((tenantId) => !tenantIds.includes(tenantId));
    const detachedTenants = (other.tenant_ids ?? []).filter((tenantId) => tenantIds.includes(tenantId));
    forms[index] = {
      ...other,
      tenant_ids: remainingTenants,
      scope: remainingTenants.length > 0 ? "selected" : "unassigned",
      status: remainingTenants.length > 0 ? "active" : "inactive",
      updated_at: new Date().toISOString(),
    };
    if (detachedTenants.length > 0) {
      recordBlogAudit(
        other.id,
        "tenants_reassigned",
        "platform_super_admin",
        `Detached ${detachedTenants.length} enterprise(s) reassigned to “${current.name}” (v${current.version}). Remaining tenants: ${remainingTenants.length}.`,
      );
    }
  }
}

export function getMyBlogForm(kind: BlogKind, enterpriseId?: string): Promise<BlogForm> {
  const resolveLocalActiveForm = (): BlogForm => {
    // Critical Rule 4: Draft and inactive forms must not appear for enterprise use.
    // Only active forms are eligible.
    const activeForms = getStoredForms().filter((f) => f.status === "active");

    // Critical Rule 1 & 2: Only one effective active form per tenant and post type.
    // Selected tenant assignment overrides the global default.
    if (enterpriseId) {
      // Priority 1A: Specific tenant custom form with exact post type match (Blog-specific or News-specific or Both)
      const specificExact = activeForms.find(
        (f) => f.scope === "selected" && f.type === kind && f.tenant_ids?.includes(enterpriseId),
      );
      if (specificExact) return specificExact;

      // Priority 1B: Specific tenant custom form with "both" post type
      if (kind !== "both") {
        const specificBoth = activeForms.find(
          (f) => f.scope === "selected" && f.type === "both" && f.tenant_ids?.includes(enterpriseId),
        );
        if (specificBoth) return specificBoth;
      }
    }

    // Priority 2A: Global default form with exact post type match (Blog-specific or News-specific or Both)
    const globalExact = activeForms.find(
      (f) => f.scope === "global" && f.type === kind,
    );
    if (globalExact) return globalExact;

    // Priority 2B: Global default form with "both" post type
    if (kind !== "both") {
      const globalBoth = activeForms.find(
        (f) => f.scope === "global" && f.type === "both",
      );
      if (globalBoth) return globalBoth;
    }

    // Priority 2C: If requesting "both" and no "both" form is active, fallback to global blog or news form
    if (kind === "both") {
      const globalBlogOrNews = activeForms.find(
        (f) => f.scope === "global" && (f.type === "blog" || f.type === "news"),
      );
      if (globalBlogOrNews) return globalBlogOrNews;
    }

    // Critical Rule 3: Other tenants must not see a selectively assigned form.
    // Situation: No applicable active form -> Creation unavailable with clear message.
    const postTypeName = kind === "blog" ? "Blog" : kind === "news" ? "News" : "Blog & News";
    throw new BlogsApiError(
      `Creation unavailable. No active ${postTypeName} form configuration has been assigned to your enterprise. Please contact your platform administrator.`,
      404,
    );
  };

  return safeRequest(
    async () => {
      // The remote backend expects "blog" or "news" for the query param
      const queryKind = kind === "both" ? "blog" : kind;
      let remoteForm: BlogForm | null = null;
      try {
        remoteForm = normalizeForm(
          await request(`/cms/blogs/my/form${query({ kind: queryKind, enterprise_id: enterpriseId })}`),
        );
      } catch (err) {
        if (kind === "both") {
          try {
            remoteForm = normalizeForm(
              await request(`/cms/blogs/my/form${query({ kind: "news", enterprise_id: enterpriseId })}`),
            );
          } catch {
            return resolveLocalActiveForm();
          }
        } else {
          try {
            return resolveLocalActiveForm();
          } catch {
            throw err;
          }
        }
      }

      // If kind was "both" and remote returned a blog-specific form, check if local storage
      // has an active "both" form configured by platform superadmin:
      if (kind === "both" && remoteForm && remoteForm.type !== "both") {
        try {
          const localBoth = resolveLocalActiveForm();
          if (localBoth.type === "both") return localBoth;
        } catch {
          // fallback to remote form
        }
      }

      return remoteForm;
    },
    () => resolveLocalActiveForm(),
  );
}

export function assignAdminBlogForm(
  id: string,
  scope: "global" | "selected",
  tenantIds: string[] = [],
): Promise<BlogForm> {
  return safeRequest(
    async () => {
      await assertNoActiveBlogFormConflict(id);
      const res = normalizeForm(await request(`/cms/blogs/admin/forms/${encodeURIComponent(id)}/assignments`, {
        method: "PUT",
        body: JSON.stringify({ status: "published", scope, tenant_ids: tenantIds }),
      }));
      try {
        const forms = getStoredForms();
        const index = forms.findIndex((f) => f.id === id);
        if (index !== -1) {
          applyLocalFormAssignment(forms, index, scope, tenantIds);
          forms[index] = { ...forms[index], ...res, status: "active", scope, tenant_ids: tenantIds };
          saveStoredForms(forms);
        }
      } catch {
        /* storage sync is best-effort */
      }
      return res;
    },
    () => {
      const forms = getStoredForms();
      const index = forms.findIndex((f) => f.id === id);
      if (index === -1) throw new BlogsApiError("Form not found", 404);
      assertNoLocalActiveBlogFormConflict(forms, index);
      applyLocalFormAssignment(forms, index, scope, tenantIds);
      const updated: BlogForm = {
        ...forms[index],
        status: "active",
        scope,
        tenant_ids: tenantIds,
        updated_at: new Date().toISOString(),
      };
      forms[index] = updated;
      saveStoredForms(forms);
      recordBlogAudit(
        updated.id,
        "activate_form",
        "platform_super_admin",
        scope === "global"
          ? `Globally activated form “${updated.name}” (v${updated.version}) as default for ${updated.type}. All enterprises without a specific custom form will use this template.`
          : `Activated form “${updated.name}” (v${updated.version}) for ${tenantIds.length} selected enterprise(s).`,
      );
      return updated;
    },
  );
}

// -------------------------------------------------------------
// CATEGORY TAXONOMY API FUNCTIONS
// -------------------------------------------------------------
type AdminBlogCategoryResponse =
  | BlogCategory[]
  | {
      items?: BlogCategory[];
      categories?: BlogCategory[];
      data?: BlogCategory[];
    };

export function listBlogCategories(kind?: BlogKind): Promise<BlogCategory[]> {
  return safeRequest(
    async () => {
      const response = await request<AdminBlogCategoryResponse>(`/cms/blogs/categories${query({ kind })}`);
      if (Array.isArray(response)) return response.filter((category) => category.is_active);
      const items = response.items ?? response.categories ?? response.data;
      if (!Array.isArray(items)) throw new BlogsApiError("Invalid category response.", 502, response);
      return items.filter((category) => category.is_active);
    },
    () => getStoredCategories().filter((c) => c.is_active),
  );
}

export function listAdminBlogCategories(): Promise<BlogCategory[]> {
  return safeRequest(
    async () => {
      const response = await request<AdminBlogCategoryResponse>(
        "/cms/blogs/admin/categories",
      );
      if (Array.isArray(response)) return response;

      const items = response.items ?? response.categories ?? response.data;
      if (Array.isArray(items)) return items;

      throw new BlogsApiError("Invalid category response.", 502, response);
    },
    () => {
      const categories = getStoredCategories();
      const posts = getStoredPosts();
      return categories.map((cat) => {
        const matching = posts.filter(
          (p) =>
            p.category_id === cat.id ||
            (p.category && p.category.toLowerCase() === cat.name.toLowerCase()),
        );
        return {
          ...cat,
          post_count: matching.length,
        };
      });
    },
  );
}

export function createAdminBlogCategory(payload: {
  name: string;
  is_active: boolean;
}): Promise<BlogCategory> {
  return safeRequest(
    () =>
      request("/cms/blogs/admin/categories", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    () => {
      const categories = getStoredCategories();
      const normalizedName = payload.name.trim().toLocaleLowerCase();
      if (
        categories.some(
          (category) =>
            category.name.trim().toLocaleLowerCase() === normalizedName,
        )
      ) {
        throw new BlogsApiError("A category with this name already exists", 409);
      }
      const newCategory: BlogCategory = {
        id: `cat-${Date.now()}`,
        name: payload.name.trim(),
        is_active: payload.is_active,
        sort_order: categories.length + 1,
        post_count: 0,
      };
      categories.push(newCategory);
      saveStoredCategories(categories);
      return newCategory;
    },
  );
}

export function updateAdminBlogCategory(
  id: string,
  payload: { name?: string; is_active?: boolean },
): Promise<BlogCategory> {
  return safeRequest(
    () =>
      request(`/cms/blogs/admin/categories/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    () => {
      const categories = getStoredCategories();
      const index = categories.findIndex((c) => c.id === id);
      if (index === -1) throw new BlogsApiError("Category not found", 404);
      const nextName = payload.name?.trim() ?? categories[index].name;
      const nextActive = payload.is_active !== undefined ? payload.is_active : categories[index].is_active;
      if (
        categories.some(
          (category) =>
            category.id !== id &&
            category.name.trim().toLocaleLowerCase() === nextName.toLocaleLowerCase(),
        )
      ) {
        throw new BlogsApiError("A category with this name already exists", 409);
      }
      const prevName = categories[index].name;
      const updated: BlogCategory = {
        ...categories[index],
        name: nextName,
        is_active: nextActive,
      };
      categories[index] = updated;
      saveStoredCategories(categories);

      // If category name changed, synchronize posts in local storage
      if (nextName !== prevName) {
        const posts = getStoredPosts();
        let changed = false;
        posts.forEach((p) => {
          if (p.category_id === id || p.category === prevName) {
            p.category = nextName;
            p.category_id = id;
            changed = true;
          }
        });
        if (changed) saveStoredPosts(posts);
      }

      return updated;
    },
  );
}

export function reorderAdminBlogCategories(
  ids: string[],
): Promise<BlogCategory[]> {
  return safeRequest(
    () =>
      request("/cms/blogs/admin/categories/order", {
        method: "PUT",
        body: JSON.stringify({ ids }),
      }),
    () => {
      const categories = getStoredCategories();
      const reordered = ids
        .map((id, index) => {
          const found = categories.find((c) => c.id === id);
          return found ? { ...found, sort_order: index + 1 } : null;
        })
        .filter((c): c is BlogCategory => c !== null);
      saveStoredCategories(reordered);
      return reordered;
    },
  );
}

export function deleteAdminBlogCategory(
  id: string,
): Promise<{ message: string }> {
  return safeRequest(
    () =>
      request(`/cms/blogs/admin/categories/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
    () => {
      const categories = getStoredCategories();
      const category = categories.find((item) => item.id === id);
      if (!category) throw new BlogsApiError("Category not found", 404);
      const posts = getStoredPosts();
      const matching = posts.filter(
        (p) =>
          p.category_id === id ||
          (p.category && p.category.toLowerCase() === category.name.toLowerCase()),
      );
      if (matching.length > 0 || (category.post_count ?? 0) > 0) {
        throw new BlogsApiError(
          "Categories used by existing posts cannot be deleted.",
          409,
        );
      }
      saveStoredCategories(categories.filter((item) => item.id !== id));
      return { message: "Category deleted" };
    },
  );
}

export function uploadBlogAsset(
  file: File,
  purpose: "cover_image" | "image" | "document" = "image",
): Promise<UploadResponse> {
  return safeRequest(
    () => {
      const body = new FormData();
      body.append("file", file);
      body.append("purpose", purpose);
      return request<Record<string, unknown>>("/cms/blogs/uploads", { method: "POST", body }).then((response) => {
        const url = typeof response.url === "string" ? response.url
          : typeof response.file_url === "string" ? response.file_url
          : typeof response.asset_url === "string" ? response.asset_url
          : typeof response.path === "string" ? response.path
          : typeof response.location === "string" ? response.location
          : "";
        return {
          url,
          name: typeof response.name === "string" ? response.name : typeof response.filename === "string" ? response.filename : file.name,
          size: typeof response.size === "number" ? response.size : typeof response.file_size === "number" ? response.file_size : file.size,
          type: typeof response.type === "string" ? response.type : typeof response.content_type === "string" ? response.content_type : typeof response.mime_type === "string" ? response.mime_type : file.type,
          id: typeof response.id === "string" ? response.id : typeof response.file_id === "string" ? response.file_id : typeof response.asset_id === "string" ? response.asset_id : undefined,
        };
      });
    },
    () => ({
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
      type: file.type,
      id: `asset-${Date.now()}`,
    }),
  );
}

// -------------------------------------------------------------
// MODULE-LEVEL BLOG GOVERNANCE API FUNCTIONS
// -------------------------------------------------------------
export function getAdminBlogGovernance(): Promise<BlogGovernanceResponse> {
  return safeRequest(
    () => request<BlogGovernanceResponse>("/cms/blogs/admin/governance"),
    () => getStoredGovernanceResponse(),
  );
}

/** Fetches the current Blog/News module governance state (enterprise/public-facing, no admin auth required). */
export function getBlogGovernanceFromServer(): Promise<BlogGovernanceResponse> {
  return safeRequest(
    () => request<BlogGovernanceResponse>("/cms/blogs/governance"),
    () => getStoredGovernanceResponse(),
  );
}

/** Syncs governance state from the backend to localStorage and notifies listeners. Call on app/page mount. */
export async function syncBlogGovernanceFromServer(): Promise<BlogGovernanceResponse> {
  const response = await getBlogGovernanceFromServer();
  if (response && typeof response === "object" && "modules" in response) {
    saveStoredGovernanceResponse(response);
  }
  return response;
}

export function updateAdminBlogGovernanceModule(
  module: BlogModuleKey,
  enabled: boolean,
): Promise<BlogGovernanceResponse> {
  return safeRequest(
    () =>
      request<BlogGovernanceResponse>(
        `/cms/blogs/admin/governance/${encodeURIComponent(module)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ enabled }),
        },
      ),
    () => {
      const current = getStoredGovernanceResponse();
      const prevVal = current.modules[module] ?? true;
      if (prevVal !== enabled) {
        recordGovernanceAudit({
          module,
          previous_value: prevVal,
          new_value: enabled,
          action: enabled ? "enabled" : "disabled",
          actor_id: current.updated_by?.id ?? "usr-super-admin-01",
          actor_name: current.updated_by?.name ?? "Super Admin",
          actor_role: "super_admin",
        });
      }
      const updated: BlogGovernanceResponse = {
        modules: { ...current.modules, [module]: enabled },
        updated_at: new Date().toISOString(),
        updated_by: current.updated_by,
      };
      saveStoredGovernanceResponse(updated);
      return updated;
    },
  );
}

export function resetAdminBlogGovernance(): Promise<BlogGovernanceResponse> {
  return safeRequest(
    () =>
      request<BlogGovernanceResponse>("/cms/blogs/admin/governance/reset", {
        method: "POST",
        body: "{}",
      }),
    () => {
      const current = getStoredGovernanceResponse();
      recordGovernanceAudit({
        module: "general",
        previous_value: false,
        new_value: true,
        action: "reset",
        actor_id: current.updated_by?.id ?? "usr-super-admin-01",
        actor_name: current.updated_by?.name ?? "Super Admin",
        actor_role: "super_admin",
      });
      const resetResponse: BlogGovernanceResponse = {
        modules: { ...DEFAULT_BLOG_GOVERNANCE },
        updated_at: new Date().toISOString(),
        updated_by: current.updated_by,
      };
      saveStoredGovernanceResponse(resetResponse);
      return resetResponse;
    },
  );
}

export function getAdminBlogGovernanceAudit(): Promise<BlogGovernanceAuditResponse> {
  return safeRequest(
    () =>
      request<BlogGovernanceAuditResponse>("/cms/blogs/admin/governance/audit"),
    () => {
      const items = getStoredGovernanceAudit();
      return { items, total: items.length };
    },
  );
}

