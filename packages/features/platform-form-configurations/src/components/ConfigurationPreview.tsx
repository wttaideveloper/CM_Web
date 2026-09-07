"use client";

import { formConfigurationCopy as copy } from "../constants/form-configuration-copy";
import { getEventCompositeFieldDefinition } from "../model/event-composite-field-definitions";
import type { ConfiguredField, FormConfiguration } from "../model/form-configuration.types";

function PreviewField({ field }: { field: ConfiguredField }) {
  const base = "mt-1.5 w-full rounded-lg border border-[#cfe0d8] bg-white px-3 py-2 text-sm";
  const compositeDefinition = field.source === "core" ? getEventCompositeFieldDefinition(field.coreKey) : undefined;
  if (compositeDefinition) {
    const enabledFields = field.compositeConfig?.enabled_fields ?? compositeDefinition.subfields.map((subfield) => subfield.key);
    const labels = compositeDefinition.subfields.filter((subfield) => enabledFields.includes(subfield.key)).map((subfield) => subfield.label);
    return <span className="mt-1.5 block rounded-lg border border-[#cfe0d8] bg-[#f7fbf8] p-3 font-normal"><span className="block font-semibold text-[#06201c]">{compositeDefinition.title}</span><span className="mt-1 block text-xs text-[#52736a]">{labels.length ? `${compositeDefinition.fieldNoun[0]?.toUpperCase()}${compositeDefinition.fieldNoun.slice(1)} fields: ${labels.join(", ")}` : compositeDefinition.description}</span></span>;
  }
  if (field.renderer === "textarea") return <textarea aria-label={field.label} placeholder={field.placeholder} className={`${base} min-h-20`} />;
  if (field.renderer === "select" || field.renderer === "multi_select") return <select aria-label={field.label} multiple={field.renderer === "multi_select"} className={base}><option>{field.placeholder}</option>{field.options.map((option) => <option key={option.value}>{option.label}</option>)}</select>;
  if (field.renderer === "checkbox") return <input aria-label={field.label} type="checkbox" className="mt-2 h-4 w-4" />;
  return <input aria-label={field.label} type={field.renderer === "datetime" ? "datetime-local" : field.renderer} placeholder={field.placeholder} className={base} />;
}

/** Renders fields entirely from local configuration state and never submits Event data. */
export function ConfigurationPreview({ configuration }: { configuration: FormConfiguration }) {
  return <section className="rounded-2xl border border-[#dfe9e4] bg-[#f7fbf8] p-5"><h3 className="text-lg font-bold text-[#06201c]">{copy.preview}</h3><p className="mt-1 text-sm text-[#52736a]">{copy.previewDescription}</p><div className="mt-5 space-y-5">{[...configuration.sections].sort((a, b) => a.position - b.position).filter((section) => section.enabled).map((section) => { const fields = configuration.fields.filter((field) => field.sectionLocalId === section.localId && field.enabled).sort((a, b) => a.position - b.position); return <div key={section.localId} className="rounded-xl border border-[#dfe9e4] bg-white p-4"><h4 className="font-bold text-[#06201c]">{section.name}</h4>{section.description ? <p className="mt-1 text-sm text-[#52736a]">{section.description}</p> : null}<div className="mt-4 grid gap-4 md:grid-cols-2">{fields.length ? fields.map((field) => <label key={field.localId} className="text-sm font-semibold text-[#355a51]">{field.label}{field.required ? " *" : ""}<PreviewField field={field} />{field.helpText ? <span className="mt-1 block text-xs font-normal text-[#52736a]">{field.helpText}</span> : null}</label>) : <p className="text-sm text-[#52736a]">{copy.noFields}</p>}</div></div>; })}</div></section>;
}
