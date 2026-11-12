/** Privacy-enhanced YouTube embed URL for supported YouTube links. */
export function getYouTubeEmbedUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const input = value.trim();
  if (!input) return null;

  let parsed: URL;
  try {
    parsed = new URL(input.includes("://") ? input : `https://${input}`);
  } catch {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
  let videoId: string | null = null;

  if (hostname === "youtu.be") {
    videoId = parsed.pathname.split("/").filter(Boolean)[0] ?? null;
  } else if (hostname === "youtube.com" || hostname === "youtube-nocookie.com" || hostname === "m.youtube.com") {
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (parsed.pathname === "/watch") videoId = parsed.searchParams.get("v");
    else if (["embed", "shorts", "live"].includes(segments[0] ?? "")) videoId = segments[1] ?? null;
  }

  return videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId)
    ? `https://www.youtube-nocookie.com/embed/${videoId}`
    : null;
}

/** Vimeo player embed URL for supported Vimeo links. */
export function getVimeoEmbedUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const input = value.trim();
  if (!input) return null;

  let parsed: URL;
  try {
    parsed = new URL(input.includes("://") ? input : `https://${input}`);
  } catch {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (hostname === "vimeo.com" || hostname === "player.vimeo.com") {
    const segments = parsed.pathname.split("/").filter(Boolean);
    const videoId = segments.find((s) => /^\d+$/.test(s));
    return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
  }

  return null;
}

/** Check if a URL represents a playable video (YouTube, Vimeo, or direct video file). */
export function isPlayableVideoUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (Boolean(getYouTubeEmbedUrl(trimmed)) || Boolean(getVimeoEmbedUrl(trimmed))) return true;
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(trimmed);
}
