"use client";

import { useState } from "react";
import type { BlogForm, BlogCategory, BlogFormField, BlogCustomFieldValue, BlogPostFields, BlogLinkedEntity, BlogModuleKey } from "@ihp/shared";
import { BlogCustomFieldsRenderer } from "./BlogCustomFieldsRenderer";

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

interface AuthoringContext {
  module: "events" | "trainings" | "products" | "services";
  entityId: string;
  entityTitle: string;
}

interface BlogAuthoringDrawerProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly editing: Post | null;
  readonly form: {
    type: "blog" | "news" | "both";
    title: string;
    summary: string;
    content: string;
    category: string;
    coverImageUrl: string;
    tags: string;
  };
  readonly onFormChange: (updated: Partial<BlogAuthoringDrawerProps["form"]>) => void;
  readonly activeForm: BlogForm | null;
  readonly activeFormLoading: boolean;
  readonly authoringContext: AuthoringContext | null;
  readonly categories: BlogCategory[];
  readonly customFields: Record<string, BlogCustomFieldValue>;
  readonly onCustomFieldChange: (key: string, value: BlogCustomFieldValue) => void;
  readonly onUploadMedia: (field: BlogFormField, files: FileList | null) => Promise<void>;
  readonly onRemoveMedia: (fieldKey: string, urlToRemove: string) => void;
  readonly uploadingKeys: Set<string>;
  readonly onSave: (submitForReview: boolean) => Promise<void>;
  readonly onOpenPreview: () => void;
  readonly isSaving: boolean;
  readonly error: string;
}

function RichTextEditor({ value, onChange, placeholder, minHeightClass }: { value: string; onChange: (v: string) => void; placeholder?: string; minHeightClass?: string }) {
  return (
    <div className={`rounded-xl border border-[#d7e5df] bg-white ${minHeightClass ?? "min-h-[120px]"}`}>
      <div className="flex gap-1 border-b border-[#edf3f0] p-2">
        {(["bold", "italic", "underline"] as const).map((cmd) => (
          <button key={cmd} type="button" onMouseDown={(e) => { e.preventDefault(); document.execCommand(cmd); }} className="rounded px-2 py-1 text-xs font-semibold text-[#175245] hover:bg-[#f4faf7]">
            {cmd === "bold" ? "B" : cmd === "italic" ? "I" : "U"}
          </button>
        ))}
      </div>
      <div contentEditable suppressContentEditableWarning className="px-3 py-2 text-sm text-[#06201c] outline-none" onInput={(e) => onChange(e.currentTarget.innerHTML)} dangerouslySetInnerHTML={{ __html: value || `<p>${placeholder ?? ""}</p>` }} />
    </div>
  );
}

export function BlogAuthoringDrawer({
  isOpen,
  onClose,
  editing,
  form,
  onFormChange,
  activeForm,
  activeFormLoading,
  authoringContext,
  categories,
  customFields,
  onCustomFieldChange,
  onUploadMedia,
  onRemoveMedia,
  uploadingKeys,
  onSave,
  onOpenPreview,
  isSaving,
  error,
}: BlogAuthoringDrawerProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-[#06201c]/35" role="dialog" aria-modal="true" aria-label={editing ? "Edit post" : "Create post"} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-[#edf3f0] p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#7f9d94]">{editing ? "Edit post" : "New post"}</p>
            <h2 className="mt-1 text-xl font-bold text-[#06201c]">
              {editing?.status === "changes_requested" || editing?.status === "rejected" ? "Edit and resubmit your post" : editing ? "Update your post" : "Create a Blog or News post"}
            </h2>
            {authoringContext && !editing && (
              <div className="mt-3 rounded-xl border border-[#b6dfce] bg-[#eff8f3] px-3.5 py-3 text-sm text-[#175245]">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#52736a]">Linked content</p>
                <p className="mt-1 font-semibold">{authoringContext.module}: {authoringContext.entityTitle}</p>
                <p className="mt-1 text-xs text-[#52736a]">This article will remain associated with this item after submission.</p>
              </div>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg px-3 py-2 text-[#52736a] hover:bg-[#f4faf7]">Close</button>
        </header>
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {editing?.feedback && (editing.status === "changes_requested" || editing.status === "rejected") && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">Reviewer feedback</p>
              <p className="mt-1 whitespace-pre-wrap">{editing.feedback}</p>
            </div>
          )}
          <label className="block text-sm font-medium text-[#06201c]">
            Post type
            <select value={form.type} disabled={Boolean(editing)} onChange={(e) => onFormChange({ type: e.target.value as "blog" | "news" | "both" })} className="mt-2 w-full rounded-xl border border-[#d7e5df] bg-white px-3 py-3 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed">
              <option value="blog">Blog</option>
              <option value="news">News</option>
              <option value="both">Blog &amp; News</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-[#06201c]">
            Title
            <input value={form.title} onChange={(e) => onFormChange({ title: e.target.value })} maxLength={200} className="mt-2 w-full rounded-xl border border-[#d7e5df] px-3 py-3" placeholder="Enter a clear post title" />
          </label>
          <label className="block text-sm font-medium text-[#06201c]">
            Summary
            <textarea value={form.summary} onChange={(e) => onFormChange({ summary: e.target.value })} rows={3} className="mt-2 w-full rounded-xl border border-[#d7e5df] px-3 py-3" placeholder="Briefly describe what readers will learn" />
          </label>
          <label className="block text-sm font-medium text-[#06201c]">
            Category
            <select value={form.category} onChange={(e) => onFormChange({ category: e.target.value })} className="mt-2 w-full rounded-xl border border-[#d7e5df] bg-white px-3 py-3">
              <option value="">Select a category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <div>
            <p className="text-sm font-medium text-[#06201c]">Cover image</p>
            <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#b6dfce] bg-[#f8fafc] p-4 text-xs text-[#52736a]">
              Upload cover image
              <input type="file" accept="image/*" className="sr-only" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                // Delegated to parent via onSave? Parent handles upload; here we just store name
                onFormChange({ coverImageUrl: file.name });
              }} />
            </label>
            {form.coverImageUrl && <p className="mt-2 text-xs text-[#52736a] truncate">{form.coverImageUrl}</p>}
          </div>
          <div>
            <p className="text-sm font-medium text-[#06201c] mb-2">Article content</p>
            <RichTextEditor value={form.content} onChange={(v) => onFormChange({ content: v })} placeholder="Write the post content..." minHeightClass="min-h-[200px]" />
          </div>
          <label className="block text-sm font-medium text-[#06201c]">
            Tags (comma separated)
            <input value={form.tags} onChange={(e) => onFormChange({ tags: e.target.value })} className="mt-2 w-full rounded-xl border border-[#d7e5df] px-3 py-3" placeholder="Separate tags with commas" />
          </label>
          <BlogCustomFieldsRenderer sections={activeForm?.sections ?? []} customFields={customFields} onChange={onCustomFieldChange} onUploadMedia={onUploadMedia} onRemoveMedia={onRemoveMedia} uploadingKeys={uploadingKeys} />
        </div>
        <footer className="flex flex-wrap justify-between gap-3 border-t border-[#edf3f0] p-5">
          <button type="button" onClick={onOpenPreview} className="rounded-xl border border-[#d7e5df] px-4 py-2.5 text-sm font-semibold hover:bg-[#f8fafc]">Preview</button>
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" onClick={() => void onSave(false)} disabled={isSaving} className="rounded-xl border border-[#d7e5df] px-4 py-2.5 text-sm font-semibold hover:bg-[#f8fafc] disabled:opacity-50">Save draft</button>
            <button type="button" onClick={() => void onSave(true)} disabled={isSaving} className="rounded-xl bg-[#1f6a58] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#175245] disabled:opacity-50">Submit for review</button>
          </div>
        </footer>
      </section>
    </div>
  );
}