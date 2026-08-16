"use client";

import { useMemo, useState } from "react";

import type { WorkflowAdminCapabilities } from "./types";
import {
  useWorkflow,
  useWorkflowForms,
  useWorkflowMutations,
  useWorkflowVersion,
  useWorkflowVersions,
  useWorkflows,
} from "./hooks";
import { ApiDebugPanel } from "./components/ApiDebugPanel";
import { WorkflowEditor } from "./components/WorkflowEditor";
import { WorkflowLibrary } from "./components/WorkflowLibrary";
import { WorkflowVersions } from "./components/WorkflowVersions";
import { WorkspaceCard, WorkspaceError, WorkspaceSkeleton } from "./components/WorkspacePrimitives";

type WorkflowsWorkspaceProps = {
  capabilities: WorkflowAdminCapabilities;
  eyebrow?: string;
  title?: string;
  description?: string;
  showApiDebug?: boolean;
  showTechnicalGuidance?: boolean;
};

/** Renders the reusable Workflow library, composer, raw JSON fallback, and version inspector. */
export function WorkflowsWorkspace({
  capabilities,
  eyebrow = "Temporary integration workspace",
  title = "Workflow Lab",
  description = "Reusable workflow composition hosted temporarily in Enterprise Admin.",
  showApiDebug = true,
  showTechnicalGuidance = true,
}: WorkflowsWorkspaceProps) {
  const [workflowSearch, setWorkflowSearch] = useState("");
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const workflowsQuery = useWorkflows();
  const formsQuery = useWorkflowForms({ publishedOnly: true });
  const workflowQuery = useWorkflow(selectedWorkflowId);
  const versionsQuery = useWorkflowVersions(selectedWorkflowId);
  const versionQuery = useWorkflowVersion(selectedWorkflowId, selectedVersion);
  const mutations = useWorkflowMutations();
  const selectedWorkflow = workflowQuery.data?.data ?? null;
  const availableForms = formsQuery.data?.data ?? [];
  const workflows = workflowsQuery.data?.data ?? [];
  const visibleWorkflows = useMemo(() => {
    const searchTerm = workflowSearch.trim().toLocaleLowerCase();
    if (!searchTerm) {
      return workflows;
    }

    return workflows.filter((workflow) =>
      [workflow.name, workflow.description ?? ""].some((value) =>
        value.toLocaleLowerCase().includes(searchTerm),
      ),
    );
  }, [workflowSearch, workflows]);
  const isMutating =
    mutations.create.isPending ||
    mutations.update.isPending ||
    mutations.publish.isPending ||
    mutations.remove.isPending;
  const mutationError = [
    mutations.create.error,
    mutations.update.error,
    mutations.publish.error,
    mutations.remove.error,
  ].find(Boolean);

  const selectWorkflow = (workflowId: string | null) => {
    setSelectedWorkflowId(workflowId);
    setSelectedVersion(null);
  };

  const refreshSelection = async (workflowId: string) => {
    selectWorkflow(workflowId);
    await workflowsQuery.refetch();
    await workflowQuery.refetch();
  };

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">
          {eyebrow}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#06201c]">{title}</h1>
        <p className="mt-1 text-sm text-[#52736a]">{description}</p>
      </header>

      {mutationError ? (
        <div
          role="alert"
          className="rounded-xl border border-[#f3c8c2] bg-[#fff5f4] p-3 text-sm text-[#b42318]"
        >
          {mutationError instanceof Error ? mutationError.message : "Workflow request failed."}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <WorkspaceCard
          title="Workflow library"
          actions={(
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => selectWorkflow(null)}
                className="text-xs font-semibold text-[#1f6a58]"
              >
                Create workflow
              </button>
              <button
                type="button"
                onClick={() => void workflowsQuery.refetch()}
                className="text-xs font-semibold text-[#1f6a58]"
              >
                Refresh
              </button>
            </div>
          )}
        >
          <label className="mb-3 block">
            <span className="sr-only">Search workflows</span>
            <input
              type="search"
              value={workflowSearch}
              onChange={(event) => setWorkflowSearch(event.target.value)}
              placeholder="Search workflows"
              className="h-9 w-full rounded-lg border border-[#d7e5df] px-3 text-sm outline-none focus:border-[#1f6a58]"
            />
          </label>
          <WorkflowLibrary
            workflows={visibleWorkflows}
            selectedWorkflowId={selectedWorkflowId}
            isLoading={workflowsQuery.isPending}
            error={workflowsQuery.error}
            onSelect={selectWorkflow}
            onRetry={() => void workflowsQuery.refetch()}
          />
          {!workflowsQuery.isPending &&
          !workflowsQuery.error &&
          workflows.length > 0 &&
          visibleWorkflows.length === 0 ? (
            <p className="mt-3 text-sm text-[#52736a]">No workflows match this search.</p>
          ) : null}
        </WorkspaceCard>

        <div className="space-y-5">
          {selectedWorkflowId && workflowQuery.isPending ? (
            <WorkspaceSkeleton />
          ) : workflowQuery.error ? (
            <WorkspaceError error={workflowQuery.error} onRetry={() => void workflowQuery.refetch()} />
          ) : (
            <WorkflowEditor
              workflow={selectedWorkflow}
              capabilities={capabilities}
              forms={availableForms}
              isSaving={isMutating}
              onCreate={(input) =>
                mutations.create.mutate(input, {
                  onSuccess: (result) => void refreshSelection(result.data.id),
                })
              }
              onSave={(input) =>
                selectedWorkflow &&
                mutations.update.mutate(
                  { workflowId: selectedWorkflow.id, input },
                  { onSuccess: () => void workflowQuery.refetch() },
                )
              }
              onPublish={(input) => {
                if (selectedWorkflow && window.confirm(`Publish ${input.name}?`)) {
                  mutations.publish.mutate(
                    { workflowId: selectedWorkflow.id, input },
                    { onSuccess: () => void refreshSelection(selectedWorkflow.id) },
                  );
                }
              }}
              onDelete={() => {
                if (
                  selectedWorkflow &&
                  window.confirm(
                    `Delete ${selectedWorkflow.name}? This action cannot be undone from this workspace.`,
                  )
                ) {
                  mutations.remove.mutate(selectedWorkflow.id, {
                    onSuccess: () => {
                      selectWorkflow(null);
                      void workflowsQuery.refetch();
                    },
                  });
                }
              }}
            />
          )}
          {formsQuery.error ? (
            <WorkspaceError error={formsQuery.error} onRetry={() => void formsQuery.refetch()} />
          ) : null}
          {showApiDebug ? <ApiDebugPanel /> : null}
        </div>

        <div className="space-y-5">
          <WorkflowVersions
            versions={versionsQuery.data?.data ?? []}
            selectedVersion={selectedVersion}
            detail={versionQuery.data?.data ?? null}
            isLoading={versionsQuery.isPending}
            error={versionsQuery.error}
            detailIsLoading={versionQuery.isFetching}
            detailError={versionQuery.error}
            onSelect={setSelectedVersion}
            onRetry={() => void versionsQuery.refetch()}
            onRetryDetail={() => void versionQuery.refetch()}
          />
          {showTechnicalGuidance ? (
            <WorkspaceCard title="Composer contract">
              <p className="text-sm text-[#52736a]">
                The visual composer writes a linear <code>start</code> to <code>form_ref</code>{" "}
                graph. Advanced graphs remain editable only as Raw JSON.
              </p>
            </WorkspaceCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}
