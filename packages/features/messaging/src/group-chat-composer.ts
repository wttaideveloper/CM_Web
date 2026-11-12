export type GroupChatComposerKeyEvent = {
  key: string;
  shiftKey: boolean;
  isComposing?: boolean;
  defaultPrevented?: boolean;
  preventDefault: () => void;
};

/** Returns whether a keyboard event should submit the Group Chat text composer. */
export function shouldSubmitGroupChatComposerOnKeyDown(event: GroupChatComposerKeyEvent): boolean {
  return event.key === "Enter" && !event.shiftKey && event.isComposing !== true && event.defaultPrevented !== true;
}

/** Prevents the browser newline and invokes the existing composer submission handler when appropriate. */
export function handleGroupChatComposerKeyDown(event: GroupChatComposerKeyEvent, submit: () => void): void {
  if (!shouldSubmitGroupChatComposerOnKeyDown(event)) return;
  event.preventDefault();
  submit();
}

/** Checks the text-only conditions shared by the button and keyboard submission paths. */
export function canSubmitGroupChatText(content: string, canPost: boolean, pending: boolean): boolean {
  return !pending && canPost && content.trim().length > 0;
}
