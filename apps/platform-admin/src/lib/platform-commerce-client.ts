import type { CommerceRequestOptions } from "@ihp/commerce";

/** Uses the Platform Admin BFF, which authenticates with the HttpOnly Super Admin session bridge. */
export const platformCommerceRequest: CommerceRequestOptions = {
  baseUrl: "/api/platform-super-admin/commerce",
  fetcher: fetch,
};
