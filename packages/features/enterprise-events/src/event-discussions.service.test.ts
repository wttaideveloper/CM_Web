import { strict as assert } from "node:assert";
import test from "node:test";
import {
  appealEventDiscussionMessage,
  createEventDiscussion,
  createEventDiscussionReply,
  editEventDiscussionMessage,
  getEventDiscussionAccess,
  getEventDiscussionModerationHistory,
  getEventDiscussionThread,
  listEventDiscussions,
  listEventFlaggedDiscussions,
  moderateEventDiscussion,
  resolveAuthorName,
} from "./event-discussions.service.ts";

function mockFetchResponse(body: unknown, status = 200) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request) => {
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? "OK" : "Error",
      json: async () => body,
      text: async () => JSON.stringify(body),
    } as unknown as Response;
  }) as typeof fetch;

  return () => {
    globalThis.fetch = originalFetch;
  };
}

test("getEventDiscussionAccess calls backend endpoint and parses access", async () => {
  const restore = mockFetchResponse({
    can_read: true,
    can_post: true,
    role: "registered_participant",
    locked_reason: null,
    message: null,
  });

  try {
    const access = await getEventDiscussionAccess("evt-101");
    assert.equal(access.can_read, true);
    assert.equal(access.can_post, true);
    assert.equal(access.can_access, true);
    assert.equal(access.is_registered, true);
  } finally {
    restore();
  }
});

test("listEventDiscussions passes filter params and sanitizes item content", async () => {
  const restore = mockFetchResponse({
    items: [
      {
        id: "msg-001",
        event_id: "evt-101",
        parent_id: null,
        author_id: "usr-admin-1",
        author_name: "Event Organizing Team",
        author_avatar_url: null,
        author_role: "enterprise_admin",
        content: "<b>Welcome everyone!</b>",
        is_announcement: true,
        moderation_status: "published",
        reply_count: 0,
        created_at: "2026-11-09T08:00:00Z",
      },
    ],
    pagination: { total: 1, page: 1, page_size: 20, total_pages: 1 },
  });

  try {
    const res = await listEventDiscussions("evt-101", "announcements");
    assert.equal(res.items.length, 1);
    assert.equal(res.items[0].content, "Welcome everyone!");
    assert.equal(res.items[0].is_announcement, true);
  } finally {
    restore();
  }
});

test("createEventDiscussion handles 200 safe published response", async () => {
  const restore = mockFetchResponse({
    status: "published",
    message: {
      id: "msg-001",
      event_id: "evt-101",
      parent_id: null,
      author_id: "usr-current-user",
      author_name: "Attendee",
      author_avatar_url: null,
      author_role: "registered_participant",
      content: "Is there a certificate?",
      is_announcement: false,
      moderation_status: "published",
      reply_count: 0,
      created_at: "2026-11-09T08:00:00Z",
    },
  });

  try {
    const res = await createEventDiscussion("evt-101", {
      content: "Is there a certificate?",
    });
    assert.equal(res.status, "published");
    assert.ok(res.message);
  } finally {
    restore();
  }
});

test("createEventDiscussion handles 201 extreme violation blocked response", async () => {
  const restore = mockFetchResponse({
    status: "blocked",
    message: {
      id: "msg-blocked-1",
      moderation_status: "blocked",
      content: "blocked text",
    },
    user_message: "Your message violates community guidelines and cannot be posted.",
  }, 201);

  try {
    const res = await createEventDiscussion("evt-101", {
      content: "violation text",
    });
    assert.equal(res.status, "blocked");
    assert.equal(res.user_message, "Your message violates community guidelines and cannot be posted.");
    assert.equal(res.can_retry, true);
  } finally {
    restore();
  }
});

test("createEventDiscussionReply posts replies to thread endpoint", async () => {
  const restore = mockFetchResponse({
    status: "published",
    message: {
      id: "reply-501",
      event_id: "evt-101",
      parent_id: "msg-001",
      author_id: "usr-current-user",
      author_name: "Attendee",
      author_avatar_url: null,
      author_role: "registered_participant",
      content: "Thank you!",
      is_announcement: false,
      moderation_status: "published",
      created_at: "2026-11-09T08:15:00Z",
    },
  });

  try {
    const res = await createEventDiscussionReply("evt-101", "msg-001", {
      content: "Thank you!",
    });
    assert.equal(res.status, "published");
    assert.ok(res.message);
    assert.equal(res.message.parent_id, "msg-001");
  } finally {
    restore();
  }
});

test("listEventFlaggedDiscussions retrieves queue for enterprise admins", async () => {
  const restore = mockFetchResponse({
    items: [
      {
        id: "msg-002",
        event_id: "evt-101",
        sender_id: "usr-1",
        sender_name: "Kavitha",
        content: "Suspicious message",
        created_at: "2026-11-09T08:30:00Z",
        ai_flag_reason: "Check tone",
        ai_categories: ["hostile_language"],
        confidence: 0.8,
        moderation_status: "pending_review",
      },
    ],
    total_pending: 1,
  });

  try {
    const flagged = await listEventFlaggedDiscussions("evt-101");
    assert.equal(flagged.total_pending, 1);
    assert.equal(flagged.items[0].ai_categories?.includes("hostile_language"), true);
  } finally {
    restore();
  }
});

test("listEventFlaggedDiscussions normalizes message_id, raw array, alternative date and reason fields", async () => {
  const restore = mockFetchResponse([
    {
      message_id: "msg-alt-999",
      sender: { name: "Organizer Admin" },
      body: "Test flagged content",
      reason: "Keyword violation",
      categories: "spam",
      timestamp: 1731154800000,
      appealed: true,
    },
  ]);

  try {
    const flagged = await listEventFlaggedDiscussions("evt-101");
    assert.equal(flagged.total_pending, 1);
    assert.equal(flagged.items[0].id, "msg-alt-999");
    assert.equal(flagged.items[0].sender_name, "Organizer Admin");
    assert.equal(flagged.items[0].content, "Test flagged content");
    assert.equal(flagged.items[0].ai_flag_reason, "Keyword violation");
    assert.deepEqual(flagged.items[0].ai_categories, ["spam"]);
    assert.equal(flagged.items[0].is_appeal, true);
    assert.ok(flagged.items[0].created_at.includes("2024") || flagged.items[0].created_at.includes("2026") || flagged.items[0].created_at.includes("T"));
  } finally {
    restore();
  }
});

test("moderateEventDiscussion executes approve and delete actions", async () => {
  const restoreApprove = mockFetchResponse({ success: true, status: "published" });
  try {
    const approved = await moderateEventDiscussion("evt-101", "msg-002", { action: "approve" });
    assert.equal(approved.success, true);
    assert.equal(approved.status, "published");
  } finally {
    restoreApprove();
  }

  const restoreDelete = mockFetchResponse({ success: true, status: "deleted" });
  try {
    const deleted = await moderateEventDiscussion("evt-101", "msg-002", { action: "delete" });
    assert.equal(deleted.success, true);
    assert.equal(deleted.status, "deleted");
  } finally {
    restoreDelete();
  }
});

test("getEventDiscussionThread returns thread or throws for 404", async () => {
  const restoreFound = mockFetchResponse({
    id: "msg-001",
    event_id: "evt-101",
    parent_id: null,
    author_id: "usr-1",
    author_name: "Admin",
    content: "Root question",
    is_announcement: false,
    moderation_status: "published",
    reply_count: 0,
    created_at: "2026-11-09T08:00:00Z",
    replies: [],
  });

  try {
    const thread = await getEventDiscussionThread("evt-101", "msg-001");
    assert.equal(thread.id, "msg-001");
  } finally {
    restoreFound();
  }

  const restoreNotFound = mockFetchResponse({}, 404);
  try {
    await assert.rejects(
      async () => getEventDiscussionThread("evt-101", "missing-msg"),
      /no longer available/,
    );
  } finally {
    restoreNotFound();
  }
});

test("getEventDiscussionModerationHistory returns audit log entries", async () => {
  const restore = mockFetchResponse([
    {
      id: "audit-001",
      event_id: "evt-101",
      message_id: "msg-001",
      message_content_snapshot: "Test content",
      author_id: "usr-1",
      author_name: "Author",
      action: "ai_approved",
      action_by: "AI_ENGINE",
      action_by_name: "AI Engine",
      created_at: "2026-11-09T08:00:00Z",
    },
  ]);

  try {
    const history = await getEventDiscussionModerationHistory("evt-101");
    assert.equal(history.length, 1);
    assert.equal(history[0].action, "ai_approved");
  } finally {
    restore();
  }
});

test("appealEventDiscussionMessage sends appeal to backend and handles 409", async () => {
  const restoreSuccess = mockFetchResponse({ success: true });
  try {
    const res = await appealEventDiscussionMessage("evt-101", "msg-blocked-1");
    assert.equal(res.success, true);
  } finally {
    restoreSuccess();
  }

  const restoreConflict = mockFetchResponse({ message: "Already appealed" }, 409);
  try {
    await assert.rejects(
      async () => appealEventDiscussionMessage("evt-101", "msg-blocked-1"),
      /already been submitted/,
    );
  } finally {
    restoreConflict();
  }
});

test("editEventDiscussionMessage sends PUT request to edit blocked message", async () => {
  const restore = mockFetchResponse({
    status: "published",
    message: {
      id: "msg-blocked-1",
      moderation_status: "published",
      content: "Clean revised message",
    },
  }, 201);

  try {
    const res = await editEventDiscussionMessage("evt-101", "msg-blocked-1", "Clean revised message");
    assert.equal(res.status, "published");
    assert.equal(res.message?.content, "Clean revised message");
  } finally {
    restore();
  }
});

test("resolveAuthorName resolves across backend schema variations", () => {
  assert.equal(resolveAuthorName({ author_name: "Dr. Sarah Smith" }), "Dr. Sarah Smith");
  assert.equal(resolveAuthorName({ sender_name: "Alex Doe" }), "Alex Doe");
  assert.equal(resolveAuthorName({ user_name: "Morgan Lee" }), "Morgan Lee");
  assert.equal(resolveAuthorName({ full_name: "Taylor Swift" }), "Taylor Swift");
  assert.equal(resolveAuthorName({ author: { name: "Enterprise Admin" } }), "Enterprise Admin");
  assert.equal(resolveAuthorName({ user: { full_name: "Jordan Bell" } }), "Jordan Bell");
  assert.equal(resolveAuthorName({ first_name: "Jane", last_name: "Goodall" }), "Jane Goodall");
  assert.equal(resolveAuthorName({ email: "priya.sharma@health.com" }), "Priya.sharma");
  assert.equal(resolveAuthorName({}, "Admin"), "Admin");
  assert.equal(resolveAuthorName({}), "Attendee");
});

