"use client";

import { useEffect, useState } from "react";

import { documentName, mediaItemUrl, protectedMediaPreviewUrl, type EventMediaItem } from "./event-media";

/** Media presentation mode selected from the documented Event field. */
export type EventMediaPreviewKind = "image" | "video" | "document";

/** Props for the read-only Event media preview used by forms and detail screens. */
export interface EventMediaPreviewProps {
  item: EventMediaItem;
  kind: EventMediaPreviewKind;
  label: string;
}

function safeUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return value.startsWith("/") ? value : null;
  }
}

function fallback(label: string, url: string, message: string) {
  return (
    <div className="rounded-xl border border-dashed border-[#d7e5df] bg-[#f9fcfa] px-3 py-3 text-sm text-[#52736a]">
      <p>{message}</p>
      {url ? <a href={url} target="_blank" rel="noreferrer" className="mt-1 inline-block font-semibold text-[#1f6a58] underline">Open {label.toLowerCase()}</a> : null}
    </div>
  );
}

/** Renders an Event media item without exposing raw object values or upload controls. */
export default function EventMediaPreview({ item, kind, label }: EventMediaPreviewProps) {
  const rawUrl = mediaItemUrl(item);
  const url = safeUrl(protectedMediaPreviewUrl(rawUrl));
  const [failed, setFailed] = useState(false);
  const [largerViewOpen, setLargerViewOpen] = useState(false);

  useEffect(() => {
    setFailed(false);
    setLargerViewOpen(false);
  }, [rawUrl]);

  useEffect(() => {
    if (!largerViewOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLargerViewOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [largerViewOpen]);

  if (!url) return fallback(label, "", `${label} preview is unavailable because its URL is invalid.`);
  if (failed) return fallback(label, url, `${label} preview could not be loaded.`);

  if (kind === "document") {
    return (
      <div className="rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 py-3">
        <p className="break-all text-sm font-semibold text-[#06201c]">{documentName(item)}</p>
        <a href={url} download={documentName(item)} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm font-semibold text-[#1f6a58] underline">Open / download</a>
      </div>
    );
  }

  if (kind === "video") {
    return <video controls preload="metadata" src={url} onError={() => setFailed(true)} className="max-h-72 w-full rounded-xl border border-[#d7e5df] bg-black object-contain" aria-label={label} />;
  }

  return (
    <>
      <button type="button" onClick={() => setLargerViewOpen(true)} className="block w-full max-w-xl rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6a58] focus-visible:ring-offset-2" aria-label={`Open ${label.toLowerCase()} larger view`}>
        <img src={url} alt={label} onError={() => setFailed(true)} className="max-h-72 w-full rounded-xl border border-[#d7e5df] object-contain" />
        <span className="mt-1 block text-xs font-semibold text-[#52736a]">Select image to view larger</span>
      </button>
      {largerViewOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#06201c]/75 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setLargerViewOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-label={`${label} larger view`} className="relative max-h-full max-w-5xl rounded-2xl bg-white p-3 shadow-2xl">
            <button type="button" onClick={() => setLargerViewOpen(false)} className="absolute right-3 top-3 rounded-full bg-white px-3 py-1 text-sm font-bold text-[#06201c] shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6a58]">Close</button>
            <img src={url} alt={label} className="max-h-[85vh] max-w-full rounded-xl object-contain" />
          </div>
        </div>
      ) : null}
    </>
  );
}
