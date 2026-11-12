"use client";

import { useEffect, useState } from "react";
import { protectedMediaPreviewUrl } from "./event-media";
import { getYouTubeEmbedUrl, getVimeoEmbedUrl, isPlayableVideoUrl } from "./event-video-url";

export interface ActiveEventMediaPreview {
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
export function EventMediaModal({
  media,
  onClose,
}: {
  media: ActiveEventMediaPreview | null;
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
  const directUrl = protectedMediaPreviewUrl(media.url);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={media.title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-h-[92vh] max-w-5xl w-full flex flex-col items-center justify-center overflow-hidden rounded-2xl bg-[#06201c] p-2 shadow-2xl border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="flex w-full items-center justify-between px-4 py-2 text-white">
          <p className="max-w-[75%] truncate text-sm font-semibold text-white/90">
            {media.title || "Media Preview"}
          </p>
          <div className="flex items-center gap-3">
            <a
              href={media.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-white/70 hover:text-white underline"
              title="Open raw source"
            >
              Open source ↗
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-white/10 p-1.5 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Close preview"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content body */}
        <div className="relative flex items-center justify-center w-full max-h-[80vh] overflow-hidden rounded-xl bg-black">
          {media.type === "video" ? (
            embedUrl ? (
              <div className="w-full aspect-video max-h-[78vh]">
                <iframe
                  src={embedUrl}
                  title={media.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              </div>
            ) : (
              <video
                src={directUrl}
                controls
                autoPlay
                playsInline
                className="max-h-[78vh] max-w-full rounded-lg object-contain"
              >
                Your browser does not support playing this video directly.
              </video>
            )
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={directUrl}
              alt={media.title}
              className="max-h-[78vh] max-w-full rounded-lg object-contain"
            />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Responsive inline video player supporting:
 * 1. Privacy-enhanced YouTube embed (youtube-nocookie.com)
 * 2. Vimeo player embed
 * 3. Direct video file uploads via HTML5 video tag
 *
 * Includes an "Expand preview" button to open the in-page lightbox modal.
 */
export function EventVideoInlinePlayer({
  url,
  title,
  onExpand,
}: {
  url: string;
  title: string;
  onExpand?: () => void;
}) {
  const [loadError, setLoadError] = useState(false);
  const ytEmbed = getYouTubeEmbedUrl(url);
  const vimeoEmbed = getVimeoEmbedUrl(url);
  const isEmbed = Boolean(ytEmbed || vimeoEmbed);
  const embedUrl = ytEmbed || vimeoEmbed;
  const directUrl = protectedMediaPreviewUrl(url);

  return (
    <div className="relative group overflow-hidden rounded-xl border border-[#d7e5df] bg-black shadow-xs">
      <div className="aspect-video w-full">
        {isEmbed ? (
          <iframe
            src={embedUrl ?? ""}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="w-full h-full border-0"
          />
        ) : !loadError ? (
          <video
            src={directUrl}
            controls
            preload="metadata"
            playsInline
            onError={() => setLoadError(true)}
            className="w-full h-full object-contain bg-black"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-4 text-center text-white/80">
            <p className="text-xs">Video format requires external player.</p>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 rounded-full bg-[#1f6a58] px-3 py-1 text-xs font-bold text-white hover:bg-[#185447]"
            >
              Open video link
            </a>
          </div>
        )}
      </div>

      {onExpand ? (
        <button
          type="button"
          onClick={onExpand}
          className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white backdrop-blur-xs transition hover:bg-black/85 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white"
          title="Expand preview"
          aria-label="Expand preview"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}

/**
 * Thumbnail for an image that opens the in-page media modal when clicked.
 */
export function EventImageThumbnail({
  url,
  alt,
  onPreview,
}: {
  url: string;
  alt: string;
  onPreview: () => void;
}) {
  const [loadError, setLoadError] = useState(false);
  const resolvedUrl = protectedMediaPreviewUrl(url);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-1.5 shadow-xs transition-shadow hover:shadow-sm">
      <button
        type="button"
        onClick={onPreview}
        className="relative h-28 w-28 overflow-hidden rounded-lg bg-[#f0f4f2] text-left sm:h-36 sm:w-36 focus:outline-none focus:ring-2 focus:ring-[#1f6a58]"
        title="Click to preview without leaving page"
      >
        {!loadError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolvedUrl}
            alt={alt}
            onError={() => setLoadError(true)}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center text-xs text-[#52736a]">
            <span>Image unavailable</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20 flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white transition-opacity">
            Preview
          </span>
        </div>
      </button>
    </div>
  );
}
