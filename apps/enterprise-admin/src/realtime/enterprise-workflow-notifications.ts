"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authenticatedFetch } from "@ihp/auth";
import { useCurrentEnterprise, useTenant } from "@ihp/enterprise-runtime";
import {
  getTrainingAdminNotes,
  listTrainingEnrolments,
  listTrainings,
  type TrainingListItem,
} from "@ihp/enterprise-trainings";
import { createWorkflowNotificationClient, type WorkflowNotification } from "@ihp/realtime";

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

/** In-memory set of read synthetic Training notification IDs (compliant with CODING_STANDARDS.md). */
const readTrainingNotificationIds = new Set<string>();

function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function extractAdminNote(raw: unknown): { note: string | null; reviewedAt: string | null } {
  if (typeof raw === "string") {
    return { note: raw.trim() || null, reviewedAt: null };
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { note: null, reviewedAt: null };
  }
  const record = raw as Record<string, unknown>;
  const note =
    [
      record.last_admin_notes,
      record.note,
      record.message,
      record.reason,
      record.comment,
      record.notes,
      record.admin_note,
      record.rejection_reason,
    ].find((v): v is string => typeof v === "string" && v.trim().length > 0)?.trim() ?? null;
  const reviewedAt =
    readNonEmptyString(record.created_at) ??
    readNonEmptyString(record.performed_at) ??
    readNonEmptyString(record.updated_at);
  return { note, reviewedAt };
}

async function buildTrainingWorkflowNotifications(
  trainings: readonly TrainingListItem[],
): Promise<WorkflowNotification[]> {
  const notifications: WorkflowNotification[] = [];

  await Promise.all(
    trainings.map(async (training) => {
      const baseTimestamp = training.updated_at ?? training.created_at ?? new Date().toISOString();

      if (training.status === "approved" || training.status === "published") {
        const id = `training-moderation:${training.id}:approved:${training.updated_at ?? ""}`;
        notifications.push({
          id,
          notification_id: id,
          user_id: "",
          is_read: readTrainingNotificationIds.has(id),
          read_at: null,
          delivered_at: baseTimestamp,
          title: `Training approved: ${training.title}`,
          message: `Super Admin approved "${training.title}".`,
          notification_type: "training_approved",
          category: "training",
          metadata: {
            training_id: training.id,
            entity_type: "training",
            entity_id: training.id,
            training_title: training.title,
            status: training.status,
          },
          created_at: baseTimestamp,
        });
      } else if (training.status === "rejected" || training.status === "needs_revision") {
        const rawNotes = await getTrainingAdminNotes(training.id).catch(() => null);
        const { note, reviewedAt } = extractAdminNote(rawNotes);
        const isRejected = training.status === "rejected";
        const id = `training-moderation:${training.id}:${training.status}:${reviewedAt ?? training.updated_at ?? ""}`;
        notifications.push({
          id,
          notification_id: id,
          user_id: "",
          is_read: readTrainingNotificationIds.has(id),
          read_at: null,
          delivered_at: reviewedAt ?? baseTimestamp,
          title: isRejected
            ? `Training rejected: ${training.title}`
            : `Changes requested: ${training.title}`,
          message: isRejected
            ? `Super Admin rejected "${training.title}".`
            : `Super Admin requested changes for "${training.title}".`,
          notification_type: isRejected ? "training_rejected" : "training_changes_requested",
          category: "training",
          metadata: {
            training_id: training.id,
            entity_type: "training",
            entity_id: training.id,
            training_title: training.title,
            status: training.status,
            ...(note ? { reason: note } : {}),
          },
          created_at: reviewedAt ?? baseTimestamp,
        });
      }

      const shouldCheckEnrolments =
        (typeof training.enrolled_count === "number" && training.enrolled_count > 0) ||
        training.status === "published" ||
        training.status === "approved";

      if (shouldCheckEnrolments) {
        const enrolments = await listTrainingEnrolments(training.id).catch(() => []);
        enrolments.forEach((rawEnrolment, index) => {
          if (!rawEnrolment || typeof rawEnrolment !== "object" || Array.isArray(rawEnrolment)) return;
          const record = rawEnrolment as Record<string, unknown>;
          const enrolId =
            readNonEmptyString(record.id) ??
            readNonEmptyString(record.enrolment_id) ??
            readNonEmptyString(record.enrollment_id) ??
            String(index);
          const participantName =
            readNonEmptyString(record.participant_name) ??
            readNonEmptyString(record.learner_name) ??
            readNonEmptyString(record.user_name) ??
            readNonEmptyString(record.full_name) ??
            readNonEmptyString(record.name) ??
            "Mobile Learner";
          const participantEmail =
            readNonEmptyString(record.participant_email) ??
            readNonEmptyString(record.learner_email) ??
            readNonEmptyString(record.user_email) ??
            readNonEmptyString(record.email);
          const rawStatus =
            readNonEmptyString(record.status) ??
            readNonEmptyString(record.enrolment_status) ??
            readNonEmptyString(record.approval_status);
          const enrolledAt =
            readNonEmptyString(record.enrolled_at) ??
            readNonEmptyString(record.created_at) ??
            baseTimestamp;
          const id = `training-enrolment:${training.id}:${enrolId}`;
          const learnerDetails = participantEmail ? `${participantName} (${participantEmail})` : participantName;

          notifications.push({
            id,
            notification_id: id,
            user_id: "",
            is_read: readTrainingNotificationIds.has(id),
            read_at: null,
            delivered_at: enrolledAt,
            title: `New enrolment: ${training.title}`,
            message: `${learnerDetails} enrolled in "${training.title}".`,
            notification_type: "training_enrolled",
            category: "training",
            metadata: {
              training_id: training.id,
              entity_type: "training",
              entity_id: training.id,
              training_title: training.title,
              enrollment_id: enrolId,
              enrolment_id: enrolId,
              participant_name: participantName,
              ...(participantEmail ? { participant_email: participantEmail } : {}),
              ...(rawStatus ? { status: rawStatus } : {}),
            },
            created_at: enrolledAt,
          });
        });
      }
    }),
  );

  return notifications;
}

/** Loads the authenticated Enterprise Admin notification feed and read actions. */
export function useEnterpriseWorkflowNotifications() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  const { enterpriseId } = useCurrentEnterprise();

  const list = useQuery({
    queryKey: enterpriseWorkflowNotificationsKey,
    queryFn: () => client.list(),
    staleTime: 15_000,
    refetchInterval: 15_000,
  });

  const trainingNotifications = useQuery({
    queryKey: [...enterpriseWorkflowNotificationsKey, "trainings", tenantId ?? "", enterpriseId ?? ""],
    queryFn: async () => {
      const response = await listTrainings({
        tenant_id: tenantId ?? undefined,
        enterprise_id: enterpriseId ?? undefined,
        page: 1,
        page_size: 20,
      }).catch(() => ({ items: [] as TrainingListItem[] }));
      return buildTrainingWorkflowNotifications(response.items);
    },
    staleTime: 15_000,
    refetchInterval: 15_000,
  });

  const mergedItems = useMemo(() => {
    const backendItems = list.data?.items ?? [];
    const syntheticItems = trainingNotifications.data ?? [];
    const seenKeys = new Set<string>();

    for (const item of backendItems) {
      const trainingId =
        readNonEmptyString(item.metadata?.training_id) ??
        readNonEmptyString(item.metadata?.trainingId) ??
        (item.metadata?.entity_type === "training" ? readNonEmptyString(item.metadata?.entity_id) : null);
      const enrolmentId =
        readNonEmptyString(item.metadata?.enrolment_id) ??
        readNonEmptyString(item.metadata?.enrollment_id);
      if (trainingId) {
        seenKeys.add(`${item.notification_type}:${trainingId}:${enrolmentId ?? ""}`);
      }
    }

    const combined: WorkflowNotification[] = [...backendItems];
    for (const item of syntheticItems) {
      const trainingId = readNonEmptyString(item.metadata.training_id) ?? "";
      const enrolmentId = readNonEmptyString(item.metadata.enrolment_id) ?? "";
      const dedupeKey = `${item.notification_type}:${trainingId}:${enrolmentId}`;
      if (!seenKeys.has(dedupeKey)) {
        seenKeys.add(dedupeKey);
        combined.push({
          ...item,
          is_read: item.is_read || readTrainingNotificationIds.has(item.id),
        });
      }
    }

    return combined.sort((left, right) => {
      const leftTime = Date.parse(left.created_at ?? "");
      const rightTime = Date.parse(right.created_at ?? "");
      if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) {
        return rightTime - leftTime;
      }
      return 0;
    });
  }, [list.data?.items, trainingNotifications.data]);

  const unreadCount = useMemo(
    () => mergedItems.filter((item) => !item.is_read).length,
    [mergedItems],
  );

  const read = useMutation({
    mutationFn: async (id: string) => {
      if (id.startsWith("training-")) {
        readTrainingNotificationIds.add(id);
        return;
      }
      await client.markRead(id).catch(() => undefined);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: enterpriseWorkflowNotificationsKey }),
  });

  const readAll = useMutation({
    mutationFn: async () => {
      for (const item of mergedItems) {
        if (item.id.startsWith("training-")) {
          readTrainingNotificationIds.add(item.id);
        }
      }
      await client.markAllRead().catch(() => ({ marked_read: 0 }));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: enterpriseWorkflowNotificationsKey }),
  });

  return {
    items: mergedItems,
    unreadCount,
    isLoading: list.isLoading || trainingNotifications.isLoading,
    error: list.error ?? trainingNotifications.error,
    markRead: read.mutateAsync,
    markAllRead: readAll.mutateAsync,
  };
}
