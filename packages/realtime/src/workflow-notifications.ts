export type WorkflowNotification = {
  id: string;
  notification_id: string;
  user_id: string;
  is_read: boolean;
  read_at: string | null;
  delivered_at: string | null;
  title: string;
  message: string;
  notification_type: string;
  category: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type WorkflowNotificationHistoryResponse = {
  items: WorkflowNotification[];
  pagination: { page: number; page_size: number; total: number; total_pages: number };
};

export type WorkflowNotificationClient = {
  list: (page?: number, pageSize?: number) => Promise<WorkflowNotificationHistoryResponse>;
  unreadCount: () => Promise<{ unread_count: number }>;
  markRead: (id: string) => Promise<WorkflowNotification>;
  markAllRead: () => Promise<{ marked_read: number }>;
};

export type WorkflowRequest = <T>(path: string, init?: RequestInit) => Promise<T>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function firstString(record: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    if (typeof record[key] === "string") return record[key] as string;
  }
  return "";
}

function normalizeWorkflowNotification(candidate: unknown): WorkflowNotification | null {
  if (!isRecord(candidate)) return null;
  const id = firstString(candidate, "id", "notification_id");
  if (!id) return null;
  const metadata = isRecord(candidate.metadata)
    ? candidate.metadata
    : isRecord(candidate.data)
      ? candidate.data
      : {};
  const readAt = candidate.read_at;
  const deliveredAt = candidate.delivered_at;
  return {
    id,
    notification_id: firstString(candidate, "notification_id", "id") || id,
    user_id: firstString(candidate, "user_id"),
    is_read: candidate.is_read === true,
    read_at: typeof readAt === "string" ? readAt : null,
    delivered_at: typeof deliveredAt === "string" ? deliveredAt : null,
    title: firstString(candidate, "title"),
    message: firstString(candidate, "message", "body"),
    notification_type: firstString(candidate, "notification_type", "type") || "unknown",
    category: firstString(candidate, "category"),
    metadata,
    created_at: firstString(candidate, "created_at"),
  };
}

function normalizeHistory(response: unknown, page: number, pageSize: number): WorkflowNotificationHistoryResponse {
  const envelope = isRecord(response) && isRecord(response.data) ? response.data : response;
  if (!isRecord(envelope)) throw new Error("Invalid workflow notification history response.");
  const rows = Array.isArray(envelope.items)
    ? envelope.items
    : Array.isArray(envelope.notifications)
      ? envelope.notifications
      : null;
  if (!rows) throw new Error("Invalid workflow notification history response.");

  const pagination = isRecord(envelope.pagination)
    ? envelope.pagination
    : isRecord(response) && isRecord(response.meta) && isRecord(response.meta.pagination)
      ? response.meta.pagination
      : isRecord(response) && isRecord(response.meta)
        ? response.meta
        : {};
  const items = rows
    .map(normalizeWorkflowNotification)
    .filter((item): item is WorkflowNotification => item !== null);

  return {
    items,
    pagination: {
      page: Number(pagination.page) || page,
      page_size: Number(pagination.page_size) || pageSize,
      total: Number(pagination.total) || items.length,
      total_pages: Number(pagination.total_pages) || 0,
    },
  };
}

/** Creates a client for the authenticated workflow notification store. */
export function createWorkflowNotificationClient(request: WorkflowRequest): WorkflowNotificationClient {
  return {
    list: async (page = 1, pageSize = 20) =>
      normalizeHistory(await request<unknown>(`/notifications?page=${page}&page_size=${pageSize}`), page, pageSize),
    unreadCount: () => request("/notifications/unread-count"),
    markRead: (id) => request(`/notifications/${encodeURIComponent(id)}/read`, { method: "PUT", body: "{}" }),
    markAllRead: () => request("/notifications/read-all", { method: "PUT", body: "{}" }),
  };
}

/** Performs a same-origin workflow notification request without exposing credentials. */
export async function browserWorkflowRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/platform-super-admin${path}`, { ...init, credentials: "include", cache: "no-store" });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error("Unable to load workflow notifications.");
  return body as T;
}
