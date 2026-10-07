import assert from "node:assert/strict";
import { test } from "node:test";

import {
  confirmEventCreateLeave,
  EVENT_CREATE_LEAVE_MESSAGE,
  shouldConfirmEventCreateLeave,
} from "./event-create-navigation-guard.ts";

test("pristine create forms and edit forms do not prompt", () => {
  assert.equal(shouldConfirmEventCreateLeave({ mode: "create", isDirty: false, hasSubmitted: false }), false);
  assert.equal(shouldConfirmEventCreateLeave({ mode: "edit", isDirty: true, hasSubmitted: false }), false);
  assert.equal(shouldConfirmEventCreateLeave({ mode: "create", isDirty: true, hasSubmitted: true }), false);
});

test("dirty create forms prompt and preserve the user's choice", () => {
  const messages: string[] = [];
  const confirm = (answer: boolean) => (message: string) => {
    messages.push(message);
    return answer;
  };
  const dirty = { mode: "create" as const, isDirty: true, hasSubmitted: false };

  assert.equal(confirmEventCreateLeave(dirty, confirm(false)), false);
  assert.equal(confirmEventCreateLeave(dirty, confirm(true)), true);
  assert.deepEqual(messages, [EVENT_CREATE_LEAVE_MESSAGE, EVENT_CREATE_LEAVE_MESSAGE]);
});
