"use client";

import { ServicesListScreen } from "@ihp/services";

export default function EnterpriseServicesPage() {
  return (
    <ServicesListScreen
      createHref="/admin/services"
      detailHrefBase="/admin/services"
      editHrefBase="/admin/services"
    />
  );
}
