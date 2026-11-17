"use client";

import { useState } from "react";
import type { BlogForm, BlogCategory, BlogCustomFieldValue } from "@ihp/shared";

interface BlogPostReaderPreviewModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly form: {
    type: "blog" | "news" | "both";
    title: string;
    summary: string;
    content: string;
    category: string;
    coverImageUrl: string;
    tags: string;
  };
  readonly activeForm: BlogForm | null;
  readonly customFields: Record<string, BlogCustomFieldValue>;
  readonly categories: BlogCategory[];
}

function sanitizeRichText(value: string): string {
  if (typeof window === "undefined" || !value) return value;
  const doc = new DOMParser().parseFromString(value, "text/html");
  doc.querySelectorAll("script, style, iframe, object, embed").forEach((n) => n.remove());
  doc.querySelectorAll("*").forEach((node) => {
    Array.from(node.attributes).forEach((a) => {
      if (a.name.toLowerCase().startsWith("on")) node.removeAttribute(a.name);
      if (["href", "src"].includes(a.name.toLowerCase()) && a.value.trim().toLowerCase().startsWith("javascript:")) node.removeAttribute(a.name);
    });
  });
  return doc.body.innerHTML;
}

function previewRichTextHtml(value: string, fallback: string): string {
  return sanitizeRichText(value || `<p>${fallback}</p>`);
}

function postTypeLabel(value: "blog" | "news" | "both"): string {
  return value === "both" ? "Blog & News" : value === "blog" ? "Blog" : "News";
}

function visibleCustomFields(activeForm: BlogForm | null, customFields: Record<string, BlogCustomFieldValue>) {
  return (activeForm?.sections ?? [])
    .filter((s) => s.visible !== false && s.visibility_scope !== "admin_only" && s.type !== "admin_notes")
    .flatMap((s) =>
      s.fields.filter(
        (f) =>
          f.visible && f.visibility_scope !== "admin_only" && !["post_type", "title", "post_title_slug", "excerpt", "short_summary", "content", "article_content", "category", "category_id", "cover_image", "cover_image_url", "cover_image_file", "tags", "article_tags"].includes(f.key) &&
          customFields[f.key] !== undefined && customFields[f.key] !== "" && customFields[f.key] !== null,
      ),
    );
}

export function BlogPostReaderPreviewModal({ isOpen, onClose, form, activeForm, customFields, categories }: BlogPostReaderPreviewModalProps) {
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "desktop">("mobile");
  if (!isOpen) return null;
  const categoryName = categories.find((c) => c.id === form.category)?.name ?? form.category ?? "General";
  const fields = visibleCustomFields(activeForm, customFields);

  const renderField = (field: { id: string; label: string; type: string }, val: unknown, desktop: boolean) => {
    const v = String(val);
    if (field.type === "textarea" || field.type === "rich_text" || field.type === "richtext") {
      return (
        <div key={field.id} className={desktop ? "sm:col-span-2 rounded-xl border border-[#d7e5df] bg-[#f8fafc] p-4" : "p-2.5 rounded-xl border border-[#e1ebe6] bg-[#f8fafc]/50"}>
          <span className={desktop ? "block text-xs font-bold uppercase tracking-wider text-[#175245]" : "text-[11px] font-bold text-[#06201c] block"}>{field.label}</span>
          <p className={desktop ? "mt-1 text-sm text-[#52736a] leading-relaxed italic whitespace-pre-wrap" : "mt-1 text-xs text-[#52736a] leading-relaxed italic whitespace-pre-wrap"}>{v}</p>
        </div>
      );
    }
    if (field.type === "media_upload" || field.type === "additional_images" || field.type === "image" || field.type === "image_list") {
      const urls = Array.isArray(val) ? val : v.split(",").map((x) => x.trim()).filter(Boolean);
      return (
        <div key={field.id} className={desktop ? "rounded-xl border border-[#d7e5df] bg-white p-3 shadow-xs" : "rounded-xl border border-[#e1ebe6] bg-white p-3"}>
          <span className={desktop ? "block text-xs font-bold uppercase tracking-wider text-[#175245]" : "text-[10px] font-bold uppercase tracking-wider text-[#1f6a58]"}>{field.label}</span>
          <div className="mt-2 flex flex-wrap gap-2">{urls.map((u) => <img key={String(u)} src={String(u)} alt={field.label} className={desktop ? "h-20 w-20 rounded-lg border border-[#d7e5df] object-cover" : "h-16 w-16 rounded-lg border border-[#e1ebe6] object-cover"} />)}</div>
        </div>
      );
    }
    if (field.type === "file_upload" || field.type === "supporting_document" || field.type === "document") {
      return (
        <div key={field.id} className={desktop ? "rounded-xl border border-[#d7e5df] bg-white p-3 flex items-center justify-between shadow-xs" : "p-2 rounded-lg border border-[#e1ebe6] bg-white flex items-center justify-between"}>
          <div className="flex items-center gap-2 truncate">
            <span className="rounded bg-[#e8f6ee] px-1.5 py-0.5 text-[10px] font-bold text-[#1f6a58] uppercase">DOC</span>
            <span className={desktop ? "text-sm font-semibold text-[#06201c] truncate" : "text-xs font-semibold text-[#06201c] truncate"}>{v}</span>
          </div>
          <span className={desktop ? "text-xs font-semibold text-[#1f6a58] shrink-0" : "text-[11px] font-semibold text-[#1f6a58] shrink-0"}>Download</span>
        </div>
      );
    }
    return (
      <div key={field.id} className={desktop ? "rounded-xl border border-[#d7e5df] bg-[#f8fafc] p-3 text-xs flex flex-col gap-0.5" : "rounded-lg bg-[#eff8f3] border border-[#b6dfce] p-2 text-xs flex flex-col gap-0.5"}>
        <span className={desktop ? "font-semibold text-[#175245] block text-[10px] uppercase tracking-wider" : "font-semibold text-[#175245] block text-[10px] uppercase tracking-wider"}>{field.label}</span>
        <span className={desktop ? "text-[#06201c] text-xs font-medium" : "text-[#06201c] text-xs font-medium"}>{v}</span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#06201c]/45 p-4 backdrop-blur-xs" role="dialog" aria-modal="true" aria-label="Post preview">
      <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4 border-b border-[#edf3f0] pb-3">
          <div>
            <h2 className="text-xl font-bold text-[#06201c]">Article Preview</h2>
            <p className="text-xs text-[#52736a] mt-0.5">Live preview of the published article layout. Enterprise Admin Only fields are not shown.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg bg-[#f4faf7] p-0.5 text-xs font-semibold">
              <button type="button" onClick={() => setPreviewDevice("mobile")} className={`rounded-md px-2.5 py-1 transition-colors ${previewDevice === "mobile" ? "bg-white text-[#06201c] shadow-xs" : "text-[#52736a] hover:text-[#06201c]"}`}>Customer Mobile</button>
              <button type="button" onClick={() => setPreviewDevice("desktop")} className={`rounded-md px-2.5 py-1 transition-colors ${previewDevice === "desktop" ? "bg-white text-[#06201c] shadow-xs" : "text-[#52736a] hover:text-[#06201c]"}`}>Customer Web</button>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold hover:bg-[#f8fafc]">Close</button>
          </div>
        </div>

        <div className="rounded-xl bg-[#eff8f3] border border-[#b6dfce] p-2.5 text-xs text-[#175245] flex items-center justify-between">
          <span className="font-medium">Public Reader View: Only approved public article content is rendered below.</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#1f6a58] bg-white px-2 py-0.5 rounded border border-[#b6dfce]">Admin-Only Hidden</span>
        </div>

        {previewDevice === "mobile" && (
        <div className="w-full max-w-[375px] mx-auto rounded-[32px] border-4 border-[#06201c] bg-white shadow-xl p-4 overflow-hidden flex flex-col gap-3">
          <div className="flex items-center justify-between px-1 text-[10px] font-semibold text-[#52736a] border-b border-[#edf3f0] pb-1.5">
            <span>9:41</span><div className="w-12 h-2.5 bg-[#06201c] rounded-full" /><span>5G</span>
          </div>
          <div>
            <span className="rounded-full bg-[#e8f6ee] px-2 py-0.5 text-[10px] font-bold uppercase text-[#1f6a58]">{postTypeLabel(form.type)}</span>
            <h1 className="mt-1.5 text-base font-bold text-[#06201c] leading-snug">{form.title || "Post title preview"}</h1>
            <p className="mt-1 text-xs text-[#52736a]">{categoryName}</p>
          </div>
          {form.coverImageUrl && <img src={form.coverImageUrl} alt="Post cover preview" className="max-h-48 w-full rounded-xl object-cover" />}
          {form.summary && <p className="text-xs text-[#52736a] italic border-l-2 border-[#1f6a58] pl-2">{form.summary}</p>}
          <div className="prose prose-sm max-w-none text-xs leading-relaxed text-[#52736a] [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5" dangerouslySetInnerHTML={{ __html: previewRichTextHtml(form.content, "Post content preview") }} />
          <div className="flex flex-col gap-2">{fields.map((f) => renderField(f, customFields[f.key], false))}</div>
        </div>
        )}

        {previewDevice === "desktop" && (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#7f9d94]">{postTypeLabel(form.type)}</p>
            <h2 className="mt-1 text-2xl font-bold text-[#06201c]">{form.title || "Post title preview"}</h2>
            <p className="mt-2 text-sm text-[#52736a]">{categoryName}</p>
          </div>
          {form.coverImageUrl && <img src={form.coverImageUrl} alt="Post cover preview" className="max-h-72 w-full rounded-xl object-cover" />}
          {form.summary && <p className="whitespace-pre-wrap text-sm leading-6 text-[#52736a] italic border-l-3 border-[#1f6a58] pl-3">{form.summary}</p>}
          <div className="prose prose-sm max-w-none text-sm leading-7 text-[#52736a] [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5" dangerouslySetInnerHTML={{ __html: previewRichTextHtml(form.content, "Post content preview") }} />
          <div className="flex flex-col gap-3 pt-3 border-t border-[#edf3f0]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#175245]">Additional Information</span>
              <span className="text-xs text-[#1f6a58] bg-[#e8f6ee] px-2 py-0.5 rounded-full font-medium border border-[#a3d7c3]">Approved Display Layout</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{fields.map((f) => renderField(f, customFields[f.key], true))}</div>
          </div>
        </div>
        )}
      </section>
    </div>
  );
}