/** Return a privacy-enhanced YouTube embed URL for supported YouTube watch links. */
export function getYouTubeEmbedUrl(value: string): string | null {
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
