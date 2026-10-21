"use client";

import { useState } from "react";
import { MediaUploadField } from "./MediaUploadField";
import type { NewBuilderAudience, NewBuilderField, NewBuilderSection } from "../screens/new-training-form-builder.types";

/** Renders active Training form fields for one audience and skips hidden fields during validation. */
export function FormRenderer({ sections, viewMode, tipsOn = false }: { sections: NewBuilderSection[]; viewMode: NewBuilderAudience; tipsOn?: boolean }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState("");
  const visibleSections = sections.filter((section) => section.enabled && section.fields.some((field) => field.enabled && field.visibility[viewMode]));
  const checkRequiredFields = () => {
    const missing = visibleSections.flatMap((section) => section.fields.filter((field) => field.enabled && field.visibility[viewMode] && field.required && !values[field.id]?.trim()).map((field) => field.label || "Untitled field"));
    setFeedback(missing.length ? `Complete these required fields: ${missing.join(", ")}.` : "All required fields in this form are complete.");
  };
  return <div className={`mx-auto mt-6 space-y-5 ${viewMode === "mobile" ? "max-w-sm rounded-[2rem] border-[5px] border-[#12352e] bg-[#f7fbf9] p-4" : "max-w-3xl"}`}>
    {visibleSections.map((section) => <fieldset key={section.id} className="rounded-xl border border-[#dfe9e4] bg-[#fbfdfc] p-4"><legend className="px-1 text-base font-bold text-[#12352e]">{section.title || "Untitled section"}</legend><div className="space-y-4">{section.fields.filter((field) => field.enabled && field.visibility[viewMode]).map((field) => <RenderedField key={field.id} field={field} value={values[field.id] ?? ""} tipsOn={tipsOn} onValue={(value) => setValues((current) => ({ ...current, [field.id]: value }))} />)}</div></fieldset>)}
    {visibleSections.length === 0 ? <p className="rounded-xl bg-[#f7fbf9] p-5 text-center text-sm text-[#718d84]">No fields are configured for this view yet.</p> : <><button type="button" onClick={checkRequiredFields} className="rounded-full bg-[#1f6a58] px-5 py-2.5 text-sm font-bold text-white">Check required fields</button>{feedback ? <p role="status" className="text-sm font-semibold text-[#1f6a58]">{feedback}</p> : null}</>}</div>;
}

function RenderedField({ field, value, onValue, tipsOn }: { field: NewBuilderField; value: string; onValue: (value: string) => void; tipsOn: boolean }) {
  const id = `training-form-${field.id}`;
  if (field.type === "link_upload") return <MediaUploadField label={field.label} placeholder={field.placeholder} required={field.required} value={value} onChange={onValue} tipsOn={tipsOn} />;
  return <div className="block text-sm font-semibold text-[#355a51]"><label htmlFor={id}>{field.label || "Untitled field"}{field.required ? <span className="ml-1 text-[#b42318]" aria-label="required">*</span> : null}{field.placeholder ? <span className="mt-1 block text-xs font-normal text-[#718d84]">{field.placeholder}</span> : null}</label>
    {field.type === "long_paragraph" ? <textarea id={id} value={value} placeholder={field.placeholder} onChange={(event) => onValue(event.target.value)} className="mt-2 min-h-24 w-full rounded-lg border border-[#cfe0d8] bg-white p-3 font-normal" />
      : field.type === "dropdown" ? <select id={id} value={value} onChange={(event) => onValue(event.target.value)} className="mt-2 w-full rounded-lg border border-[#cfe0d8] bg-white p-3 font-normal"><option value="">{field.placeholder || "Choose an option"}</option>{field.options.filter(Boolean).map((option, index) => <option key={`${index}-${option}`} value={option}>{option}</option>)}</select>
        : field.type === "radio" ? <fieldset className="mt-2 space-y-2"><legend className="sr-only">{field.label}</legend>{field.options.filter(Boolean).map((option) => <label key={option} className="flex items-center gap-2 font-normal"><input type="radio" name={id} checked={value === option} onChange={() => onValue(option)} />{option}</label>)}</fieldset>
          : field.type === "tags" ? <TagsRenderer id={id} value={value} placeholder={field.placeholder} label={field.label} onValue={onValue} />
          : field.type === "checkboxes" ? <fieldset className="mt-2 space-y-2"><legend className="sr-only">{field.label}</legend>{field.options.filter(Boolean).map((option) => <label key={option} className="flex items-center gap-2 font-normal"><input type="checkbox" checked={value.split("|/").includes(option)} onChange={(event) => { const selected = new Set(value.split("|/").filter(Boolean)); if (event.target.checked) selected.add(option); else selected.delete(option); onValue([...selected].join("|/")); }} />{option}</label>)}</fieldset>
            : <input id={id} type={field.type === "number" ? "number" : field.type === "datetime" ? "datetime-local" : "text"} value={value} onChange={(event) => onValue(event.target.value)} placeholder={field.placeholder} className="mt-2 w-full rounded-lg border border-[#cfe0d8] bg-white p-3 font-normal" />}</div>;
}

function TagsRenderer({ id, value, placeholder, label, onValue }: { id: string; value: string; placeholder: string; label: string; onValue: (value: string) => void }) {
  const [entry, setEntry] = useState("");
  let tags: string[] = [];
  try {
    const parsed: unknown = JSON.parse(value || "[]");
    if (Array.isArray(parsed)) tags = parsed.filter((item): item is string => typeof item === "string");
  } catch {
    if (value.trim()) tags = [value.trim()];
  }
  const saveTags = (nextTags: string[]) => onValue(nextTags.length ? JSON.stringify(nextTags) : "");
  const addTag = () => {
    const nextTag = entry.trim();
    if (!nextTag || tags.includes(nextTag)) return;
    saveTags([...tags, nextTag]);
    setEntry("");
  };
  return <div className="mt-2 rounded-lg border border-[#cfe0d8] bg-white p-2"><ul className="flex flex-wrap gap-2">{tags.map((tag) => <li key={tag} className="flex items-center gap-1 rounded-full bg-[#e8f6ee] px-3 py-1 text-xs font-semibold text-[#1f6a58]">{tag}<button type="button" aria-label={`Remove ${tag} from ${label}`} onClick={() => saveTags(tags.filter((item) => item !== tag))} className="ml-1 text-base leading-none">×</button></li>)}</ul><div className="mt-1 flex gap-2"><input id={id} value={entry} onChange={(event) => setEntry(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === ",") { event.preventDefault(); addTag(); } }} placeholder={placeholder || "Type an item and press Enter"} className="min-w-0 flex-1 p-2 font-normal outline-none" /><button type="button" onClick={addTag} className="rounded-md px-3 py-2 text-xs font-bold text-[#1f6a58]">Add</button></div></div>;
}
