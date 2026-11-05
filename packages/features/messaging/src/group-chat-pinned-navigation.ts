/** Maximum number of pinned-message rows shown before the list scrolls internally. */
export const GROUP_CHAT_PINNED_VISIBLE_ROWS = 5;
/** Compact pinned row height in pixels, including its vertical padding. */
export const GROUP_CHAT_PINNED_ROW_HEIGHT_PX = 44;
/** Vertical space between pinned rows in pixels. */
export const GROUP_CHAT_PINNED_ROW_GAP_PX = 4;
/** Duration of the actual-message highlight after pinned navigation. */
export const GROUP_CHAT_PINNED_HIGHLIGHT_MS = 2000;

/**
 * Returns a maximum height only when the pinned list exceeds its visible-row limit.
 * Shorter lists retain their natural height rather than showing blank space.
 */
export function getGroupChatPinnedListMaxHeight(itemCount: number): number | undefined {
  if (itemCount <= GROUP_CHAT_PINNED_VISIBLE_ROWS) return undefined;
  return GROUP_CHAT_PINNED_VISIBLE_ROWS * GROUP_CHAT_PINNED_ROW_HEIGHT_PX + (GROUP_CHAT_PINNED_VISIBLE_ROWS - 1) * GROUP_CHAT_PINNED_ROW_GAP_PX;
}

/**
 * Computes a centered scroll position for the message-history element only.
 * The caller applies the result to that element's scrollTop, never the document.
 */
export function getGroupChatCenteredScrollTop(metrics: {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  targetTop: number;
  targetHeight: number;
}): number {
  const desired = metrics.scrollTop + metrics.targetTop - (metrics.clientHeight - metrics.targetHeight) / 2;
  return Math.max(0, Math.min(desired, Math.max(0, metrics.scrollHeight - metrics.clientHeight)));
}

/** Indicates whether another existing cursor page can be fetched for a pinned target. */
export function shouldFetchGroupChatPinnedTargetPage(loaded: boolean, hasNextPage: boolean, isFetching: boolean): boolean {
  return !loaded && hasNextPage && !isFetching;
}

/** Resolves pinned-jump work in priority order so layout closure always precedes final scrolling. */
export function getGroupChatPinnedNavigationStage(state: {
  sameGroup: boolean;
  panelOpen: boolean;
  targetLoaded: boolean;
  historyLoading: boolean;
  pageFetching: boolean;
  hasNextPage: boolean;
}): "stale" | "wait-for-panel" | "scroll" | "wait-for-history" | "fetch-next-page" | "not-found" {
  if (!state.sameGroup) return "stale";
  if (state.panelOpen) return "wait-for-panel";
  if (state.historyLoading || state.pageFetching) return "wait-for-history";
  if (state.targetLoaded) return "scroll";
  return state.hasNextPage ? "fetch-next-page" : "not-found";
}
