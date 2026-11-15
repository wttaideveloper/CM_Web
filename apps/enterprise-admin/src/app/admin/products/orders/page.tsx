"use client";

import { ProductOrdersScreen } from "@ihp/products";
import CurrentEnterpriseGuard from "@/components/CurrentEnterpriseGuard";

export default function EnterpriseProductOrdersPage() {
  return (
    <CurrentEnterpriseGuard>
      {() => <ProductOrdersScreen />}
    </CurrentEnterpriseGuard>
  );
}