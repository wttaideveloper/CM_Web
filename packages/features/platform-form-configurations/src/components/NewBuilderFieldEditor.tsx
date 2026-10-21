"use client";

import { useEffect, useRef } from "react";
import { newBuilderFieldTypes, type NewBuilderField } from "../screens/new-training-form-builder.types";

const control = "mt-1 w-full rounded-xl border border-[#cfe0d8] bg-white px-3 py-2.5 text-sm text-[#12352e] outline-none focus:border-[#1f6a58] focus:ring-2 focus:ring-[#1f6a58]/20";

/** Field settings panel owned exclusively by the New Training Form Builder. */
export function NewBuilderFieldEditor({ field, onChange, onBeforeEdit, onRemove, onClose }: {
  field: NewBuilderField;
  onChange: (field: NewBuilderField) => void;
  onBeforeEdit: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const labelRef = useRef<HTMLInputElement>(null);
  const checkpointTaken = useRef(false);
  useEffect(() => {
    labelRef.current?.focus();
    labelRef.current?.setSelectionRange(0, 0);
  }, [field.id]);
  const update = (changes: Partial<NewBuilderField>) => {
    if (!checkpointTaken.current) {
      onBeforeEdit();
      checkpointTaken.current = true;
    }
    onChange({ ...field, ...changes });
  };
  const hasOptions = field.type === "dropdown" || field.type === "checkboxes" || field.type === "radio";
  return <aside aria-label="Field settings" className="w-full rounded-2xl border border-[#dfe9e4] bg-[#f7fbf9] p-5 lg:sticky lg:top-5 lg:max-h-[calc(100vh-2.5rem)] lg:overflow-y-auto">
    <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold text-[#12352e]">{field.label ? "Edit field" : "Add field"}</h2><button type="button" onClick={onClose} aria-label="Close field settings" className="rounded-full px-3 py-1 text-sm font-bold text-[#52736a] hover:bg-white">Close</button></div>
    <label className="mt-5 block text-sm font-semibold text-[#355a51]">Field label<input ref={labelRef} value={field.label} onChange={(event) => update({ label: event.target.value })} maxLength={200} placeholder="For example, Training materials" className={control} /></label>
    <label className="mt-4 block text-sm font-semibold text-[#355a51]">Field type<select value={field.type} onChange={(event) => update({ type: event.target.value as NewBuilderField["type"], options: ["dropdown", "checkboxes", "radio"].includes(event.target.value) ? (field.options.length ? field.options : [""]) : [] })} className={control}>{newBuilderFieldTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
    <label className="mt-4 block text-sm font-semibold text-[#355a51]">Placeholder or hint <span className="font-normal text-[#718d84]">(optional)</span><input value={field.placeholder} onChange={(event) => update({ placeholder: event.target.value })} maxLength={300} placeholder="Shown inside the field on the Training form" className={control} /></label>
    {hasOptions ? <fieldset className="mt-5"><legend className="text-sm font-semibold text-[#355a51]">Available options</legend><div className="mt-2 space-y-2">{field.options.map((option, index) => <div key={`${field.id}-option-${index}`} className="flex gap-2"><input aria-label={`Option ${index + 1}`} value={option} onChange={(event) => update({ options: field.options.map((item, itemIndex) => itemIndex === index ? event.target.value : item) })} placeholder={`Option ${index + 1}`} className={control} /><button type="button" aria-label={`Remove option ${index + 1}`} disabled={field.options.length <= 1} onClick={() => update({ options: field.options.filter((_, itemIndex) => itemIndex !== index) })} className="mt-1 rounded-lg px-3 text-sm font-bold text-[#a13226] disabled:opacity-40">Remove</button></div>)}</div><button type="button" onClick={() => update({ options: [...field.options, ""] })} className="mt-2 text-sm font-bold text-[#1f6a58]">+ Add option</button></fieldset> : null}
    {field.type === "link_upload" ? <p className="mt-4 rounded-xl bg-white p-3 text-xs leading-5 text-[#52736a]">Supports PNG, JPG, WEBP, and PDF files up to 10 MB. The Enterprise form can accept a link or an upload.</p> : null}
    <fieldset className="mt-5"><legend className="text-sm font-semibold text-[#355a51]">Where should this field appear?</legend><label className="mt-3 flex items-start gap-2 text-sm text-[#355a51]"><input type="checkbox" checked={field.visibility.enterprise} onChange={(event) => update({ visibility: { ...field.visibility, enterprise: event.target.checked } })} className="mt-0.5 accent-[#1f6a58]" />Enterprise Admin form</label><label className="mt-3 flex items-start gap-2 text-sm text-[#355a51]"><input type="checkbox" checked={field.visibility.mobile} onChange={(event) => update({ visibility: { ...field.visibility, mobile: event.target.checked } })} className="mt-0.5 accent-[#1f6a58]" />Mobile user app</label><p className="mt-2 text-xs text-[#718d84]">Hidden or disabled fields are skipped when checking required fields in each view.</p></fieldset>
    <fieldset className="mt-5 border-t border-[#dfe9e4] pt-4"><legend className="sr-only">Field status and requirement</legend><label className="flex items-center gap-2 text-sm font-semibold text-[#355a51]"><input type="checkbox" checked={field.enabled} onChange={(event) => update({ enabled: event.target.checked, required: event.target.checked && field.required })} className="accent-[#1f6a58]" />Enabled</label><label className="mt-3 flex items-center gap-2 text-sm font-semibold text-[#355a51]"><input type="checkbox" checked={field.required} disabled={!field.enabled} onChange={(event) => update({ required: event.target.checked })} className="accent-[#1f6a58]" />Required</label></fieldset>
    <div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-[#dfe9e4] pt-4"><button type="button" onClick={onRemove} className="text-sm font-bold text-[#b42318]">Remove from form</button><button type="button" onClick={onClose} className="rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-bold text-white">Done</button></div>
  </aside>;
}
