import { AuthProvider } from "@ihp/auth";
import { WorkflowAdminProvider } from "@ihp/workflow-admin";
import type { ReactNode } from "react";

import PlatformBuilderAuthGate from "@/components/PlatformBuilderAuthGate";

/** Mounts Web Auth only for the temporary Platform builder routes. */
export default function ProtectedBuildersLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <WorkflowAdminProvider>
        <PlatformBuilderAuthGate>{children}</PlatformBuilderAuthGate>
      </WorkflowAdminProvider>
    </AuthProvider>
  );
}
