import type { ReactNode } from "react";

import AdminAuthGuard from "@/components/auth/AdminAuthGuard";

/**
 * `/training-forms` renders the Super-Admin-only dynamic Training form
 * builder (create/publish/activate/deactivate/assign). It previously had no
 * guard at all, so it rendered — with live mutation buttons — for anonymous
 * visitors. Mirrors `apps/shell/src/app/admin/layout.tsx` exactly.
 */
export default function TrainingFormsLayout({ children }: { children: ReactNode }) {
  return <AdminAuthGuard>{children}</AdminAuthGuard>;
}
