import PlatformAdminShell from "@/components/PlatformAdminShell";
import { PlatformSuperAdminsScreen } from "@ihp/platform-users";

/** Hosts the dedicated Super Admin lifecycle management workspace. */
export default function PlatformSuperAdminsPage() {
  return <PlatformAdminShell><PlatformSuperAdminsScreen /></PlatformAdminShell>;
}
