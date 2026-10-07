"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { browserWorkflowRequest, createWorkflowNotificationClient, resolveNotificationTarget, type WorkflowNotification } from "@ihp/realtime";

const client = createWorkflowNotificationClient(browserWorkflowRequest);
export const platformWorkflowNotificationsKey = ["platform-workflow-notifications"] as const;
const PLATFORM_NOTIFICATION_PAGE_SIZE = 100;

export function usePlatformWorkflowNotifications() {
  const queryClient = useQueryClient();
  const list = useQuery({
    queryKey: platformWorkflowNotificationsKey,
    queryFn: () => client.list(1, PLATFORM_NOTIFICATION_PAGE_SIZE),
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
  });
  const count = useQuery({
    queryKey: [...platformWorkflowNotificationsKey, "unread"],
    queryFn: () => client.unreadCount(),
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
  });
  const markReadMutation = useMutation({ mutationFn: (id: string) => client.markRead(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: platformWorkflowNotificationsKey }) });
  const markAllReadMutation = useMutation({ mutationFn: () => client.markAllRead(), onSuccess: () => queryClient.invalidateQueries({ queryKey: platformWorkflowNotificationsKey }) });
  return {
    items: list.data?.items ?? [], unreadCount: count.data?.unread_count,
    isLoading: list.isLoading || count.isLoading, error: list.error ?? count.error,
    actionError: markReadMutation.error ?? markAllReadMutation.error,
    unreadCountError: count.error,
    markRead: async (id: string) => { try { await markReadMutation.mutateAsync(id); } catch { /* The header/page exposes actionError without creating an unhandled rejection. */ } },
    markAllRead: async () => { try { await markAllReadMutation.mutateAsync(); } catch { /* The header/page exposes actionError without creating an unhandled rejection. */ } },
    refresh: async () => { await Promise.allSettled([list.refetch(), count.refetch()]); },
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
