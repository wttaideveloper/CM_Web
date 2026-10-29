import { redirect } from "next/navigation";

/**
 * /trainings/pending is superseded by the canonical Trainings tab in /approval-queue.
 * Phase 3: redirect to the unified approval queue to eliminate the duplicate Training
 * approval workflow. The /approval-queue Trainings tab supports pending_approval,
 * needs_revision, and approved statuses with search, pagination, reason capture for
 * reject/request-changes, and a confirmation dialog.
 */
export default function PlatformApprovalPendingRedirectPage() {
  redirect("/approval-queue");
}
