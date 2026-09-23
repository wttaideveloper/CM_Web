"use client";

import { formConfigurationCopy as copy } from "../constants/form-configuration-copy";
import { getEventCompositeFieldDefinition } from "../model/event-composite-field-definitions";
import { getEventCoreFieldSemantic, isEventCoreFieldRuntimeSourced } from "../model/event-core-field-semantics";
import type { ConfiguredField, CoreFieldRegistryItem, FormConfiguration, FormFieldOption } from "../model/form-configuration.types";

function previewOptionKey(option: FormFieldOption, index: number): string {
  return `${option.value}\u001f${option.label}\u001f${option.position}\u001f${index}`;
}

function PreviewField({ field, registry }: { field: ConfiguredField; registry: readonly CoreFieldRegistryItem[] }) {
  const base = "mt-1.5 w-full rounded-lg border border-[#cfe0d8] bg-white px-3 py-2 text-sm";
  const compositeDefinition = field.source === "core" ? getEventCompositeFieldDefinition(field.coreKey) : undefined;
  const taxonomySemantic = field.source === "core" ? getEventCoreFieldSemantic(field.coreKey) : undefined;
  const registryField = field.coreKey ? registry.find((item) => item.key === field.coreKey) : undefined;
  const registryRuntimeSourced = Boolean(registryField?.valueSource || registryField?.sourceEndpoint);
  if (compositeDefinition) {
    const enabledFields = field.compositeConfig?.enabled_fields ?? compositeDefinition.subfields.map((subfield) => subfield.key);
    const labels = compositeDefinition.subfields.filter((subfield) => enabledFields.includes(subfield.key)).map((subfield) => subfield.label);
    return <span className="mt-1.5 block rounded-lg border border-[#cfe0d8] bg-[#f7fbf8] p-3 font-normal"><span className="block font-semibold text-[#06201c]">{compositeDefinition.title}</span><span className="mt-1 block text-xs text-[#52736a]">{labels.length ? `${compositeDefinition.fieldNoun[0]?.toUpperCase()}${compositeDefinition.fieldNoun.slice(1)} fields: ${labels.join(", ")}` : compositeDefinition.description}</span></span>;
  }
  if (taxonomySemantic && isEventCoreFieldRuntimeSourced(field.coreKey)) return <div><select aria-label={field.label} disabled className={base}><option>{taxonomySemantic.optionsSource === "event_categories" ? "Event Categories (loaded at runtime)" : "Enterprise locations (loaded at runtime)"}</option></select><span className="mt-1 block text-xs font-normal text-[#52736a]">{taxonomySemantic.description}</span></div>;
  if (registryRuntimeSourced) return <div><select aria-label={field.label} disabled className={base}><option>Training values (loaded at runtime)</option></select><span className="mt-1 block text-xs font-normal text-[#52736a]">Values are supplied by the Training runtime source.</span></div>;
  if (field.renderer === "textarea") return <textarea aria-label={field.label} placeholder={field.placeholder} className={`${base} min-h-20`} />;
  if (field.renderer === "select" || field.renderer === "multi_select") {
    const multiSelect = field.renderer === "multi_select";
    const selectClass = multiSelect ? `${base} min-h-24 max-h-40 overflow-y-auto leading-7` : base;
    return <select aria-label={field.label} multiple={multiSelect} className={selectClass}>{!multiSelect && field.placeholder ? <option value="" disabled hidden>{field.placeholder}</option> : null}{field.options.map((option, index) => <option key={previewOptionKey(option, index)}>{option.label}</option>)}</select>;
  }
  if (field.renderer === "checkbox") return <input aria-label={field.label} type="checkbox" className="ml-2 mt-1.5 inline-block h-4 w-4 align-middle accent-[#1f6a58]" />;
  return <input aria-label={field.label} type={field.renderer === "datetime" ? "datetime-local" : field.renderer} placeholder={field.placeholder} className={base} />;
}

/** Renders fields entirely from local configuration state and never submits Event data. */
export function ConfigurationPreview({ configuration, registry = [] }: { configuration: FormConfiguration; registry?: readonly CoreFieldRegistryItem[] }) {
  return <section className="rounded-2xl border border-[#dfe9e4] bg-[#f7fbf8] p-5"><h3 className="text-lg font-bold text-[#06201c]">{copy.preview}</h3><p className="mt-1 text-sm text-[#52736a]">{copy.previewDescription}</p><div className="mt-5 space-y-5">{[...configuration.sections].sort((a, b) => a.position - b.position).filter((section) => section.enabled).map((section) => { const fields = configuration.fields.filter((field) => field.sectionLocalId === section.localId && field.enabled).sort((a, b) => a.position - b.position); return <div key={section.localId} className="rounded-xl border border-[#dfe9e4] bg-white p-4"><h4 className="font-bold text-[#06201c]">{section.name}</h4>{section.description ? <p className="mt-1 text-sm text-[#52736a]">{section.description}</p> : null}<div className="mt-4 grid gap-4 md:grid-cols-2">{fields.length ? fields.map((field) => <label key={field.localId} className="text-sm font-semibold text-[#355a51]">{field.label}{field.required ? " *" : ""}<PreviewField field={field} registry={registry} />{field.helpText ? <span className="mt-1 block text-xs font-normal text-[#52736a]">{field.helpText}</span> : null}</label>) : <p className="text-sm text-[#52736a]">{copy.noFields}</p>}</div></div>; })}</div></section>;
}
