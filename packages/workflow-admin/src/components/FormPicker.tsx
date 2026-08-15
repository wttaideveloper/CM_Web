"use client";

import type { WorkflowForm } from "@ihp/workflow-runtime";
import { useWorkflowForms } from "../hooks";
import { FormLibrary } from "./FormLibrary";
import { WorkspaceCard } from "./WorkspacePrimitives";

/** Selects only backend-eligible published Forms for adding a workflow Form step. */
export function FormPicker({ selectedFormId, onSelect }: { selectedFormId: string | null; onSelect: (form: WorkflowForm) => void }) {
  const formsQuery = useWorkflowForms({ publishedOnly: true, forPicker: true });
  const forms = formsQuery.data?.data ?? [];
  return <WorkspaceCard title="Add Published Form"><p className="mb-3 text-sm text-[#52736a]">Backend eligibility uses <code>published_only=true&amp;for_picker=true</code>.</p><FormLibrary forms={forms} selectedFormId={selectedFormId} isLoading={formsQuery.isPending} error={formsQuery.error} onSelect={(formId) => { const form = forms.find((candidate) => candidate.id === formId); if (form) onSelect(form); }} onRetry={() => void formsQuery.refetch()} /></WorkspaceCard>;
}
