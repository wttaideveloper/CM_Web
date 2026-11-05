"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCurrentEnterprise } from "@ihp/enterprise-runtime";
import { BlogConfirmationModal } from "./BlogConfirmationModal";
import {
  deleteMyBlogPost,
  sanitizeBlogPostHtml,
  getAdminBlogFormVersion,
  getMyBlogForm,
  getMyBlogPost,
  type BlogForm,
  type BlogFormField,
  type BlogManageDetail,
  unpublishMyBlogPost,
} from "@ihp/shared";

const statusLabel: Record<string, string> = {
  draft: "Draft",
  pending_approval: "Pending approval",
  changes_requested: "Changes requested",
  rejected: "Rejected",
  published: "Published",
  unpublished: "Unpublished",
};

const SYSTEM_FIELD_KEYS = new Set([
  "post_type",
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
  "tags",
  "article_tags",
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
    url: "Reference URL",
    date: "Date",
    text: "Short Text",
    time: "Time",
    radio: "Radio Button",
    number: "Number",
    select: "Dropdown",
    textarea: "Long Text",
    "rich_text": "Rich Text Field",
    richtext: "Rich Text Field",
    "file_upload": "Supporting Document",
    fileupload: "Supporting Document",
    "media_upload": "Additional Images",
    mediaupload: "Additional Images",
    "multi_select": "Checkbox / Multi-select",
    multiselect: "Checkbox / Multi-select",
  };
  if (inferred && labels[inferred]) return labels[inferred];
  return key
    .replace(/^custom_fields\./, "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function inferCustomFieldType(key: string): BlogFormField["type"] {
  const normalized = key.replace(/^custom_fields\./, "").toLowerCase();
  if (normalized.includes("media_upload") || normalized.includes("image")) return "media_upload";
  if (normalized.includes("file_upload") || normalized.includes("document")) return "file_upload";
  return "text";
}

function renderValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value ?? "");
}

function assetUrl(value: string): string {
  if (typeof window === "undefined") return value;
  try {
    const parsed = new URL(value, window.location.origin);
    if (parsed.pathname.startsWith("/api/v1/cms/blogs/") && parsed.origin !== window.location.origin) {
      return `${window.location.origin}${parsed.pathname}${parsed.search}`;
    }
  } catch {
    // Keep the original value when it is not a valid absolute URL.
  }
  return value;
}

function sanitizeRichText(value: string): string {
  return sanitizeBlogPostHtml(value);
}

function choiceLabel(field: BlogFormField | undefined, value: unknown): string {
  const raw = renderValue(value);
  const options = field?.validation?.options;
  if (typeof options !== "string") return raw;
  const labels = new Map(
    options.split(",").map((option) => {
      const trimmed = option.trim();
      return [trimmed, trimmed] as const;
    }),
  );
  return raw
    .split(", ")
    .map((item) => labels.get(item) ?? item)
    .join(", ");
}

function formatPostDate(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

/** Displays one tenant-scoped Blog or News post returned by the authenticated My Posts API. */
export default function EnterpriseBlogPostDetailsScreen() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { enterpriseId, isLoadingEnterprise, enterpriseError } = useCurrentEnterprise();
  const [post, setPost] = useState<BlogManageDetail | null>(null);
  const [postForm, setPostForm] = useState<BlogForm | null>(null);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    destructive: boolean;
    onConfirm: () => Promise<void>;
  } | null>(null);

  const isBlogsPath = typeof window !== "undefined" && window.location.pathname.startsWith("/admin/blogs");
  const basePath = isBlogsPath ? "/admin/blogs" : "/admin/my-blogs";

  useEffect(() => {
    if (!params.id) return;
    if (!enterpriseId) return;
    void getMyBlogPost(params.id, enterpriseId)
      .then(setPost)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to load this post."));
  }, [params.id, enterpriseId]);

  useEffect(() => {
    if (!post?.form_id || !post.form_version) {
      setPostForm(null);
      return;
    }
    void getAdminBlogFormVersion(post.form_id, post.form_version)
      .then(setPostForm)
      .catch(() => getMyBlogForm(post.kind, enterpriseId ?? undefined).then(setPostForm).catch(() => setPostForm(null)));
  }, [enterpriseId, post?.form_id, post?.form_version, post?.kind]);

  if (error || (!isLoadingEnterprise && enterpriseError)) return <main className="min-h-screen bg-[#f8fafc] p-6"><div role="alert" className="mx-auto max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error || enterpriseError}</div></main>;
  if (!post) return <main className="min-h-screen bg-[#f8fafc] p-6"><div role="status" className="mx-auto max-w-3xl animate-pulse space-y-4"><div className="h-8 w-64 rounded bg-[#e5eee9]" /><div className="h-64 rounded-2xl bg-white" /></div></main>;

  return (
    <main className="min-h-screen bg-[#f8fafc] p-5 text-[#06201c] sm:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href={basePath} className="text-sm font-semibold text-[#1f6a58] hover:underline">← Back to My Posts</Link>
        <header className="overflow-hidden rounded-2xl border border-[#dfe9e4] bg-white shadow-sm">
          {post.cover_image_url && (
            <img
              src={assetUrl(post.cover_image_url)}
              alt={post.title || "Article cover"}
              className="max-h-[360px] w-full object-cover"
            />
          )}
          <div className="p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-[#f1f6f3] px-2 py-1 text-xs font-semibold uppercase text-[#52736a]">{post.kind}</span>
            {post.category && <span className="rounded-md bg-[#e8f6ee] px-2 py-1 text-xs font-semibold text-[#26705d]">{post.category}</span>}
            <span className="rounded-full bg-[#eef7f2] px-3 py-1 text-xs font-semibold">{statusLabel[post.status] ?? post.status}</span>
          </div>
          <h1 className="mt-3 text-3xl font-bold">{post.title}</h1>
          <p className="mt-3 text-sm text-[#52736a]">
            {post.author_name ? `By ${post.author_name} · ` : ""}
            Published {formatPostDate(post.published_at)} · Updated {formatPostDate(post.updated_at)}
          </p>
          {post.status === "published" && post.is_live && (
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => {
                setConfirmDialog({
                  isOpen: true,
                  title: "Unpublish this article?",
                  message: "It will immediately be hidden from readers and return to an unpublished status.",
                  confirmLabel: "Unpublish Article",
                  destructive: true,
                  onConfirm: async () => {
                    setActionBusy(true);
                    setError("");
                    setConfirmDialog(null);
                    try {
                      setPost(await unpublishMyBlogPost(post.id));
                      setActionMessage("Article unpublished. It is no longer publicly available.");
                    } catch (reason: unknown) {
                      setError(reason instanceof Error ? reason.message : "Unable to unpublish this article.");
                    } finally {
                      setActionBusy(false);
                    }
                  },
                });
              }}
              className="mt-5 rounded-xl border border-amber-300 px-4 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-50"
            >
              Unpublish
            </button>
          )}
          {(post.status === "draft" || post.status === "rejected") && (
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => {
                const isDraft = post.status === "draft";
                setConfirmDialog({
                  isOpen: true,
                  title: isDraft ? "Delete this draft?" : "Discard this rejected post?",
                  message: isDraft
                    ? "This removes the draft post completely from My Posts. This action cannot be undone."
                    : "This removes the rejected post proposal from your posts list.",
                  confirmLabel: isDraft ? "Delete Draft" : "Discard Post",
                  destructive: true,
                  onConfirm: async () => {
                    setActionBusy(true);
                    setError("");
                    setConfirmDialog(null);
                    try {
                      await deleteMyBlogPost(post.id);
                      router.replace(basePath);
                    } catch (reason: unknown) {
                      setError(reason instanceof Error ? reason.message : "Unable to delete this post.");
                      setActionBusy(false);
                    }
                  },
                });
              }}
              className="mt-5 ml-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {post.status === "draft" ? "Delete draft" : "Discard post"}
            </button>
          )}
          {actionMessage && <p role="status" className="mt-3 text-sm font-semibold text-[#175245]">{actionMessage}</p>}
          {(post.status === "changes_requested" || post.status === "rejected") && (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="alert">
              <p className="font-semibold">Reviewer feedback</p>
              <p className="mt-1 whitespace-pre-wrap">{post.reviewer_note || "Please review the submission and make the requested updates before resubmitting."}</p>
            </div>
          )}
          {(post.status === "changes_requested" || post.status === "rejected") && (
            <button
              type="button"
              onClick={() => router.push(`${basePath}?edit=${encodeURIComponent(post.id)}`)}
              className="mt-5 rounded-xl bg-[#1f6a58] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#175245]"
            >
              Edit &amp; resubmit
            </button>
          )}
          </div>
        </header>
        <article className="rounded-2xl border border-[#dfe9e4] bg-white p-6 shadow-sm">
          <section className="rounded-xl border border-[#dceee5] bg-[#f5fbf7] p-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#52736a]">At a glance</h2>
            <p className="mt-2 text-base leading-7 text-[#35544b]">{post.excerpt || "No summary provided."}</p>
          </section>
          <section className="mt-8">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#7f9d94]">Article</h2>
            <div className="prose prose-sm mt-3 max-w-none leading-7 text-[#35544b]" dangerouslySetInnerHTML={{ __html: sanitizeRichText(post.content || "No content provided.") }} />
          </section>
        </article>
        {post.custom_fields && Object.keys(post.custom_fields).length > 0 && (
          <article className="rounded-2xl border border-[#dfe9e4] bg-white p-6 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#7f9d94]">
              Additional information
            </h2>
            <div className="mt-4 space-y-5">
              {(() => {
                const configuredSections = (postForm?.sections ?? []).filter((section) => !isProtectedSection(section));
                const configuredKeys = new Set(configuredSections.flatMap((section) => section.fields.map((field) => field.key)));
                const fallbackFields: BlogFormField[] = Object.keys(post.custom_fields ?? {})
                  .filter((key) => !isSystemFieldKey(key) && !configuredKeys.has(key))
                  .map((key, index) => ({ id: key, key, label: friendlyFieldName(key), type: inferCustomFieldType(key), required: false, visible: true, order: index }));
                const sections = [...configuredSections, ...(fallbackFields.length ? [{ id: "custom-fallback", title: "", description: null, order: 999, fields: fallbackFields }] : [])];
                const seenKeys = new Set<string>();
                return sections.map((section) => {
                  const fields = section.fields.filter((field) => {
                    if (isSystemFieldKey(field.key) || seenKeys.has(field.key)) return false;
                    seenKeys.add(field.key);
                  const value = post.custom_fields?.[field.key];
                  return value !== "" && value !== null && value !== undefined;
                  });
                  if (fields.length === 0) return null;
                  return (
                  <section key={section.id}>
                    {section.title && <h3 className="text-lg font-semibold text-[#06201c]">{section.title}</h3>}
                    {section.description && <p className="mt-1 text-sm text-[#52736a]">{section.description}</p>}
                    <div className="mt-3 space-y-3">
                      {fields.map((field) => {
                        const value = post.custom_fields?.[field.key];
                        const type = field.type.toLowerCase();
                        const displayValue = choiceLabel(field, value);
                        const isRichText = type === "rich_text" || type === "richtext" || type === "html";
                        const isImage = type === "media_upload" || type === "image" || type === "image_list";
                        const isFile = type === "file_upload" || type === "document";
                        const values = Array.isArray(value) ? value : value ? [value] : [];
                        return (
                          <div key={field.key} className="rounded-xl border border-[#edf3f0] bg-[#f8fbf9] p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h4 className="font-semibold text-[#175245]">{field.label || friendlyFieldName(field.key)}</h4>
                            </div>
                            {isRichText ? (
                              <div className="prose prose-sm mt-3 max-w-none text-[#35544b]" dangerouslySetInnerHTML={{ __html: sanitizeRichText(displayValue) }} />
                            ) : isImage ? (
                              <div className="mt-3 flex flex-wrap gap-3">
                                {values.map((item) => {
                                  const url = assetUrl(String(item));
                                  return <a key={url} href={url} target="_blank" rel="noreferrer" className="block"><img src={url} alt={field.label} className="h-24 w-24 rounded-lg border border-[#d7e5df] object-cover" /></a>;
                                })}
                              </div>
                            ) : isFile ? (
                              <div className="mt-3 space-y-2">
                                {values.map((item) => <a key={String(item)} href={assetUrl(String(item))} target="_blank" rel="noreferrer" className="block truncate text-sm font-semibold text-[#1f6a58] hover:underline">Open attached document</a>)}
                              </div>
                            ) : (
                              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#35544b]">{displayValue}</p>
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
          </article>
        )}
      </div>
      {confirmDialog && (
        <BlogConfirmationModal
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          destructive={confirmDialog.destructive}
          isPending={actionBusy}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </main>
  );
}
