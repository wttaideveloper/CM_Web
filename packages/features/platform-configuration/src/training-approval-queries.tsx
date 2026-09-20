"use client";

import { useQuery } from "@tanstack/react-query";

import { isRecord, type TrainingApprovalReview } from "./training-approval-review.types";

export type TrainingApprovalStatus = "pending_approval" | "needs_revision" | "approved";
export type TrainingApprovalListItem = Pick<
  TrainingApprovalReview,
  "id" | "enterprise_id" | "enterprise_name" | "title" | "category" | "delivery_mode" | "price" | "currency" | "status" | "created_at"
> & { primary_image?: string | null };
export type TrainingApprovalList = {
  items: TrainingApprovalListItem[];
  pagination: { total: number; page: number; page_size: number; total_pages: number };
};

export function trainingApprovalListQueryKey(status: TrainingApprovalStatus, page: number, search: string) {
  return ["platform", "training-approval-list", status, page, search] as const;
}

/** Platform approval reads go through the bearer-token BFF (Super Admin session), never the
 * marketplace's public list endpoint directly — that endpoint has no auth dependency (it powers
 * the public course catalog), so calling it straight from the browser leaked every tenant's
 * pending/approved/needs-revision Trainings to anyone who opened it, authenticated or not. */
const trainingApprovalsBffBasePath = "/api/platform-super-admin/training-approvals";

/** Lists Trainings in one approval lifecycle state via the Super Admin BFF. */
export async function getTrainingApprovalList(status: TrainingApprovalStatus, page: number, search: string): Promise<TrainingApprovalList> {
  const parameters = new URLSearchParams({ status, page: String(page), page_size: "20" });
  if (search) parameters.set("search", search);

  const response = await fetch(`${trainingApprovalsBffBasePath}/list?${parameters.toString()}`, { credentials: "include" });
  if (!response.ok) throw new Error();

  const value = await response.json();
  if (!isRecord(value) || !Array.isArray(value.items) || !isRecord(value.pagination) || typeof value.pagination.total !== "number" || typeof value.pagination.page !== "number" || typeof value.pagination.page_size !== "number" || typeof value.pagination.total_pages !== "number" || !value.items.every((item) => isTrainingApprovalListItem(item, status))) {
    throw new Error();
  }

  return value as TrainingApprovalList;
}

function isTrainingApprovalListItem(value: unknown, status: TrainingApprovalStatus): value is TrainingApprovalListItem {
  return isRecord(value) && typeof value.id === "string" && (value.enterprise_id === null || typeof value.enterprise_id === "string") && typeof value.title === "string" && typeof value.category === "string" && value.status === status && (value.enterprise_name === undefined || value.enterprise_name === null || typeof value.enterprise_name === "string") && (value.created_at === undefined || value.created_at === null || typeof value.created_at === "string");
}

/** Returns the current aggregate pending Training count; combined with events for the approval badge. */
export function usePendingTrainingApprovalCount() {
  return useQuery({
    queryKey: trainingApprovalListQueryKey("pending_approval", 1, ""),
    queryFn: () => getTrainingApprovalList("pending_approval", 1, ""),
  });
}