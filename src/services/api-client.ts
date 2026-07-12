import { API_BASE_URL } from "@/lib/api";

export function toHeaders(initHeaders?: HeadersInit, includeJsonContentType = true): Headers {
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

export async function request<T>(
  path: string,
  init?: RequestInit,
  includeJsonContentType = true,
): Promise<T> {
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

export async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(path, init);
}
