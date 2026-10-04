/** Routes protected Training media URLs through the app's authenticated API proxy. */
export function getTrainingMediaPreviewUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.includes("\\")) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    if (parsed.pathname.startsWith("/api/v1/trainings/") || parsed.pathname.startsWith("/api/v1/media/")) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    return parsed.href;
  } catch {
    return null;
  }
}
