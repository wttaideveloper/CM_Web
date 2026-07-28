"use client";

import AppShell from "@/components/layout/AppShell";
import { ProductCreateScreen } from "@ihp/products";

export default function PublicCreateProductPage() {
  return (
    <AppShell>
      <ProductCreateScreen />
    </AppShell>
  );
}
