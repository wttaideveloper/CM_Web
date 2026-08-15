import { FormsWorkspace } from "@ihp/workflow-admin";

import { enterpriseWorkflowAdminCapabilities } from "@/workflow-admin";

export default function EnterpriseWorkflowFormsPage() {
  return <FormsWorkspace capabilities={enterpriseWorkflowAdminCapabilities} />;
}
