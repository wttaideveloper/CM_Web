"use client";

import type { BlogFormSection, BlogFormField, BlogCustomFieldValue } from "@ihp/shared";

interface BlogCustomFieldsRendererProps {
  readonly sections: BlogFormSection[];
  readonly customFields: Record<string, BlogCustomFieldValue>;
  readonly onChange: (key: string, value: BlogCustomFieldValue) => void;
  readonly onUploadMedia: (field: BlogFormField, files: FileList | null) => Promise<void>;
  readonly onRemoveMedia: (fieldKey: string, urlToRemove: string) => void;
  readonly uploadingKeys: Set<string>;
  readonly error?: string;
}

const SYSTEM_FIELD_KEYS = new Set([
  "post_type", "title", "post_title_slug", "excerpt", "short_summary", "content", "article_content",
  "category", "category_id", "cover_image", "cover_image_url", "cover_image_file", "tags", "article_tags",
]);

export function BlogCustomFieldsRenderer({
  sections,
  customFields,
  onChange,
  onUploadMedia,
  onRemoveMedia,
  uploadingKeys,
}: BlogCustomFieldsRendererProps) {
  const visibleSections = (sections ?? []).filter((s) => s.visible !== false);
  return (
    <div className="space-y-4">
      {visibleSections.map((section) => {
        const fields = (section.fields ?? []).filter(
          (f) => f.visible && !SYSTEM_FIELD_KEYS.has(f.key),
        );
        if (fields.length === 0) return null;
        const isAdminOnly = section.visibility_scope === "admin_only" || section.type === "admin_notes";
        return (
          <div key={section.id} className={`rounded-2xl border p-4 ${isAdminOnly ? "border-purple-200 bg-purple-50/40" : "border-[#d7e5df] bg-[#fbfdfc]"}`}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#06201c]">{section.title}</h3>
                {section.description ? <p className="mt-0.5 text-xs text-[#52736a]">{section.description}</p> : null}
              </div>
              <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${isAdminOnly ? "bg-purple-100 text-purple-800" : "bg-[#e8f6ee] text-[#1f6a58] border border-[#a3d7c3]"}`}>
                {isAdminOnly ? "Enterprise Admin Only" : "Customer-Visible"}
              </span>
            </div>
            <div className="space-y-3.5">
              {fields.map((field) => {
                const isFieldAdminOnly = isAdminOnly || field.visibility_scope === "admin_only";
                const value = customFields[field.key];
                return (
                  <label key={field.id} className="block text-sm font-medium text-[#06201c]">
                    <div className="flex items-center justify-between gap-2">
                      <span>{field.label}{field.required && <span className="text-red-600 font-bold"> *</span>}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${isFieldAdminOnly ? "bg-purple-100 text-purple-800" : "bg-[#e8f6ee] text-[#1f6a58]"}`}>
                        {isFieldAdminOnly ? "Enterprise Admin Only" : "Customer-Visible"}
                      </span>
                    </div>
                    {field.type === "rich_text" || field.type === "richtext" ? (
                      <textarea rows={4} value={String(value ?? "")} onChange={(e) => onChange(field.key, e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#d7e5df] bg-white px-3 py-2.5 text-sm focus:border-[#1f6a58] focus:outline-none" placeholder={field.placeholder?.trim() || "Write formatted content..."} />
                    ) : field.type === "textarea" || field.type === "long_text" ? (
                      <textarea rows={3} value={String(value ?? "")} onChange={(e) => onChange(field.key, e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#d7e5df] bg-white px-3 py-2.5 text-sm focus:border-[#1f6a58] focus:outline-none" placeholder={field.placeholder?.trim() || "Enter value"} />
                    ) : field.type === "select" || field.type === "dropdown" || field.type === "category" ? (
                      <select value={String(value ?? "")} onChange={(e) => onChange(field.key, e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#d7e5df] bg-white px-3 py-2.5 text-sm focus:border-[#1f6a58] focus:outline-none">
                        <option value="">Select an option...</option>
                        {(typeof field.validation?.options === "string" ? field.validation.options.split(",").map((o) => o.trim()).filter(Boolean) : Array.isArray(field.validation?.options) ? (field.validation.options as string[]) : []).map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : field.type === "number" ? (
                      <input type="number" value={String(value ?? "")} onChange={(e) => onChange(field.key, e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#d7e5df] bg-white px-3 py-2.5 text-sm focus:border-[#1f6a58] focus:outline-none" placeholder={field.placeholder?.trim() || "0"} />
                    ) : field.type === "date" ? (
                      <input type="date" value={String(value ?? "")} onChange={(e) => onChange(field.key, e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#d7e5df] bg-white px-3 py-2.5 text-sm focus:border-[#1f6a58] focus:outline-none" />
                    ) : field.type === "checkbox" ? (
                      <label className="mt-1.5 flex items-center gap-2 rounded-xl border border-[#d7e5df] bg-white px-3 py-2.5 text-sm font-normal">
                        <input type="checkbox" checked={value === true || value === "true"} onChange={(e) => onChange(field.key, e.target.checked)} className="h-4 w-4 accent-[#1f6a58]" />
                        <span>{field.placeholder ?? `Enable ${field.label.toLowerCase()}`}</span>
                      </label>
                    ) : field.type === "media_upload" || field.type === "additional_images" || field.type === "image" || field.type === "image_list" || field.type === "file_upload" || field.type === "supporting_document" || field.type === "document" ? (
                      <div className="mt-1.5 flex flex-col gap-2 rounded-xl border border-dashed border-[#b6dfce] bg-[#f8fafc] p-3">
                        <label className="cursor-pointer rounded-lg border border-[#d7e5df] bg-white px-3 py-1.5 text-xs font-semibold text-[#06201c] hover:bg-[#f4faf7] transition-colors w-fit">
                          {uploadingKeys.has(field.key) ? "Uploading..." : "Browse file"}
                          <input type="file" className="sr-only" onChange={(e) => onUploadMedia(field, e.target.files)} />
                        </label>
                        {value ? <span className="text-xs text-[#52736a] truncate">{String(value)}</span> : null}
                      </div>
                    ) : (
                      <input type="text" value={String(value ?? "")} onChange={(e) => onChange(field.key, e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#d7e5df] bg-white px-3 py-2.5 text-sm focus:border-[#1f6a58] focus:outline-none" placeholder={field.placeholder?.trim() || "Enter value"} />
                    )}
                    {field.help_text && <p className="mt-1 text-xs text-[#52736a]">{field.help_text}</p>}
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}