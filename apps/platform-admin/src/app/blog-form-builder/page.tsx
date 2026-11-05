"use client";

import { Suspense } from "react";
import PlatformAdminShell from "@/components/PlatformAdminShell";
import { PlatformBlogFormBuilderScreen } from "@ihp/platform-configuration";

export default function PlatformBlogFormBuilderPage() {
  return (
    <PlatformAdminShell>
      <Suspense fallback={<p role="status" className="mx-auto w-full max-w-6xl px-4 py-12 text-center text-sm font-semibold text-[#52736a]">Loading form builder canvas...</p>}>
        <PlatformBlogFormBuilderScreen />
      </Suspense>
    </PlatformAdminShell>
  );
}
