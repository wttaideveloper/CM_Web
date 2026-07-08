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

type SendMessagePayload = {
  conversation_id: string;
  content: string;
  message_type: "text";
};

type EditMessagePayload = {
  content: string;
};

type UploadAttachmentResponse = unknown;

type TypingUsersResponse = unknown[] | { items?: unknown[] } | { data?: unknown[] };

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

export function getConversationById(conversationId: string) {
  return requestJson<unknown>(`/conversations/${conversationId}`);
}

export function getConversationMessages(conversationId: string, params?: ConversationMessagesParams) {
  const searchParams = new URLSearchParams();

  searchParams.set("limit", String(params?.limit ?? 20));

  if (params?.cursor) {
    searchParams.set("cursor", params.cursor);
  }

  return requestJson<unknown>(`/conversations/${conversationId}/messages?${searchParams.toString()}`);
}

export function markConversationRead(conversationId: string) {
  return requestJson<unknown>(`/conversations/${conversationId}/read`, {
    method: "PATCH",
  });
}

export function sendMessage(payload: SendMessagePayload) {
  return requestJson<unknown>(`/messages/`, {
    method: "POST",
    body: JSON.stringify(payload),
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
