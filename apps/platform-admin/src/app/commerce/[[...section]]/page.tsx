import PlatformAdminShell from "@/components/PlatformAdminShell";
import PlatformCommerceScreen from "@/components/PlatformCommerceScreen";
import { resolvePlatformCommerceSection } from "@/lib/platform-commerce-routes";
import { Suspense } from "react";
import { notFound } from "next/navigation";

type CommercePageProps = {
  params: Promise<{ section?: string[] }>;
};

export default async function PlatformCommercePage({ params }: CommercePageProps) {
  const { section } = await params;
  const routeSection = resolvePlatformCommerceSection(section);

  if (!routeSection) {
    notFound();
  }

  return (
    <PlatformAdminShell>
      <Suspense fallback={<div className="p-6 text-sm text-[#52736a]">Loading Commerce Management...</div>}>
        <PlatformCommerceScreen section={routeSection} />
      </Suspense>
    </PlatformAdminShell>
  );
}
