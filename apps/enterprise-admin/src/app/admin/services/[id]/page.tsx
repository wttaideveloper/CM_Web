"use client";

import { ServiceDetailsScreen } from "@ihp/services";

export default function EnterpriseServiceDetailsPage() {
  return <ServiceDetailsScreen listHref="/admin/services" editHrefBase="/admin/services" />;
}
