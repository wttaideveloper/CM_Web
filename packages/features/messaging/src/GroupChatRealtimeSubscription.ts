"use client";

import { useContext, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RealtimeContext } from "@ihp/realtime";
import { createGroupChatSocketController, isGroupChatRealtimeActiveStatus, isGroupChatRealtimeEnabled, type GroupChatNormalizedReadEvent, type GroupChatSocketClient } from "./group-chat/group-chat-socket-controller";
import { getGroupChatLifecycleQueryKeys, getGroupChatMembershipQueryKeys, getGroupChatSocketQueryKeys, isGroupChatLifecycleEvent, isGroupChatLiveMessageEvent, isGroupChatMembershipEvent, normalizeGroupChatJoinedRoomAcknowledgement, normalizeGroupChatSocketEvent, shouldProcessGroupChatLifecycleEvent, type GroupChatLifecycleEvent, type GroupChatLiveMessageEventKind, type GroupChatMembershipEvent, type GroupChatMembershipEventKind } from "./group-chat/group-chat-socket";
import { markGroupChatRead } from "./group-chat/group-chat.service";
import { groupChatReadRefreshQueryKeys, groupChatReadStatusQueryKey, reconcileGroupChatReadState, shouldProcessGroupChatReadEvent } from "./group-chat/group-chat-read-state";
import { getGroupChatReconnectQueryKeys } from "./group-chat/group-chat-reconnect";

const groupsKey = (userScope: string) => ["group-chat", "groups", userScope] as const;
const messageKey = (groupId: string) => ["group-chat", "messages", groupId] as const;
const groupKey = (groupId: string, userScope: string) => ["group-chat", "group", groupId, userScope] as const;
const membersKey = (groupId: string) => ["group-chat", "members", groupId] as const;
const currentMemberKey = (groupId: string, userScope: string) => ["group-chat", "current-member", groupId, userScope] as const;

/** Options proving that the selected Group is authorized for a live subscription. */
export type GroupChatRealtimeSubscriptionOptions = {
  groupId: string;
  userScope: string;
  tenantScope: string;
  groupStatus: string | null;
  detailsReady: boolean;
  membershipAuthorized: boolean;
  onGroupRead?: (event: GroupChatNormalizedReadEvent) => void;
  onReadStatusRefresh?: () => void;
  onReconnectReadState?: () => void;
  onGroupMembershipEvent?: (event: GroupChatMembershipEvent) => void;
  onGroupLifecycleEvent?: (event: GroupChatLifecycleEvent) => void;
};

/** Subscribes to one selected Group through the existing RealtimeContext socket. */
export function useGroupChatRealtimeSubscription({ groupId, userScope, tenantScope, groupStatus, detailsReady, membershipAuthorized, onGroupRead, onReadStatusRefresh, onReconnectReadState, onGroupMembershipEvent, onGroupLifecycleEvent }: GroupChatRealtimeSubscriptionOptions): void {
  const realtime = useContext(RealtimeContext);
  const queryClient = useQueryClient();
  const enabled = isGroupChatRealtimeEnabled();
  const identityScope = `${userScope}:${tenantScope}`;
  const previousScope = useRef<{ groupId: string; identityScope: string; userScope: string } | null>(null);

  useEffect(() => {
    const previous = previousScope.current;
    if (previous && (previous.groupId !== groupId || previous.identityScope !== identityScope)) {
      queryClient.removeQueries({ queryKey: messageKey(previous.groupId) });
      queryClient.removeQueries({ queryKey: groupKey(previous.groupId, previous.userScope) });
      queryClient.removeQueries({ queryKey: currentMemberKey(previous.groupId, previous.userScope) });
      queryClient.removeQueries({ queryKey: membersKey(previous.groupId) });
      if (previous.identityScope !== identityScope) queryClient.removeQueries({ queryKey: ["group-chat", "read-status"] });
      queryClient.removeQueries({ queryKey: groupsKey(previous.userScope) });
    }
    previousScope.current = { groupId, identityScope, userScope };
  }, [groupId, identityScope, queryClient, userScope]);

  useEffect(() => {
    // The shared Socket.IO client uses event-name generics; this narrow adapter only exposes the events owned here.
    const socket = realtime?.socket ? realtime.socket as unknown as GroupChatSocketClient : null;
    if (!enabled || !socket) return undefined;

    let active = true;
    let refreshScheduled = false;
    const pendingRefreshes = new Map<string, readonly unknown[]>();
    const readEventSignatures = new Set<string>();
    const lifecycleEventSignatures = new Set<string>();
    let reconnectRefreshInFlight: Promise<void> | null = null;
    let reconnectRefreshQueued = false;

    const scheduleGroupEventRefresh = (kind: GroupChatLiveMessageEventKind) => {
      for (const queryKey of getGroupChatSocketQueryKeys(kind, groupId)) pendingRefreshes.set(JSON.stringify(queryKey), queryKey);
      if (refreshScheduled) return;
      refreshScheduled = true;
      void Promise.resolve().then(async () => {
        refreshScheduled = false;
        if (!active) {
          pendingRefreshes.clear();
          return;
        }
        const queryKeys = [...pendingRefreshes.values()];
        pendingRefreshes.clear();
        await Promise.all(queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      });
    };

    const scheduleMembershipRefresh = (kind: GroupChatMembershipEventKind) => {
      readEventSignatures.clear();
      lifecycleEventSignatures.clear();
      const queryKeys: readonly (readonly unknown[])[] = [
        ...getGroupChatMembershipQueryKeys(kind, groupId),
        membersKey(groupId),
        currentMemberKey(groupId, userScope),
        groupKey(groupId, userScope),
        groupsKey(userScope),
        ...(kind === "member_joined" || kind === "member_left" || kind === "member_removed" ? [groupChatReadStatusQueryKey(groupId, userScope, tenantScope)] : []),
      ];
      for (const queryKey of queryKeys) pendingRefreshes.set(JSON.stringify(queryKey), queryKey);
      if (refreshScheduled) return;
      refreshScheduled = true;
      void Promise.resolve().then(async () => {
        refreshScheduled = false;
        if (!active) {
          pendingRefreshes.clear();
          return;
        }
        const keys = [...pendingRefreshes.values()];
        pendingRefreshes.clear();
        await Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      });
    };

    const scheduleGroupReadRefresh = (event: GroupChatNormalizedReadEvent) => {
      // Boundary-bearing duplicates are coalesced for this subscription epoch. Membership changes clear the set because recipient counts may change.
      if (!shouldProcessGroupChatReadEvent(readEventSignatures, event.userId, event.readThroughMessageId)) return;
      for (const queryKey of groupChatReadRefreshQueryKeys(groupId, userScope, tenantScope)) pendingRefreshes.set(JSON.stringify(queryKey), queryKey);
      onGroupRead?.(event);
      if (refreshScheduled) return;
      refreshScheduled = true;
      void Promise.resolve().then(async () => {
        refreshScheduled = false;
        if (!active) {
          pendingRefreshes.clear();
          return;
        }
        const keys = [...pendingRefreshes.values()];
        pendingRefreshes.clear();
        await Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      });
    };

    const scheduleGroupLifecycleRefresh = (event: GroupChatLifecycleEvent) => {
      if (!shouldProcessGroupChatLifecycleEvent(lifecycleEventSignatures, event)) return;
      onGroupLifecycleEvent?.(event);
      const lifecycleKeys = getGroupChatLifecycleQueryKeys(groupId, userScope);
      for (const queryKey of lifecycleKeys) pendingRefreshes.set(JSON.stringify(queryKey), queryKey);
      if (refreshScheduled) return;
      refreshScheduled = true;
      void Promise.resolve().then(async () => {
        refreshScheduled = false;
        if (!active) {
          pendingRefreshes.clear();
          return;
        }
        const keys = [...pendingRefreshes.values()];
        pendingRefreshes.clear();
        await Promise.all(keys.map(async (queryKey) => {
          await queryClient.invalidateQueries({ queryKey, refetchType: "none" });
          // React Query cancels an older active refetch before starting this authoritative one.
          await queryClient.refetchQueries({ queryKey, type: "active" });
        }));
      });
    };

    const refreshGroupData = async () => {
      if (!active) return;
      if (reconnectRefreshInFlight) {
        reconnectRefreshQueued = true;
        await reconnectRefreshInFlight;
        return;
      }

      const run = async () => {
        do {
          reconnectRefreshQueued = false;
          if (!active) return;
          readEventSignatures.clear();
          lifecycleEventSignatures.clear();
          await Promise.all(getGroupChatReconnectQueryKeys(groupId, userScope, tenantScope).map((queryKey) =>
            queryKey[1] === "read-status"
              ? queryClient.invalidateQueries({ queryKey, refetchType: "active" })
              : queryClient.refetchQueries({ queryKey, type: "active" }),
          ));
          if (active) {
            onReadStatusRefresh?.();
            onReconnectReadState?.();
          }
        } while (active && reconnectRefreshQueued);
      };

      reconnectRefreshInFlight = run().finally(() => {
        reconnectRefreshInFlight = null;
      });
      await reconnectRefreshInFlight;
    };

    const cleanupController = createGroupChatSocketController({
      enabled,
      socket,
      groupId,
      groupIsActive: detailsReady && isGroupChatRealtimeActiveStatus(groupStatus),
      membershipAuthorized: detailsReady && membershipAuthorized,
      normalizeNewMessage: (payload, expectedGroupId) => {
        const event = normalizeGroupChatSocketEvent("new_message", payload, expectedGroupId);
        return event?.event === "new_message" ? { messageId: event.message.id } : null;
      },
      normalizeGroupEvent: (kind, payload, expectedGroupId) => {
        const event = normalizeGroupChatSocketEvent(kind, payload, expectedGroupId);
        return event && isGroupChatLiveMessageEvent(event) ? event : null;
      },
      normalizeGroupMembershipEvent: (kind, payload, expectedGroupId) => {
        const event = normalizeGroupChatSocketEvent(kind, payload, expectedGroupId);
        return event && isGroupChatMembershipEvent(event) ? event : null;
      },
      normalizeGroupLifecycleEvent: (kind, payload, expectedGroupId) => {
        const event = normalizeGroupChatSocketEvent(kind, payload, expectedGroupId);
        return event && isGroupChatLifecycleEvent(event) ? event : null;
      },
      validateJoinedRoom: (payload, expectedGroupId) => normalizeGroupChatJoinedRoomAcknowledgement(payload, expectedGroupId) !== null,
      normalizeGroupRead: (payload, expectedGroupId) => {
        const event = normalizeGroupChatSocketEvent("group_read", payload, expectedGroupId);
        return event?.event === "group_read" ? { userId: event.user_id, readAt: event.read_at, ...(event.read_through_message_id !== undefined ? { readThroughMessageId: event.read_through_message_id } : {}) } : null;
      },
      onMessage: () => {
        void queryClient.invalidateQueries({ queryKey: messageKey(groupId) });
        void queryClient.invalidateQueries({ queryKey: groupsKey(userScope) });
        void reconcileGroupChatReadState(groupId, markGroupChatRead, (queryKey) => queryClient.invalidateQueries({ queryKey }), userScope, tenantScope).catch(() => undefined);
      },
      onGroupEvent: (event) => scheduleGroupEventRefresh(event.event),
      onGroupMembershipEvent: (event) => {
        scheduleMembershipRefresh(event.event);
        onGroupMembershipEvent?.(event);
      },
      onGroupLifecycleEvent: scheduleGroupLifecycleRefresh,
      onGroupRead: scheduleGroupReadRefresh,
      onReconnect: refreshGroupData,
    });
    return () => {
      active = false;
      reconnectRefreshQueued = false;
      pendingRefreshes.clear();
      readEventSignatures.clear();
      lifecycleEventSignatures.clear();
      cleanupController();
    };
  }, [detailsReady, enabled, groupId, groupStatus, identityScope, membershipAuthorized, onGroupLifecycleEvent, onGroupMembershipEvent, onGroupRead, onReadStatusRefresh, onReconnectReadState, queryClient, realtime?.socket, tenantScope, userScope]);
}
