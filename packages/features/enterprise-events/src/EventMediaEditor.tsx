"use client";

import { useMemo, useRef, useState } from "react";

import EventMediaPreview from "./EventMediaPreview";
import { documentName, documentUrl, type EventDocumentEntry, type EventMediaField, type EventMediaPolicy, type EventMediaUploadState, validateEventMediaLink } from "./event-media";

export interface EventMediaEditorProps {
  field: EventMediaField;
  label: string;
  value: string | string[] | EventDocumentEntry[];
  error?: string;
  policy?: EventMediaPolicy;
  policyError?: string;
  uploads: readonly EventMediaUploadState[];
  onLinkChange: (index: number, value: string) => void;
  onAddLink: () => void;
  onRemove: (index: number) => void;
  onUpload: (file: File, replaceIndex?: number) => void;
  onRetry: (uploadId: string) => void;
}
const inputClass = "h-10 min-w-0 flex-1 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm text-[#06201c] outline-none focus:border-[#1f6a58]";

function valuesFor(value: EventMediaEditorProps["value"]): Array<string | EventDocumentEntry> {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function acceptedType(file: File, allowedTypes: readonly string[]): boolean {
  const extension = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".") + 1).toLowerCase() : "";
  return allowedTypes.some((allowed) => {
    const normalized = allowed.toLowerCase().replace(/^\./, "");
    return file.type.toLowerCase() === normalized || file.type.toLowerCase() === `application/${normalized}` || extension === normalized || file.type.toLowerCase().endsWith(`/${normalized}`);
  });
}

function fileAccept(allowedTypes: readonly string[]): string {
  return allowedTypes.map((type) => type.includes("/") || type.startsWith(".") ? type : `.${type}`).join(",");
}

/** Link-or-upload Event media control. Form values remain plain links or documented document objects. */
export default function EventMediaEditor({ field, label, value, error, policy, policyError, uploads, onLinkChange, onAddLink, onRemove, onUpload, onRetry }: EventMediaEditorProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [localErrors, setLocalErrors] = useState<Record<number, string>>({});
  const isPrimary = field === "primary_image";
  const items = valuesFor(value);
  const renderItems = isPrimary && items.length === 0 ? [""] : items;
  const fieldUploads = uploads.filter((upload) => upload.field === field);
  const rule = policy?.[field];
  const busyCount = fieldUploads.filter((upload) => upload.status === "uploading" || upload.status === "error").length;
  const canAdd = !rule || items.length + busyCount < rule.max_count;
  const canUpload = Boolean(rule) && (canAdd || field === "primary_image" && items.length > 0);
  const openPicker = (replaceIndex?: number) => {
    if (!canUpload && replaceIndex === undefined) return;
    if (fileInput.current) {
      fileInput.current.dataset.replaceIndex = replaceIndex === undefined ? "" : String(replaceIndex);
      fileInput.current.click();
    }
  };
  const policySummary = useMemo(() => rule ? `${rule.allowed_types.join(", ")} · up to ${Math.round(rule.max_size_bytes / (1024 * 1024))} MB · ${rule.max_count} item${rule.max_count === 1 ? "" : "s"}` : null, [rule]);
  return <div className="min-w-0 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-[#06201c]">{label}</p><div className="flex flex-wrap gap-2"><button type="button" onClick={onAddLink} disabled={!canAdd || isPrimary && items.length > 0} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#1f6a58] disabled:cursor-not-allowed disabled:opacity-50">+ Add link</button><button type="button" onClick={() => openPicker(isPrimary && items.length > 0 ? 0 : undefined)} disabled={!canUpload} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#1f6a58] disabled:cursor-not-allowed disabled:opacity-50">+ Upload file</button></div></div>
    {policySummary ? <p className="text-xs text-[#52736a]">Allowed: {policySummary}. Links and uploads share this count.</p> : policyError ? null : <p className="text-xs text-[#52736a]">Loading the live upload limits…</p>}
    {policyError ? <p role="alert" className="text-xs font-medium text-[#b42318]">{policyError}</p> : null}
    <input ref={fileInput} type="file" accept={fileAccept(rule?.allowed_types ?? [])} className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (!file) return; const replaceIndex = event.currentTarget.dataset.replaceIndex ? Number(event.currentTarget.dataset.replaceIndex) : undefined; if (rule && file.size > rule.max_size_bytes) { setLocalErrors((current) => ({ ...current, [-1]: `${file.name} is larger than the ${Math.round(rule.max_size_bytes / (1024 * 1024))} MB limit.` })); return; } if (rule && !acceptedType(file, rule.allowed_types)) { setLocalErrors((current) => ({ ...current, [-1]: `${file.name} is not an allowed file type for ${label}.` })); return; } setLocalErrors((current) => ({ ...current, [-1]: "" })); onUpload(file, replaceIndex); }} />
    {localErrors[-1] ? <p role="alert" className="text-xs text-[#b42318]">{localErrors[-1]}</p> : null}
    {renderItems.map((item, index) => { const rawUrl = documentUrl(item); const currentError = localErrors[index]; const previewKind = field === "videos" ? "video" : field === "documents" ? "document" : "image"; return <div key={`${rawUrl}-${index}`} className="space-y-2"><div className="flex min-w-0 gap-2"><input id={index === 0 ? `event-field-${field}` : undefined} type="url" value={rawUrl} placeholder="https://example.com/media" onChange={(event) => onLinkChange(index, event.target.value)} onBlur={() => { const checked = validateEventMediaLink(rawUrl); setLocalErrors((current) => ({ ...current, [index]: checked.error ?? "" })); if (!checked.error && checked.value !== rawUrl) onLinkChange(index, checked.value); }} className={inputClass} aria-invalid={Boolean(currentError || error)} /> <button type="button" onClick={() => onRemove(index)} className="shrink-0 rounded-xl px-3 text-sm font-semibold text-[#b42318]">Remove</button></div>{currentError ? <p role="alert" className="text-xs text-[#b42318]">{currentError}</p> : null}{rawUrl ? <EventMediaPreview item={item} kind={previewKind} label={`${label} ${index + 1}`} /> : null}{field === "documents" && typeof item === "object" && item.name ? <p className="text-xs text-[#52736a]">Download name: {documentName(item)}</p> : null}</div>; })}
    {fieldUploads.map((upload) => <div key={upload.id} className="rounded-xl border border-[#edf3f0] bg-[#f9fcfa] px-3 py-2 text-xs"><div className="flex items-center justify-between gap-3"><span className="min-w-0 truncate font-semibold text-[#06201c]">{upload.file.name}</span><span className="shrink-0 text-[#52736a]">{upload.status === "uploading" ? `${upload.progress}%` : upload.status === "ready" ? "Uploaded" : "Upload failed"}</span></div>{upload.status === "uploading" ? <progress className="mt-2 h-1.5 w-full accent-[#1f6a58]" max={100} value={upload.progress} /> : null}{upload.error ? <div className="mt-1 flex items-center justify-between gap-3 text-[#b42318]"><span>{upload.error}</span><button type="button" onClick={() => onRetry(upload.id)} className="shrink-0 font-semibold underline">Retry</button></div> : null}</div>)}
    {error ? <p role="alert" className="text-xs font-medium text-[#b42318]">{error}</p> : null}
  </div>;
}
