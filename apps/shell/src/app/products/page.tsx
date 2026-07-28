"use client";

import AppShell from "@/components/layout/AppShell";
import { ProductsListScreen } from "@ihp/products";

export default function PublicProductsPage() {
  return (
    <AppShell>
      <ProductsListScreen />
    </AppShell>
  );
}
