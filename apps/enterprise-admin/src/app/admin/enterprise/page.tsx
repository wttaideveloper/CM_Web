"use client";

import { EnterpriseDetailsScreen } from "@ihp/enterprises";

import {
  loadEnterpriseProductSummaries,
  loadEnterpriseServiceSummaries,
} from "@/adapters/enterprise-screen-loaders";

export default function EnterprisePage() {
  return (
    <EnterpriseDetailsScreen
      allowEnterpriseSelector={false}
      editHref="/admin/enterprise/edit"
      productCreateHref="/admin/products"
      serviceCreateHref="/admin/services"
      enterpriseProductsLoader={loadEnterpriseProductSummaries}
      enterpriseServicesLoader={loadEnterpriseServiceSummaries}
    />
  );
}
