import { WorkflowAdminWorkspace } from "@ihp/workflow-admin";

import { enterpriseWorkflowAdminCapabilities, enterpriseWorkflowAdminLinks } from "@/workflow-admin";

export default function EnterpriseWorkflowLabPage() {
  return <WorkflowAdminWorkspace capabilities={enterpriseWorkflowAdminCapabilities} links={enterpriseWorkflowAdminLinks} />;
}
