"use client";

import { ProductsListScreen } from "@ihp/products";

export default function EnterpriseProductsPage() {
  return (
    <ProductsListScreen
      createHref="/admin/products"
      detailHrefBase="/admin/products"
      editHrefBase="/admin/products"
    />
  );
}
