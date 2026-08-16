"use client";

import { useEffect, useState } from "react";

import {
  buildLinearWorkflowGraph,
  isJsonObject,
  parseLinearWorkflowGraph,
  validateLinearWorkflowGraph,
  type JsonObject,
  type LinearWorkflowGraph,
  type Workflow,
  type WorkflowForm,
  type WorkflowFormReferenceNode,
} from "@ihp/workflow-runtime";

import type { WorkflowAdminCapabilities } from "../types";
import { WorkflowComposer } from "./WorkflowComposer";
import { JsonEditor, parseJsonObject, WorkspaceCard } from "./WorkspacePrimitives";

type EditorTab = "composer" | "summary" | "raw";

type WorkflowEditorProps = {
  workflow: Workflow | null;
  capabilities: WorkflowAdminCapabilities;
  forms: WorkflowForm[];
  isSaving: boolean;
  onCreate: (input: { name: string; description: string; flowDefinition: JsonObject }) => void;
  onSave: (input: { name: string; description: string; flowDefinition: JsonObject }) => void;
  onPublish: (input: { name: string; description: string; flowDefinition: JsonObject }) => void;
  onDelete: () => void;
};

function createEmptyGraph(): LinearWorkflowGraph {
  return buildLinearWorkflowGraph({ id: "start-1", type: "start" }, []);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rawContainsFormReference(value: Record<string, unknown>): boolean {
  return (
    Array.isArray(value.nodes) &&
    value.nodes.some(
      (node) =>
        isRecord(node) &&
        node.type === "form_ref" &&
        isRecord(node.data) &&
        typeof node.data.formId === "string",
    )
  );
}

/** Edits linear workflow graphs visually and preserves advanced workflow graphs in Raw JSON mode. */
export function WorkflowEditor({
  workflow,
  capabilities,
  forms,
  isSaving,
  onCreate,
  onSave,
  onPublish,
  onDelete,
}: WorkflowEditorProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [graph, setGraph] = useState<LinearWorkflowGraph | null>(createEmptyGraph());
  const [rawText, setRawText] = useState(JSON.stringify(createEmptyGraph(), null, 2));
  const [backendText, setBackendText] = useState(rawText);
  const [mappingError, setMappingError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [tab, setTab] = useState<EditorTab>("composer");

  useEffect(() => {
    const flow = workflow?.flowDefinition ?? createEmptyGraph();
    const text = JSON.stringify(flow, null, 2);
    const parsed = parseLinearWorkflowGraph(flow);

    setName(workflow?.name ?? "");
    setDescription(workflow?.description ?? "");
    setGraph(parsed.graph);
    setRawText(text);
    setBackendText(text);
    setMappingError(parsed.error);
    setValidationError(null);
    setTab("composer");
  }, [workflow]);

  const rawResult = parseJsonObject(rawText);
  const canEdit = workflow ? capabilities.canEditWorkflows : capabilities.canCreateWorkflows;

  const applyFlowText = (text: string) => {
    const result = parseJsonObject(text);
    if (!result.value) {
      setValidationError(result.error);
      return;
    }

    const parsed = parseLinearWorkflowGraph(result.value);
    setGraph(parsed.graph);
    setMappingError(parsed.error);
    setValidationError(null);
    if (parsed.graph) {
      setRawText(JSON.stringify(parsed.graph, null, 2));
    }
  };

  const changeGraph = (nextGraph: LinearWorkflowGraph) => {
    setGraph(nextGraph);
    setRawText(JSON.stringify(nextGraph, null, 2));
    setMappingError(null);
    setValidationError(null);
  };

  const submit = (forPublish: boolean) => {
    if (!name.trim()) {
      setValidationError("Workflow name is required.");
      return;
    }
    if (!rawResult.value) {
      setValidationError(rawResult.error);
      return;
    }

    if (!isJsonObject(rawResult.value)) {
      setValidationError("Flow definition must be a JSON object.");
      return;
    }
    const flowDefinition = rawResult.value;

    const graphValidation = graph ? validateLinearWorkflowGraph(graph, forPublish) : null;
    if (graphValidation) {
      setValidationError(graphValidation);
      return;
    }
    if (forPublish && !graph && !rawContainsFormReference(rawResult.value)) {
      setValidationError("Publishing requires at least one Form step.");
      return;
    }

    setValidationError(null);
    const input = {
      name: name.trim(),
      description: description.trim(),
      flowDefinition,
    };

    if (forPublish) {
      onPublish(input);
    } else if (workflow) {
      onSave(input);
    } else {
      onCreate(input);
    }
  };

  const summarySteps =
    graph?.nodes.filter(
      (node): node is WorkflowFormReferenceNode => node.type === "form_ref",
    ) ?? [];

  return (
    <WorkspaceCard
      title={workflow ? "Workflow editor" : "Create workflow"}
      actions={<span className="text-xs text-[#7f9d94]">{workflow ? `v${workflow.version}` : "Unsaved"}</span>}
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-[#16332b]">
            Workflow name
            <input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3" />
          </label>
          <label className="text-sm font-semibold text-[#16332b]">
            Description
            <input value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3" />
          </label>
        </div>

        <div className="flex gap-4 border-b border-[#e1ebe6]" role="tablist" aria-label="Workflow editor mode">
          {(["composer", "summary", "raw"] as const).map((value) => (
            <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={`border-b-2 pb-2 text-sm font-semibold ${tab === value ? "border-[#1f6a58] text-[#1f6a58]" : "border-transparent text-[#52736a]"}`}>
              {value === "composer" ? "Composer" : value === "summary" ? "Summary" : "Raw JSON"}
            </button>
          ))}
        </div>

        {tab === "composer" ? graph ? <WorkflowComposer graph={graph} forms={forms} onChange={changeGraph} /> : <p role="alert" className="rounded-xl border border-[#f3c8c2] bg-[#fff5f4] p-3 text-sm text-[#b42318]">{mappingError}</p> : null}
        {tab === "summary" ? graph ? <div className="rounded-xl border border-[#e1ebe6] bg-[#fbfdfc] p-4"><p className="text-sm font-semibold text-[#16332b]">Start</p>{summarySteps.length === 0 ? <p className="mt-2 text-sm text-[#52736a]">No Form steps have been added.</p> : <ol className="mt-3 space-y-2">{summarySteps.map((step, index) => { const form = forms.find((candidate) => candidate.id === step.data.formId); return <li key={step.id} className="rounded-xl border border-[#e1ebe6] bg-white p-3"><p className="text-sm font-semibold text-[#16332b]">{index + 1}. {form?.name ?? "Referenced Form"}</p><p className="mt-1 text-xs text-[#52736a]">{form ? `Published · v${form.version} · ${form.fieldCount} fields` : "Form details are not present in the current library response."}</p></li>; })}</ol>}</div> : <p role="alert" className="rounded-xl border border-[#f7d899] bg-[#fffaf0] p-3 text-sm text-[#8b5b17]">This advanced workflow graph is available in Raw JSON mode and cannot be summarized as a linear workflow safely.</p> : null}
        {tab === "raw" ? <div><div className="mb-2 flex gap-3"><button type="button" onClick={() => applyFlowText(rawText)} className="text-sm font-semibold text-[#1f6a58]">Validate</button><button type="button" onClick={() => { if (rawResult.value) setRawText(JSON.stringify(rawResult.value, null, 2)); }} className="text-sm font-semibold text-[#1f6a58]">Pretty Format</button><button type="button" onClick={() => { setRawText(backendText); applyFlowText(backendText); }} className="text-sm font-semibold text-[#1f6a58]">Reset to backend</button></div><JsonEditor label="Flow JSON" value={rawText} onChange={setRawText} /></div> : null}
        {mappingError && tab === "raw" ? <p role="alert" className="rounded-xl border border-[#f7d899] bg-[#fffaf0] p-3 text-sm text-[#8b5b17]">{mappingError}</p> : null}
        {validationError ? <p role="alert" className="text-sm text-[#b42318]">{validationError}</p> : null}

        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={!canEdit || isSaving} onClick={() => submit(false)} className="rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{isSaving ? "Saving…" : workflow ? "Save" : "Create"}</button>
          {workflow ? <><button type="button" disabled={!capabilities.canPublishWorkflows || isSaving} onClick={() => submit(true)} className="rounded-full border border-[#1f6a58] px-4 py-2 text-sm font-semibold text-[#1f6a58] disabled:opacity-60">Publish</button><button type="button" disabled={isSaving || !capabilities.canDeleteWorkflows} onClick={onDelete} className="rounded-full border border-[#c74f42] px-4 py-2 text-sm font-semibold text-[#b42318] disabled:opacity-60">Delete</button></> : null}
        </div>
      </div>
    </WorkspaceCard>
  );
}
