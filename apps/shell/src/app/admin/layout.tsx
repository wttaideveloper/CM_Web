import type { ReactNode } from "react";

import AdminAuthGuard from "@/components/auth/AdminAuthGuard";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminAuthGuard>{children}</AdminAuthGuard>;
}
