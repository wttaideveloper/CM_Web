"use client";

import { ProductDetailsScreen } from "@ihp/products";

export default function EnterpriseProductDetailsPage() {
  return <ProductDetailsScreen listHref="/admin/products" editHrefBase="/admin/products" />;
}
