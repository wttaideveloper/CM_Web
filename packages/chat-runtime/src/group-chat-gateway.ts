type AuthenticatedRequest = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/** Builds the same-origin Group Chat gateway path used for normal session authentication. */
export function buildGroupChatGatewayPath(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `/api/chat${normalizedPath}`;
}

/** Creates a Group Chat request function backed by the application's normal authenticated session. */
export function createGroupChatRequestResponse(authenticatedRequest: AuthenticatedRequest) {
  return async function groupChatRequestResponse(
    path: string,
    init?: RequestInit,
    includeJsonContentType = true,
  ): Promise<Response> {
    const includeContentType =
      includeJsonContentType && !(init?.body instanceof FormData) && !(init?.body instanceof Blob);
    const headers = new Headers(init?.headers);

    if (includeContentType && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    if (init?.body instanceof FormData) {
      headers.delete("Content-Type");
    }

    return authenticatedRequest(buildGroupChatGatewayPath(path), {
      ...init,
      cache: "no-store",
      credentials: "include",
      headers,
    });
  };
}
