import assert from "node:assert/strict";
import test from "node:test";
import { canSubmitGroupChatText, handleGroupChatComposerKeyDown } from "./group-chat-composer.ts";

function keyboardEvent(overrides: Partial<Parameters<typeof handleGroupChatComposerKeyDown>[0]> = {}) {
  let prevented = false;
  return {
    event: {
      key: "Enter",
      shiftKey: false,
      isComposing: false,
      defaultPrevented: false,
      preventDefault: () => { prevented = true; },
      ...overrides,
    },
    wasPrevented: () => prevented,
  };
}

test("Enter submits once and prevents the newline", () => {
  const state = keyboardEvent();
  let submissions = 0;

  handleGroupChatComposerKeyDown(state.event, () => { submissions += 1; });

  assert.equal(submissions, 1);
  assert.equal(state.wasPrevented(), true);
});

test("Shift+Enter leaves the newline behavior to the textarea", () => {
  const state = keyboardEvent({ shiftKey: true });
  let submissions = 0;

  handleGroupChatComposerKeyDown(state.event, () => { submissions += 1; });

  assert.equal(submissions, 0);
  assert.equal(state.wasPrevented(), false);
});

test("IME composition leaves Enter untouched", () => {
  const state = keyboardEvent({ isComposing: true });
  let submissions = 0;

  handleGroupChatComposerKeyDown(state.event, () => { submissions += 1; });

  assert.equal(submissions, 0);
  assert.equal(state.wasPrevented(), false);
});

test("already handled Enter leaves the event untouched", () => {
  const state = keyboardEvent({ defaultPrevented: true });
  let submissions = 0;

  handleGroupChatComposerKeyDown(state.event, () => { submissions += 1; });

  assert.equal(submissions, 0);
  assert.equal(state.wasPrevented(), false);
});

test("empty and whitespace-only drafts cannot submit", () => {
  assert.equal(canSubmitGroupChatText("", true, false), false);
  assert.equal(canSubmitGroupChatText("  \n\t", true, false), false);
  assert.equal(canSubmitGroupChatText("message", true, false), true);
});

test("pending sends and restricted members cannot submit text", () => {
  assert.equal(canSubmitGroupChatText("message", true, true), false);
  assert.equal(canSubmitGroupChatText("message", false, false), false);
});
