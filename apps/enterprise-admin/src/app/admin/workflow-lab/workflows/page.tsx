import { WorkflowsWorkspace } from "@ihp/workflow-admin";

import { enterpriseWorkflowAdminCapabilities } from "@/workflow-admin";

export default function EnterpriseWorkflowWorkflowsPage() {
  return <WorkflowsWorkspace capabilities={enterpriseWorkflowAdminCapabilities} />;
}
