"use client";

import type { WorkflowForm } from "@ihp/workflow-runtime";
import { PublicationBadge, WorkspaceError, WorkspaceSkeleton } from "./WorkspacePrimitives";

/** Displays a selectable, backend-filtered Forms library. */
export function FormLibrary({ forms, selectedFormId, isLoading, error, onSelect, onRetry }: { forms: WorkflowForm[]; selectedFormId: string | null; isLoading: boolean; error: unknown; onSelect: (formId: string) => void; onRetry: () => void }) {
  if (isLoading) return <WorkspaceSkeleton />;
  if (error) return <WorkspaceError error={error} onRetry={onRetry} />;
  if (forms.length === 0) return <p className="text-sm text-[#52736a]">No forms match this backend filter.</p>;
  return <div className="space-y-2">{forms.map((form) => <button key={form.id} type="button" onClick={() => onSelect(form.id)} className={`w-full rounded-xl border p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6a58] ${selectedFormId === form.id ? "border-[#1f6a58] bg-[#eef8f2]" : "border-[#e1ebe6] bg-[#fbfdfc] hover:border-[#bcd8cd]"}`}><div className="flex items-start justify-between gap-2"><span className="font-semibold text-[#16332b]">{form.name}</span><PublicationBadge published={form.isPublished} /></div><p className="mt-1 line-clamp-2 text-xs text-[#52736a]">{form.description ?? "No description"}</p><p className="mt-2 text-[11px] text-[#7f9d94]">v{form.version} · {form.fieldCount} fields</p></button>)}</div>;
}
