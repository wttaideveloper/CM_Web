import PlatformAdminShell from "@/components/PlatformAdminShell";
import { PlatformCategoriesScreen } from "@ihp/platform-configuration";

interface PlatformCategoriesPageProps {
  searchParams?: Promise<{ module?: string }>;
}

const VALID_MODULES = ["products-services", "events", "trainings"] as const;

function resolveModule(value: string | undefined): (typeof VALID_MODULES)[number] {
  return VALID_MODULES.includes(value as (typeof VALID_MODULES)[number]) ? (value as (typeof VALID_MODULES)[number]) : "events";
}

export default async function PlatformCategoriesPage({ searchParams }: PlatformCategoriesPageProps) {
  const resolved = await searchParams;
  const initialModule = resolveModule(resolved?.module);
  return (
    <PlatformAdminShell>
      <PlatformCategoriesScreen initialModule={initialModule} />
    </PlatformAdminShell>
  );
}
