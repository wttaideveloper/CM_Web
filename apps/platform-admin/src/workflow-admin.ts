import type { WorkflowAdminCapabilities } from "@ihp/workflow-admin";

/** Capabilities supplied to the shared authoring workspaces by the protected Platform routes. */
export const platformWorkflowAdminCapabilities: WorkflowAdminCapabilities = {
  canCreateForms: true,
  canEditForms: true,
  canPublishForms: true,
  canDeleteForms: true,
  canCreateWorkflows: true,
  canEditWorkflows: true,
  canPublishWorkflows: true,
  canDeleteWorkflows: true,
  canViewResponses: true,
};
