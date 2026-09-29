import PlatformAdminShell from "@/components/PlatformAdminShell";
import { PlatformAccountScreen } from "@/components/PlatformAccountScreen";
import PlatformBuilderAuthGate from "@/components/PlatformBuilderAuthGate";

/** Hosts the authenticated Super Admin account settings page. */
export default function PlatformAccountSettingsPage() {
  return (
    <PlatformAdminShell>
      <PlatformBuilderAuthGate>
        <PlatformAccountScreen title="Account Settings" showPasswordSettings />
      </PlatformBuilderAuthGate>
    </PlatformAdminShell>
  );
}
