"use client";

import { useEffect, useState } from "react";
import { getTrainingMediaPreviewUrl } from "./training-media-url";
import { getYouTubeEmbedUrl, getVimeoEmbedUrl, isPlayableVideoUrl } from "./youtube-video-url";

export interface ActiveMediaPreview {
  type: "image" | "video";
  url: string;
  title: string;
  embedUrl?: string | null;
}

/**
 * Extracts an array of string media URLs from any raw value:
 * - array of strings
 * - comma-separated string of URLs
 * - array of objects with { url, file_url, path, etc. }
 * - single object with { url, file_url, path, etc. }
 * - single URL string
 * - JSON string representing an array or object
 */
export function extractMediaUrls(value: unknown): string[] {
  if (value === null || value === undefined || value === "") return [];

  if (Array.isArray(value)) {
    return value.flatMap(extractMediaUrls);
  }

  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    const candidate = obj.url ?? obj.file_url ?? obj.fileUrl ?? obj.path ?? obj.src ?? obj.preview_url ?? obj.value;
    if (typeof candidate === "string" && candidate.trim()) {
      return [candidate.trim()];
    }
    return [];
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    // Parse JSON stringified arrays or objects if present
    if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
      try {
        const parsed = JSON.parse(trimmed);
        return extractMediaUrls(parsed);
      } catch {
        // Not valid JSON, proceed
      }
    }

    // Split comma-separated URLs (guard against data URLs)
    if (trimmed.includes(",") && !trimmed.startsWith("data:")) {
      const parts = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
      if (parts.length > 1 && parts.every((p) => p.startsWith("http://") || p.startsWith("https://") || p.startsWith("/"))) {
        return parts;
      }
    }

    return [trimmed];
  }

  return [];
}

/**
 * Modal / Lightbox component for viewing full-screen images and expanded videos
 * without leaving the current page.
 */
export function TrainingMediaModal({
  media,
  onClose,
}: {
  media: ActiveMediaPreview | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!media) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [media, onClose]);

  if (!media) return null;

  const ytEmbed = getYouTubeEmbedUrl(media.url);
  const vimeoEmbed = getVimeoEmbedUrl(media.url);
  const embedUrl = media.embedUrl || ytEmbed || vimeoEmbed;
  const directUrl = getTrainingMediaPreviewUrl(media.url) || media.url;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={media.title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-6 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl border border-white/15 bg-[#06201c] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
          <p className="truncate text-sm font-semibold text-white/90">{media.title}</p>
          <div className="flex items-center gap-3">
            <a
              href={directUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-white/60 hover:text-white underline"
            >
              Open in new tab
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Close preview"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center overflow-auto p-2 sm:p-5 min-h-[260px]">
          {media.type === "image" ? (
            <img
              src={directUrl}
              alt={media.title}
              className="max-h-[75vh] w-auto max-w-full rounded-lg object-contain shadow-md"
            />
          ) : embedUrl ? (
            <div className="aspect-video w-full max-w-4xl overflow-hidden rounded-xl bg-black shadow-lg">
              <iframe
                src={embedUrl}
                title={media.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          ) : (
            <video
              src={directUrl}
              controls
              autoPlay
              playsInline
              className="max-h-[75vh] max-w-full rounded-lg bg-black"
            />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Inline Video Player with responsive YouTube/Vimeo embed support,
 * HTML5 media player for direct files, and in-page modal expand action.
 */
export function TrainingVideoInlinePlayer({
  url,
  title,
  onExpand,
}: {
  url: string;
  title: string;
  onExpand?: () => void;
}) {
  const [loadFailed, setLoadFailed] = useState(false);
  const ytEmbed = getYouTubeEmbedUrl(url);
  const vimeoEmbed = getVimeoEmbedUrl(url);
  const embedUrl = ytEmbed || vimeoEmbed;
  const previewUrl = getTrainingMediaPreviewUrl(url) || url;

  return (
    <div className="overflow-hidden rounded-xl border border-[#e1ebe6] bg-[#06201c] p-2 shadow-xs">
      {embedUrl ? (
        <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
          <iframe
            src={embedUrl}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      ) : loadFailed ? (
        <div className="flex h-44 w-full flex-col items-center justify-center rounded-lg bg-black/40 p-4 text-center text-xs text-[#8ac7a7]">
          <p>Video preview could not be loaded directly.</p>
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 font-semibold text-white underline hover:text-[#bce8d1]"
          >
            Open video in browser
          </a>
        </div>
      ) : (
        <video
          controls
          preload="metadata"
          src={previewUrl}
          onError={() => setLoadFailed(true)}
          className="max-h-64 w-full rounded-lg bg-black"
          aria-label={title}
        />
      )}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1">
        {onExpand ? (
          <button
            type="button"
            onClick={onExpand}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8ac7a7] hover:text-white transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            Expand preview
          </button>
        ) : <span />}

        <a
          href={previewUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-medium text-[#8ac7a7]/80 hover:text-white underline transition-colors"
        >
          Open external
        </a>
      </div>
    </div>
  );
}

/**
 * Thumbnail card for images with fallback error state and modal preview trigger.
 */
export function TrainingImageThumbnail({
  url,
  alt,
  onPreview,
}: {
  url: string;
  alt: string;
  onPreview: () => void;
}) {
  const [loadFailed, setLoadFailed] = useState(false);
  const previewUrl = getTrainingMediaPreviewUrl(url) || url;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-1.5 shadow-xs transition-shadow hover:shadow-sm">
      <button
        type="button"
        onClick={onPreview}
        className="relative h-28 w-28 overflow-hidden rounded-lg bg-[#f0f4f2] text-left sm:h-36 sm:w-36 focus:outline-none focus:ring-2 focus:ring-[#1f6a58]"
        title="Click to preview without leaving page"
      >
        {!loadFailed ? (
          <img
            src={previewUrl}
            alt={alt}
            onError={() => setLoadFailed(true)}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center text-xs text-[#52736a]">
            <svg className="mb-1 h-6 w-6 text-[#7f9d94]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Image unavailable</span>
          </div>
        )}
      </button>
      <button
        type="button"
        onClick={onPreview}
        className="block w-full px-2 pt-1.5 text-center text-xs font-semibold text-[#1f6a58] hover:underline"
      >
        View preview
      </button>
    </div>
  );
}
