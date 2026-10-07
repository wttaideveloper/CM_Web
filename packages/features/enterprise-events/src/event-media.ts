export const EVENT_MEDIA_FIELDS = ["primary_image", "gallery_images", "videos", "documents"] as const;

/** Routes protected Chat media through the current app's authenticated BFF. */
export function protectedMediaPreviewUrl(value: string, proxyPath = "/api/event-media"): string {
  try {
    const url = new URL(value);
    if ((url.protocol !== "http:" && url.protocol !== "https:") || url.origin !== "https://chat.wisdomtooth.tech") return value;
    return `${proxyPath}?url=${encodeURIComponent(url.toString())}`;
  } catch {
    return value;
  }
}
export type EventMediaField = (typeof EVENT_MEDIA_FIELDS)[number];

export interface EventMediaPolicyRule {
  allowed_types: string[];
  mime_types?: string[];
  extensions?: string[];
  max_size_bytes: number;
  max_count: number;
}

export type EventMediaPolicy = Record<EventMediaField, EventMediaPolicyRule>;

export interface EventMediaAsset {
  id: string;
  field: EventMediaField;
  url: string;
  name: string;
  size: number;
  type: string;
  attached: boolean;
  expires_at: string | null;
}

export interface EventDocumentEntry {
  url: string;
  name?: string;
  id?: string;
  size?: number;
  type?: string;
  attached?: boolean;
  expires_at?: string | null;
}

export type EventMediaItem = string | EventMediaAsset | EventDocumentEntry;

export interface EventMediaPayload {
  primary_image: string;
  gallery_images: string[];
  videos: string[];
  documents: EventDocumentEntry[];
}

export interface EventMediaUpdatePayload {
  primary_image?: string | null;
  gallery_images?: string[];
  videos?: string[];
  documents?: EventDocumentEntry[];
}

export interface EventMediaUploadState {
  id: string;
  field: EventMediaField;
  file: File;
  clientRef: string;
  progress: number;
  status: "uploading" | "ready" | "error";
  error?: string;
  asset?: EventMediaAsset;
  replaceIndex?: number;
  /** Reserved form-list position keeps uploads ordered by selection, not completion time. */
  valueIndex?: number;
}

const MEDIA_FIELD_SET = new Set<string>(EVENT_MEDIA_FIELDS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function policyRule(value: unknown): EventMediaPolicyRule | null {
  if (!isRecord(value)) return null;
  const legacyAllowedTypes = stringArray(value.allowed_types ?? value.allowedTypes ?? value.types);
  const mimeTypes = stringArray(value.mime_types ?? value.mimeTypes);
  const extensions = stringArray(value.extensions);
  const allowedTypes = [...new Set([...legacyAllowedTypes, ...mimeTypes, ...extensions])];
  const maxSizeBytes = numberValue(value.max_size_bytes ?? value.maxSizeBytes)
    ?? (numberValue(value.max_size_mb ?? value.maxSizeMb) ?? 0) * 1024 * 1024;
  const maxCount = numberValue(value.max_count ?? value.maxCount);
  if (!allowedTypes.length || maxSizeBytes <= 0 || maxCount === null || maxCount < 1) return null;
  return { allowed_types: allowedTypes, ...(mimeTypes.length ? { mime_types: mimeTypes } : {}), ...(extensions.length ? { extensions } : {}), max_size_bytes: maxSizeBytes, max_count: maxCount };
}

/** Parses the backend policy response and rejects a response missing any Event media field. */
export function parseEventMediaPolicy(value: unknown): EventMediaPolicy {
  const source = isRecord(value) && isRecord(value.fields) ? value.fields : value;
  if (!isRecord(source)) throw new Error("Events API returned an invalid media policy.");
  const policy = {} as Partial<EventMediaPolicy>;
  for (const field of EVENT_MEDIA_FIELDS) {
    const rule = policyRule(source[field]);
    if (!rule) throw new Error(`Events API media policy is missing ${field}.`);
    policy[field] = rule;
  }
  return policy as EventMediaPolicy;
}

function isIpLiteral(hostname: string): boolean {
  const value = hostname.replace(/^\[|\]$/g, "");
  if (value.includes(":")) return value.split(":").every((part) => /^[0-9a-f]{0,4}$/i.test(part));
  const octets = value.split(".");
  return octets.length === 4 && octets.every((part) => /^\d+$/.test(part) && Number(part) <= 255);
}

/** Applies the documented client-side link checks; the server remains authoritative. */
export function validateEventMediaLink(value: string): { value: string; error?: string } {
  const input = value.trim();
  if (!input) return { value: "", error: "Enter an http or https link." };
  if (input.length > 2048) return { value: input, error: "Links must be 2048 characters or fewer." };
  if (/\s/.test(input)) return { value: input, error: "Links cannot contain spaces." };
  let url: URL;
  try { url = new URL(input); } catch { return { value: input, error: "Enter a complete public URL." }; }
  if (url.protocol !== "http:" && url.protocol !== "https:") return { value: input, error: "Only http and https links are supported." };
  if (url.username || url.password) return { value: input, error: "Links cannot include credentials." };
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname || hostname === "localhost" || isIpLiteral(hostname) || !hostname.includes(".")) return { value: input, error: "Use a public hostname, not localhost, a bare IP, or a single-word host." };
  url.protocol = "https:";
  return { value: url.toString() };
}

export function documentUrl(value: EventMediaItem): string {
  return typeof value === "string" ? value : value.url;
}

export function documentName(value: EventMediaItem): string {
  if (typeof value !== "string" && value.name?.trim()) return value.name.trim();
  try { return decodeURIComponent(new URL(documentUrl(value)).pathname.split("/").filter(Boolean).pop() ?? "document"); } catch { return "document"; }
}

export function normalizeDocumentEntry(value: unknown): EventDocumentEntry | null {
  if (typeof value === "string" && value.trim()) return { url: value.trim() };
  if (!isRecord(value) || typeof value.url !== "string" || !value.url.trim()) return null;
  return {
    url: value.url.trim(),
    ...(typeof value.name === "string" ? { name: value.name } : {}),
    ...(typeof value.id === "string" ? { id: value.id } : {}),
    ...(numberValue(value.size) !== null ? { size: value.size as number } : {}),
    ...(typeof value.type === "string" ? { type: value.type } : {}),
    ...(typeof value.attached === "boolean" ? { attached: value.attached } : {}),
    ...(value.expires_at === null || typeof value.expires_at === "string" ? { expires_at: value.expires_at } : {}),
  };
}

export function normalizeDocumentEntries(value: unknown): EventDocumentEntry[] {
  return Array.isArray(value) ? value.map(normalizeDocumentEntry).filter((item): item is EventDocumentEntry => item !== null) : [];
}

export function mediaItemUrl(value: unknown): string {
  return typeof value === "string" ? value.trim() : isRecord(value) && typeof value.url === "string" ? value.url.trim() : "";
}

export function mediaUrls(values: readonly EventMediaItem[]): string[] {
  return values.map(mediaItemUrl).filter(Boolean);
}

export function mediaDocuments(values: readonly EventMediaItem[]): EventDocumentEntry[] {
  return values.map((value) => normalizeDocumentEntry(value)).filter((item): item is EventDocumentEntry => item !== null);
}

export function buildEventMediaPayload(values: { primary_image: string; gallery_images: readonly EventMediaItem[]; videos: readonly EventMediaItem[]; documents: readonly EventMediaItem[] }): EventMediaPayload {
  return { primary_image: values.primary_image.trim(), gallery_images: mediaUrls(values.gallery_images), videos: mediaUrls(values.videos), documents: mediaDocuments(values.documents) };
}

export function buildEventMediaUpdatePayload(values: { primary_image: string; gallery_images: readonly EventMediaItem[]; videos: readonly EventMediaItem[]; documents: readonly EventMediaItem[] }, initial: { primary_image: string; gallery_images: readonly EventMediaItem[]; videos: readonly EventMediaItem[]; documents: readonly EventMediaItem[] }): EventMediaUpdatePayload {
  const payload: EventMediaUpdatePayload = {};
  if (values.primary_image !== initial.primary_image) payload.primary_image = values.primary_image.trim() || null;
  if (JSON.stringify(values.gallery_images) !== JSON.stringify(initial.gallery_images)) payload.gallery_images = mediaUrls(values.gallery_images);
  if (JSON.stringify(values.videos) !== JSON.stringify(initial.videos)) payload.videos = mediaUrls(values.videos);
  if (JSON.stringify(values.documents) !== JSON.stringify(initial.documents)) payload.documents = mediaDocuments(values.documents);
  return payload;
}

export function isEventMediaField(value: string): value is EventMediaField {
  return MEDIA_FIELD_SET.has(value);
}
