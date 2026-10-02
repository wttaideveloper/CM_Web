"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { chatRequestJson } from "@ihp/chat-runtime";
import { createWorkflowNotificationClient } from "@ihp/realtime";
const client = createWorkflowNotificationClient((path, init) => chatRequestJson(`/users/me${path}`, init));
const key = ["enterprise-workflow-notifications"] as const;
export function useEnterpriseWorkflowNotifications() {
  const queryClient = useQueryClient();
  const list = useQuery({ queryKey: key, queryFn: () => client.list(), staleTime: 30_000 });
  const count = useQuery({ queryKey: [...key, "unread"], queryFn: () => client.unreadCount(), staleTime: 30_000 });
  const read = useMutation({ mutationFn: client.markRead, onSuccess: () => queryClient.invalidateQueries({ queryKey: key }) });
  const readAll = useMutation({ mutationFn: client.markAllRead, onSuccess: () => queryClient.invalidateQueries({ queryKey: key }) });
  return { items: list.data?.items ?? [], unreadCount: count.data?.unread_count ?? 0, markRead: read.mutateAsync, markAllRead: readAll.mutateAsync };
}
