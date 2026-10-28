"use client";

import { useEffect, useState } from "react";
import { CHAT_API_BASE_URL, CHAT_GATEWAY_MODE } from "@ihp/chat-runtime";
import { resolveGroupAvatarDisplayUrl, resolveGroupChatAvatarUrl } from "./group-chat-models";

type AvatarSize = "small" | "medium" | "large";

const sizeClasses: Record<AvatarSize, string> = {
  small: "h-11 w-11 text-sm",
  medium: "h-11 w-11 text-sm",
  large: "h-20 w-20 text-xl",
};

const avatarUrlConfig = { chatApiBaseUrl: CHAT_API_BASE_URL, gatewayMode: CHAT_GATEWAY_MODE };

function initials(name: string): string {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "G";
}

/** Creates and cleans a temporary preview URL for a selected local image. */
export function useGroupAvatarPreview(file: File | null): string | null {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return undefined;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return previewUrl;
}

/** Displays a Group Chat avatar and safely falls back to initials after an image error. */
export function GroupAvatarDisplay({ name, url, size = "medium" }: { name: string; url?: string | null; size?: AvatarSize }) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [url]);
  const displayUrl = resolveGroupChatAvatarUrl(url, avatarUrlConfig);
  const showImage = Boolean(displayUrl) && !imageFailed;
  return <span className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#dceee5] font-bold text-[#1f6a58] ${sizeClasses[size]}`}>{showImage ? <img src={displayUrl!} alt="" onError={() => setImageFailed(true)} className="h-full w-full object-cover" /> : initials(name)}</span>;
}

/** Provides optional local-image selection, preview, replacement, and clearing controls. */
export function GroupAvatarPicker({ name, currentUrl, previewUrl, fileName, error, disabled = false, onSelect, onClear }: { name: string; currentUrl?: string | null; previewUrl?: string | null; fileName?: string | null; error?: string | null; disabled?: boolean; onSelect: (file: File | null) => void; onClear: () => void }) {
  const displayedUrl = resolveGroupAvatarDisplayUrl(previewUrl, currentUrl);
  return <div className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-3"><div className="flex flex-wrap items-center gap-3"><GroupAvatarDisplay name={name} url={displayedUrl} size="large" /><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-[#16332b]">Group avatar <span className="font-normal text-[#7f9d94]">(optional)</span></p><p className="mt-1 text-xs text-[#52736a]">{previewUrl ? `Selected: ${fileName || "new image"}` : currentUrl ? "Current avatar" : "Using group initials"}</p><div className="mt-2 flex flex-wrap gap-2"><label className="cursor-pointer rounded-full border border-[#1f6a58] px-3 py-1.5 text-xs font-semibold text-[#1f6a58] hover:bg-[#e8f6ee]">{previewUrl ? "Change image" : "Select image"}<input type="file" accept="image/*" disabled={disabled} onChange={(event) => { onSelect(event.target.files?.[0] ?? null); event.currentTarget.value = ""; }} className="sr-only" /></label>{previewUrl ? <button type="button" disabled={disabled} onClick={onClear} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#52736a]">{currentUrl ? "Cancel replacement" : "Clear image"}</button> : null}</div></div></div>{error ? <p className="mt-2 text-xs font-semibold text-[#b42318]" role="alert">{error}</p> : null}</div>;
}
