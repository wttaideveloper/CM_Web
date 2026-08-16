import { WorkflowsWorkspace } from "@ihp/workflow-admin";

import PlatformAdminShell from "@/components/PlatformAdminShell";
import { platformWorkflowAdminCapabilities } from "@/workflow-admin";

export default function WorkflowBuilderNewPage() {
  return (
    <PlatformAdminShell>
      <WorkflowsWorkspace
        capabilities={platformWorkflowAdminCapabilities}
        eyebrow="Platform authoring"
        title="Workflow Builder"
        description="Compose and publish reusable workflows from backend-eligible published Forms."
        showApiDebug={false}
        showTechnicalGuidance={false}
      />
    </PlatformAdminShell>
  );
}
