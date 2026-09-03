"use client";

import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { isRecord, type EventApprovalReview } from "./event-approval-review.types";

export type EventApprovalStatus = "pending_approval" | "needs_revision" | "approved";
export type EventApprovalListItem = Pick<EventApprovalReview, "id" | "enterprise_id" | "enterprise_name" | "title" | "category" | "start_date" | "end_date" | "venue" | "status" | "primary_image">;
export type EventApprovalList = {
  items: EventApprovalListItem[];
  pagination: { total: number; page: number; page_size: number; total_pages: number };
};

export function eventApprovalListQueryKey(status: EventApprovalStatus, page: number, search: string) {
  return ["platform", "event-approval-list", status, page, search] as const;
}

export async function getEventApprovalList(status: EventApprovalStatus, page: number, search: string): Promise<EventApprovalList> {
  const parameters = new URLSearchParams({ status, page: String(page), page_size: "20" });
  if (search) parameters.set("search", search);

  const response = await fetch("/api/v1/events/?" + parameters.toString(), { credentials: "include" });
  if (!response.ok) throw new Error();

  const value = await response.json();
  if (!isRecord(value) || !Array.isArray(value.items) || !isRecord(value.pagination) || typeof value.pagination.total !== "number" || typeof value.pagination.page !== "number" || typeof value.pagination.page_size !== "number" || typeof value.pagination.total_pages !== "number" || !value.items.every((item) => isEventApprovalListItem(item, status))) {
    throw new Error();
  }

  return value as EventApprovalList;
}

function isEventApprovalListItem(value: unknown, status: EventApprovalStatus): value is EventApprovalListItem {
  return isRecord(value) && typeof value.id === "string" && (value.enterprise_id === null || typeof value.enterprise_id === "string") && typeof value.title === "string" && typeof value.category === "string" && value.status === status && (value.primary_image === undefined || value.primary_image === null || typeof value.primary_image === "string");
}

/** Shares approval-list server state between the Platform sidebar and approval workspace. */
export function PlatformApprovalDataProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/** Returns the current aggregate pending Event count; future approval types can be added to this aggregate. */
export function usePendingEventApprovalCount() {
  return useQuery({
    queryKey: eventApprovalListQueryKey("pending_approval", 1, ""),
    queryFn: () => getEventApprovalList("pending_approval", 1, ""),
  });
}
