import { FormsWorkspace } from "@ihp/workflow-admin";

import PlatformAdminShell from "@/components/PlatformAdminShell";
import { platformWorkflowAdminCapabilities } from "@/workflow-admin";

export default function FormBuilderNewPage() {
  return (
    <PlatformAdminShell>
      <FormsWorkspace
        capabilities={platformWorkflowAdminCapabilities}
        eyebrow="Platform authoring"
        title="Form Builder"
        description="Create, publish, and maintain reusable Forms for Platform workflows."
        showApiDebug={false}
        showMediaTools={false}
        showTechnicalGuidance={false}
        showRawJson={false}
        versionDetailPresentation="preview"
      />
    </PlatformAdminShell>
  );
}
