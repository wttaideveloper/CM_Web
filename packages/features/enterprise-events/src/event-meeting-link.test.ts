import assert from "node:assert/strict";
import test from "node:test";

import {
  hasUnsafeProtectedSessionMeetingLinkEdit,
  isProtectedMeetingLink,
  isUnsafeProtectedMeetingLinkEdit,
} from "./event-meeting-link.ts";

test("recognizes the backend redaction marker without treating it as a URL", () => {
  assert.equal(isProtectedMeetingLink(" protected "), true);
  assert.equal(isProtectedMeetingLink("https://meet.example.com"), false);
  assert.equal(isProtectedMeetingLink(null), false);
});

test("blocks unchanged or cleared protected links", () => {
  assert.equal(isUnsafeProtectedMeetingLinkEdit("protected", ""), true);
  assert.equal(isUnsafeProtectedMeetingLinkEdit("protected", "protected"), true);
  assert.equal(isUnsafeProtectedMeetingLinkEdit("protected", "https://meet.example.com"), false);
  assert.equal(isUnsafeProtectedMeetingLinkEdit("https://old.example.com", ""), false);
});

test("matches protected Session links by ID without changing order or unrelated links", () => {
  const initial = [
    { id: "session-a", meeting_link: "protected" },
    { id: "session-b", meeting_link: "https://meet.example.com/b" },
  ];

  assert.equal(
    hasUnsafeProtectedSessionMeetingLinkEdit(
      [
        { id: "session-b", meeting_link: "https://meet.example.com/b" },
        { id: "session-a", meeting_link: "protected" },
      ],
      initial,
    ),
    true,
  );
  assert.equal(
    hasUnsafeProtectedSessionMeetingLinkEdit(
      [
        { id: "session-a", meeting_link: "https://meet.example.com/a" },
        { id: "session-b", meeting_link: "https://meet.example.com/updated" },
      ],
      initial,
    ),
    false,
  );
  assert.equal(
    hasUnsafeProtectedSessionMeetingLinkEdit(
      [{ id: "new-session", meeting_link: null }],
      initial,
    ),
    false,
  );
});
