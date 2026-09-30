"use client";

import { useState } from "react";

import TrainingMediaUploadButton from "./TrainingMediaUploadButton";
import type { TrainingUploadResponse } from "./trainings.service";

type TrainingMediaKind = "image" | "video" | "document";
type TrainingMediaPurpose = "image" | "lesson_document" | "lesson_video";

interface TrainingMediaFieldProps {
  fieldKey: string;
  label: string;
  value: string;
  kind: TrainingMediaKind;
  accept: string;
  purpose: TrainingMediaPurpose;
  placeholder?: string;
  allowedMimeTypes?: readonly string[];
  maxFileSizeMb?: number | null;
  onChange: (value: string) => void;
}

function safePreviewUrl(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.includes("\\")) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;

    // Route protected API media through this app so its authenticated session cookie is included.
    if (parsed.pathname.startsWith("/api/v1/trainings/") || parsed.pathname.startsWith("/api/v1/media/")) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

function fileNameFromUrl(value: string): string {
  const safeUrl = safePreviewUrl(value);
  if (!safeUrl) return "Uploaded file";
  try {
    const name = decodeURIComponent(new URL(safeUrl, "https://training-media.invalid").pathname.split("/").pop() ?? "");
    return name || "Uploaded file";
  } catch {
    return "Uploaded file";
  }
}

/** Shows an uploaded media preview in place of the stored URL while preserving URL editing. */
export default function TrainingMediaField({
  fieldKey,
  label,
  value,
  kind,
  accept,
  purpose,
  placeholder = "https://…",
  allowedMimeTypes,
  maxFileSizeMb,
  onChange,
}: TrainingMediaFieldProps) {
  const [editingOverride, setEditingOverride] = useState<boolean | null>(null);
  const [failedPreviewUrl, setFailedPreviewUrl] = useState<string | null>(null);
  const [imageQualityWarning, setImageQualityWarning] = useState<{ url: string; message: string } | null>(null);
  const editingUrl = editingOverride ?? !value;
  const previewUrl = safePreviewUrl(value);
  const uploaded = (file: TrainingUploadResponse, qualityWarning?: string) => {
    onChange(file.url);
    setImageQualityWarning(qualityWarning ? { url: file.url, message: qualityWarning } : null);
    setEditingOverride(false);
  };

  return (
    <div className="min-w-0">
      {value && !editingUrl && previewUrl ? (
        <div className="overflow-hidden rounded-xl border border-[#d7e5df] bg-[#f9fcfa]">
          {kind === "image" ? (
            failedPreviewUrl === previewUrl ? (
              <p role="status" className="p-4 text-sm text-[#52736a]">
                Image preview is unavailable. <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#1f6a58] underline">Open image</a>
              </p>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- Upload URLs are backend-hosted and cannot be constrained to static Next image hosts.
              <img src={previewUrl} alt={`${label} preview`} onError={() => setFailedPreviewUrl(previewUrl)} className="max-h-72 w-full object-contain" />
            )
          ) : null}
          {kind === "video" ? (
            failedPreviewUrl === previewUrl ? (
              <p role="status" className="p-4 text-sm text-[#52736a]">
                Video preview is unavailable. <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#1f6a58] underline">Open video</a>
              </p>
            ) : (
              <video src={previewUrl} controls preload="metadata" onError={() => setFailedPreviewUrl(previewUrl)} className="max-h-72 w-full" aria-label={`${label} preview`} />
            )
          ) : null}
          {kind === "document" ? (
            <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-3 p-4 text-sm font-semibold text-[#1f6a58] hover:bg-[#e8f6ee]">
              <span aria-hidden="true" className="rounded-lg bg-white px-3 py-2 text-xs font-bold uppercase text-[#52736a]">File</span>
              <span className="min-w-0 flex-1 truncate">{fileNameFromUrl(previewUrl)}</span>
              <span className="shrink-0 underline">Open file</span>
            </a>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#d7e5df] px-3 py-2">
            <span className="min-w-0 truncate text-xs text-[#52736a]">{fileNameFromUrl(previewUrl)}</span>
            <div className="flex shrink-0 items-center gap-3">
              <button type="button" onClick={() => setEditingOverride(true)} className="text-xs font-semibold text-[#1f6a58] underline">Change URL</button>
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setEditingOverride(true);
                  setFailedPreviewUrl(null);
                }}
                className="text-xs font-semibold text-[#b42318] underline hover:text-[#8f1c13]"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-w-0 flex-nowrap items-center gap-2">
          <input
            type="url"
            value={value}
            onChange={(event) => {
              setEditingOverride(true);
              onChange(event.target.value);
            }}
            placeholder={placeholder}
            aria-label={`${label} URL`}
            className="mt-1.5 h-11 min-w-0 flex-1 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm font-normal text-[#06201c] outline-none focus:border-[#1f6a58]"
          />
          {value && previewUrl ? <button type="button" onClick={() => setEditingOverride(false)} className="shrink-0 text-xs font-semibold text-[#1f6a58] underline">Preview</button> : null}
        </div>
      )}
      {imageQualityWarning?.url === value && kind === "image" ? (
        <p role="note" className="mt-2 text-xs text-[#8a5a00]">{imageQualityWarning.message}</p>
      ) : null}
      <div className="mt-2">
        <TrainingMediaUploadButton
          fieldKey={fieldKey}
          label={kind === "image" ? "Upload image" : kind === "video" ? "Upload video" : "Upload document"}
          accept={accept}
          purpose={purpose}
          allowedMimeTypes={allowedMimeTypes}
          maxFileSizeMb={maxFileSizeMb}
          onUploaded={uploaded}
        />
      </div>
    </div>
  );
}
