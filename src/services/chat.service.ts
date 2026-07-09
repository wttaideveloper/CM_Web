import { API_BASE_URL } from "@/lib/api";

type ProviderConversationsParams = {
  status?: string;
  page?: number;
  pageSize?: number;
};

type ConversationMessagesParams = {
  cursor?: string;
  limit?: number;
};

type ConversationMessagesPagination = {
  has_more: boolean;
  next_cursor: string | null;
  limit: number;
};

export type ConversationMessagesResponse<T = unknown> = {
  items: T[];
  pagination: ConversationMessagesPagination;
};

type SendMessagePayload = {
  conversation_id: string;
  content: string;
  message_type?: "text" | "image" | "document" | "audio" | "video";
  attachment_id?: string;
};

type EditMessagePayload = {
  content: string;
};

type UploadAttachmentResponse = unknown;
type DownloadAttachmentResponse = {
  blob: Blob;
  fileName?: string;
  mimeType?: string;
};

type TypingUsersResponse = unknown[] | { items?: unknown[] } | { data?: unknown[] };
type PresenceStatus = "online" | "offline" | "away";

function toHeaders(initHeaders?: HeadersInit, includeJsonContentType = true): Headers {
  const headers = new Headers(initHeaders);
  const devToken = process.env.NEXT_PUBLIC_DEV_CHAT_TOKEN;

  if (devToken) {
    headers.set("Authorization", `Bearer ${devToken}`);
  }

  if (includeJsonContentType && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(path, init);
}

async function request<T>(path: string, init?: RequestInit, includeJsonContentType = true): Promise<T> {
  const shouldIncludeJsonContentType =
    includeJsonContentType && !(init?.body instanceof FormData) && !(init?.body instanceof Blob);
  const headers = toHeaders(
    Object.fromEntries(new Headers(init?.headers).entries()),
    shouldIncludeJsonContentType,
  );

  if (init?.body instanceof FormData) {
    headers.delete("Content-Type");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");

    if (process.env.NODE_ENV !== "production") {
      console.warn("Chat API request failed", {
        path,
        status: response.status,
        errorText,
      });
    }

    throw new Error(errorText || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function uploadAttachment(
  conversationId: string,
  file: File,
  attachmentType?: "image" | "document" | "audio" | "video",
) {
  const formData = new FormData();

  formData.append("conversation_id", conversationId);
  formData.append("file", file);

  if (attachmentType) {
    formData.append("attachment_type", attachmentType);
  }

  return request<UploadAttachmentResponse>(`/attachments/upload`, {
    method: "POST",
    body: formData,
  }, false);
}

export function getProviderConversations(params?: ProviderConversationsParams) {
  const searchParams = new URLSearchParams();

  searchParams.set("page", String(params?.page ?? 1));
  searchParams.set("page_size", String(params?.pageSize ?? 20));

  if (params?.status) {
    searchParams.set("status", params.status);
  }

  return requestJson<unknown>(`/conversations/provider?${searchParams.toString()}`);
}

export function getArchivedConversations() {
  return requestJson<unknown>(`/conversations/provider/archived`);
}

export function getConversationById(conversationId: string) {
  return requestJson<unknown>(`/conversations/${conversationId}`);
}

export function getConversationMessages<T = unknown>(
  conversationId: string,
  options?: ConversationMessagesParams,
) {
  const searchParams = new URLSearchParams();

  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 100);
  searchParams.set("limit", String(limit));

  const query = options?.cursor
    ? `${searchParams.toString()}&cursor=${encodeURIComponent(options.cursor)}`
    : searchParams.toString();

  return requestJson<ConversationMessagesResponse<T>>(
    `/conversations/${encodeURIComponent(conversationId)}/messages?${query}`,
  );
}

export function markConversationRead(conversationId: string) {
  return requestJson<unknown>(`/conversations/${conversationId}/read`, {
    method: "PATCH",
  });
}

export function closeConversation(conversationId: string) {
  return requestJson<unknown>(`/conversations/${encodeURIComponent(conversationId)}/close`, {
    method: "PATCH",
  });
}

export function reopenConversation(conversationId: string) {
  return requestJson<unknown>(`/conversations/${encodeURIComponent(conversationId)}/reopen`, {
    method: "PATCH",
  });
}

export function archiveConversation(conversationId: string, archived: boolean) {
  return requestJson<unknown>(`/conversations/${encodeURIComponent(conversationId)}/archive`, {
    method: "PATCH",
    body: JSON.stringify({
      archived,
    }),
  });
}

export function sendMessage(payload: SendMessagePayload) {
  return requestJson<unknown>(`/messages/`, {
    method: "POST",
    body: JSON.stringify({
      conversation_id: payload.conversation_id,
      content: payload.content,
      message_type: payload.message_type ?? "text",
      ...(payload.attachment_id ? { attachment_id: payload.attachment_id } : {}),
    }),
  });
}

export function editMessage(messageId: string, content: string) {
  return requestJson<unknown>(`/messages/${encodeURIComponent(messageId)}`, {
    method: "PATCH",
    body: JSON.stringify({ content } satisfies EditMessagePayload),
  });
}

export function deleteMessage(messageId: string) {
  return requestJson<unknown>(`/messages/${encodeURIComponent(messageId)}`, {
    method: "DELETE",
  });
}

export function updateTypingStatus(conversationId: string, isTyping: boolean) {
  return requestJson<unknown>(`/conversations/${encodeURIComponent(conversationId)}/typing`, {
    method: "PUT",
    body: JSON.stringify({
      is_typing: isTyping,
    }),
  });
}

export function updatePresenceStatus(status: PresenceStatus) {
  return requestJson<unknown>(`/presence/status`, {
    method: "PUT",
    body: JSON.stringify({
      status,
    }),
  });
}

export async function getUserLastSeen(userId: string) {
  const response = await fetch(
    `${API_BASE_URL}/presence/${encodeURIComponent(userId)}/last-seen`,
    {
      method: "GET",
      cache: "no-store",
      headers: toHeaders(undefined, false),
    },
  );

  if (response.status === 404) {
    const errorText = await response.text().catch(() => "");

    if (errorText.includes("User presence not found")) {
      return null;
    }
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");

    if (process.env.NODE_ENV !== "production") {
      console.warn("Chat API request failed", {
        path: `/presence/${encodeURIComponent(userId)}/last-seen`,
        status: response.status,
        errorText,
      });
    }

    throw new Error(errorText || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function getTypingUsers(conversationId: string) {
  const response = await requestJson<TypingUsersResponse>(
    `/conversations/${encodeURIComponent(conversationId)}/typing`,
  );

  if (Array.isArray(response)) {
    return response;
  }

  if (response && Array.isArray(response.items)) {
    return response.items;
  }

  if (response && Array.isArray(response.data)) {
    return response.data;
  }

  return [];
}

function getFileNameFromContentDisposition(headerValue?: string | null) {
  if (!headerValue) {
    return undefined;
  }

  const filenameStarMatch = headerValue.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (filenameStarMatch?.[1]) {
    try {
      return decodeURIComponent(filenameStarMatch[1].trim().replace(/^"|"$/g, ""));
    } catch {
      return filenameStarMatch[1].trim().replace(/^"|"$/g, "");
    }
  }

  const filenameMatch = headerValue.match(/filename\s*=\s*("?)([^";]+)\1/i);
  if (filenameMatch?.[2]) {
    return filenameMatch[2].trim();
  }

  return undefined;
}

export async function downloadAttachment(attachmentId: string): Promise<DownloadAttachmentResponse> {
  const attachmentPath = `/attachments/${encodeURIComponent(attachmentId)}?download=true`;

  const response = await fetch(
    `${API_BASE_URL}${attachmentPath}`,
    {
      method: "GET",
      cache: "no-store",
      headers: toHeaders({}, false),
    },
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");

    if (process.env.NODE_ENV !== "production") {
      console.warn("Chat attachment download failed", {
        attachmentId,
        status: response.status,
        errorText,
      });
    }

    throw new Error(errorText || `Request failed with status ${response.status}`);
  }

  const responseContentType = response.headers.get("content-type") ?? "";

  if (responseContentType.toLowerCase().includes("application/json")) {
    await response.text().catch(() => "");

    throw new Error("Attachment download returned JSON instead of audio data.");
  }

  const blob = await response.blob();
  const fileName =
    getFileNameFromContentDisposition(response.headers.get("content-disposition")) ?? "attachment";
  const shouldNormalizeM4a =
    responseContentType.toLowerCase() === "audio/m4a" ||
    blob.type.toLowerCase() === "audio/m4a" ||
    fileName.toLowerCase().endsWith(".m4a");
  const normalizedBlob = shouldNormalizeM4a ? new Blob([blob], { type: "audio/mp4" }) : blob;

  return {
    blob: normalizedBlob,
    fileName,
    mimeType: response.headers.get("content-type") ?? undefined,
  };
}

export async function downloadAttachmentBlob(attachmentId: string): Promise<DownloadAttachmentResponse> {
  return downloadAttachment(attachmentId);
}
