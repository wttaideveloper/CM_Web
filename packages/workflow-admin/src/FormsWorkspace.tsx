"use client";

import { useMemo, useState } from "react";

import type { WorkflowAdminCapabilities } from "./types";
import {
  useWorkflowForm,
  useWorkflowFormMutations,
  useWorkflowFormVersion,
  useWorkflowFormVersions,
  useWorkflowForms,
} from "./hooks";
import { ApiDebugPanel } from "./components/ApiDebugPanel";
import { FormEditor } from "./components/FormEditor";
import { FormLibrary } from "./components/FormLibrary";
import { FormVersions } from "./components/FormVersions";
import { MediaUploadPanel } from "./components/MediaUploadPanel";
import { WorkspaceCard, WorkspaceError, WorkspaceSkeleton } from "./components/WorkspacePrimitives";

type FormsWorkspaceProps = {
  capabilities: WorkflowAdminCapabilities;
  eyebrow?: string;
  title?: string;
  description?: string;
  showApiDebug?: boolean;
  showMediaTools?: boolean;
  showTechnicalGuidance?: boolean;
  showRawJson?: boolean;
  versionDetailPresentation?: "json" | "preview";
};

/** Renders the reusable Forms library, editor, version inspector, preview, and optional media tools. */
export function FormsWorkspace({
  capabilities,
  eyebrow = "Temporary integration workspace",
  title = "Forms Lab",
  description = "Reusable form library hosted temporarily in Enterprise Admin.",
  showApiDebug = true,
  showMediaTools = true,
  showTechnicalGuidance = true,
  showRawJson = true,
  versionDetailPresentation = "json",
}: FormsWorkspaceProps) {
  const [filter, setFilter] = useState<"all" | "published" | "picker">("all");
  const [formSearch, setFormSearch] = useState("");
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const filters =
    filter === "published"
      ? { publishedOnly: true }
      : filter === "picker"
        ? { forPicker: true }
        : undefined;
  const formsQuery = useWorkflowForms(filters);
  const formQuery = useWorkflowForm(selectedFormId);
  const versionsQuery = useWorkflowFormVersions(selectedFormId);
  const versionQuery = useWorkflowFormVersion(selectedFormId, selectedVersion);
  const mutations = useWorkflowFormMutations();
  const selectedForm = formQuery.data?.data ?? null;
  const forms = formsQuery.data?.data ?? [];
  const visibleForms = useMemo(() => {
    const searchTerm = formSearch.trim().toLocaleLowerCase();
    if (!searchTerm) {
      return forms;
    }

    return forms.filter((form) =>
      [form.name, form.description ?? ""].some((value) =>
        value.toLocaleLowerCase().includes(searchTerm),
      ),
    );
  }, [formSearch, forms]);
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

  const selectForm = (formId: string | null) => {
    setSelectedFormId(formId);
    setSelectedVersion(null);
  };

  const invalidateSelection = async (formId: string) => {
    selectForm(formId);
    await formsQuery.refetch();
    await formQuery.refetch();
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
          {mutationError instanceof Error ? mutationError.message : "Form request failed."}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <WorkspaceCard
          title="Forms library"
          actions={(
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => selectForm(null)}
                className="text-xs font-semibold text-[#1f6a58]"
              >
                Create form
              </button>
              <button
                type="button"
                onClick={() => void formsQuery.refetch()}
                className="text-xs font-semibold text-[#1f6a58]"
              >
                Refresh
              </button>
            </div>
          )}
        >
          <label className="mb-3 block">
            <span className="sr-only">Search forms</span>
            <input
              type="search"
              value={formSearch}
              onChange={(event) => setFormSearch(event.target.value)}
              placeholder="Search forms"
              className="h-9 w-full rounded-lg border border-[#d7e5df] px-3 text-sm outline-none focus:border-[#1f6a58]"
            />
          </label>
          <div className="mb-3 flex flex-wrap gap-1" aria-label="Forms filters">
            {(["all", "published", "picker"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => {
                  setFilter(value);
                  selectForm(null);
                }}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  filter === value ? "bg-[#1f6a58] text-white" : "bg-[#edf3f0] text-[#52736a]"
                }`}
              >
                {value === "all" ? "All" : value === "published" ? "Published" : "Picker eligible"}
              </button>
            ))}
          </div>
          <FormLibrary
            forms={visibleForms}
            selectedFormId={selectedFormId}
            isLoading={formsQuery.isPending}
            error={formsQuery.error}
            onSelect={selectForm}
            onRetry={() => void formsQuery.refetch()}
          />
          {!formsQuery.isPending && !formsQuery.error && forms.length > 0 && visibleForms.length === 0 ? (
            <p className="mt-3 text-sm text-[#52736a]">No forms match this search.</p>
          ) : null}
        </WorkspaceCard>

        <div className="space-y-5">
          {selectedFormId && formQuery.isPending ? (
            <WorkspaceSkeleton />
          ) : formQuery.error ? (
            <WorkspaceError error={formQuery.error} onRetry={() => void formQuery.refetch()} />
          ) : (
            <FormEditor
              form={selectedForm}
              capabilities={capabilities}
              isSaving={isMutating}
              showRawJson={showRawJson}
              onCreate={(input) =>
                mutations.create.mutate(input, {
                  onSuccess: (result) => void invalidateSelection(result.data.id),
                })
              }
              onSave={(input) =>
                selectedForm &&
                mutations.update.mutate(
                  { formId: selectedForm.id, input },
                  { onSuccess: () => void formQuery.refetch() },
                )
              }
              onPublish={(input) => {
                if (selectedForm && window.confirm(`Publish ${input.name}?`)) {
                  mutations.update.mutate(
                    { formId: selectedForm.id, input },
                    {
                      onSuccess: () =>
                        mutations.publish.mutate(selectedForm.id, {
                          onSuccess: () => void invalidateSelection(selectedForm.id),
                        }),
                    },
                  );
                }
              }}
              onDelete={() => {
                if (
                  selectedForm &&
                  window.confirm(
                    `Delete ${selectedForm.name}? This action cannot be undone from this workspace.`,
                  )
                ) {
                  mutations.remove.mutate(selectedForm.id, {
                    onSuccess: () => {
                      selectForm(null);
                      void formsQuery.refetch();
                    },
                  });
                }
              }}
            />
          )}
          {showMediaTools ? <MediaUploadPanel /> : null}
          {showApiDebug ? <ApiDebugPanel /> : null}
        </div>

        <div className="space-y-5">
          <FormVersions
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
            detailPresentation={versionDetailPresentation}
          />
          {showTechnicalGuidance ? (
            <WorkspaceCard title="Definition contract">
              <p className="text-sm text-[#52736a]">
                Definition title and field order are stored in <code>definition.title</code> and{" "}
                <code>definition.fields[]</code>.
              </p>
            </WorkspaceCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}
