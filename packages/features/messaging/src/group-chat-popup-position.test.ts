import assert from "node:assert/strict";
import test from "node:test";
import { calculateGroupChatPopupPlacement, dismissGroupChatPopup, shouldDismissGroupChatPopupOnKey, shouldDismissGroupChatPopupOnPointer, toggleGroupChatPopup, type GroupChatPopupRect } from "./group-chat-popup-position.ts";

const chatViewport: GroupChatPopupRect = { top: 140, right: 900, bottom: 680, left: 240, width: 660, height: 540 };
const menu = { width: 224, height: 280 };

function anchor(top: number, left = 300, width = 28): GroupChatPopupRect {
  return { top, left, right: left + width, bottom: top + 28, width, height: 28 };
}

test("first and middle message menus open below when the history viewport has room", () => {
  for (const trigger of [anchor(170), anchor(350)]) {
    const placement = calculateGroupChatPopupPlacement({ anchor: trigger, popup: menu, boundary: chatViewport, alignment: "end" });
    assert.equal(placement.side, "below");
    assert.ok(placement.top >= chatViewport.top);
    assert.ok(placement.top + menu.height <= chatViewport.bottom);
  }
});

test("last and second-last message menus flip above rather than overlap the composer", () => {
  for (const trigger of [anchor(630), anchor(570)]) {
    const placement = calculateGroupChatPopupPlacement({ anchor: trigger, popup: menu, boundary: chatViewport, alignment: "end" });
    assert.equal(placement.side, "above");
    assert.ok(placement.top + menu.height <= trigger.top);
    assert.ok(placement.top >= chatViewport.top);
  }
});

test("incoming and outgoing message menus stay aligned within the history viewport", () => {
  for (const alignment of ["start", "end"] as const) {
    const placement = calculateGroupChatPopupPlacement({ anchor: anchor(250, alignment === "start" ? 245 : 850), popup: menu, boundary: chatViewport, alignment });
    assert.ok(placement.left >= chatViewport.left);
    assert.ok(placement.left + menu.width <= chatViewport.right);
  }
});

test("a reaction picker near the final message flips above and remains above the composer", () => {
  const placement = calculateGroupChatPopupPlacement({ anchor: anchor(640), popup: { width: 224, height: 148 }, boundary: chatViewport });
  assert.equal(placement.side, "above");
  assert.ok(placement.top + 148 <= chatViewport.bottom);
  assert.ok(placement.top < anchor(640).top);
});

test("when neither side fits, the popup is bounded to the larger available area and scrollable", () => {
  const placement = calculateGroupChatPopupPlacement({
    anchor: anchor(390),
    popup: menu,
    boundary: { top: 380, right: 500, bottom: 440, left: 250, width: 250, height: 60 },
  });
  assert.ok(placement.maxHeight < menu.height);
  assert.ok(placement.maxHeight >= 0);
  assert.equal(placement.side, "below");
});

test("popup horizontal alignment is clamped to the chat viewport", () => {
  const placement = calculateGroupChatPopupPlacement({
    anchor: anchor(200, 850),
    popup: menu,
    boundary: chatViewport,
    alignment: "start",
  });
  assert.ok(placement.left >= chatViewport.left);
  assert.ok(placement.left + menu.width <= chatViewport.right);
});

test("popup placement is recalculated against the moved trigger after internal scrolling", () => {
  const before = calculateGroupChatPopupPlacement({ anchor: anchor(350), popup: menu, boundary: chatViewport });
  const after = calculateGroupChatPopupPlacement({ anchor: anchor(620), popup: menu, boundary: chatViewport });
  assert.notEqual(before.top, after.top);
  assert.equal(after.side, "above");
});

test("menu and reaction picker state switches across messages and between popup kinds", () => {
  let open = toggleGroupChatPopup(null, { kind: "menu", messageId: "first" });
  open = toggleGroupChatPopup(open, { kind: "menu", messageId: "middle" });
  assert.deepEqual(open, { kind: "menu", messageId: "middle" });
  open = toggleGroupChatPopup(open, { kind: "reaction", messageId: "middle" });
  assert.deepEqual(open, { kind: "reaction", messageId: "middle" });
  open = toggleGroupChatPopup(open, { kind: "reaction", messageId: "middle" });
  assert.equal(open, null);
});

test("outside-pointer and Escape dismissal use the same closed state", () => {
  assert.equal(dismissGroupChatPopup(), null);
  assert.equal(shouldDismissGroupChatPopupOnPointer(false, false), true);
  assert.equal(shouldDismissGroupChatPopupOnPointer(true, false), false);
  assert.equal(shouldDismissGroupChatPopupOnPointer(false, true), false);
  assert.equal(shouldDismissGroupChatPopupOnKey("Escape"), true);
  assert.equal(shouldDismissGroupChatPopupOnKey("Enter"), false);
});
