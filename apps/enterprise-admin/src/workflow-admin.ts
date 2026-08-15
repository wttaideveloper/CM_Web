import type { WorkflowAdminCapabilities, WorkflowAdminLinks } from "@ihp/workflow-admin";

/** Temporary integration-test capabilities for the Enterprise Admin host. */
export const enterpriseWorkflowAdminCapabilities: WorkflowAdminCapabilities = {
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

/** Temporary host links passed to the reusable Workflow administration workspace. */
export const enterpriseWorkflowAdminLinks: WorkflowAdminLinks = {
  home: "/admin/workflow-lab",
  forms: "/admin/workflow-lab/forms",
  workflows: "/admin/workflow-lab/workflows",
  responses: "/admin/workflow-lab/responses",
};
