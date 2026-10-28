export const GROUP_CHAT_SCROLL_BOTTOM_THRESHOLD = 96;
export const GROUP_CHAT_SCROLL_TOP_THRESHOLD = 80;

export type GroupChatScrollMetrics = {
  scrollHeight: number;
  scrollTop: number;
  clientHeight: number;
};

export function isGroupChatNearBottom(
  metrics: GroupChatScrollMetrics,
  threshold = GROUP_CHAT_SCROLL_BOTTOM_THRESHOLD,
): boolean {
  return metrics.scrollHeight - metrics.scrollTop - metrics.clientHeight <= threshold;
}

export function shouldFollowGroupChatLatest({
  initial,
  newestMessageChanged,
  userWasNearBottom,
  explicitLatestRequest,
}: {
  initial: boolean;
  newestMessageChanged: boolean;
  userWasNearBottom: boolean;
  explicitLatestRequest: boolean;
}): boolean {
  return explicitLatestRequest || initial || (newestMessageChanged && userWasNearBottom);
}

export function shouldScrollGroupChatToLatestOnEntry(entryRequested: boolean, hasMessages: boolean): boolean {
  return entryRequested && hasMessages;
}

export function getGroupChatScrollTopAfterPrepend(
  previousScrollHeight: number,
  previousScrollTop: number,
  nextScrollHeight: number,
): number {
  return previousScrollTop + nextScrollHeight - previousScrollHeight;
}
