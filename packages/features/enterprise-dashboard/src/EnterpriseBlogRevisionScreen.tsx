"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCurrentEnterprise } from "@ihp/enterprise-runtime";
import { BlogConfirmationModal } from "./BlogConfirmationModal";
import {
  getAdminBlogFormVersion,
  getMyBlogForm,
  getMyBlogPost,
  listBlogCategories,
  submitMyBlogPost,
  updateMyBlogPost,
  uploadBlogAsset,
  type BlogCategory,
  type BlogCustomFieldValue,
  type BlogForm,
  type BlogFormField,
  type BlogManageDetail,
} from "@ihp/shared";

const CORE_KEYS = new Set(["title", "excerpt", "summary", "content", "category", "category_id", "tags", "cover_image_url"]);

function normalizeValue(value: unknown): BlogCustomFieldValue {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  return String(value);
}

function asFieldRecord(value: unknown): Record<string, BlogCustomFieldValue> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalizeValue(item)]));
}

function optionsFor(field: BlogFormField): string[] {
  const raw = field.validation?.options;
  return typeof raw === "string" ? raw.split(",").map((option) => option.trim()).filter(Boolean) : [];
}

function fieldType(field: BlogFormField): string {
  const type = field.type.toLowerCase();
  if (["image", "image_list", "media"].includes(type)) return "media_upload";
  if (["file", "document", "supporting_document"].includes(type)) return "file_upload";
  return type;
}

export default function EnterpriseBlogRevisionScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const postId = searchParams.get("id");
  const { enterpriseId } = useCurrentEnterprise();
  const [post, setPost] = useState<BlogManageDetail | null>(null);
  const [form, setForm] = useState<BlogForm | null>(null);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [customFields, setCustomFields] = useState<Record<string, BlogCustomFieldValue>>({});
  const [changeNotes, setChangeNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isBlogsPath = typeof window !== "undefined" && window.location.pathname.startsWith("/admin/blogs");
  const basePath = isBlogsPath ? "/admin/blogs" : "/admin/my-blogs";

  useEffect(() => {
    let cancelled = false;
    if (!postId || !enterpriseId) {
      setLoading(false);
      setError("The article could not be identified.");
      return () => { cancelled = true; };
    }
    void Promise.all([getMyBlogPost(postId, enterpriseId), listBlogCategories()])
      .then(async ([postData, catData]) => {
        const source = postData.pending_revision ?? postData;
        const sourceFormId = source.form_id ?? postData.form_id;
        const sourceFormVersion = source.form_version ?? postData.form_version;
        const loadedForm = sourceFormId && sourceFormVersion
          ? await getAdminBlogFormVersion(sourceFormId, sourceFormVersion)
          : await getMyBlogForm(source.kind, enterpriseId);
        if (cancelled) return;
        setPost(postData);
        setForm(loadedForm);
        setCategories(catData);
        setTitle(source.title ?? postData.title ?? "");
        setSummary(source.excerpt ?? postData.excerpt ?? "");
        setContent(source.content ?? postData.content ?? "");
        setCategoryId(source.category_id ?? postData.category_id ?? "");
        setCoverImageUrl(source.cover_image_url ?? postData.cover_image_url ?? "");
        setTags(source.tags ?? postData.tags ?? []);
        setCustomFields(asFieldRecord(source.custom_fields ?? postData.custom_fields));
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load the article for editing.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [postId, enterpriseId]);

  const fields = useMemo(() => (form?.sections ?? [])
    .filter((section) => section.visible !== false)
    .flatMap((section) => section.fields.filter((field) => field.visible !== false && !CORE_KEYS.has(field.key.toLowerCase()))), [form]);

  const setFieldValue = (key: string, value: BlogCustomFieldValue) => setCustomFields((current) => ({ ...current, [key]: value }));

  const uploadField = async (field: BlogFormField, files: FileList | null) => {
    if (!files?.length) return;
    setUploadingKey(field.key);
    setError("");
    try {
      const purpose = fieldType(field) === "media_upload" ? "image" : "document";
      const uploaded = await Promise.all(Array.from(files).map((file) => uploadBlogAsset(file, purpose)));
      const urls = uploaded.map((item) => item.url).filter(Boolean);
      const current = customFields[field.key];
      const existing = Array.isArray(current) ? current : current ? [String(current)] : [];
      setFieldValue(field.key, fieldType(field) === "media_upload" ? [...existing, ...urls] : urls[0] ?? "");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to upload the selected file.");
    } finally { setUploadingKey(null); }
  };

  const removeUploadedValue = (key: string, value: string) => {
    const current = customFields[key];
    if (Array.isArray(current)) setFieldValue(key, current.filter((item) => item !== value));
    else if (current === value) setFieldValue(key, "");
  };

  const validate = () => {
    if (title.trim().length < 5) return "Please provide a title with at least 5 characters.";
    if (!summary.trim() || !content.trim() || !categoryId.trim()) return "Complete the summary, content, and category before continuing.";
    const missing = fields.find((field) => {
      const value = customFields[field.key];
      const empty = value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
      return field.required && empty;
    });
    return missing ? `Complete the required field: ${missing.label}.` : "";
  };

  const buildPayload = (withNotes: boolean) => {
    const { supporting_documents: _supportingDocuments, ...customFieldPayload } = customFields;
    return ({
    ...(() => {
      const documentValue = customFields.supporting_documents;
      const urls = Array.isArray(documentValue) ? documentValue : documentValue ? [String(documentValue)] : [];
      return urls.length > 0
        ? { supporting_documents: urls.map((url) => ({ url, name: url.split("/").pop() || "Supporting document" })) }
        : {};
    })(),
    kind: post?.kind ?? "blog", title, excerpt: summary, content, category_id: categoryId,
    cover_image_url: coverImageUrl || null, tags, custom_fields: customFieldPayload,
    form_id: form?.id ?? post?.form_id ?? null, form_version: form?.version ?? post?.form_version ?? null,
    revision: true, ...(post?.version ? { base_version: post.version } : {}),
    ...(withNotes ? { change_notes: changeNotes } : {}),
    });
  };

  const handleSaveDraft = async () => {
    if (!postId || !post?.is_live || post.status !== "published") { setError("Only a currently published article can be edited from this screen."); return; }
    setSaving(true); setError("");
    try { await updateMyBlogPost(postId, buildPayload(false)); setNotice("Staged revision draft saved. The published article remains unchanged until approval."); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : "Unable to save revision draft."); }
    finally { setSaving(false); }
  };

  const handleSubmitForReview = async () => {
    if (!postId || !post?.is_live || post.status !== "published") { setError("Only a currently published article can be edited from this screen."); return; }
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    if (changeNotes.trim().length < 10) { setError("Please enter a change summary (at least 10 characters) explaining your revisions to the reviewer."); return; }
    setConfirmOpen(true);
  };

  const executeSubmitRevision = async () => {
    if (!postId) return;
    setConfirmOpen(false);
    setSaving(true); setError("");
    try {
      await updateMyBlogPost(postId, buildPayload(true));
      await submitMyBlogPost(postId, changeNotes);
      setNotice("Revision submitted to Super Admin for approval. The current live article remains active until approval.");
      window.setTimeout(() => router.push(basePath), 2000);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Unable to submit revision."); setSaving(false); }
  };

  const renderField = (field: BlogFormField) => {
    const type = fieldType(field);
    const value = customFields[field.key];
    const inputClass = "mt-1.5 w-full rounded-xl border border-[#d7e5df] bg-white px-3.5 py-2.5 text-sm";
    if (type === "media_upload" || type === "file_upload") {
      const values = Array.isArray(value) ? value : value ? [String(value)] : [];
      return <div key={field.key} className="rounded-xl border border-[#d7e5df] p-3"><label className="block text-sm font-medium">{field.label}{field.required ? " *" : ""}<input type="file" accept={type === "media_upload" ? "image/*" : undefined} multiple={type === "media_upload"} onChange={(event) => { void uploadField(field, event.target.files); event.currentTarget.value = ""; }} className="mt-2 block w-full text-sm" disabled={uploadingKey === field.key} /></label>{uploadingKey === field.key && <p className="mt-2 text-xs text-[#52736a]">Uploading…</p>}<div className="mt-3 flex flex-wrap gap-3">{values.map((item) => <div key={item} className="relative">{type === "media_upload" ? <img src={item} alt={field.label} className="h-20 w-20 rounded-lg object-cover" /> : <a href={item} target="_blank" rel="noreferrer" className="text-xs text-[#1f6a58] underline">Open file</a>}<button type="button" onClick={() => removeUploadedValue(field.key, item)} className="absolute -right-2 -top-2 rounded-full bg-white px-1.5 text-xs text-red-600 shadow">×</button></div>)}</div></div>;
    }
    if (type === "select" || type === "radio") return <label key={field.key} className="block text-sm font-medium">{field.label}{field.required ? " *" : ""}<select value={typeof value === "string" ? value : ""} onChange={(event) => setFieldValue(field.key, event.target.value)} className={inputClass}><option value="">Select an option</option>{optionsFor(field).map((option) => <option key={option} value={option}>{option}</option>)}</select>{field.help_text && <span className="mt-1 block text-xs text-[#7f9d94]">{field.help_text}</span>}</label>;
    if (type === "multi_select" || type === "checkbox") return <fieldset key={field.key} className="rounded-xl border border-[#d7e5df] p-3"><legend className="px-1 text-sm font-medium">{field.label}{field.required ? " *" : ""}</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{optionsFor(field).map((option) => { const checked = Array.isArray(value) && value.includes(option); return <label key={option} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={checked} onChange={(event) => { const current = Array.isArray(value) ? value : []; setFieldValue(field.key, event.target.checked ? [...current, option] : current.filter((item) => item !== option)); }} />{option}</label>; })}</div></fieldset>;
    const isLong = type === "textarea" || type === "rich_text";
    return <label key={field.key} className="block text-sm font-medium">{field.label}{field.required ? " *" : ""}{isLong ? <textarea rows={type === "rich_text" ? 5 : 3} value={value == null ? "" : String(value)} onChange={(event) => setFieldValue(field.key, event.target.value)} className={inputClass} placeholder={field.placeholder ?? undefined} /> : <input type={type === "number" ? "number" : type === "date" || type === "time" || type === "url" ? type : "text"} value={value == null ? "" : String(value)} onChange={(event) => setFieldValue(field.key, type === "number" ? Number(event.target.value) : event.target.value)} className={inputClass} placeholder={field.placeholder ?? undefined} />}{field.help_text && <span className="mt-1 block text-xs text-[#7f9d94]">{field.help_text}</span>}</label>;
  };

  if (loading) return <main className="min-h-screen bg-[#f8fafc] p-6 text-[#06201c]"><div className="mx-auto max-w-7xl animate-pulse space-y-4"><div className="h-8 w-48 rounded bg-[#edf3f0]" /><div className="h-4 w-72 rounded bg-[#edf3f0]" /><div className="h-64 rounded-xl bg-white p-6 shadow-sm" /></div></main>;
  const live = post?.live_version;
  const liveTitle = live?.title || post?.title || "Live Article";
  const liveSummary = live?.excerpt || post?.excerpt || "No summary provided.";
  const liveContent = live?.content || post?.content || "No content.";

  return <main className="min-h-screen bg-[#f8fafc] p-5 text-[#06201c] sm:p-8"><div className="mx-auto max-w-7xl space-y-6"><header className="flex flex-wrap items-end justify-between gap-4"><div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#7f9d94]"><Link href={basePath} className="hover:underline">My Posts</Link><span>/</span><span>Dual-State Revision Safety</span></div><h1 className="mt-1 text-3xl font-bold">Edit Published Article (Revision Mode)</h1><p className="mt-2 text-sm text-[#52736a]">Revisions to live articles do not change the published version until the revision is approved.</p></div><Link href={basePath} className="rounded-xl border border-[#d7e5df] bg-white px-4 py-2.5 text-sm font-semibold text-[#52736a] hover:bg-slate-50">Cancel &amp; Return</Link></header>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}{notice && <div role="status" className="rounded-xl border border-[#b6dfce] bg-[#eff8f3] p-4 text-sm font-semibold text-[#175245]">{notice}</div>}
    <div className="grid gap-6 lg:grid-cols-2"><section className="flex flex-col rounded-2xl border border-[#b6dfce] bg-white p-6 shadow-sm"><div className="flex items-center justify-between border-b border-[#edf3f0] pb-4"><div><span className="rounded-full bg-[#e8f6ee] px-2.5 py-1 text-xs font-bold text-[#175245]">Public Live Version</span><h2 className="mt-2 text-lg font-bold text-[#06201c]">{liveTitle}</h2></div><span className="text-xs font-semibold text-[#52736a]">Currently Public</span></div><div className="mt-4 space-y-4 text-sm"><div><p className="text-xs font-bold uppercase tracking-wider text-[#7f9d94]">Live Summary</p><p className="mt-1 rounded-xl bg-slate-50 p-3 text-slate-700">{liveSummary}</p></div><div><p className="text-xs font-bold uppercase tracking-wider text-[#7f9d94]">Live Content Preview</p><div className="mt-1 max-h-72 overflow-y-auto rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-700">{liveContent}</div></div><div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-xs text-amber-800"><strong>Published version:</strong> The current live version remains available while this revision is reviewed.</div></div></section>
      <section className="flex flex-col rounded-2xl border border-purple-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between border-b border-purple-100 pb-4"><div><span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-bold text-purple-800">Staged Revision Draft</span><h2 className="mt-2 text-lg font-bold text-[#06201c]">Update Content</h2></div><span className="text-xs font-semibold text-purple-700">Requires Reapproval</span></div><div className="mt-4 space-y-4"><label className="block text-sm font-medium">Revision Title<input type="text" value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#d7e5df] px-3.5 py-2.5 text-sm" /></label><label className="block text-sm font-medium">Category<select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#d7e5df] bg-white px-3.5 py-2.5 text-sm"><option value="">Select Category</option>{categoryId && !categories.some((category) => category.id === categoryId) && <option value={categoryId} disabled>{post?.category || "Current Category"} (Inactive)</option>}{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="block text-sm font-medium">Updated Summary<textarea rows={2} value={summary} onChange={(event) => setSummary(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#d7e5df] px-3.5 py-2.5 text-sm" /></label><label className="block text-sm font-medium">Updated Content<textarea rows={6} value={content} onChange={(event) => setContent(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#d7e5df] px-3.5 py-2.5 text-sm font-mono" /></label><label className="block text-sm font-medium">Cover Image<input type="url" value={coverImageUrl} onChange={(event) => setCoverImageUrl(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#d7e5df] px-3.5 py-2.5 text-sm" placeholder="https://…" /></label><label className="block text-sm font-medium">Tags / Keywords<input type="text" value={tags.join(", ")} onChange={(event) => setTags(event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean))} className="mt-1.5 w-full rounded-xl border border-[#d7e5df] px-3.5 py-2.5 text-sm" /></label>{fields.length > 0 && <div className="space-y-4 rounded-xl border border-[#edf3f0] bg-[#fbfdfc] p-4"><h3 className="text-sm font-bold uppercase tracking-wider text-[#52736a]">Additional Article Fields</h3>{fields.map(renderField)}</div>}<label className="block text-sm font-medium">Reviewer Change Summary (Mandatory)<textarea rows={2} value={changeNotes} onChange={(event) => setChangeNotes(event.target.value)} className="mt-1.5 w-full rounded-xl border border-purple-200 bg-purple-50/30 px-3.5 py-2.5 text-sm" placeholder="Detail what was revised for the reviewer." /></label><div className="flex flex-wrap justify-end gap-3 pt-4"><button type="button" disabled={saving} onClick={() => { void handleSaveDraft(); }} className="rounded-xl border border-[#d7e5df] bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Save Draft Revision</button><button type="button" disabled={saving} onClick={() => { void handleSubmitForReview(); }} className="rounded-xl bg-[#1f6a58] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#175245] disabled:opacity-50">{saving ? "Submitting…" : "Submit for Approval"}</button></div></div></section></div></div></main>;
}
