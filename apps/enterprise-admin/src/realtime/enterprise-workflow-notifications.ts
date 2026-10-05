"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authenticatedFetch } from "@ihp/auth";
import { createWorkflowNotificationClient } from "@ihp/realtime";

async function workflowRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await authenticatedFetch(`/api/v1/users/me${path}`, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body && typeof body === "object" && "detail" in body && typeof body.detail === "string" ? body.detail : `Workflow notification request failed (HTTP ${response.status}).`;
    throw new Error(detail);
  }
  return body as T;
}

const client = createWorkflowNotificationClient(workflowRequest);
const key = ["enterprise-workflow-notifications"] as const;
export function useEnterpriseWorkflowNotifications() {
  const queryClient = useQueryClient();
  const list = useQuery({ queryKey: key, queryFn: () => client.list(), staleTime: 30_000 });
  const count = useQuery({ queryKey: [...key, "unread"], queryFn: () => client.unreadCount(), staleTime: 30_000 });
  const read = useMutation({ mutationFn: client.markRead, onSuccess: () => queryClient.invalidateQueries({ queryKey: key }) });
  const readAll = useMutation({ mutationFn: client.markAllRead, onSuccess: () => queryClient.invalidateQueries({ queryKey: key }) });
  return { items: list.data?.items ?? [], unreadCount: count.data?.unread_count ?? 0, isLoading: list.isLoading || count.isLoading, error: list.error ?? count.error, markRead: read.mutateAsync, markAllRead: readAll.mutateAsync };
}
