/** Stable query keys for the shared Forms and Workflow API resources. */
export const workflowQueryKeys = {
  forms: (filters?: { publishedOnly?: boolean; forPicker?: boolean }) =>
    ["workflow", "forms", filters?.publishedOnly === true, filters?.forPicker === true] as const,
  form: (formId: string) => ["workflow", "forms", formId] as const,
  formVersions: (formId: string) => ["workflow", "forms", formId, "versions"] as const,
  formVersion: (formId: string, version: number) =>
    ["workflow", "forms", formId, "versions", version] as const,
  workflows: () => ["workflow", "workflows"] as const,
  workflow: (workflowId: string) => ["workflow", "workflows", workflowId] as const,
  workflowVersions: (workflowId: string) => ["workflow", "workflows", workflowId, "versions"] as const,
  workflowVersion: (workflowId: string, version: number) =>
    ["workflow", "workflows", workflowId, "versions", version] as const,
  responses: (workflowId: string, status?: string) =>
    ["workflow", "workflows", workflowId, "responses", status ?? "all"] as const,
  answers: (workflowId: string, sessionId?: string) =>
    ["workflow", "workflows", workflowId, "answers", sessionId ?? "all"] as const,
  journey: (sessionId: string) => ["workflow", "sessions", sessionId, "journey"] as const,
};
