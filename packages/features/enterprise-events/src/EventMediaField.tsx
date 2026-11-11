"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useCurrentEnterprise } from "@ihp/enterprise-runtime";
import { uploadEventMedia, EventMediaApiError } from "./event-media.service";
import { protectedMediaPreviewUrl, type EventMediaAsset, type EventMediaField as CoreEventMediaField } from "./event-media";

export type EventMediaKind = "image" | "video" | "document";

export interface EventMediaFieldProps {
  fieldKey?: string;
  label: string;
  value: string;
  kind: EventMediaKind;
  accept: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onUploadAsset?: (asset: EventMediaAsset) => void;
}

export interface RepeatableEventMediaFieldProps {
  label: string;
  fieldKey?: string;
  rowsValue: unknown;
  kind: EventMediaKind;
  accept: string;
  placeholder?: string;
  onChange: (value: string[]) => void;
  onUploadPreview?: (preview: { name: string; url: string; kind: EventMediaKind }) => void;
}

function fileNameFromUrl(value: string): string {
  try {
    const parsed = new URL(value, "https://event-media.invalid");
    const name = decodeURIComponent(parsed.pathname.split("/").pop() ?? "");
    return name || "Uploaded file";
  } catch {
    return "Uploaded file";
  }
}

/** Upload button with direct server upload and progress indicator. */
export function EventMediaUploadButton({
  label,
  kind,
  accept,
  onUploaded,
  onError,
}: {
  label: string;
  kind: EventMediaKind;
  accept: string;
  onUploaded: (asset: EventMediaAsset) => void;
  onError?: (error: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { enterpriseId } = useCurrentEnterprise();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [feedback, setFeedback] = useState<{ message: string; isError: boolean } | null>(null);

  useEffect(() => {
    if (!feedback || feedback.isError) return undefined;
    const timer = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const targetMediaField: CoreEventMediaField =
    kind === "video" ? "videos" : kind === "document" ? "documents" : "gallery_images";

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const clientRef =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    setIsUploading(true);
    setProgress(0);
    setFeedback(null);

    uploadEventMedia(file, targetMediaField, clientRef, enterpriseId ?? undefined, (percent) => {
      setProgress(percent);
    })
      .then((asset) => {
        setIsUploading(false);
        setProgress(100);
        setFeedback({ message: "Upload complete", isError: false });
        onUploaded(asset);
      })
      .catch((error: unknown) => {
        setIsUploading(false);
        const message =
          error instanceof EventMediaApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Upload failed.";
        setFeedback({ message, isError: true });
        onError?.(message);
      });
  };

  return (
    <div className="flex shrink-0 flex-nowrap items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        disabled={isUploading}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="inline-flex h-9 w-32 shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-[#1f6a58] px-2 text-xs font-bold text-[#1f6a58] transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#1f6a58] hover:text-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6a58] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:bg-transparent disabled:hover:text-[#1f6a58] disabled:hover:shadow-none"
      >
        {isUploading ? `${progress}%` : label}
      </button>
      {feedback ? (
        <span
          role={feedback.isError ? "alert" : "status"}
          className={`text-xs ${feedback.isError ? "font-semibold text-[#b42318]" : "text-[#1f6a58]"}`}
        >
          {feedback.message}
        </span>
      ) : null}
    </div>
  );
}

/** Shows an uploaded media preview in place of the stored URL while preserving URL editing. */
export function EventMediaField({
  label,
  value,
  kind,
  accept,
  placeholder = "https://…",
  onChange,
  onUploadAsset,
}: EventMediaFieldProps) {
  const [editingOverride, setEditingOverride] = useState<boolean | null>(null);
  const [failedPreviewUrl, setFailedPreviewUrl] = useState<string | null>(null);
  const editingUrl = editingOverride ?? !value;
  const previewUrl = value ? protectedMediaPreviewUrl(value) : "";

  const handleUploaded = (asset: EventMediaAsset) => {
    onChange(asset.url);
    setEditingOverride(false);
    onUploadAsset?.(asset);
  };

  const uploadButtonLabel =
    kind === "image" ? "+ Upload image" : kind === "video" ? "+ Upload video" : "+ Upload file";

  return (
    <div className="min-w-0">
      {value && !editingUrl && previewUrl ? (
        <div className="overflow-hidden rounded-xl border border-[#d7e5df] bg-[#f9fcfa]">
          {kind === "image" ? (
            failedPreviewUrl === previewUrl ? (
              <p role="status" className="p-4 text-sm text-[#52736a]">
                Image preview is unavailable.{" "}
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#1f6a58] underline"
                >
                  Open image
                </a>
              </p>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt={`${label} preview`}
                onError={() => setFailedPreviewUrl(previewUrl)}
                className="max-h-72 w-full object-contain"
              />
            )
          ) : null}
          {kind === "video" ? (
            failedPreviewUrl === previewUrl ? (
              <p role="status" className="p-4 text-sm text-[#52736a]">
                Video preview is unavailable.{" "}
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#1f6a58] underline"
                >
                  Open video
                </a>
              </p>
            ) : (
              <video
                src={previewUrl}
                controls
                preload="metadata"
                onError={() => setFailedPreviewUrl(previewUrl)}
                className="max-h-72 w-full"
                aria-label={`${label} preview`}
              />
            )
          ) : null}
          {kind === "document" ? (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-w-0 items-center gap-3 p-4 text-sm font-semibold text-[#1f6a58] hover:bg-[#e8f6ee]"
            >
              <span
                aria-hidden="true"
                className="rounded-lg bg-white px-3 py-2 text-xs font-bold uppercase text-[#52736a]"
              >
                File
              </span>
              <span className="min-w-0 flex-1 truncate">{fileNameFromUrl(previewUrl)}</span>
              <span className="shrink-0 underline">Open file</span>
            </a>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#d7e5df] px-3 py-2">
            <span className="min-w-0 truncate text-xs text-[#52736a]">
              {fileNameFromUrl(previewUrl)}
            </span>
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setEditingOverride(true)}
                className="text-xs font-semibold text-[#1f6a58] underline"
              >
                Change URL
              </button>
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
        <div className="space-y-2">
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
            {value && previewUrl ? (
              <button
                type="button"
                onClick={() => setEditingOverride(false)}
                className="shrink-0 text-xs font-semibold text-[#1f6a58] underline"
              >
                Preview
              </button>
            ) : null}
          </div>
          <EventMediaUploadButton
            label={uploadButtonLabel}
            kind={kind}
            accept={accept}
            onUploaded={handleUploaded}
          />
        </div>
      )}
    </div>
  );
}

/** Repeatable list of media items with live upload, preview, add, and remove. */
export function RepeatableEventMediaField({
  label,
  fieldKey,
  rowsValue,
  kind,
  accept,
  placeholder,
  onChange,
  onUploadPreview,
}: RepeatableEventMediaFieldProps) {
  const initialRows = Array.isArray(rowsValue)
    ? rowsValue.map((item) => String(item).trim()).filter(Boolean)
    : typeof rowsValue === "string" && rowsValue.trim()
      ? rowsValue.split(",").map((item) => item.trim()).filter(Boolean)
      : [];
  const [rows, setRows] = useState<string[]>(initialRows.length > 0 ? initialRows : [""]);

  useEffect(() => {
    const updated = Array.isArray(rowsValue)
      ? rowsValue.map((item) => String(item).trim()).filter(Boolean)
      : typeof rowsValue === "string" && rowsValue.trim()
        ? rowsValue.split(",").map((item) => item.trim()).filter(Boolean)
        : [];
    if (updated.length > 0) {
      setRows(updated);
    }
  }, [rowsValue]);

  const updateRow = (index: number, value: string) => {
    const next = rows.map((row, rowIndex) => (rowIndex === index ? value : row));
    setRows(next);
    onChange(next.filter((item) => item.trim().length > 0));
  };

  const removeRow = (index: number) => {
    const next = rows.filter((_, rowIndex) => rowIndex !== index);
    const safeNext = next.length > 0 ? next : [""];
    setRows(safeNext);
    onChange(safeNext.filter((item) => item.trim().length > 0));
  };

  const addRow = () => {
    setRows((current) => [...current, ""]);
  };

  const itemNoun = kind === "image" ? "image" : kind === "video" ? "video" : "document";

  return (
    <div className="block min-w-0 text-sm font-semibold text-[#06201c]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p>{label}</p>
        <button
          type="button"
          onClick={addRow}
          className="text-xs font-bold text-[#1f6a58] hover:text-[#175345]"
        >
          + Add {itemNoun}
        </button>
      </div>
      <div className="mt-2 space-y-3">
        {rows.map((row, index) => (
          <div
            key={`${label}-${index}`}
            className="relative rounded-xl border border-[#d7e5df] bg-[#f9fcfa] p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#7f9d94]">
                {label} #{index + 1}
              </span>
              {rows.length > 1 || row ? (
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  className="text-xs font-semibold text-[#b42318] hover:underline"
                >
                  Remove
                </button>
              ) : null}
            </div>
            <div className="mt-2">
              <EventMediaField
                fieldKey={fieldKey || ""}
                label={`${label} ${index + 1}`}
                value={row}
                kind={kind}
                accept={accept}
                placeholder={placeholder ?? "https://…"}
                onChange={(url) => updateRow(index, url)}
                onUploadAsset={(asset) => {
                  onUploadPreview?.({
                    name: asset.name,
                    url: asset.url,
                    kind,
                  });
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addRow}
        className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#1f6a58] hover:text-[#175345]"
      >
        + Add another {itemNoun}
      </button>
    </div>
  );
}

export default EventMediaField;
