import assert from "node:assert/strict";
import test from "node:test";
import { formatGroupChatMessageTimestamp, getGroupChatMessageDateSeparatorKeys, getGroupChatMessageLocalDateKey } from "./group-chat-timestamps.ts";

test("formats message timestamps for the viewer's local date and time", () => {
  const display = formatGroupChatMessageTimestamp("2026-11-12T09:30:00Z", "Asia/Kolkata");

  assert.equal(display.valid, true);
  assert.match(display.date, /12 Nov 2026/);
  assert.match(display.compactTime, /3:00/);
  assert.match(display.fullTime, /3:00/);
});

test("converts UTC across local midnight", () => {
  const display = formatGroupChatMessageTimestamp("2026-11-12T23:30:00Z", "Asia/Kolkata");

  assert.match(display.date, /13 Nov 2026/);
  assert.match(display.compactTime, /5:00/);
});

test("preserves an explicit timestamp offset before local formatting", () => {
  const display = formatGroupChatMessageTimestamp("2026-11-12T23:30:00+05:30", "UTC");

  assert.match(display.date, /12 Nov 2026/);
  assert.match(display.compactTime, /6:00/);
});

test("treats the backend timezone-less Group timestamp as UTC", () => {
  const display = formatGroupChatMessageTimestamp("2026-11-12T23:30:00", "Asia/Kolkata");

  assert.match(display.date, /13 Nov 2026/);
  assert.match(display.compactTime, /5:00/);
});

test("handles invalid and missing timestamps without throwing", () => {
  assert.deepEqual(formatGroupChatMessageTimestamp("not-a-date"), {
    fullTime: "not-a-date",
    compactTime: "not-a-date",
    date: "Date unavailable",
    valid: false,
  });
  assert.deepEqual(formatGroupChatMessageTimestamp(null), {
    fullTime: "Time unavailable",
    compactTime: "Time unavailable",
    date: "Date unavailable",
    valid: false,
  });
});

test("creates one separator for consecutive messages on the same local date", () => {
  assert.deepEqual(
    getGroupChatMessageDateSeparatorKeys([
      "2026-11-12T09:00:00Z",
      "2026-11-12T10:00:00Z",
      "2026-11-12T11:00:00Z",
    ], "UTC"),
    ["2026-11-12", null, null],
  );
});

test("creates separators when the local calendar date changes", () => {
  assert.deepEqual(
    getGroupChatMessageDateSeparatorKeys([
      "2026-11-12T23:00:00Z",
      "2026-11-13T01:00:00Z",
      "2026-11-14T01:00:00Z",
    ], "UTC"),
    ["2026-11-12", "2026-11-13", "2026-11-14"],
  );
});

test("uses the viewer timezone when a UTC timestamp crosses midnight", () => {
  assert.equal(getGroupChatMessageLocalDateKey("2026-11-12T23:30:00Z", "Asia/Kolkata"), "2026-11-13");
  assert.deepEqual(
    getGroupChatMessageDateSeparatorKeys([
      "2026-11-12T23:00:00Z",
      "2026-11-12T23:30:00Z",
      "2026-11-13T00:00:00Z",
    ], "Asia/Kolkata"),
    ["2026-11-13", null, null],
  );
});

test("does not duplicate a separator when paginated history adds messages from an existing date", () => {
  const firstPage = ["2026-11-12T09:00:00Z", "2026-11-12T10:00:00Z"];
  const olderPage = ["2026-11-12T08:00:00Z", "2026-11-11T23:00:00Z"];
  assert.deepEqual(
    getGroupChatMessageDateSeparatorKeys([...olderPage.reverse(), ...firstPage], "UTC"),
    ["2026-11-11", "2026-11-12", null, null],
  );
});
