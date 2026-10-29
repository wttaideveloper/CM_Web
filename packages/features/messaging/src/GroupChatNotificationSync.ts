"use client";

import { useContext, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RealtimeContext, type RealtimeStatus } from "@ihp/realtime";
import { createGroupChatPersonalSocketController, isGroupChatRealtimeEnabled, type GroupChatSocketClient } from "./group-chat/group-chat-socket-controller";
import { isGroupChatCurrentUserRemoval, isGroupChatPersonalEvent, normalizeGroupChatSocketEvent, type GroupChatPersonalEvent } from "./group-chat/group-chat-socket";
import { getGroupChatMessageNotificationGroupId, groupChatInvitationQueryKey, groupChatMembershipRemovalRefreshQueryKey, groupChatPostingRefreshQueryKey } from "./group-chat/group-chat-notification";
import { getGroupChat, GroupChatApiError } from "./group-chat/group-chat.service";
import { isConfirmedGroupChatRemovalStatus } from "./group-chat-models";
import type { GroupChatDetails, GroupChatMember } from "./group-chat/group-chat.types";
import { groupChatReadStatusQueryKey } from "./group-chat/group-chat-read-state";

export { getGroupChatMessageNotificationGroupId, groupChatInvitationQueryKey, groupChatPostingRefreshQueryKey } from "./group-chat/group-chat-notification";

function groupListKey(userScope: string): readonly string[] {
  return ["group-chat", "groups", userScope];
}

function groupDetailsKey(groupId: string, userScope: string): readonly string[] {
  return ["group-chat", "group", groupId, userScope];
}

function currentMemberKey(groupId: string, userScope: string): readonly string[] {
  return ["group-chat", "current-member", groupId, userScope];
}

function privateGroupQueryKeys(groupId: string, userScope: string, tenantScope: string): readonly (readonly unknown[])[] {
  return [
    ["group-chat", "group", groupId, userScope],
    ["group-chat", "current-member", groupId, userScope],
    ["group-chat", "messages", groupId],
    groupChatReadStatusQueryKey(groupId, userScope, tenantScope),
    ["group-chat", "reactions", groupId],
    ["group-chat", "pinned", groupId],
    ["group-chat", "members", groupId],
    ["group-chat", "files", groupId],
    ["group-chat", "search", groupId],
    ["group-chat", "member-role-roster", groupId],
    ["group-chat", "invite-members", groupId],
    ["group-chat", "invite-learners", groupId],
    ["group-chat", "invite-providers", groupId],
  ];
}

export type GroupChatNotificationSyncOptions = {
  userScope: string;
  tenantScope?: string;
  selectedGroupId?: string;
  onPostingRefresh?: (groupId: string, pending: boolean) => void;
};

/** Refreshes authorized Group list queries from socket-delivered Group notifications without joining inactive rooms. */
export function useGroupChatNotificationSync({ userScope, tenantScope = "", selectedGroupId = "", onPostingRefresh }: GroupChatNotificationSyncOptions): void {
  const realtime = useContext(RealtimeContext);
  const queryClient = useQueryClient();
  const initializedRef = useRef(false);
  const scopeKey = `${userScope}:${tenantScope}`;
  const previousScopeRef = useRef(scopeKey);
  const seenNotificationsRef = useRef(new Set<string>());
  const pendingGroupsRef = useRef(new Set<string>());
  const refreshTimerRef = useRef<number | null>(null);
  const previousStatusRef = useRef<RealtimeStatus | null>(null);
  const selectedGroupIdRef = useRef(selectedGroupId);

  useEffect(() => {
    selectedGroupIdRef.current = selectedGroupId;
  }, [selectedGroupId]);

  useEffect(() => {
    if (previousScopeRef.current === scopeKey) return;
    previousScopeRef.current = scopeKey;
    initializedRef.current = false;
    seenNotificationsRef.current.clear();
    pendingGroupsRef.current.clear();
    if (refreshTimerRef.current !== null) window.clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = null;
    previousStatusRef.current = null;
  }, [scopeKey]);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current !== null) window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
      pendingGroupsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!userScope || !realtime) return;
    const notifications = realtime.notifications;
    if (!initializedRef.current) {
      notifications.forEach((notification) => {
        seenNotificationsRef.current.add(`${notification.id}:${notification.received_at ?? notification.created_at ?? ""}`);
        if (notification.source === "socket") {
          const groupId = getGroupChatMessageNotificationGroupId(notification);
          if (groupId) pendingGroupsRef.current.add(groupId);
        }
      });
      initializedRef.current = true;
      if (pendingGroupsRef.current.size === 0) return;
    }

    notifications.forEach((notification) => {
      const notificationKey = `${notification.id}:${notification.received_at ?? notification.created_at ?? ""}`;
      if (seenNotificationsRef.current.has(notificationKey)) return;
      seenNotificationsRef.current.add(notificationKey);
      if (notification.source !== "socket") return;
      const groupId = getGroupChatMessageNotificationGroupId(notification);
      if (groupId) pendingGroupsRef.current.add(groupId);
    });

    if (pendingGroupsRef.current.size === 0 || refreshTimerRef.current !== null) return;
    refreshTimerRef.current = window.setTimeout(() => {
      refreshTimerRef.current = null;
      pendingGroupsRef.current.clear();
      void queryClient.invalidateQueries({ queryKey: groupListKey(userScope) });
    }, 100);
  }, [queryClient, realtime, realtime?.notifications, userScope]);

  useEffect(() => {
    if (!userScope || !realtime) return;
    const previousStatus = previousStatusRef.current;
    previousStatusRef.current = realtime.status;
    if (previousStatus && previousStatus !== "connected" && realtime.status === "connected") {
      void queryClient.invalidateQueries({ queryKey: groupListKey(userScope) });
    }
  }, [queryClient, realtime, realtime?.status, userScope]);

  useEffect(() => {
    const socket = realtime?.socket as GroupChatSocketClient | null;
    if (!userScope || !socket || !isGroupChatRealtimeEnabled()) return undefined;

    let active = true;
    let refreshScheduled = false;
    let invitationPending = false;
    const pendingPostingGroups = new Map<string, "posting_muted" | "posting_unmuted">();

    const refreshGroupQueries = async (groupIds: readonly string[]) => {
      const groupListPromise = queryClient.invalidateQueries({ queryKey: groupListKey(userScope), refetchType: "active" });
      const groupPromises = groupIds.flatMap((groupId) => [
        queryClient.invalidateQueries({ queryKey: groupDetailsKey(groupId, userScope), refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: currentMemberKey(groupId, userScope), refetchType: "active" }),
      ]);
      await Promise.all([groupListPromise, ...groupPromises]);
    };

    const reconcileInactiveRemoval = async (groupId: string) => {
      try {
        await queryClient.fetchQuery({
          queryKey: groupDetailsKey(groupId, userScope),
          queryFn: ({ signal }) => getGroupChat(groupId, signal),
          staleTime: 0,
          retry: false,
        });
      } catch (error: unknown) {
        if (!(error instanceof GroupChatApiError) || !isConfirmedGroupChatRemovalStatus(error.status)) return;
        const keys = privateGroupQueryKeys(groupId, userScope, tenantScope);
        await Promise.all(keys.map((queryKey) => queryClient.cancelQueries({ queryKey })));
        keys.forEach((queryKey) => queryClient.removeQueries({ queryKey }));
      } finally {
        await queryClient.invalidateQueries({ queryKey: groupListKey(userScope), refetchType: "active" });
      }
    };

    const flushPersonalRefreshes = async () => {
      refreshScheduled = false;
      if (!active) return;
      const postingGroups = [...pendingPostingGroups.entries()];
      pendingPostingGroups.clear();
      const shouldRefreshInvitations = invitationPending;
      invitationPending = false;
      if (shouldRefreshInvitations) {
        await queryClient.invalidateQueries({ queryKey: groupChatInvitationQueryKey(userScope, tenantScope), refetchType: "active" });
      }
      await refreshGroupQueries(postingGroups.map(([groupId]) => groupId));
      if (!active) return;
      postingGroups.forEach(([groupId, eventKind]) => {
        const detailsState = queryClient.getQueryState(groupDetailsKey(groupId, userScope));
        const details = queryClient.getQueryData<GroupChatDetails>(groupDetailsKey(groupId, userScope));
        const members = queryClient.getQueryData<GroupChatMember[]>(currentMemberKey(groupId, userScope));
        const currentMember = members?.find((member) => member.is_current_user);
        const permissionConfirmed = detailsState?.status === "success"
          && details !== undefined
          && (eventKind === "posting_muted"
            ? currentMember?.posting_muted === true || details.permissions.can_post === false
            : currentMember?.posting_muted !== true && details.permissions.can_post === true);
        if (permissionConfirmed) {
          queryClient.setQueryData(groupChatPostingRefreshQueryKey(groupId, userScope, tenantScope), false);
          if (onPostingRefresh && groupId.toLowerCase() === selectedGroupIdRef.current.trim().toLowerCase()) onPostingRefresh(groupId, false);
        }
      });
    };

    const scheduleRefresh = () => {
      if (refreshScheduled) return;
      refreshScheduled = true;
      queueMicrotask(() => { void flushPersonalRefreshes(); });
    };

    const handlePersonalEvent = (event: GroupChatPersonalEvent) => {
      if (event.event === "group_invitation") {
        invitationPending = true;
        scheduleRefresh();
        return;
      }
      if (event.event === "member_removed") {
        if (!isGroupChatCurrentUserRemoval(event, userScope)) return;
        const wasSelected = event.conversation_id.toLowerCase() === selectedGroupIdRef.current.trim().toLowerCase();
        if (wasSelected) {
          // The selected workspace owns immediate suspension and membership revalidation.
          queryClient.setQueryData(groupChatMembershipRemovalRefreshQueryKey(event.conversation_id, userScope, tenantScope), true);
          void refreshGroupQueries([event.conversation_id]);
        } else {
          // Inactive Groups require an authoritative access check before private caches are removed.
          void reconcileInactiveRemoval(event.conversation_id);
        }
        return;
      }
      const wasSelected = event.conversation_id.toLowerCase() === selectedGroupIdRef.current.trim().toLowerCase();
      queryClient.setQueryData(groupChatPostingRefreshQueryKey(event.conversation_id, userScope, tenantScope), true);
      if (wasSelected) onPostingRefresh?.(event.conversation_id, true);
      pendingPostingGroups.set(event.conversation_id, event.event);
      scheduleRefresh();
    };

    const cleanup = createGroupChatPersonalSocketController({
      enabled: true,
      socket,
      normalizePersonalEvent: (kind, payload) => {
        const event = normalizeGroupChatSocketEvent(kind, payload);
        return event && isGroupChatPersonalEvent(event) ? event : null;
      },
      onPersonalEvent: handlePersonalEvent,
      onReconnect: async () => {
        if (!active) return;
        await queryClient.invalidateQueries({ queryKey: groupChatInvitationQueryKey(userScope, tenantScope), refetchType: "active" });
        if (selectedGroupIdRef.current.trim()) await refreshGroupQueries([selectedGroupIdRef.current]);
      },
    });

    return () => {
      active = false;
      cleanup();
    };
  }, [onPostingRefresh, queryClient, realtime?.socket, tenantScope, userScope]);
}
