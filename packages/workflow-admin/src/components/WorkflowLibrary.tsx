"use client";

import type { Workflow } from "@ihp/workflow-runtime";
import { PublicationBadge, WorkspaceError, WorkspaceSkeleton } from "./WorkspacePrimitives";

/** Displays the selectable Workflow library. */
export function WorkflowLibrary({ workflows, selectedWorkflowId, isLoading, error, onSelect, onRetry }: { workflows: Workflow[]; selectedWorkflowId: string | null; isLoading: boolean; error: unknown; onSelect: (workflowId: string) => void; onRetry: () => void }) {
  if (isLoading) return <WorkspaceSkeleton />;
  if (error) return <WorkspaceError error={error} onRetry={onRetry} />;
  if (workflows.length === 0) return <p className="text-sm text-[#52736a]">No workflows are available.</p>;
  return <div className="space-y-2">{workflows.map((workflow) => <button key={workflow.id} type="button" onClick={() => onSelect(workflow.id)} className={`w-full rounded-xl border p-3 text-left ${selectedWorkflowId === workflow.id ? "border-[#1f6a58] bg-[#eef8f2]" : "border-[#e1ebe6] bg-[#fbfdfc] hover:border-[#bcd8cd]"}`}><div className="flex justify-between gap-2"><span className="font-semibold text-[#16332b]">{workflow.name}</span><PublicationBadge published={workflow.isPublished} /></div><p className="mt-1 line-clamp-2 text-xs text-[#52736a]">{workflow.description ?? "No description"}</p><p className="mt-2 text-[11px] text-[#7f9d94]">v{workflow.version} · {workflow.stepCount} steps</p></button>)}</div>;
}
