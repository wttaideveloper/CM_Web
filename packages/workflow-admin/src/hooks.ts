"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useSyncExternalStore } from "react";
import {
  createWorkflow,
  createWorkflowForm,
  deleteWorkflow,
  deleteWorkflowForm,
  getLatestWorkflowApiDebugEntry,
  getWorkflow,
  getWorkflowForm,
  getWorkflowFormVersion,
  getWorkflowJourney,
  getWorkflowVersion,
  listWorkflowAnswers,
  listWorkflowFormVersions,
  listWorkflowForms,
  listWorkflowResponses,
  listWorkflowVersions,
  listWorkflows,
  publishWorkflow,
  publishWorkflowForm,
  subscribeToWorkflowApiDebug,
  updateWorkflow,
  updateWorkflowForm,
  workflowQueryKeys,
  type CreateWorkflowFormInput,
  type CreateWorkflowInput,
  type UpdateWorkflowFormInput,
  type UpdateWorkflowInput,
} from "@ihp/workflow-runtime";

const STALE_TIME_MS = 30_000;

/** Loads the backend-authoritative Forms library. */
export function useWorkflowForms(filters?: { publishedOnly?: boolean; forPicker?: boolean }) {
  return useQuery({ queryKey: workflowQueryKeys.forms(filters), queryFn: () => listWorkflowForms(filters), staleTime: STALE_TIME_MS, retry: 1 });
}

/** Loads a selected form. */
export function useWorkflowForm(formId: string | null) {
  return useQuery({ queryKey: workflowQueryKeys.form(formId ?? "unselected"), queryFn: () => getWorkflowForm(formId ?? ""), enabled: Boolean(formId), staleTime: STALE_TIME_MS, retry: 1 });
}

/** Loads form publish snapshots only when a form is selected. */
export function useWorkflowFormVersions(formId: string | null) {
  return useQuery({ queryKey: workflowQueryKeys.formVersions(formId ?? "unselected"), queryFn: () => listWorkflowFormVersions(formId ?? ""), enabled: Boolean(formId), staleTime: STALE_TIME_MS, retry: 1 });
}

/** Loads one read-only form version on demand. */
export function useWorkflowFormVersion(formId: string | null, version: number | null) {
  return useQuery({ queryKey: workflowQueryKeys.formVersion(formId ?? "unselected", version ?? 0), queryFn: () => getWorkflowFormVersion(formId ?? "", version ?? 0), enabled: Boolean(formId && version !== null), staleTime: STALE_TIME_MS, retry: 1 });
}

/** Provides form mutations and invalidates only Form-related queries. */
export function useWorkflowFormMutations() {
  const queryClient = useQueryClient();
  const invalidateForms = useCallback(() => queryClient.invalidateQueries({ queryKey: ["workflow", "forms"] }), [queryClient]);
  return {
    create: useMutation({ mutationFn: (input: CreateWorkflowFormInput) => createWorkflowForm(input), onSuccess: invalidateForms }),
    update: useMutation({ mutationFn: ({ formId, input }: { formId: string; input: UpdateWorkflowFormInput }) => updateWorkflowForm(formId, input), onSuccess: invalidateForms }),
    publish: useMutation({ mutationFn: publishWorkflowForm, onSuccess: invalidateForms }),
    remove: useMutation({ mutationFn: deleteWorkflowForm, onSuccess: invalidateForms }),
  };
}

/** Loads the Workflow library. */
export function useWorkflows() {
  return useQuery({ queryKey: workflowQueryKeys.workflows(), queryFn: listWorkflows, staleTime: STALE_TIME_MS, retry: 1 });
}

/** Loads a selected workflow. */
export function useWorkflow(workflowId: string | null) {
  return useQuery({ queryKey: workflowQueryKeys.workflow(workflowId ?? "unselected"), queryFn: () => getWorkflow(workflowId ?? ""), enabled: Boolean(workflowId), staleTime: STALE_TIME_MS, retry: 1 });
}

/** Loads published workflow snapshots for a selected workflow. */
export function useWorkflowVersions(workflowId: string | null) {
  return useQuery({ queryKey: workflowQueryKeys.workflowVersions(workflowId ?? "unselected"), queryFn: () => listWorkflowVersions(workflowId ?? ""), enabled: Boolean(workflowId), staleTime: STALE_TIME_MS, retry: 1 });
}

/** Loads a selected read-only workflow snapshot. */
export function useWorkflowVersion(workflowId: string | null, version: number | null) {
  return useQuery({ queryKey: workflowQueryKeys.workflowVersion(workflowId ?? "unselected", version ?? 0), queryFn: () => getWorkflowVersion(workflowId ?? "", version ?? 0), enabled: Boolean(workflowId && version !== null), staleTime: STALE_TIME_MS, retry: 1 });
}

/** Provides workflow mutations and invalidates only Workflow-related queries. */
export function useWorkflowMutations() {
  const queryClient = useQueryClient();
  const invalidateWorkflows = useCallback(() => queryClient.invalidateQueries({ queryKey: ["workflow", "workflows"] }), [queryClient]);
  return {
    create: useMutation({ mutationFn: (input: CreateWorkflowInput) => createWorkflow(input), onSuccess: invalidateWorkflows }),
    update: useMutation({ mutationFn: ({ workflowId, input }: { workflowId: string; input: UpdateWorkflowInput }) => updateWorkflow(workflowId, input), onSuccess: invalidateWorkflows }),
    publish: useMutation({ mutationFn: ({ workflowId, input }: { workflowId: string; input?: UpdateWorkflowInput }) => publishWorkflow(workflowId, input), onSuccess: invalidateWorkflows }),
    remove: useMutation({ mutationFn: deleteWorkflow, onSuccess: invalidateWorkflows }),
  };
}

/** Loads response rows for a selected workflow and backend status filter. */
export function useWorkflowResponses(workflowId: string | null, status?: "completed" | "in_progress") {
  return useQuery({ queryKey: workflowQueryKeys.responses(workflowId ?? "unselected", status), queryFn: () => listWorkflowResponses(workflowId ?? "", status), enabled: Boolean(workflowId), staleTime: STALE_TIME_MS, retry: 1 });
}

/** Loads grouped journey data for a selected workflow session. */
export function useWorkflowJourney(sessionId: string | null) {
  return useQuery({ queryKey: workflowQueryKeys.journey(sessionId ?? "unselected"), queryFn: () => getWorkflowJourney(sessionId ?? ""), enabled: Boolean(sessionId), staleTime: STALE_TIME_MS, retry: 1 });
}

/** Loads workflow answers, optionally scoped to the selected session. */
export function useWorkflowAnswers(workflowId: string | null, sessionId?: string | null) {
  return useQuery({ queryKey: workflowQueryKeys.answers(workflowId ?? "unselected", sessionId ?? undefined), queryFn: () => listWorkflowAnswers(workflowId ?? "", sessionId ?? undefined), enabled: Boolean(workflowId), staleTime: STALE_TIME_MS, retry: 1 });
}

/** Returns the latest redacted API diagnostic entry without coupling runtime transport to React. */
export function useWorkflowApiDebug() {
  return useSyncExternalStore(subscribeToWorkflowApiDebug, getLatestWorkflowApiDebugEntry, () => null);
}
