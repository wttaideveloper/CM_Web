"use client";

import { ProductEditScreen } from "@ihp/products";

export default function EnterpriseProductEditPage() {
  return (
    <ProductEditScreen
      listHref="/admin/products"
      detailHrefBase="/admin/products"
    />
  );
}
