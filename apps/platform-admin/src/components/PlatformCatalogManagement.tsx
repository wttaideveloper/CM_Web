"use client";

import { Suspense, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PlatformModuleReviewsTab } from "@ihp/platform-marketplace-static";

type CatalogModule = "product" | "service";

/** Adds the Super Admin review queue alongside a Product or Service catalogue. */
export function PlatformCatalogManagement({ module, children, itemId = null }: { module: CatalogModule; children: ReactNode; itemId?: string | null }) {
  return <Suspense fallback={<div role="status" className="mt-5 animate-pulse rounded-2xl bg-[#edf3f0] p-8">Loading {module} management…</div>}><PlatformCatalogManagementContent module={module} itemId={itemId}>{children}</PlatformCatalogManagementContent></Suspense>;
}

function PlatformCatalogManagementContent({ module, children, itemId }: { module: CatalogModule; children: ReactNode; itemId: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const reviewsSelected = params.get("view") === "reviews" || params.get("tab") === "reviews";
  const setView = (view: "catalog" | "reviews") => {
    const next = new URLSearchParams(params.toString());
    if (view === "reviews") {
      next.set(itemId ? "tab" : "view", "reviews");
      if (itemId) next.set("item_id", itemId);
    } else for (const key of ["view", "tab", "item_id", "review_id", "status", "show_audit"]) next.delete(key);
    router.replace(`${pathname}${next.size ? `?${next.toString()}` : ""}`, { scroll: false });
  };
  const statusValue = params.get("status");
  const initialStatus = statusValue === "pending" || statusValue === "approved" || statusValue === "rejected" || statusValue === "deleted" ? statusValue : "all";
  return <>
    <div className="mb-4 flex gap-2 border-b border-[#e1ebe6]" role="tablist" aria-label={`${module} management`}>
      <button type="button" role="tab" aria-selected={!reviewsSelected} onClick={() => setView("catalog")} className={`border-b-2 px-4 py-3 text-sm font-semibold ${!reviewsSelected ? "border-[#1f6a58] text-[#1f6a58]" : "border-transparent text-[#52736a]"}`}>{itemId ? `${module === "product" ? "Product" : "Service"} details` : module === "product" ? "Products" : "Services"}</button>
      <button type="button" role="tab" aria-selected={reviewsSelected} onClick={() => setView("reviews")} className={`border-b-2 px-4 py-3 text-sm font-semibold ${reviewsSelected ? "border-[#1f6a58] text-[#1f6a58]" : "border-transparent text-[#52736a]"}`}>Reviews</button>
    </div>
    {reviewsSelected ? <PlatformModuleReviewsTab module={module} itemId={params.get("item_id") ?? itemId} reviewId={params.get("review_id")} initialStatus={initialStatus} openAuditOnLoad={params.get("show_audit") === "true"} /> : children}
  </>;
}
