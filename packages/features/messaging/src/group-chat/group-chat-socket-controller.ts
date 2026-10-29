import type { GroupChatLifecycleEvent, GroupChatLifecycleEventKind, GroupChatLiveMessageEvent, GroupChatLiveMessageEventKind, GroupChatMembershipEvent, GroupChatMembershipEventKind, GroupChatPersonalEvent, GroupChatPersonalEventKind } from "./group-chat-socket";

function getGroupChatSocketEnvelopeFields(payload: unknown): { conversationType: string | null; conversationId: string | null } {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { conversationType: null, conversationId: null };
  }
  const record = payload as Record<string, unknown>;
  return {
    conversationType: typeof record.conversation_type === "string" ? record.conversation_type : null,
    conversationId: typeof record.conversation_id === "string" ? record.conversation_id : null,
  };
}

/** The minimal normalized result needed by the Group message controller. */
export type GroupChatNormalizedIncomingMessage = { messageId: string };
export type GroupChatNormalizedReadEvent = { userId: string; readAt: string; readThroughMessageId?: string | null };

/** The existing authenticated Socket.IO surface required by the Group subscription. */
export type GroupChatSocketClient = {
  connected: boolean;
  on: (event: string, listener: (...args: unknown[]) => void) => unknown;
  off: (event: string, listener: (...args: unknown[]) => void) => unknown;
  emit: (event: string, ...args: unknown[]) => unknown;
  io: {
    on: (event: string, listener: (...args: unknown[]) => void) => unknown;
    off: (event: string, listener: (...args: unknown[]) => void) => unknown;
  };
};

/** Inputs for the opt-in Group room controller. */
export type GroupChatSocketControllerOptions = {
  enabled: boolean;
  socket: GroupChatSocketClient;
  groupId: string;
  groupIsActive: boolean;
  membershipAuthorized: boolean;
  normalizeNewMessage: (payload: unknown, expectedGroupId: string) => GroupChatNormalizedIncomingMessage | null;
  normalizeGroupEvent?: (kind: GroupChatLiveMessageEventKind, payload: unknown, expectedGroupId: string) => GroupChatLiveMessageEvent | null;
  normalizeGroupMembershipEvent?: (kind: GroupChatMembershipEventKind, payload: unknown, expectedGroupId: string) => GroupChatMembershipEvent | null;
  normalizeGroupLifecycleEvent?: (kind: GroupChatLifecycleEventKind, payload: unknown, expectedGroupId: string) => GroupChatLifecycleEvent | null;
  normalizeGroupRead?: (payload: unknown, expectedGroupId: string) => GroupChatNormalizedReadEvent | null;
  validateJoinedRoom: (payload: unknown, expectedGroupId: string) => boolean;
  onMessage: (message: GroupChatNormalizedIncomingMessage) => void;
  onGroupEvent?: (event: GroupChatLiveMessageEvent) => void;
  onGroupMembershipEvent?: (event: GroupChatMembershipEvent) => void;
  onGroupLifecycleEvent?: (event: GroupChatLifecycleEvent) => void;
  onGroupRead?: (event: GroupChatNormalizedReadEvent) => void;
  onReconnect: () => void | Promise<void>;
  onJoinRejected?: () => void;
};

/** Inputs for the authenticated personal-room Group event controller. */
export type GroupChatPersonalSocketControllerOptions = {
  enabled: boolean;
  socket: GroupChatSocketClient;
  normalizePersonalEvent: (kind: GroupChatPersonalEventKind, payload: unknown) => GroupChatPersonalEvent | null;
  onPersonalEvent: (event: GroupChatPersonalEvent) => void;
  onReconnect: () => void | Promise<void>;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}

function isMatchingConversation(value: unknown, groupId: string): boolean {
  return typeof value === "object" && value !== null && !Array.isArray(value) && "conversation_id" in value && typeof value.conversation_id === "string" && value.conversation_id.trim().toLowerCase() === groupId.toLowerCase();
}

/** Returns true only for backend Group statuses that permit a live room subscription. */
export function isGroupChatRealtimeActiveStatus(status: string | null | undefined): boolean {
  const normalizedStatus = status?.trim().toLowerCase();
  // Closed Groups remain subscribed while authorized so a later group_reopened event can be observed.
  return normalizedStatus === "open" || normalizedStatus === "active" || normalizedStatus === "closed";
}

/** Reads the public opt-in flag without changing the global Socket.IO configuration. */
export function isGroupChatRealtimeEnabled(value = process.env.NEXT_PUBLIC_GROUP_CHAT_REALTIME_ENABLED): boolean {
  return value?.trim().toLowerCase() === "true";
}

/** Owns one selected Group room on the existing authenticated socket and nothing else. */
export function createGroupChatSocketController(options: GroupChatSocketControllerOptions): () => void {
  const { enabled, socket, groupId, groupIsActive, membershipAuthorized, normalizeNewMessage, normalizeGroupEvent, normalizeGroupMembershipEvent, normalizeGroupLifecycleEvent, normalizeGroupRead, validateJoinedRoom, onMessage, onGroupEvent, onGroupMembershipEvent, onGroupLifecycleEvent, onGroupRead, onReconnect, onJoinRejected } = options;
  if (!enabled || !isUuid(groupId) || !groupIsActive || !membershipAuthorized) return () => undefined;

  let active = true;
  let joinSent = false;
  let ownsRoom = false;
  const processedMessageIds = new Set<string>();

  const joinRoom = () => {
    if (!active || !socket.connected || joinSent) return;
    joinSent = true;
    ownsRoom = true;
    socket.emit("join_room", { conversation_id: groupId }, (acknowledgement: unknown) => {
      if (acknowledgement !== undefined && !validateJoinedRoom(acknowledgement, groupId)) onJoinRejected?.();
    });
  };

  const handleConnect = () => {
    joinRoom();
  };

  const handleDisconnect = () => {
    joinSent = false;
    ownsRoom = false;
  };

  const handleReconnect = () => {
    joinSent = false;
    ownsRoom = false;
    joinRoom();
    void onReconnect();
  };

  const handleJoinedRoom = (payload: unknown) => {
    if (!isMatchingConversation(payload, groupId)) return;
    if (!validateJoinedRoom(payload, groupId)) onJoinRejected?.();
  };

  const handleNewMessage = (payload: unknown) => {
    const normalized = normalizeNewMessage(payload, groupId);
    if (!normalized || processedMessageIds.has(normalized.messageId.toLowerCase())) return;
    processedMessageIds.add(normalized.messageId.toLowerCase());
    onMessage(normalized);
  };

  const handleGroupRead = (payload: unknown) => {
    if (!normalizeGroupRead || !onGroupRead) return;
    const normalized = normalizeGroupRead(payload, groupId);
    if (normalized) onGroupRead(normalized);
  };

  const liveEventListeners = new Map<GroupChatLiveMessageEventKind, (payload: unknown) => void>();
  if (normalizeGroupEvent && onGroupEvent) {
    for (const kind of ["message_updated", "message_hidden", "reaction_updated", "message_pinned"] as const) {
      const listener = (payload: unknown) => {
        const normalized = normalizeGroupEvent(kind, payload, groupId);
        if (normalized) onGroupEvent(normalized);
      };
      liveEventListeners.set(kind, listener);
      socket.on(kind, listener);
    }
  }

  const membershipEventListeners = new Map<GroupChatMembershipEventKind, (payload: unknown) => void>();
  if (normalizeGroupMembershipEvent && onGroupMembershipEvent) {
    for (const kind of ["member_joined", "member_left", "member_removed", "member_role_changed"] as const) {
      const listener = (payload: unknown) => {
        const normalized = normalizeGroupMembershipEvent(kind, payload, groupId);
        if (normalized) onGroupMembershipEvent(normalized);
      };
      membershipEventListeners.set(kind, listener);
      socket.on(kind, listener);
    }
  }

  const lifecycleEventListeners = new Map<GroupChatLifecycleEventKind, (payload: unknown) => void>();
  if (normalizeGroupLifecycleEvent && onGroupLifecycleEvent) {
    for (const kind of ["group_updated", "group_closed", "group_reopened"] as const) {
      const listener = (payload: unknown) => {
        const normalized = normalizeGroupLifecycleEvent(kind, payload, groupId);
        if (normalized) {
          onGroupLifecycleEvent(normalized);
          return;
        }
        const envelope = getGroupChatSocketEnvelopeFields(payload);
        const reason = envelope.conversationType !== "group"
          ? "conversation_type_not_group"
          : !envelope.conversationId
            ? "conversation_id_missing_or_invalid"
            : envelope.conversationId.trim().toLowerCase() !== groupId.trim().toLowerCase()
              ? "wrong_selected_group"
              : "event_payload_invalid";
      };
      lifecycleEventListeners.set(kind, listener);
      socket.on(kind, listener);
    }
  }

  socket.on("connect", handleConnect);
  socket.on("disconnect", handleDisconnect);
  socket.on("joined_room", handleJoinedRoom);
  socket.on("new_message", handleNewMessage);
  if (normalizeGroupRead && onGroupRead) socket.on("group_read", handleGroupRead);
  socket.io.on("reconnect", handleReconnect);

  if (socket.connected) joinRoom();

  return () => {
    active = false;
    socket.off("connect", handleConnect);
    socket.off("disconnect", handleDisconnect);
    socket.off("joined_room", handleJoinedRoom);
    socket.off("new_message", handleNewMessage);
    if (normalizeGroupRead && onGroupRead) socket.off("group_read", handleGroupRead);
    for (const [kind, listener] of liveEventListeners) socket.off(kind, listener);
    for (const [kind, listener] of membershipEventListeners) socket.off(kind, listener);
    for (const [kind, listener] of lifecycleEventListeners) socket.off(kind, listener);
    socket.io.off("reconnect", handleReconnect);
    if (ownsRoom && socket.connected) socket.emit("leave_room", { conversation_id: groupId });
    processedMessageIds.clear();
  };
}

/** Subscribes to authenticated personal-room Group events without joining or leaving any room. */
export function createGroupChatPersonalSocketController(options: GroupChatPersonalSocketControllerOptions): () => void {
  const { enabled, socket, normalizePersonalEvent, onPersonalEvent, onReconnect } = options;
  if (!enabled) return () => undefined;

  let active = true;
  const processedEventSignatures = new Set<string>();
  const listeners = new Map<GroupChatPersonalEventKind, (payload: unknown) => void>();

  for (const kind of ["group_invitation", "member_removed", "posting_muted", "posting_unmuted"] as const) {
    const listener = (payload: unknown) => {
      if (!active) return;
      const normalized = normalizePersonalEvent(kind, payload);
      if (!normalized) return;
      const signature = JSON.stringify(normalized);
      if (processedEventSignatures.has(signature)) return;
      processedEventSignatures.add(signature);
      onPersonalEvent(normalized);
    };
    listeners.set(kind, listener);
    socket.on(kind, listener);
  }

  const handleReconnect = () => {
    if (!active) return;
    processedEventSignatures.clear();
    void onReconnect();
  };
  socket.io.on("reconnect", handleReconnect);

  return () => {
    active = false;
    for (const [kind, listener] of listeners) socket.off(kind, listener);
    socket.io.off("reconnect", handleReconnect);
    processedEventSignatures.clear();
  };
}
