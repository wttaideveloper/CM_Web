"use client";

import PlatformAdminShell from "@/components/PlatformAdminShell";
import { ProductOrdersScreen } from "@ihp/products";

export default function PlatformProductOrdersPage() {
  return (
    <PlatformAdminShell>
      <ProductOrdersScreen readOnly={true} />
    </PlatformAdminShell>
  );
}
