const GROUP_MESSAGE_CATEGORY = "group_message";
const GENERIC_GROUP_MESSAGE_LABELS = new Set(["new message", "event: new message", "group message"]);

/** The notification fields used by the shared Group Chat formatter. */
export interface GroupChatNotificationInput {
  notification_type?: string | null;
  category?: string | null;
  title?: string | null;
  body?: string | null;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
  data?: Record<string, unknown> | null;
}

/** Display-safe Group Chat notification details derived only from backend fields. */
export interface GroupChatNotificationDetails {
  title: string;
  message: string;
  groupName: string | null;
  contextLabel: "Event Group" | "Training Group" | "Group";
  senderName: string | null;
  attachmentLabel: string | null;
}

function readNotificationValue(
  metadata: Record<string, unknown>,
  data: Record<string, unknown>,
  ...keys: readonly string[]
): string | null {
  for (const key of keys) {
    const metadataValue = readNonEmptyString(metadata[key]);
    if (metadataValue) return metadataValue;
    const dataValue = readNonEmptyString(data[key]);
    if (dataValue) return dataValue;
  }
  return null;
}

function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeDisplayText(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  return normalized.length > 160 ? `${normalized.slice(0, 157)}...` : normalized;
}

function isGenericGroupMessageLabel(value: string | null): boolean {
  return value ? GENERIC_GROUP_MESSAGE_LABELS.has(value.toLocaleLowerCase()) : false;
}

function readGroupMessageCategory(notification: GroupChatNotificationInput, metadata: Record<string, unknown>, data: Record<string, unknown>): string | null {
  return [
    notification.category,
    metadata.category,
    data.category,
    metadata.type,
    data.type,
    notification.notification_type,
  ].map(readNonEmptyString).find((value): value is string => value !== null)?.toLocaleLowerCase() ?? null;
}

function getAttachmentLabel(value: unknown): string | null {
  const attachmentType = readNonEmptyString(value)?.toLocaleLowerCase();
  if (!attachmentType || attachmentType === "none" || attachmentType === "text") return null;
  if (attachmentType === "image") return "Image attachment";
  if (attachmentType === "audio" || attachmentType === "voice") return "Audio attachment";
  if (attachmentType === "video") return "Video attachment";
  if (attachmentType === "document" || attachmentType === "file") return "Document attachment";
  return "Attachment";
}

function getGroupContextLabel(metadata: Record<string, unknown>, data: Record<string, unknown>): "Event Group" | "Training Group" | "Group" {
  const nestedGroup = [metadata.group, data.group].find((value): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value)) ?? {};
  const contextType = [
    metadata.context_type,
    metadata.contextType,
    metadata.group_context_type,
    metadata.groupContextType,
    data.context_type,
    data.contextType,
    data.group_context_type,
    data.groupContextType,
    nestedGroup.context_type,
    nestedGroup.contextType,
  ].map(readNonEmptyString).find((value): value is string => value !== null)?.toLocaleLowerCase();
  if (contextType === "event") return "Event Group";
  if (contextType === "training") return "Training Group";
  return "Group";
}

/**
 * Formats enriched and legacy Group Chat notifications without performing
 * additional Group or message requests.
 */
export function formatGroupChatNotificationDetails(notification: GroupChatNotificationInput): GroupChatNotificationDetails | null {
  const metadata = notification.metadata ?? {};
  const data = notification.data ?? {};
  if (readGroupMessageCategory(notification, metadata, data) !== GROUP_MESSAGE_CATEGORY) return null;

  const rawTitle = normalizeDisplayText(readNonEmptyString(notification.title));
  const groupName = rawTitle && !isGenericGroupMessageLabel(rawTitle) ? rawTitle : null;
  const senderName = normalizeDisplayText(readNonEmptyString(metadata.sender_name) ?? readNonEmptyString(data.sender_name));
  const attachmentLabel = getAttachmentLabel(metadata.attachment_type ?? data.attachment_type ?? metadata.message_type ?? data.message_type);
  const backendMessage = normalizeDisplayText(readNonEmptyString(notification.message) ?? readNonEmptyString(notification.body));
  const metadataPreview = normalizeDisplayText(readNonEmptyString(metadata.preview) ?? readNonEmptyString(data.preview));
  const message = [backendMessage, metadataPreview].find((value) => value !== null && !isGenericGroupMessageLabel(value)) ?? attachmentLabel ?? "New message";

  return {
    title: senderName ?? "New message",
    message,
    groupName,
    contextLabel: getGroupContextLabel(metadata, data),
    senderName,
    attachmentLabel,
  };
}

/**
 * Builds the existing Messages route for an authorized Group Chat notification.
 * The workspace resolves authorization and group details; this helper only
 * carries backend-issued identifiers and never uses a display name as identity.
 */
export function getGroupChatNotificationTarget(
  notification: GroupChatNotificationInput,
  messagesRoute: string,
): string | null {
  const metadata = notification.metadata ?? {};
  const data = notification.data ?? {};
  if (readGroupMessageCategory(notification, metadata, data) !== GROUP_MESSAGE_CATEGORY) return null;

  const conversationId = readNotificationValue(metadata, data, "conversation_id", "conversationId");
  if (!conversationId || !messagesRoute.startsWith("/")) return null;

  const routeParts = messagesRoute.split("#");
  const [pathname, existingQuery] = routeParts[0].split("?", 2);
  const params = new URLSearchParams(existingQuery ?? "");
  params.set("tab", "groups");
  params.set("groupId", conversationId);
  const messageId = readNotificationValue(metadata, data, "message_id", "messageId");
  if (messageId) params.set("messageId", messageId);
  return `${pathname}?${params.toString()}${routeParts[1] ? `#${routeParts[1]}` : ""}`;
}
