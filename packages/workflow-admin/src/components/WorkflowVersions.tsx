"use client";

import type { WorkflowVersion, WorkflowVersionSummary } from "@ihp/workflow-runtime";
import { formatWorkspaceDate, WorkspaceCard, WorkspaceError, WorkspaceSkeleton } from "./WorkspacePrimitives";

/** Displays immutable published workflow versions. */
export function WorkflowVersions({ versions, selectedVersion, detail, isLoading, error, onSelect, onRetry }: { versions: WorkflowVersionSummary[]; selectedVersion: number | null; detail: WorkflowVersion | null; isLoading: boolean; error: unknown; onSelect: (version: number) => void; onRetry: () => void }) {
  return <WorkspaceCard title="Version history">{isLoading ? <WorkspaceSkeleton rows={2} /> : error ? <WorkspaceError error={error} onRetry={onRetry} /> : versions.length === 0 ? <p className="text-sm text-[#52736a]">No published versions are available.</p> : <div className="space-y-2">{versions.map((version) => <button key={version.id} type="button" onClick={() => onSelect(version.version)} className={`w-full rounded-xl border p-3 text-left text-sm ${selectedVersion === version.version ? "border-[#1f6a58] bg-[#eef8f2]" : "border-[#e1ebe6]"}`}><strong>Version {version.version}</strong><span className="block mt-1 text-xs text-[#52736a]">Published {formatWorkspaceDate(version.publishedAt)}</span></button>)}{detail ? <pre className="max-h-52 overflow-auto rounded-xl bg-[#f4f8f6] p-3 text-xs">{JSON.stringify(detail.flowDefinition, null, 2)}</pre> : null}</div>}</WorkspaceCard>;
}
