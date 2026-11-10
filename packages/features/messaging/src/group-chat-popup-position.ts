export type GroupChatPopupRect = {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
};

export type GroupChatPopupPlacement = {
  top: number;
  left: number;
  maxHeight: number;
  maxWidth: number;
  side: "above" | "below";
};

export type GroupChatPopupAlignment = "start" | "end";

/** Calculates a collision-aware fixed popup position inside the chat history viewport. */
export function calculateGroupChatPopupPlacement({
  anchor,
  popup,
  boundary,
  alignment = "start",
  gap = 8,
  gutter = 8,
}: {
  anchor: GroupChatPopupRect;
  popup: Pick<GroupChatPopupRect, "width" | "height">;
  boundary: GroupChatPopupRect;
  alignment?: GroupChatPopupAlignment;
  gap?: number;
  gutter?: number;
}): GroupChatPopupPlacement {
  const leftBound = boundary.left + gutter;
  const rightBound = Math.max(leftBound, boundary.right - gutter);
  const topBound = boundary.top + gutter;
  const bottomBound = Math.max(topBound, boundary.bottom - gutter);
  const maxWidth = Math.max(0, rightBound - leftBound);
  const width = Math.min(Math.max(0, popup.width), maxWidth);
  const height = Math.max(0, popup.height);
  const spaceBelow = Math.max(0, bottomBound - anchor.bottom - gap);
  const spaceAbove = Math.max(0, anchor.top - topBound - gap);
  const side = height <= spaceBelow
    ? "below"
    : height <= spaceAbove
      ? "above"
      : spaceAbove > spaceBelow ? "above" : "below";
  const maxHeight = side === "below" ? spaceBelow : spaceAbove;
  const renderedHeight = Math.min(height, maxHeight);
  const preferredLeft = alignment === "end" ? anchor.right - width : anchor.left;
  const left = Math.min(Math.max(preferredLeft, leftBound), rightBound - width);
  const preferredTop = side === "below"
    ? anchor.bottom + gap
    : anchor.top - gap - renderedHeight;
  const top = Math.min(Math.max(preferredTop, topBound), bottomBound - renderedHeight);

  return { top, left, maxHeight, maxWidth, side };
}

/** Toggles one Group message popup while ensuring only one menu or picker is open. */
export function toggleGroupChatPopup(
  current: { kind: "menu" | "reaction"; messageId: string } | null,
  requested: { kind: "menu" | "reaction"; messageId: string },
): { kind: "menu" | "reaction"; messageId: string } | null {
  return current?.kind === requested.kind && current.messageId === requested.messageId
    ? null
    : requested;
}

/** Returns the closed popup state used by outside-pointer and Escape dismissal. */
export function dismissGroupChatPopup(): null {
  return null;
}

/** Identifies pointer events outside both the popup and its trigger. */
export function shouldDismissGroupChatPopupOnPointer(triggerContainsTarget: boolean, popupContainsTarget: boolean): boolean {
  return !triggerContainsTarget && !popupContainsTarget;
}

/** Identifies Escape key events that dismiss a Group Chat popup. */
export function shouldDismissGroupChatPopupOnKey(key: string): boolean {
  return key === "Escape";
}
