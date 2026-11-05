"use client";

import { Suspense } from "react";
import PlatformAdminShell from "@/components/PlatformAdminShell";
import { PlatformBlogCategoriesScreen } from "@ihp/platform-configuration";

export default function BlogCategoriesPage() {
  return (
    <PlatformAdminShell>
      <Suspense fallback={<p role="status" className="mx-auto w-full max-w-6xl px-4 py-12 text-center text-sm font-semibold text-[#52736a]">Loading taxonomy classifications...</p>}>
        <PlatformBlogCategoriesScreen />
      </Suspense>
    </PlatformAdminShell>
  );
}
