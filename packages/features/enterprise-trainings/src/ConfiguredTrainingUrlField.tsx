"use client";

import { useState } from "react";

import TrainingMediaUploadButton from "./TrainingMediaUploadButton";
import { getTrainingMediaPreviewUrl } from "./training-media-url";

const SUPPORTED_MEDIA_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/webm", "video/quicktime",
  "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain", "application/rtf",
];

function uploadPurpose(file: File): "image" | "lesson_video" | "lesson_document" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "lesson_video";
  return "lesson_document";
}

function previewType(url: string, contentType?: string | null, fileName?: string): "image" | "video" | "document" | "link" {
  if (contentType?.startsWith("image/")) return "image";
  if (contentType?.startsWith("video/")) return "video";
  if (contentType === "application/pdf" || contentType?.startsWith("text/")) return "document";
  const path = `${fileName ?? ""} ${url.split(/[?#]/, 1)[0]}`.toLowerCase();
  if (/\.(?:png|jpe?g|gif|webp|avif|svg)$/.test(path)) return "image";
  if (/\.(?:mp4|webm|mov|m4v|ogv)$/.test(path)) return "video";
  if (/\.(?:pdf|txt|md|rtf)$/.test(path)) return "document";
  return "link";
}

/** Lets Training URL fields accept a link or an uploaded file and previews the saved value inline. */
export function ConfiguredTrainingUrlField({
  fieldKey,
  label,
  value,
  placeholder,
  error,
  allowedMimeTypes,
  maxFileSizeMb,
  onChange,
}: {
  fieldKey: string;
  label: string;
  value: string;
  placeholder?: string;
  error?: string;
  allowedMimeTypes?: readonly string[];
  maxFileSizeMb?: number | null;
  onChange: (value: string) => void;
}) {
  const [linkInputOpen, setLinkInputOpen] = useState(!value);
  const [uploadedFile, setUploadedFile] = useState<{ type: string | null; name: string } | null>(null);
  const previewUrl = getTrainingMediaPreviewUrl(value);
  const kind = previewType(value, uploadedFile?.type, uploadedFile?.name);
  const accept = (allowedMimeTypes?.length ? allowedMimeTypes : SUPPORTED_MEDIA_TYPES).join(",");

  return (
    <div className="block min-w-0 text-sm font-semibold text-[#06201c]">
      <span>{label}</span>
      {linkInputOpen ? (
        <input type="url" value={value} placeholder={placeholder} aria-label={`${label} URL`} aria-invalid={Boolean(error) || undefined} onChange={(event) => { setUploadedFile(null); onChange(event.target.value); }} className="mt-1.5 h-11 w-full min-w-0 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm font-normal outline-none focus:border-[#1f6a58]" />
      ) : null}
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {!linkInputOpen ? <button type="button" onClick={() => setLinkInputOpen(true)} className="text-xs font-semibold text-[#1f6a58] underline hover:text-[#14513f]">+ Add link</button> : null}
        <TrainingMediaUploadButton
          fieldKey={fieldKey}
          label="+ Upload file"
          accept={accept}
          purpose={uploadPurpose}
          allowedMimeTypes={allowedMimeTypes?.length ? allowedMimeTypes : SUPPORTED_MEDIA_TYPES}
          maxFileSizeMb={maxFileSizeMb}
          onUploaded={(file) => { setUploadedFile({ type: file.type ?? null, name: file.name }); onChange(file.url); setLinkInputOpen(false); }}
        />
        {linkInputOpen && value ? <button type="button" onClick={() => setLinkInputOpen(false)} className="text-xs font-semibold text-[#1f6a58] underline">Preview link</button> : null}
        {value ? <button type="button" onClick={() => { setUploadedFile(null); onChange(""); setLinkInputOpen(true); }} className="text-xs font-semibold text-[#b42318] underline hover:text-[#8f1c13]">Remove</button> : null}
      </div>
      {error ? <p role="alert" className="mt-1 text-xs text-[#b42318]">{error}</p> : null}
      {!linkInputOpen && previewUrl ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-[#d7e5df] bg-[#f9fcfa]">
          {kind === "image" ? <img src={previewUrl} alt={`${label} preview`} referrerPolicy="no-referrer" className="max-h-72 w-full object-contain" /> : null}
          {kind === "video" ? <video src={previewUrl} controls preload="metadata" className="max-h-72 w-full" aria-label={`${label} preview`} /> : null}
          {kind === "document" && (uploadedFile?.type === "application/pdf" || /\.pdf(?:$|[?#])/i.test(`${uploadedFile?.name ?? ""} ${value}`)) ? <iframe src={previewUrl} title={`${label} preview`} sandbox="" className="h-72 w-full bg-white" /> : null}
          {kind === "document" && uploadedFile?.type !== "application/pdf" && !/\.pdf(?:$|[?#])/i.test(`${uploadedFile?.name ?? ""} ${value}`) ? <p className="px-3 py-3 text-xs text-[#52736a]">Document uploaded. Open it to preview.</p> : null}
          {kind === "link" ? <p className="px-3 py-3 text-xs text-[#52736a]">Link added. Open it to preview.</p> : null}
          <div className="border-t border-[#d7e5df] px-3 py-2"><a href={previewUrl} target="_blank" rel="noopener noreferrer" className="break-all text-xs font-semibold text-[#1f6a58] underline">Open {label.toLowerCase()}</a></div>
        </div>
      ) : null}
    </div>
  );
}
