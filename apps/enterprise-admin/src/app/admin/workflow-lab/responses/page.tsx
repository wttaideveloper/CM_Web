import { ResponsesWorkspace } from "@ihp/workflow-admin";

import { enterpriseWorkflowAdminCapabilities } from "@/workflow-admin";

export default function EnterpriseWorkflowResponsesPage() {
  return <ResponsesWorkspace capabilities={enterpriseWorkflowAdminCapabilities} />;
}
