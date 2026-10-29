import type { ReactNode } from "react";

import AdminAuthGuard from "@/components/auth/AdminAuthGuard";

/**
 * `/trainings` renders the platform-wide Training browse screen — the same
 * kind of platform-level surface `/admin/*` protects with `AdminAuthGuard`.
 * It previously had no guard at all, so it rendered for anonymous visitors.
 * Mirrors `apps/shell/src/app/admin/layout.tsx` exactly.
 */
export default function TrainingsLayout({ children }: { children: ReactNode }) {
  return <AdminAuthGuard>{children}</AdminAuthGuard>;
}
