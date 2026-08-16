"use client";

import { useEffect, useState } from "react";

import {
  createEmptyWorkflowFormDefinition,
  isJsonObject,
  parseWorkflowFormDefinition,
  validateWorkflowFormDefinition,
  type JsonObject,
  type WorkflowForm,
  type WorkflowFormDefinition,
} from "@ihp/workflow-runtime";

import type { WorkflowAdminCapabilities } from "../types";
import { FormBuilder } from "./FormBuilder";
import { FormPreview } from "./FormPreview";
import { JsonEditor, parseJsonObject, WorkspaceCard } from "./WorkspacePrimitives";

type EditorTab = "builder" | "preview" | "raw";

type FormEditorProps = {
  form: WorkflowForm | null;
  capabilities: WorkflowAdminCapabilities;
  isSaving: boolean;
  onCreate: (input: { name: string; description: string; definition: JsonObject }) => void;
  onSave: (input: { name: string; description: string; definition: JsonObject }) => void;
  onPublish: (input: { name: string; description: string; definition: JsonObject }) => void;
  onDelete: () => void;
  showRawJson?: boolean;
};

/** Edits Forms through Builder and Preview modes, with optional Raw JSON for technical hosts. */
export function FormEditor({
  form,
  capabilities,
  isSaving,
  onCreate,
  onSave,
  onPublish,
  onDelete,
  showRawJson = true,
}: FormEditorProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [definition, setDefinition] = useState<WorkflowFormDefinition | null>(createEmptyWorkflowFormDefinition());
  const [rawText, setRawText] = useState(JSON.stringify(createEmptyWorkflowFormDefinition(), null, 2));
  const [backendText, setBackendText] = useState(rawText);
  const [mappingError, setMappingError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [tab, setTab] = useState<EditorTab>("builder");

  useEffect(() => {
    const backendDefinition = form?.definition ?? createEmptyWorkflowFormDefinition();
    const text = JSON.stringify(backendDefinition, null, 2);
    const parsed = parseWorkflowFormDefinition(backendDefinition);

    setName(form?.name ?? "");
    setDescription(form?.description ?? "");
    setRawText(text);
    setBackendText(text);
    setDefinition(parsed.definition);
    setMappingError(parsed.error);
    setValidationError(null);
    setTab("builder");
  }, [form]);

  const rawResult = parseJsonObject(rawText);
  const editorTabs: EditorTab[] = showRawJson ? ["builder", "preview", "raw"] : ["builder", "preview"];
  const canEdit = form ? capabilities.canEditForms : capabilities.canCreateForms;

  const applyDefinitionText = (text: string) => {
    const result = parseJsonObject(text);
    if (!result.value) {
      setValidationError(result.error);
      return;
    }

    const parsed = parseWorkflowFormDefinition(result.value);
    setDefinition(parsed.definition);
    setMappingError(parsed.error);
    setValidationError(parsed.error);
    if (!parsed.error) {
      setRawText(JSON.stringify(parsed.definition, null, 2));
    }
  };

  const changeDefinition = (nextDefinition: WorkflowFormDefinition) => {
    setDefinition(nextDefinition);
    setRawText(JSON.stringify(nextDefinition, null, 2));
    setMappingError(null);
    setValidationError(null);
  };

  const submit = (forPublish: boolean) => {
    if (!name.trim()) {
      setValidationError("Form name is required.");
      return;
    }

    const source = definition ?? (rawResult.value ? parseWorkflowFormDefinition(rawResult.value).definition : null);
    if (!source) {
      setValidationError(mappingError ?? "The Form definition cannot be saved from the visual editor.");
      return;
    }

    const error = validateWorkflowFormDefinition(source, forPublish);
    if (error) {
      setValidationError(error);
      return;
    }
    if (!isJsonObject(source)) {
      setValidationError("Form definition must be a JSON object.");
      return;
    }

    setValidationError(null);
    const input = { name: name.trim(), description: description.trim(), definition: source };
    if (forPublish) {
      onPublish(input);
    } else if (form) {
      onSave(input);
    } else {
      onCreate(input);
    }
  };

  return <WorkspaceCard title={form ? "Form editor" : "Create form"} actions={<span className="text-xs text-[#7f9d94]">{form ? `v${form.version}` : "Unsaved"}</span>}><div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold text-[#16332b]">Form Name<input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3" /></label><label className="text-sm font-semibold text-[#16332b]">Description<input value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3" /></label></div><div className="flex gap-4 border-b border-[#e1ebe6]" role="tablist" aria-label="Form editor mode">{editorTabs.map((value) => <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={`border-b-2 pb-2 text-sm font-semibold ${tab === value ? "border-[#1f6a58] text-[#1f6a58]" : "border-transparent text-[#52736a]"}`}>{value === "raw" ? "Raw JSON" : value[0].toUpperCase() + value.slice(1)}</button>)}</div>{tab === "builder" ? definition ? <FormBuilder definition={definition} onChange={changeDefinition} /> : <p role="alert" className="rounded-xl border border-[#f3c8c2] bg-[#fff5f4] p-3 text-sm text-[#b42318]">{mappingError}</p> : null}{tab === "preview" ? definition ? <FormPreview definition={definition} /> : <p className="text-sm text-[#52736a]">Preview is unavailable until this definition uses the documented visual-builder structure.</p> : null}{showRawJson && tab === "raw" ? <div><div className="mb-2 flex gap-3"><button type="button" onClick={() => applyDefinitionText(rawText)} className="text-sm font-semibold text-[#1f6a58]">Validate</button><button type="button" onClick={() => { if (rawResult.value) setRawText(JSON.stringify(rawResult.value, null, 2)); }} className="text-sm font-semibold text-[#1f6a58]">Pretty Format</button><button type="button" onClick={() => { setRawText(backendText); applyDefinitionText(backendText); }} className="text-sm font-semibold text-[#1f6a58]">Reset to backend</button></div><JsonEditor label="Definition JSON" value={rawText} onChange={setRawText} /></div> : null}{validationError ? <p role="alert" className="text-sm text-[#b42318]">{validationError}</p> : null}<div className="flex flex-wrap gap-2"><button type="button" disabled={!canEdit || isSaving} onClick={() => submit(false)} className="rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{isSaving ? "Saving…" : form ? "Save" : "Create"}</button>{form ? <><button type="button" disabled={!capabilities.canPublishForms || isSaving} onClick={() => submit(true)} className="rounded-full border border-[#1f6a58] px-4 py-2 text-sm font-semibold text-[#1f6a58] disabled:opacity-60">Publish</button><button type="button" disabled={!capabilities.canDeleteForms || isSaving} onClick={onDelete} className="rounded-full border border-[#c74f42] px-4 py-2 text-sm font-semibold text-[#b42318] disabled:opacity-60">Delete</button></> : null}</div></div></WorkspaceCard>;
}
