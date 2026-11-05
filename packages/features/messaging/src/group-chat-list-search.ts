/** Empty/loading presentation states for the authenticated Group list. */
export type GroupChatListEmptyState = "loading" | "none" | "no-groups" | "no-matches";
export const GROUP_CHAT_SEARCH_DEBOUNCE_MS = 300;

/** Schedules the existing server-side Group search and cancels superseded keystrokes. */
export function scheduleGroupChatSearch(search: string, applySearch: (value: string) => void): () => void {
  const timeout = globalThis.setTimeout(() => applySearch(search.trim()), GROUP_CHAT_SEARCH_DEBOUNCE_MS);
  return () => globalThis.clearTimeout(timeout);
}

/** Resolves whether the current Group list should show loading, results, or an empty message. */
export function resolveGroupChatListEmptyState(input: {
  search: string;
  isPending: boolean;
  isFetching: boolean;
  isPlaceholderData: boolean;
  hasError: boolean;
  hasItems: boolean;
}): GroupChatListEmptyState {
  if (input.isPending && !input.hasItems) return "loading";
  if (input.hasError || input.hasItems || input.isFetching || input.isPlaceholderData) return "none";
  return input.search.trim() ? "no-matches" : "no-groups";
}

/** Builds an account-, tenant-, search-, and page-scoped Group list cache key. */
export function groupChatGroupListQueryKey(userScope: string, tenantScope: string, search: string, page: number) {
  return ["group-chat", "groups", userScope, tenantScope, search.trim(), page] as const;
}

/** Allows stale placeholders only across searches/pages for the same authenticated account and tenant. */
export function canReuseGroupChatListPlaceholder(previousQueryKey: readonly unknown[] | undefined, userScope: string, tenantScope: string): boolean {
  return previousQueryKey?.[0] === "group-chat" && previousQueryKey[1] === "groups" && previousQueryKey[2] === userScope && previousQueryKey[3] === tenantScope;
}
