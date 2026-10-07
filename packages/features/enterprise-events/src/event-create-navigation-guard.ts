export const EVENT_CREATE_LEAVE_MESSAGE = "Leave event creation? Your entered information will be lost.";

export type EventCreateLeaveState = {
  mode: "create" | "edit";
  isDirty: boolean;
  hasSubmitted: boolean;
};

/** Returns whether leaving the Event create form should require confirmation. */
export function shouldConfirmEventCreateLeave(state: EventCreateLeaveState): boolean {
  return state.mode === "create" && state.isDirty && !state.hasSubmitted;
}

/** Confirms an Event create navigation while remaining easy to test without a browser. */
export function confirmEventCreateLeave(
  state: EventCreateLeaveState,
  confirm: (message: string) => boolean,
): boolean {
  return !shouldConfirmEventCreateLeave(state) || confirm(EVENT_CREATE_LEAVE_MESSAGE);
}
