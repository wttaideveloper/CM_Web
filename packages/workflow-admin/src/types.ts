/** Host-controlled abilities for the reusable Forms and Workflow workspace. */
export type WorkflowAdminCapabilities = {
  canCreateForms: boolean;
  canEditForms: boolean;
  canPublishForms: boolean;
  canDeleteForms: boolean;
  canCreateWorkflows: boolean;
  canEditWorkflows: boolean;
  canPublishWorkflows: boolean;
  canDeleteWorkflows: boolean;
  canViewResponses: boolean;
};

/** Links supplied by a host route without coupling the workspace to that host's navigation. */
export type WorkflowAdminLinks = {
  home: string;
  forms: string;
  workflows: string;
  responses: string;
};
