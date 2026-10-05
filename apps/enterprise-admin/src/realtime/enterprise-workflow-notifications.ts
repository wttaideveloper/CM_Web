"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authenticatedFetch } from "@ihp/auth";
import {
  createWorkflowNotificationClient,
  type WorkflowNotificationHistoryResponse,
} from "@ihp/realtime";

const MAX_PAGE_SIZE = 100;

async function workflowRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await authenticatedFetch(`/api/v1/users/me${path}`, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body && typeof body === "object" && "detail" in body && typeof body.detail === "string"
      ? body.detail
      : `Workflow notification request failed (HTTP ${response.status}).`;
    throw new Error(detail);
  }
  return body as T;
}
const client = createWorkflowNotificationClient(workflowRequest);

/** Query key shared with realtime-triggered workflow notification refreshes. */
export const enterpriseWorkflowNotificationsKey = ["enterprise-workflow-notifications"] as const;
const enterpriseWorkflowUnreadCountKey = [...enterpriseWorkflowNotificationsKey, "unread"] as const;

/** Loads the authenticated Enterprise Admin notification feed and read actions. */
export function useEnterpriseWorkflowNotifications() {
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: enterpriseWorkflowNotificationsKey,
    queryFn: () => client.list(1, MAX_PAGE_SIZE),
    staleTime: 15_000,
    refetchInterval: 15_000,
  });

  const count = useQuery({
    queryKey: enterpriseWorkflowUnreadCountKey,
    queryFn: () => client.unreadCount(),
    staleTime: 15_000,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });

  const read = useMutation({
    mutationFn: (id: string) => client.markRead(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: enterpriseWorkflowNotificationsKey });
      const previous = queryClient.getQueryData<WorkflowNotificationHistoryResponse>(
        enterpriseWorkflowNotificationsKey,
      );
      queryClient.setQueryData<WorkflowNotificationHistoryResponse>(
        enterpriseWorkflowNotificationsKey,
        (current) =>
          current
            ? {
                ...current,
                items: current.items.map((item) =>
                  item.id === id ? { ...item, is_read: true } : item,
                ),
              }
            : current,
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(enterpriseWorkflowNotificationsKey, context.previous);
      }
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: enterpriseWorkflowNotificationsKey }),
        queryClient.invalidateQueries({ queryKey: enterpriseWorkflowUnreadCountKey }),
      ]);
    },
  });

  const readAll = useMutation({
    mutationFn: () => client.markAllRead(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: enterpriseWorkflowNotificationsKey });
      const previous = queryClient.getQueryData<WorkflowNotificationHistoryResponse>(
        enterpriseWorkflowNotificationsKey,
      );
      queryClient.setQueryData<WorkflowNotificationHistoryResponse>(
        enterpriseWorkflowNotificationsKey,
        (current) =>
          current
            ? {
                ...current,
                items: current.items.map((item) => ({ ...item, is_read: true })),
              }
            : current,
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(enterpriseWorkflowNotificationsKey, context.previous);
      }
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: enterpriseWorkflowNotificationsKey }),
        queryClient.invalidateQueries({ queryKey: enterpriseWorkflowUnreadCountKey }),
      ]);
    },
  });

  return {
    items: list.data?.items ?? [],
    unreadCount: count.data?.unread_count ?? 0,
    isLoading: list.isLoading || count.isLoading,
    error: list.error instanceof Error ? list.error.message : count.error instanceof Error ? count.error.message : null,
    readError: read.error instanceof Error ? read.error.message : null,
    readAllError: readAll.error instanceof Error ? readAll.error.message : null,
    markRead: read.mutateAsync,
    markAllRead: readAll.mutateAsync,
  };
}
