"use client";

import Link from "next/link";
import { useState } from "react";
import { NewBuilderCanvas } from "../components/NewBuilderCanvas";
import { NewBuilderFieldEditor } from "../components/NewBuilderFieldEditor";
import { NewBuilderPreview } from "../components/NewBuilderPreview";
import type { CreateTrainingFormConfigurationRequest } from "../model/training-form-configuration-api.types";
import { useCreateTrainingFormConfiguration, usePublishTrainingFormConfiguration, useUpdateTrainingFormConfiguration } from "../training-form-configurations.queries";
import { toNewBuilderSections, type NewBuilderField, type NewBuilderSection, type NewBuilderSnapshot } from "./new-training-form-builder.types";

const emptyConfiguration = { name: "", description: "", sections: [] as NewBuilderSection[] };
const buttonStyle = "rounded-full border border-[#cfe0d8] bg-white px-4 py-2 text-sm font-bold text-[#1f6a58] hover:bg-[#f2f8f5] disabled:cursor-not-allowed disabled:opacity-50";

/** Standalone blank Training form builder; intentionally does not reuse the existing create/edit builder. */
export function FormBuilder() {
  const create = useCreateTrainingFormConfiguration();
  const update = useUpdateTrainingFormConfiguration();
  const publish = usePublishTrainingFormConfiguration();
  const [configuration, setConfiguration] = useState(emptyConfiguration);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ sectionId: string; fieldId: string } | null>(null);
  const [undoStack, setUndoStack] = useState<NewBuilderSnapshot[]>([]);
  const [tipsOn, setTipsOn] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const currentField = selected ? configuration.sections.find((section) => section.id === selected.sectionId)?.fields.find((field) => field.id === selected.fieldId) ?? null : null;
  const remember = () => setUndoStack((stack) => [...stack.slice(-19), { configuration: structuredClone(configuration), savedId }]);
  const addSection = () => { remember(); const section = { id: crypto.randomUUID(), title: "", enabled: true, fields: [] as NewBuilderField[] }; setConfiguration((current) => ({ ...current, sections: [...current.sections, section] })); setSelected(null); };
  const updateSection = (updated: NewBuilderSection) => setConfiguration((current) => ({ ...current, sections: current.sections.map((section) => section.id === updated.id ? updated : section) }));
  const addField = (sectionId: string) => { remember(); const field: NewBuilderField = { id: crypto.randomUUID(), label: "", type: "short_answer", placeholder: "", required: false, enabled: true, visibility: { enterprise: true, mobile: true }, options: [] }; setConfiguration((current) => ({ ...current, sections: current.sections.map((section) => section.id === sectionId ? { ...section, fields: [...section.fields, field] } : section) })); setSelected({ sectionId, fieldId: field.id }); };
  const updateField = (sectionId: string, field: NewBuilderField) => setConfiguration((current) => ({ ...current, sections: current.sections.map((section) => section.id === sectionId ? { ...section, fields: section.fields.map((item) => item.id === field.id ? field : item) } : section) }));
  const removeField = (sectionId: string, fieldId: string) => { remember(); setConfiguration((current) => ({ ...current, sections: current.sections.map((section) => section.id === sectionId ? { ...section, fields: section.fields.filter((field) => field.id !== fieldId) } : section) })); setSelected(null); };
  const removeSection = (sectionId: string) => { const section = configuration.sections.find((item) => item.id === sectionId); if (!section || !window.confirm(`Delete "${section.title || "Untitled section"}" and its ${section.fields.length} field(s)?`)) return; remember(); setConfiguration((current) => ({ ...current, sections: current.sections.filter((item) => item.id !== sectionId) })); if (selected?.sectionId === sectionId) setSelected(null); };
  const moveSection = (fromId: string, toId: string) => { if (fromId === toId) return; remember(); setConfiguration((current) => { const list = [...current.sections]; const from = list.findIndex((section) => section.id === fromId); const to = list.findIndex((section) => section.id === toId); if (from < 0 || to < 0) return current; const [item] = list.splice(from, 1); list.splice(to, 0, item); return { ...current, sections: list }; }); };
  const moveField = (fieldId: string, targetSectionId: string, targetFieldId?: string) => { const origin = configuration.sections.find((section) => section.fields.some((field) => field.id === fieldId)); if (!origin) return; const target = configuration.sections.find((section) => section.id === targetSectionId); if (!target || (origin.id === target.id && (!targetFieldId || targetFieldId === fieldId))) return; remember(); setConfiguration((current) => { const source = current.sections.find((section) => section.fields.some((field) => field.id === fieldId)); if (!source) return current; const moving = source.fields.find((field) => field.id === fieldId); if (!moving) return current; const without = current.sections.map((section) => ({ ...section, fields: section.fields.filter((field) => field.id !== fieldId) })); const destination = without.find((section) => section.id === targetSectionId); if (!destination) return current; const at = targetFieldId ? destination.fields.findIndex((field) => field.id === targetFieldId) : -1; const fields = [...destination.fields]; fields.splice(at < 0 ? fields.length : at, 0, moving); return { ...current, sections: without.map((section) => section.id === targetSectionId ? { ...section, fields } : section) }; }); };
  const duplicateField = (sectionId: string, field: NewBuilderField) => { remember(); const duplicate = { ...structuredClone(field), id: crypto.randomUUID(), label: field.label ? `${field.label} (copy)` : "" }; setConfiguration((current) => ({ ...current, sections: current.sections.map((section) => section.id === sectionId ? { ...section, fields: [...section.fields, duplicate] } : section) })); setSelected({ sectionId, fieldId: duplicate.id }); };
  const undo = () => { const previous = undoStack.at(-1); if (!previous) return; setConfiguration(structuredClone(previous.configuration)); setSavedId(previous.savedId); setUndoStack((stack) => stack.slice(0, -1)); setSelected(null); setError(""); setFeedback("Last change undone."); };
  const request = (): CreateTrainingFormConfigurationRequest => ({ name: configuration.name.trim(), description: configuration.description.trim() || null, scope: "global", sections: toNewBuilderSections(configuration.sections) });
  const save = async (shouldPublish = false) => {
    setError(""); setFeedback("");
    if (!configuration.name.trim()) { setError("Add a name for this form before saving."); return; }
    if (configuration.name.trim().length > 300) { setError("Form name must be 300 characters or fewer."); return; }
    if (shouldPublish && (!configuration.sections.length || configuration.sections.some((section) => !section.title.trim() || section.fields.some((field) => !field.label.trim())))) { setError("Before publishing, add a section name and a title for every field."); return; }
    setBusy(true);
    try {
      const payload = request();
      let id = savedId;
      if (!id) { const created = await create.mutateAsync(payload); id = created.id; setSavedId(id); }
      else await update.mutateAsync({ configurationId: id, payload });
      if (shouldPublish && id) { await publish.mutateAsync(id); setFeedback("Your form has been saved and published."); }
      else setFeedback("Draft saved. You can return to this form from Training Forms.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "We could not save this form. Please try again."); }
    finally { setBusy(false); }
  };
  return <main className="mx-auto w-full max-w-[1440px] space-y-5 px-3 pb-10 sm:px-6"><header className="rounded-2xl border border-[#dfe9e4] bg-white p-5 shadow-sm sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><Link href="/training-form-configurations" className="text-sm font-semibold text-[#1f6a58]">&lt;- Training Forms</Link><p className="mt-4 text-xs font-bold uppercase tracking-[.2em] text-[#718d84]">Super Admin - New builder</p><h1 className="mt-2 text-2xl font-bold text-[#12352e] sm:text-3xl">Create a Training Form</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#52736a]">Build a blank form with sections and fields. Your existing Training Form workflows are unchanged.</p></div><div className="flex flex-wrap gap-2"><button type="button" disabled={!undoStack.length || busy} onClick={undo} className={buttonStyle}>Undo</button><button type="button" aria-pressed={tipsOn} onClick={() => setTipsOn((value) => !value)} className={buttonStyle}>Tips: {tipsOn ? "ON" : "OFF"}</button><button type="button" aria-pressed={showPreview} onClick={() => setShowPreview((value) => !value)} className={buttonStyle}>{showPreview ? "Back to builder" : "Preview Form"}</button></div></div>
      <div className="mt-5 grid gap-4 md:grid-cols-2"><label className="text-sm font-semibold text-[#355a51]">Form name<input value={configuration.name} maxLength={300} onChange={(event) => setConfiguration((current) => ({ ...current, name: event.target.value }))} placeholder="For example, Training Registration Form" className="mt-1 w-full rounded-xl border border-[#cfe0d8] px-3 py-2.5 outline-none focus:border-[#1f6a58]" /></label><label className="text-sm font-semibold text-[#355a51]">Description <span className="font-normal">(optional)</span><input value={configuration.description} maxLength={1000} onChange={(event) => setConfiguration((current) => ({ ...current, description: event.target.value }))} placeholder="What is this form used for?" className="mt-1 w-full rounded-xl border border-[#cfe0d8] px-3 py-2.5 outline-none focus:border-[#1f6a58]" /></label></div>
      {tipsOn ? <p className="mt-4 rounded-xl bg-[#eef6f2] px-4 py-3 text-sm text-[#355a51]">Start with a section, then add fields inside it. You can choose where each field appears.</p> : null}</header>
    {error ? <p role="alert" className="rounded-xl border border-[#f0c8c4] bg-[#fff8f7] p-4 text-sm font-semibold text-[#b42318]">{error}</p> : null}{feedback ? <p role="status" className="rounded-xl bg-[#eaf5ef] p-4 text-sm font-semibold text-[#1f6a58]">{feedback}</p> : null}
    {showPreview ? <NewBuilderPreview sections={configuration.sections} formName={configuration.name} tipsOn={tipsOn} /> : <div className={currentField ? "grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]" : ""}><NewBuilderCanvas sections={configuration.sections} selectedFieldId={selected?.fieldId ?? null} tipsOn={tipsOn} onSectionChange={updateSection} onFieldSelect={(sectionId, fieldId) => setSelected({ sectionId, fieldId })} onBeforeSectionRename={remember} onAddField={addField} onAddSection={addSection} onDuplicateField={duplicateField} onRemoveField={removeField} onRemoveSection={removeSection} onMoveSection={moveSection} onMoveField={moveField} />{currentField && selected ? <NewBuilderFieldEditor key={currentField.id} field={currentField} onChange={(field) => updateField(selected.sectionId, field)} onBeforeEdit={remember} onRemove={() => removeField(selected.sectionId, currentField.id)} onClose={() => setSelected(null)} /> : null}</div>}
    <footer className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dfe9e4] bg-white p-4"><p className="text-xs text-[#718d84]">{savedId ? "This draft is saved to Training Forms." : "Save a draft to keep your work."}</p><div className="flex gap-2"><button type="button" disabled={busy} onClick={() => void save(false)} className={buttonStyle}>{busy ? "Saving..." : "Save Draft"}</button><button type="button" disabled={busy} onClick={() => void save(true)} className="rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? "Saving..." : "Save and Publish"}</button></div></footer>
  </main>;
}
