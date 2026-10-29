import PlatformAdminShell from "@/components/PlatformAdminShell";
import { PlatformAccountScreen } from "@/components/PlatformAccountScreen";
import PlatformBuilderAuthGate from "@/components/PlatformBuilderAuthGate";

/** Hosts the authenticated Super Admin profile page. */
export default function PlatformProfilePage() {
  return (
    <PlatformAdminShell>
      <PlatformBuilderAuthGate>
        <PlatformAccountScreen title="My Profile" />
      </PlatformBuilderAuthGate>
    </PlatformAdminShell>
  );
}
