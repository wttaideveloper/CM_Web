"use client";

import { ProductCreatePage } from "@/app/products/create/page";

export default function AdminCreateProductPage() {
  return <ProductCreatePage mode="enterprise-admin" redirectTo="/admin/products" />;
}
