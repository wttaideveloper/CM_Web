import assert from "node:assert/strict";
import test from "node:test";
import { createGroupChatPersonalSocketController, createGroupChatSocketController, isGroupChatRealtimeActiveStatus, isGroupChatRealtimeEnabled, type GroupChatSocketClient } from "./group-chat-socket-controller.ts";
import { isGroupChatLifecycleEvent, isGroupChatLiveMessageEvent, isGroupChatMembershipEvent, isGroupChatPersonalEvent, normalizeGroupChatSocketEvent } from "./group-chat-socket.ts";

const groupId = "11111111-1111-4111-8111-111111111111";
const messageId = "33333333-3333-4333-8333-333333333333";

type Listener = (...args: unknown[]) => void;

function createFakeSocket(connected = true) {
  const listeners = new Map<string, Set<Listener>>();
  const managerListeners = new Map<string, Set<Listener>>();
  const emitted: Array<{ event: string; args: unknown[] }> = [];
  const socket = {
    connected,
    on(event: string, listener: Listener) {
      const current = listeners.get(event) ?? new Set<Listener>();
      current.add(listener);
      listeners.set(event, current);
      return socket;
    },
    off(event: string, listener: Listener) {
      listeners.get(event)?.delete(listener);
      return socket;
    },
    emit(event: string, ...args: unknown[]) {
      emitted.push({ event, args });
      return socket;
    },
    io: {
      on(event: string, listener: Listener) {
        const current = managerListeners.get(event) ?? new Set<Listener>();
        current.add(listener);
        managerListeners.set(event, current);
        return socket.io;
      },
      off(event: string, listener: Listener) {
        managerListeners.get(event)?.delete(listener);
        return socket.io;
      },
    },
  } as unknown as GroupChatSocketClient;

  return {
    socket,
    emitted,
    fire(event: string, payload?: unknown) {
      listeners.get(event)?.forEach((listener) => listener(payload));
    },
    fireManager(event: string, payload?: unknown) {
      managerListeners.get(event)?.forEach((listener) => listener(payload));
    },
    listenerCount(event: string) {
      return listeners.get(event)?.size ?? 0;
    },
    managerListenerCount(event: string) {
      return managerListeners.get(event)?.size ?? 0;
    },
  };
}

function normalizeMessage(payload: unknown, expectedGroupId: string): { messageId: string } | null {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return null;
  const value = payload as { conversation_type?: unknown; conversation_id?: unknown; message?: unknown };
  if (value.conversation_type !== "group" || value.conversation_id !== expectedGroupId || typeof value.message !== "object" || value.message === null || Array.isArray(value.message)) return null;
  const message = value.message as { id?: unknown; conversation_id?: unknown };
  return typeof message.id === "string" && message.id === messageId && message.conversation_id === expectedGroupId ? { messageId: message.id } : null;
}

function validateJoinedRoom(payload: unknown, expectedGroupId: string): boolean {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return false;
  const value = payload as { conversation_id?: unknown; room?: unknown; authorized?: unknown };
  return value.conversation_id === expectedGroupId && value.room === `conversation:${expectedGroupId}` && value.authorized === true;
}

test("the feature flag is disabled by default and recognizes only true", () => {
  assert.equal(isGroupChatRealtimeEnabled(undefined), false);
  assert.equal(isGroupChatRealtimeEnabled("false"), false);
  assert.equal(isGroupChatRealtimeEnabled(" TRUE "), true);
  assert.equal(isGroupChatRealtimeActiveStatus("open"), true);
  assert.equal(isGroupChatRealtimeActiveStatus("active"), true);
  assert.equal(isGroupChatRealtimeActiveStatus("closed"), true);
  assert.equal(isGroupChatRealtimeActiveStatus(null), false);
});

test("disabled, unauthorized, inactive and malformed groups do not register or join", () => {
  for (const options of [
    { enabled: false, groupIsActive: true, membershipAuthorized: true },
    { enabled: true, groupIsActive: false, membershipAuthorized: true },
    { enabled: true, groupIsActive: true, membershipAuthorized: false },
  ]) {
    const fake = createFakeSocket();
    const cleanup = createGroupChatSocketController({ ...options, socket: fake.socket, groupId, normalizeNewMessage: normalizeMessage, validateJoinedRoom, onMessage: () => undefined, onReconnect: () => undefined });
    assert.equal(fake.listenerCount("new_message"), 0);
    assert.equal(fake.emitted.length, 0);
    cleanup();
  }
  const malformed = createFakeSocket();
  createGroupChatSocketController({ enabled: true, socket: malformed.socket, groupId: "not-a-uuid", groupIsActive: true, membershipAuthorized: true, normalizeNewMessage: normalizeMessage, validateJoinedRoom, onMessage: () => undefined, onReconnect: () => undefined });
  assert.equal(malformed.listenerCount("new_message"), 0);
});

test("enabled subscription joins only its selected group and validates acknowledgement", () => {
  const fake = createFakeSocket();
  let rejected = 0;
  const cleanup = createGroupChatSocketController({ enabled: true, socket: fake.socket, groupId, groupIsActive: true, membershipAuthorized: true, normalizeNewMessage: normalizeMessage, validateJoinedRoom, onMessage: () => undefined, onReconnect: () => undefined, onJoinRejected: () => { rejected += 1; } });
  assert.equal(fake.emitted[0]?.event, "join_room");
  assert.deepEqual(fake.emitted[0]?.args[0], { conversation_id: groupId });
  assert.equal(typeof fake.emitted[0]?.args[1], "function");
  fake.fire("joined_room", { conversation_id: groupId, room: `conversation:${groupId}`, authorized: true });
  fake.fire("joined_room", { conversation_id: groupId, room: "conversation:wrong", authorized: true });
  fake.fire("joined_room", { conversation_id: "22222222-2222-4222-8222-222222222222", room: "conversation:wrong", authorized: true });
  assert.equal(rejected, 1);
  cleanup();
  assert.deepEqual(fake.emitted.at(-1), { event: "leave_room", args: [{ conversation_id: groupId }] });
});

test("accepts only normalized Group messages, invalidates each message once, and ignores Direct or wrong-group events", () => {
  const fake = createFakeSocket();
  const received: string[] = [];
  const cleanup = createGroupChatSocketController({ enabled: true, socket: fake.socket, groupId, groupIsActive: true, membershipAuthorized: true, normalizeNewMessage: normalizeMessage, validateJoinedRoom, onMessage: ({ messageId: receivedId }) => received.push(receivedId), onReconnect: () => undefined });
  const valid = { conversation_type: "group", conversation_id: groupId, message: { id: messageId, conversation_id: groupId } };
  fake.fire("new_message", valid);
  fake.fire("new_message", valid);
  fake.fire("new_message", { ...valid, conversation_type: "direct" });
  fake.fire("new_message", { ...valid, conversation_id: "22222222-2222-4222-8222-222222222222" });
  assert.deepEqual(received, [messageId]);
  cleanup();
});

test("accepts only validated read events for the selected Group", () => {
  const fake = createFakeSocket();
  const reads: Array<{ userId: string; readThroughMessageId?: string | null }> = [];
  const cleanup = createGroupChatSocketController({
    enabled: true,
    socket: fake.socket,
    groupId,
    groupIsActive: true,
    membershipAuthorized: true,
    normalizeNewMessage: normalizeMessage,
    normalizeGroupRead: (payload, expectedGroupId) => {
      if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return null;
      const value = payload as { conversation_type?: unknown; conversation_id?: unknown; user_id?: unknown; read_at?: unknown; read_through_message_id?: unknown };
      return value.conversation_type === "group" && value.conversation_id === expectedGroupId && typeof value.user_id === "string" && typeof value.read_at === "string"
        ? { userId: value.user_id, readAt: value.read_at, ...(typeof value.read_through_message_id === "string" || value.read_through_message_id === null ? { readThroughMessageId: value.read_through_message_id } : {}) }
        : null;
    },
    validateJoinedRoom,
    onMessage: () => undefined,
    onGroupRead: (event) => reads.push({ userId: event.userId, ...(event.readThroughMessageId !== undefined ? { readThroughMessageId: event.readThroughMessageId } : {}) }),
    onReconnect: () => undefined,
  });
  fake.fire("group_read", { conversation_type: "group", conversation_id: groupId, user_id: "55555555-5555-4555-8555-555555555555", read_at: "2026-10-26T10:05:00.000Z", read_through_message_id: messageId });
  fake.fire("group_read", { conversation_type: "direct", conversation_id: groupId, user_id: "55555555-5555-4555-8555-555555555555", read_at: "2026-10-26T10:05:00.000Z" });
  fake.fire("group_read", { conversation_type: "group", conversation_id: "22222222-2222-4222-8222-222222222222", user_id: "55555555-5555-4555-8555-555555555555", read_at: "2026-10-26T10:05:00.000Z" });
  assert.deepEqual(reads, [{ userId: "55555555-5555-4555-8555-555555555555", readThroughMessageId: messageId }]);
  cleanup();
  assert.equal(fake.listenerCount("group_read"), 0);
});

test("subscribes to and forwards only valid selected-Group live message events", () => {
  const fake = createFakeSocket();
  const events: string[] = [];
  const cleanup = createGroupChatSocketController({
    enabled: true,
    socket: fake.socket,
    groupId,
    groupIsActive: true,
    membershipAuthorized: true,
    normalizeNewMessage: normalizeMessage,
    normalizeGroupEvent: (kind, payload, expectedGroupId) => {
      const event = normalizeGroupChatSocketEvent(kind, payload, expectedGroupId);
      return event && isGroupChatLiveMessageEvent(event) ? event : null;
    },
    validateJoinedRoom,
    onMessage: () => undefined,
    onGroupEvent: (event) => events.push(event.event),
    onReconnect: () => undefined,
  });
  for (const kind of ["message_updated", "message_hidden", "reaction_updated", "message_pinned"]) assert.equal(fake.listenerCount(kind), 1);

  const validBase = { conversation_type: "group", conversation_id: groupId };
  fake.fire("message_updated", { ...validBase, message: { id: messageId, conversation_id: groupId, sender_id: "44444444-4444-4444-8444-444444444444", created_at: "2026-10-26T10:00:00.000Z", content: "edited" } });
  fake.fire("message_hidden", { ...validBase, message_id: messageId, status: "hidden", placeholder: "Message unavailable." });
  fake.fire("reaction_updated", { ...validBase, message_id: messageId, reactions: { "👍": 1 } });
  fake.fire("message_pinned", { ...validBase, message_id: messageId, pinned: true });
  fake.fire("message_updated", { ...validBase, conversation_type: "direct", message: { id: messageId, conversation_id: groupId, sender_id: "44444444-4444-4444-8444-444444444444", created_at: "2026-10-26T10:00:00.000Z" } });
  fake.fire("message_pinned", { ...validBase, conversation_id: "22222222-2222-4222-8222-222222222222", message_id: messageId, pinned: true });
  fake.fire("message_hidden", { ...validBase, message_id: "not-a-uuid", status: "hidden", placeholder: "Message unavailable." });

  assert.deepEqual(events, ["message_updated", "message_hidden", "reaction_updated", "message_pinned"]);
  cleanup();
  for (const kind of ["message_updated", "message_hidden", "reaction_updated", "message_pinned"]) assert.equal(fake.listenerCount(kind), 0);
});

test("subscribes to all membership events, scopes them to the selected Group, and cleans up once", () => {
  const fake = createFakeSocket();
  const events: string[] = [];
  const cleanup = createGroupChatSocketController({
    enabled: true,
    socket: fake.socket,
    groupId,
    groupIsActive: true,
    membershipAuthorized: true,
    normalizeNewMessage: normalizeMessage,
    normalizeGroupMembershipEvent: (kind, payload, expectedGroupId) => {
      const value = normalizeGroupChatSocketEvent(kind, payload, expectedGroupId);
      return value && isGroupChatMembershipEvent(value) ? value : null;
    },
    validateJoinedRoom,
    onMessage: () => undefined,
    onGroupMembershipEvent: (event) => events.push(event.event),
    onReconnect: () => undefined,
  });
  for (const kind of ["member_joined", "member_left", "member_removed", "member_role_changed"]) assert.equal(fake.listenerCount(kind), 1);

  const validBase = { conversation_type: "group", conversation_id: groupId };
  fake.fire("member_joined", { ...validBase, user_id: "55555555-5555-4555-8555-555555555555", role: "member", kind: "learner" });
  fake.fire("member_left", { ...validBase, user_id: "55555555-5555-4555-8555-555555555555" });
  fake.fire("member_removed", { ...validBase, user_id: "55555555-5555-4555-8555-555555555555" });
  fake.fire("member_role_changed", { ...validBase, user_id: "55555555-5555-4555-8555-555555555555", role: "admin" });
  fake.fire("member_removed", { ...validBase, conversation_type: "direct", user_id: "55555555-5555-4555-8555-555555555555" });
  fake.fire("member_left", { ...validBase, conversation_id: "22222222-2222-4222-8222-222222222222", user_id: "55555555-5555-4555-8555-555555555555" });
  fake.fire("member_role_changed", { ...validBase, user_id: "not-a-uuid", role: "admin" });
  assert.deepEqual(events, ["member_joined", "member_left", "member_removed", "member_role_changed"]);

  cleanup();
  for (const kind of ["member_joined", "member_left", "member_removed", "member_role_changed"]) assert.equal(fake.listenerCount(kind), 0);
});

test("subscribes to lifecycle events once, validates them, and keeps closed rooms observable", () => {
  const fake = createFakeSocket();
  const events: string[] = [];
  const cleanup = createGroupChatSocketController({
    enabled: true,
    socket: fake.socket,
    groupId,
    groupIsActive: true,
    membershipAuthorized: true,
    normalizeNewMessage: normalizeMessage,
    normalizeGroupLifecycleEvent: (kind, payload, expectedGroupId) => {
      const value = normalizeGroupChatSocketEvent(kind, payload, expectedGroupId);
      return value && isGroupChatLifecycleEvent(value) ? value : null;
    },
    validateJoinedRoom,
    onMessage: () => undefined,
    onGroupLifecycleEvent: (event) => events.push(event.event),
    onReconnect: () => undefined,
  });
  for (const kind of ["group_updated", "group_closed", "group_reopened"]) assert.equal(fake.listenerCount(kind), 1);
  const base = { conversation_type: "group", conversation_id: groupId };
  fake.fire("group_updated", { ...base, changed_fields: { name: "Updated" } });
  fake.fire("group_closed", { ...base, closed_at: "2026-10-27T10:00:00.000Z" });
  fake.fire("group_reopened", base);
  fake.fire("group_updated", { ...base, conversation_type: "direct", changed_fields: { name: "Ignored" } });
  assert.deepEqual(events, ["group_updated", "group_closed", "group_reopened"]);
  cleanup();
  for (const kind of ["group_updated", "group_closed", "group_reopened"]) assert.equal(fake.listenerCount(kind), 0);
});

test("personal Group controller listens without joining rooms and scopes malformed events", () => {
  const fake = createFakeSocket();
  const events: string[] = [];
  let reconnects = 0;
  const cleanup = createGroupChatPersonalSocketController({
    enabled: true,
    socket: fake.socket,
    normalizePersonalEvent: (kind, payload) => {
      const event = normalizeGroupChatSocketEvent(kind, payload);
      return event && isGroupChatPersonalEvent(event) ? event : null;
    },
    onPersonalEvent: (event) => events.push(`${event.event}:${event.conversation_id}`),
    onReconnect: () => { reconnects += 1; },
  });

  for (const kind of ["group_invitation", "member_removed", "posting_muted", "posting_unmuted"]) assert.equal(fake.listenerCount(kind), 1);
  assert.equal(fake.emitted.length, 0);
  const base = { conversation_type: "group", conversation_id: groupId };
  fake.fire("group_invitation", base);
  fake.fire("group_invitation", base);
  fake.fire("member_removed", { ...base, user_id: "55555555-5555-4555-8555-555555555555" });
  fake.fire("member_removed", { ...base, user_id: "not-a-uuid" });
  fake.fire("member_removed", { ...base, conversation_type: "direct", user_id: "55555555-5555-4555-8555-555555555555" });
  fake.fire("posting_muted", { ...base, until: "2026-10-27T10:00:00.000Z" });
  fake.fire("posting_muted", { ...base, until: null });
  fake.fire("posting_muted", { ...base, until: "not-a-date" });
  fake.fire("posting_unmuted", { ...base });
  fake.fire("posting_muted", { ...base, conversation_id: "22222222-2222-4222-8222-222222222222", until: null });
  fake.fire("posting_muted", { ...base, conversation_type: "direct", until: null });
  fake.fire("posting_unmuted", { ...base, conversation_type: "direct" });
  fake.fire("posting_unmuted", { ...base, conversation_id: "not-a-uuid" });
  assert.equal(normalizeGroupChatSocketEvent("posting_muted", { ...base, conversation_id: "22222222-2222-4222-8222-222222222222", until: null }, groupId), null);
  assert.deepEqual(events, [`group_invitation:${groupId}`, `member_removed:${groupId}`, `posting_muted:${groupId}`, `posting_muted:${groupId}`, `posting_unmuted:${groupId}`, "posting_muted:22222222-2222-4222-8222-222222222222"]);

  fake.fireManager("reconnect");
  assert.equal(reconnects, 1);
  fake.fire("group_invitation", base);
  assert.equal(events.length, 7);
  cleanup();
  for (const kind of ["group_invitation", "member_removed", "posting_muted", "posting_unmuted"]) assert.equal(fake.listenerCount(kind), 0);
  assert.equal(fake.managerListenerCount("reconnect"), 0);
});

test("disabled personal Group controller attaches no listeners and emits no room operations", () => {
  const fake = createFakeSocket();
  const cleanup = createGroupChatPersonalSocketController({
    enabled: false,
    socket: fake.socket,
    normalizePersonalEvent: () => null,
    onPersonalEvent: () => undefined,
    onReconnect: () => undefined,
  });
  assert.equal(fake.emitted.length, 0);
  assert.equal(fake.listenerCount("group_invitation"), 0);
  assert.equal(fake.listenerCount("member_removed"), 0);
  assert.equal(fake.managerListenerCount("reconnect"), 0);
  cleanup();
});

test("accepts the deployed group_updated packet through the controller without changed_fields", () => {
  const deployedGroupId = "ebf4aaab-6d70-4aa1-8faa-bca7dfb9b867";
  const fake = createFakeSocket();
  const events: string[] = [];
  const cleanup = createGroupChatSocketController({
      enabled: true,
      socket: fake.socket,
      groupId: deployedGroupId,
      groupIsActive: true,
      membershipAuthorized: true,
      normalizeNewMessage: normalizeMessage,
      normalizeGroupLifecycleEvent: (kind, payload, expectedGroupId) => {
        const event = normalizeGroupChatSocketEvent(kind, payload, expectedGroupId);
        return event && isGroupChatLifecycleEvent(event) ? event : null;
      },
      validateJoinedRoom,
      onMessage: () => undefined,
      onGroupLifecycleEvent: (event) => events.push(event.event),
      onReconnect: () => undefined,
    });

    fake.fire("group_updated", {
      conversation_id: deployedGroupId,
      conversation_type: "group",
      name: "gcroup realtime test",
      description: "invite from prov to adm and leave withdr",
      avatar_url: "/api/v1/uploads/group-avatars/59fcea40814a4ff3997d468b0d4ae704.jpg",
    });

    assert.deepEqual(events, ["group_updated"]);
  cleanup();
});

test("reconnect rejoins and requests REST reconciliation, while cleanup removes only its listeners", async () => {
  const fake = createFakeSocket();
  let reconnects = 0;
  const cleanup = createGroupChatSocketController({ enabled: true, socket: fake.socket, groupId, groupIsActive: true, membershipAuthorized: true, normalizeNewMessage: normalizeMessage, validateJoinedRoom, onMessage: () => undefined, onReconnect: async () => { reconnects += 1; } });
  fake.fireManager("reconnect");
  await Promise.resolve();
  assert.equal(reconnects, 1);
  assert.equal(fake.emitted.filter((item) => item.event === "join_room").length, 2);
  assert.equal(fake.managerListenerCount("reconnect"), 1);
  cleanup();
  assert.equal(fake.listenerCount("new_message"), 0);
  assert.equal(fake.managerListenerCount("reconnect"), 0);
  assert.equal(fake.emitted.filter((item) => item.event === "leave_room").length, 1);
});
