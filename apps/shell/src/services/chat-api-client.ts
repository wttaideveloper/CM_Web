import { CHAT_API_BASE_URL } from "@/lib/chat-api";
import { getChatAccessToken } from "@/services/chat-token.service";

function buildHeaders(initHeaders?: HeadersInit, includeJsonContentType = true, token?: string) {
  const headers = new Headers(initHeaders);
  headers.set("Authorization", `Bearer ${token}`);

  if (includeJsonContentType && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
}

export async function chatRequestResponse(
  path: string,
  init?: RequestInit,
  includeJsonContentType = true,
): Promise<Response> {
  const token = await getChatAccessToken();
  const includeContentType =
    includeJsonContentType && !(init?.body instanceof FormData) && !(init?.body instanceof Blob);
  const headers = buildHeaders(init?.headers, includeContentType, token);

  if (init?.body instanceof FormData) {
    headers.delete("Content-Type");
  }

  return fetch(`${CHAT_API_BASE_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers,
  });
}

export async function chatRequest<T>(path: string, init?: RequestInit, includeJsonContentType = true): Promise<T> {
  const response = await chatRequestResponse(path, init, includeJsonContentType);

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || `Chat request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function chatRequestJson<T>(path: string, init?: RequestInit): Promise<T> {
  return chatRequest<T>(path, init);
}
