export type ProviderConversationsParams = {
  status?: string;
  page?: number;
  pageSize?: number;
};

export type SearchConversationsParams = {
  q: string;
  page?: number;
  pageSize?: number;
};

export type SearchMessagesParams = {
  q: string;
  conversationId?: string;
  page?: number;
  pageSize?: number;
};

export type ConversationMessagesParams = {
  cursor?: string;
  limit?: number;
};

export type ConversationMessagesPagination = {
  has_more: boolean;
  next_cursor: string | null;
  limit: number;
};

export type ConversationMessagesResponse<T = unknown> = {
  items: T[];
  pagination: ConversationMessagesPagination;
};

export type SendMessagePayload = {
  conversation_id: string;
  content: string;
  message_type?: "text" | "image" | "document" | "audio" | "video";
  attachment_id?: string;
};

export type EditMessagePayload = {
  content: string;
};

export type UploadAttachmentResponse = unknown;

export type DownloadAttachmentResponse = {
  blob: Blob;
  fileName?: string;
  mimeType?: string;
};

export type TypingUsersResponse = unknown[] | { items?: unknown[] } | { data?: unknown[] };

export type PresenceStatus = "online" | "offline" | "away";
