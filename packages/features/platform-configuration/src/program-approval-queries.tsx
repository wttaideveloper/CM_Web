"use client";

import { useQuery } from "@tanstack/react-query";

import { isRecord, type ProgramApprovalReview } from "./program-approval-review.types";

export type ProgramApprovalStatus = "pending_approval" | "needs_revision" | "approved";
export type ProgramApprovalListItem = Pick<
  ProgramApprovalReview,
  "id" | "enterprise_id" | "enterprise_name" | "title" | "category" | "delivery_mode" | "price" | "status" | "created_at"
>;
export type ProgramApprovalList = {
  items: ProgramApprovalListItem[];
  pagination: { total: number; page: number; page_size: number; total_pages: number };
};

export function programApprovalListQueryKey(status: ProgramApprovalStatus, page: number, search: string) {
  return ["platform", "program-approval-list", status, page, search] as const;
}

/** Lists Programs in one approval lifecycle state through the documented list endpoint. */
export async function getProgramApprovalList(status: ProgramApprovalStatus, page: number, search: string): Promise<ProgramApprovalList> {
  const parameters = new URLSearchParams({ status, page: String(page), page_size: "20" });
  if (search) parameters.set("search", search);

  const response = await fetch("/api/v1/programs/?" + parameters.toString(), { credentials: "include" });
  if (!response.ok) throw new Error();

  const value = await response.json();
  if (!isRecord(value) || !Array.isArray(value.items) || !isRecord(value.pagination) || typeof value.pagination.total !== "number" || typeof value.pagination.page !== "number" || typeof value.pagination.page_size !== "number" || typeof value.pagination.total_pages !== "number" || !value.items.every((item) => isProgramApprovalListItem(item, status))) {
    throw new Error();
  }

  return value as ProgramApprovalList;
}

function isProgramApprovalListItem(value: unknown, status: ProgramApprovalStatus): value is ProgramApprovalListItem {
  return isRecord(value) && typeof value.id === "string" && (value.enterprise_id === null || typeof value.enterprise_id === "string") && typeof value.title === "string" && typeof value.category === "string" && value.status === status && (value.enterprise_name === undefined || value.enterprise_name === null || typeof value.enterprise_name === "string") && (value.created_at === undefined || value.created_at === null || typeof value.created_at === "string");
}

/** Returns the current aggregate pending Program count; combined with events and trainings for the approval badge. */
export function usePendingProgramApprovalCount() {
  return useQuery({
    queryKey: programApprovalListQueryKey("pending_approval", 1, ""),
    queryFn: () => getProgramApprovalList("pending_approval", 1, ""),
  });
}