"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { browserWorkflowRequest, createWorkflowNotificationClient, resolveNotificationTarget, type WorkflowNotification } from "@ihp/realtime";

const client = createWorkflowNotificationClient(browserWorkflowRequest);
export const platformWorkflowNotificationsKey = ["platform-workflow-notifications"] as const;

export function usePlatformWorkflowNotifications() {
  const queryClient = useQueryClient();
  const list = useQuery({ queryKey: platformWorkflowNotificationsKey, queryFn: () => client.list(), staleTime: 30_000, refetchInterval: 30_000, refetchIntervalInBackground: false });
  const count = useQuery({ queryKey: [...platformWorkflowNotificationsKey, "unread"], queryFn: () => client.unreadCount(), staleTime: 30_000, refetchInterval: 30_000, refetchIntervalInBackground: false });
  const markRead = useMutation({ mutationFn: (id: string) => client.markRead(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: platformWorkflowNotificationsKey }) });
  const markAllRead = useMutation({ mutationFn: () => client.markAllRead(), onSuccess: () => queryClient.invalidateQueries({ queryKey: platformWorkflowNotificationsKey }) });
  return {
    items: list.data?.items ?? [], unreadCount: count.data?.unread_count ?? 0,
    isLoading: list.isLoading || count.isLoading, error: list.error ?? count.error,
    markRead: markRead.mutateAsync, markAllRead: markAllRead.mutateAsync,
    refresh: () => Promise.all([list.refetch(), count.refetch()]).then(() => undefined),
  };
}

/** Resolves a workflow notification to the Platform screen that handles it. */
export function workflowNotificationTarget(item: WorkflowNotification): string | null {
  return resolveNotificationTarget({
    notification_type: item.notification_type,
    category: item.category,
    metadata: item.metadata,
    data: item.metadata,
  }, "platform");
}
