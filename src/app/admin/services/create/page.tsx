"use client";

import { ServiceCreatePage } from "@/app/services/create/page";

export default function AdminCreateServicePage() {
  return <ServiceCreatePage mode="enterprise-admin" redirectTo="/admin/services" />;
}
