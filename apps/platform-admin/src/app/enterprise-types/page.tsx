import PlatformAdminShell from "@/components/PlatformAdminShell";
import { PlatformEnterpriseTypesScreen } from "@ihp/platform-configuration";

export default function PlatformEnterpriseTypesPage() {
  return (
    <PlatformAdminShell>
      <PlatformEnterpriseTypesScreen onboardingFormsHref="/onboarding-forms" />
    </PlatformAdminShell>
  );
}
