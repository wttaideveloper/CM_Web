import PlatformAdminShell from "@/components/PlatformAdminShell";
import PlatformTrainingAuthGate from "@/components/PlatformTrainingAuthGate";
import { NewTrainingFormBuilderScreen } from "@ihp/platform-form-configurations";

export default function NewPlatformTrainingFormBuilderPage() {
  return <PlatformAdminShell><PlatformTrainingAuthGate><NewTrainingFormBuilderScreen /></PlatformTrainingAuthGate></PlatformAdminShell>;
}
