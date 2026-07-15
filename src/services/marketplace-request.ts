type MarketplaceRequestInit = RequestInit;

function buildHeaders(init?: MarketplaceRequestInit) {
  const headers = new Headers(init?.headers);

  if (init?.body && !(init.body instanceof FormData) && !(init.body instanceof Blob) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  return headers;
}

export async function requestMarketplaceJson<T>(path: string, init?: MarketplaceRequestInit): Promise<T> {
  const response = await fetch(`/api/marketplace${path}`, {
    ...init,
    cache: "no-store",
    credentials: "include",
    headers: buildHeaders(init),
  });

  const bodyText = await response.text().catch(() => "");

  if (!response.ok) {
    throw new Error(bodyText || `Request failed with status ${response.status}`);
  }

  if (!bodyText) {
    return undefined as T;
  }

  return JSON.parse(bodyText) as T;
}
