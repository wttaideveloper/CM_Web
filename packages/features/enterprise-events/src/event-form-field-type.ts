import type { ActiveEventFormField } from "./events.service";

export function getEventFormFieldType(field: ActiveEventFormField): string {
  const rawRenderer = (field.renderer ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  const rawKey = (field.core_key ?? field.stable_key ?? field.id ?? "").toLowerCase();
  const rawLabel = (field.label ?? "").toLowerCase();

  if (["media_upload", "image_uploader", "additional_images", "image"].includes(rawRenderer)) return "media_upload";
  if (["file_upload", "document_uploader", "supporting_document", "file", "document"].includes(rawRenderer)) return "file_upload";
  if (["video", "video_input", "video_uploader"].includes(rawRenderer)) return "video";
  if (["rich_text", "rich_text_editor"].includes(rawRenderer)) return "rich_text";
  if (["tags", "tag", "tag_input"].includes(rawRenderer)) return "tags";
  if (rawRenderer === "radio" || rawRenderer === "radio_group") return "radio";

  // Infer media types and special field types from key/label if they were saved with text renderer
  if (/rich(_text)?/i.test(rawKey) || /rich(_text)?/i.test(rawLabel)) return "rich_text";
  if (/radio/i.test(rawKey) || /radio/i.test(rawLabel)) return "radio";
  if (/(^|_)date(_|$)/i.test(rawKey) || /(^|_)date(_|$)/i.test(rawLabel)) return "date";
  if (/(^|_)time(_|$)/i.test(rawKey) || /(^|_)time(_|$)/i.test(rawLabel)) return "time";
  if (/tags?/i.test(rawKey) || /tags?/i.test(rawLabel)) return "tags";
  if (/ima(ge|he)s?|photos?/i.test(rawKey) || /ima(ge|he)s?|photos?/i.test(rawLabel)) return "media_upload";
  if (/doc(ument)?s?|files?|attachment/i.test(rawKey) || /doc(ument)?s?|files?|attachment/i.test(rawLabel)) return "file_upload";
  if (/videos?/i.test(rawKey) || /videos?/i.test(rawLabel)) return "video";

  return rawRenderer;
}

export function isEventMediaRenderer(rendererOrType: string): boolean {
  return [
    "media_upload",
    "image_uploader",
    "additional_images",
    "image",
    "file_upload",
    "document_uploader",
    "supporting_document",
    "file",
    "document",
    "video",
    "video_input",
    "video_uploader",
  ].includes(rendererOrType);
}

export function getEventMediaKind(rendererOrType: string): "image" | "video" | "document" {
  if (["video", "video_input", "video_uploader"].includes(rendererOrType)) return "video";
  if (["file_upload", "document_uploader", "supporting_document", "file", "document"].includes(rendererOrType)) {
    return "document";
  }
  return "image";
}

export function getEventMediaAccept(kind: "image" | "video" | "document"): string {
  if (kind === "video") return "video/*";
  if (kind === "document") return ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,application/pdf";
  return "image/*";
}
