export type PendingEbookItem = {
  training_id: string;
  training_title: string;
  section_id: string;
  lesson_id: string;
  lesson_title: string;
  version: number;
  page_count: number;
  submitted_at: string;
  submitted_by: { id: string; name: string };
};

export type PendingEbookQueue = {
  items: PendingEbookItem[];
  total: number;
  page: number;
  page_size: number;
};

export type EbookReviewDecision =
  | { action: "approve"; publish: boolean; note?: string }
  | { action: "request_changes"; note: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPendingEbookItem(value: unknown): value is PendingEbookItem {
  return isRecord(value)
    && typeof value.training_id === "string"
    && typeof value.training_title === "string"
    && typeof value.section_id === "string"
    && typeof value.lesson_id === "string"
    && typeof value.lesson_title === "string"
    && typeof value.version === "number"
    && typeof value.page_count === "number"
    && typeof value.submitted_at === "string"
    && isRecord(value.submitted_by)
    && typeof value.submitted_by.id === "string"
    && typeof value.submitted_by.name === "string";
}

async function parseResponse(response: Response): Promise<unknown> {
  const value = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    const detail = isRecord(value) ? value.detail : null;
    const nestedDetail = isRecord(detail) ? detail : null;
    const message = typeof detail === "string"
      ? detail
      : nestedDetail && typeof nestedDetail.message === "string"
        ? nestedDetail.message
        : "The eBook approval request could not be completed.";
    throw new Error(message);
  }
  return value;
}

export async function getPendingEbooks(page: number, pageSize = 20): Promise<PendingEbookQueue> {
  const query = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  const response = await fetch(`/api/platform-super-admin/ebook-approvals?${query.toString()}`, { credentials: "include", cache: "no-store" });
  const responseValue = await parseResponse(response);
  const value = isRecord(responseValue) && isRecord(responseValue.data) ? responseValue.data : responseValue;
  if (!isRecord(value) || !Array.isArray(value.items) || !value.items.every(isPendingEbookItem) || typeof value.total !== "number" || typeof value.page !== "number" || typeof value.page_size !== "number") {
    throw new Error("The eBook approval queue returned an invalid response.");
  }
  return value as PendingEbookQueue;
}

export async function getEbookApprovalReview(trainingId: string, sectionId: string, lessonId: string): Promise<Record<string, unknown>> {
  const path = [trainingId, sectionId, lessonId].map(encodeURIComponent).join("/");
  const response = await fetch(`/api/platform-super-admin/ebook-approvals/${path}?include_drafts=true`, { credentials: "include", cache: "no-store" });
  const responseValue = await parseResponse(response);
  const value = isRecord(responseValue) && isRecord(responseValue.data) ? responseValue.data : responseValue;
  if (!isRecord(value)) throw new Error("The eBook review returned an invalid response.");
  return value;
}

export async function reviewEbook(trainingId: string, sectionId: string, lessonId: string, decision: EbookReviewDecision): Promise<unknown> {
  const path = [trainingId, sectionId, lessonId].map(encodeURIComponent).join("/");
  const response = await fetch(`/api/platform-super-admin/ebook-approvals/${path}/review`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(decision),
  });
  return parseResponse(response);
}
