export type WorkflowNotification = {
  id: string; notification_id: string; user_id: string; is_read: boolean; read_at: string | null; delivered_at: string | null;
  title: string; message: string; notification_type: string; category: string; metadata: Record<string, unknown>; created_at: string;
};
export type WorkflowNotificationHistoryResponse = { items: WorkflowNotification[]; pagination: { page: number; page_size: number; total: number; total_pages: number } };
export type WorkflowNotificationClient = { list: (page?: number, pageSize?: number) => Promise<WorkflowNotificationHistoryResponse>; unreadCount: () => Promise<{ unread_count: number }>; markRead: (id: string) => Promise<WorkflowNotification>; markAllRead: () => Promise<{ marked_read: number }> };
export type WorkflowRequest = <T>(path: string, init?: RequestInit) => Promise<T>;
/** Creates a client for the authenticated workflow notification store. */
export function createWorkflowNotificationClient(request: WorkflowRequest): WorkflowNotificationClient {
  return { list: (page = 1, pageSize = 20) => request(`/notifications?page=${page}&page_size=${pageSize}`), unreadCount: () => request("/notifications/unread-count"), markRead: (id) => request(`/notifications/${encodeURIComponent(id)}/read`, { method: "PUT", body: "{}" }), markAllRead: () => request("/notifications/read-all", { method: "PUT", body: "{}" }) };
}
/** Performs a same-origin workflow notification request without exposing credentials. */
export async function browserWorkflowRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/platform-super-admin${path}`, { ...init, credentials: "include", cache: "no-store" });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body && typeof body === "object" && "detail" in body && typeof body.detail === "string"
      ? body.detail
      : "Unable to load workflow notifications.";
    throw new Error(detail);
  }
  return body as T;
}
