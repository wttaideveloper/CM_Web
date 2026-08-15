"use client";

import { useEffect, useState } from "react";
import { asJsonObject, buildLinearWorkflowGraph, parseLinearWorkflowGraph, validateLinearWorkflowGraph, type JsonObject, type LinearWorkflowGraph, type Workflow, type WorkflowForm } from "@ihp/workflow-runtime";
import type { WorkflowAdminCapabilities } from "../types";
import { WorkflowComposer } from "./WorkflowComposer";
import { JsonEditor, parseJsonObject, WorkspaceCard } from "./WorkspacePrimitives";

type EditorTab = "composer" | "raw";

function createEmptyGraph(): LinearWorkflowGraph {
  return buildLinearWorkflowGraph({ id: "start-1", type: "start" }, []);
}

function rawContainsFormReference(value: Record<string, unknown>): boolean {
  return Array.isArray(value.nodes) && value.nodes.some((node) => typeof node === "object" && node !== null && !Array.isArray(node) && (node as Record<string, unknown>).type === "form_ref" && typeof (node as Record<string, unknown>).data === "object" && (node as { data: Record<string, unknown> }).data !== null && typeof (node as { data: Record<string, unknown> }).data.formId === "string");
}

/** Edits canonical linear workflow graphs visually, with a lossless Raw JSON escape hatch for advanced graphs. */
export function WorkflowEditor({ workflow, capabilities, forms, isSaving, onCreate, onSave, onPublish, onDelete }: { workflow: Workflow | null; capabilities: WorkflowAdminCapabilities; forms: WorkflowForm[]; isSaving: boolean; onCreate: (input: { name: string; description: string; flowDefinition: JsonObject }) => void; onSave: (input: { name: string; description: string; flowDefinition: JsonObject }) => void; onPublish: (input: { name: string; description: string; flowDefinition: JsonObject }) => void; onDelete: () => void }) {
  const [name, setName] = useState(""); const [description, setDescription] = useState(""); const [graph, setGraph] = useState<LinearWorkflowGraph | null>(createEmptyGraph()); const [rawText, setRawText] = useState(JSON.stringify(createEmptyGraph(), null, 2)); const [backendText, setBackendText] = useState(rawText); const [mappingError, setMappingError] = useState<string | null>(null); const [validationError, setValidationError] = useState<string | null>(null); const [tab, setTab] = useState<EditorTab>("composer");
  useEffect(() => { const flow = workflow?.flowDefinition ?? createEmptyGraph(); const text = JSON.stringify(flow, null, 2); const parsed = parseLinearWorkflowGraph(flow); setName(workflow?.name ?? ""); setDescription(workflow?.description ?? ""); setGraph(parsed.graph); setRawText(text); setBackendText(text); setMappingError(parsed.error); setValidationError(null); setTab("composer"); }, [workflow]);
  const rawResult = parseJsonObject(rawText);
  const applyFlowText = (text: string) => { const result = parseJsonObject(text); if (!result.value) { setValidationError(result.error); return; } const parsed = parseLinearWorkflowGraph(result.value); setGraph(parsed.graph); setMappingError(parsed.error); setValidationError(null); if (parsed.graph) setRawText(JSON.stringify(parsed.graph, null, 2)); };
  const changeGraph = (nextGraph: LinearWorkflowGraph) => { setGraph(nextGraph); setRawText(JSON.stringify(nextGraph, null, 2)); setMappingError(null); setValidationError(null); };
  const submit = (forPublish: boolean) => {
    if (!name.trim()) { setValidationError("Workflow name is required."); return; }
    if (!rawResult.value) { setValidationError(rawResult.error); return; }
    const flowDefinition = asJsonObject(rawResult.value as JsonObject);
    if (!flowDefinition) { setValidationError("Flow definition must be a JSON object."); return; }
    const graphValidation = graph ? validateLinearWorkflowGraph(graph, forPublish) : null;
    if (graphValidation) { setValidationError(graphValidation); return; }
    if (forPublish && !graph && !rawContainsFormReference(rawResult.value)) { setValidationError("Publishing requires at least one Form step."); return; }
    setValidationError(null); const input = { name: name.trim(), description: description.trim(), flowDefinition };
    if (forPublish) onPublish(input); else if (workflow) onSave(input); else onCreate(input);
  };
  const canEdit = workflow ? capabilities.canEditWorkflows : capabilities.canCreateWorkflows;
  return <WorkspaceCard title={workflow ? "Workflow editor" : "Create workflow"} actions={<span className="text-xs text-[#7f9d94]">{workflow ? `v${workflow.version}` : "Unsaved"}</span>}><div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold text-[#16332b]">Workflow name<input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3" /></label><label className="text-sm font-semibold text-[#16332b]">Description<input value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3" /></label></div><div className="flex gap-4 border-b border-[#e1ebe6]" role="tablist" aria-label="Workflow editor mode">{(["composer", "raw"] as const).map((value) => <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={`border-b-2 pb-2 text-sm font-semibold ${tab === value ? "border-[#1f6a58] text-[#1f6a58]" : "border-transparent text-[#52736a]"}`}>{value === "composer" ? "Composer" : "Raw JSON"}</button>)}</div>{tab === "composer" ? graph ? <WorkflowComposer graph={graph} forms={forms} onChange={changeGraph} /> : <p role="alert" className="rounded-xl border border-[#f3c8c2] bg-[#fff5f4] p-3 text-sm text-[#b42318]">{mappingError}</p> : null}{tab === "raw" ? <div><div className="mb-2 flex gap-3"><button type="button" onClick={() => applyFlowText(rawText)} className="text-sm font-semibold text-[#1f6a58]">Validate</button><button type="button" onClick={() => { if (rawResult.value) setRawText(JSON.stringify(rawResult.value, null, 2)); }} className="text-sm font-semibold text-[#1f6a58]">Pretty Format</button><button type="button" onClick={() => { setRawText(backendText); applyFlowText(backendText); }} className="text-sm font-semibold text-[#1f6a58]">Reset to backend</button></div><JsonEditor label="Flow JSON" value={rawText} onChange={setRawText} /></div> : null}{mappingError && tab === "raw" ? <p role="alert" className="rounded-xl border border-[#f7d899] bg-[#fffaf0] p-3 text-sm text-[#8b5b17]">{mappingError}</p> : null}{validationError ? <p role="alert" className="text-sm text-[#b42318]">{validationError}</p> : null}<div className="flex flex-wrap gap-2"><button type="button" disabled={!canEdit || isSaving} onClick={() => submit(false)} className="rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{isSaving ? "Saving…" : workflow ? "Save" : "Create"}</button>{workflow ? <><button type="button" disabled={!capabilities.canPublishWorkflows || isSaving} onClick={() => submit(true)} className="rounded-full border border-[#1f6a58] px-4 py-2 text-sm font-semibold text-[#1f6a58] disabled:opacity-60">Publish</button><button type="button" disabled={isSaving || !capabilities.canDeleteWorkflows} onClick={onDelete} className="rounded-full border border-[#c74f42] px-4 py-2 text-sm font-semibold text-[#b42318] disabled:opacity-60">Delete</button></> : null}</div></div></WorkspaceCard>;
}
