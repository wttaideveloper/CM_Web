"use client";

import { formConfigurationCopy as copy } from "../constants/form-configuration-copy";
import { getEventCompositeFieldDefinition } from "../model/event-composite-field-definitions";
import { getTrainingCompositeFieldDefinition } from "../model/training-composite-field-definitions";
import { isTrainingDeliveryModeField, TRAINING_DELIVERY_MODE_OPTIONS } from "../model/training-delivery-mode-options";
import { getEventCoreFieldSemantic, isEventCoreFieldRuntimeSourced } from "../model/event-core-field-semantics";
import type { ConfiguredField, CoreFieldRegistryItem, FormConfiguration, FormFieldOption } from "../model/form-configuration.types";
import { useState } from "react";
import { isTrainingInstructorField } from "../model/training-instructor-field";

function previewOptionKey(option: FormFieldOption, index: number): string {
  return `${option.value}\u001f${option.label}\u001f${option.position}\u001f${index}`;
}

function PreviewField({ field, registry, isTraining }: { field: ConfiguredField; registry: readonly CoreFieldRegistryItem[]; isTraining: boolean }) {
  const base = "mt-1.5 w-full rounded-lg border border-[#cfe0d8] bg-white px-3 py-2 text-sm";
  const renderer = field.renderer.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const compositeDefinition = isTraining
    ? getTrainingCompositeFieldDefinition(field.coreKey ?? field.stableKey, field.label)
    : field.source === "core" ? getEventCompositeFieldDefinition(field.coreKey) : undefined;
  const taxonomySemantic = field.source === "core" ? getEventCoreFieldSemantic(field.coreKey) : undefined;
  const trainingDeliveryMode = isTraining && isTrainingDeliveryModeField(field);
  const frontendSettings = field.compositeConfig?.frontend_settings;
  const inputMode = frontendSettings && typeof frontendSettings === "object" && !Array.isArray(frontendSettings)
    ? (frontendSettings as Record<string, unknown>).input_mode
    : undefined;
  const isLegacyLearningObjectives = isTraining && !inputMode && field.label.trim().toLowerCase() === "learning objectives";
  const registryField = field.coreKey ? registry.find((item) => item.key === field.coreKey) : undefined;
  const registryRuntimeSourced = Boolean(registryField?.valueSource || registryField?.sourceEndpoint);
  if (isTraining && isTrainingInstructorField(field)) return <div><select aria-label={field.label} disabled className={base}><option value="">{field.placeholder || "Select an instructor"}</option></select><span className="mt-1 block text-xs font-normal text-[#52736a]">Active team members are loaded from the tenant members API.</span></div>;
  if (isTraining && (inputMode === "tags" || isLegacyLearningObjectives)) return <div aria-label={`${field.label} tags input`} className="mt-1.5 flex min-h-11 flex-wrap items-center gap-2 rounded-lg border border-[#cfe0d8] bg-white p-2"><span className="rounded-full bg-[#e8f6ee] px-3 py-1 text-xs font-bold text-[#1f6a58]">Example item <span aria-hidden="true">×</span></span><span className="text-xs font-normal text-[#7f9d94]">{field.placeholder || "Type an item and press Enter"}</span></div>;
  if (compositeDefinition) {
    const enabledFields = field.compositeConfig?.enabled_fields ?? compositeDefinition.subfields.map((subfield) => subfield.key);
    const labels = compositeDefinition.subfields.filter((subfield) => enabledFields.includes(subfield.key)).map((subfield) => subfield.label);
    return <span className="mt-1.5 block rounded-lg border border-[#cfe0d8] bg-[#f7fbf8] p-3 font-normal"><span className="block font-semibold text-[#06201c]">{compositeDefinition.title}</span><span className="mt-1 block text-xs text-[#52736a]">{labels.length ? `${compositeDefinition.fieldNoun[0]?.toUpperCase()}${compositeDefinition.fieldNoun.slice(1)} fields: ${labels.join(", ")}` : compositeDefinition.description}</span></span>;
  }
  if (taxonomySemantic && isEventCoreFieldRuntimeSourced(field.coreKey)) return <div><select aria-label={field.label} disabled className={base}><option>{taxonomySemantic.optionsSource === "event_categories" ? "Event Categories (loaded at runtime)" : "Enterprise locations (loaded at runtime)"}</option></select><span className="mt-1 block text-xs font-normal text-[#52736a]">{taxonomySemantic.description}</span></div>;
  if (registryRuntimeSourced && !trainingDeliveryMode) return <div><select aria-label={field.label} disabled className={base}><option>Training values (loaded at runtime)</option></select><span className="mt-1 block text-xs font-normal text-[#52736a]">Values are supplied by the Training runtime source.</span></div>;
  if (["rich_text", "rich_text_editor"].includes(renderer)) return <div className="mt-1.5 overflow-hidden rounded-lg border border-[#cfe0d8] bg-white"><div className="flex flex-wrap gap-1 border-b border-[#dfe9e4] bg-[#f7fbf8] p-2 text-xs font-bold text-[#1f6a58]"><span className="rounded bg-white px-2 py-1">B</span><span className="rounded bg-white px-2 py-1 italic">I</span><span className="rounded bg-white px-2 py-1 underline">U</span><span className="rounded bg-white px-2 py-1">H2</span><span className="rounded bg-white px-2 py-1">Link</span></div><textarea aria-label={field.label} placeholder={field.placeholder || "Write formatted content..."} className="min-h-24 w-full resize-y border-0 px-3 py-2 text-sm outline-none" /></div>;
  if (["textarea", "long_text"].includes(renderer)) return <textarea aria-label={field.label} placeholder={field.placeholder} className={`${base} min-h-20`} />;
  if (["dropdown", "select"].includes(renderer)) {
    const options = trainingDeliveryMode ? TRAINING_DELIVERY_MODE_OPTIONS : field.options;
    return <select aria-label={field.label} className={base}>{field.placeholder ? <option value="" disabled hidden>{field.placeholder}</option> : null}{options.map((option, index) => <option key={previewOptionKey(option, index)}>{option.label}</option>)}</select>;
  }
  if (renderer === "radio") return <fieldset className="mt-2 space-y-2 rounded-lg border border-[#dfe9e4] bg-[#fbfdfc] p-3"><legend className="sr-only">{field.label}</legend>{(field.options.length ? field.options : [{ value: "", label: "No options configured", position: 0 }]).map((option, index) => <label key={previewOptionKey(option, index)} className="flex items-center gap-2 text-sm font-normal"><input aria-label={option.label} type="radio" name={`preview-radio-${field.localId}`} disabled={!option.value} />{option.label}</label>)}</fieldset>;
  if (["multi_select", "multiselect", "checkbox_group"].includes(renderer)) return <fieldset className="mt-2 space-y-2 rounded-lg border border-[#dfe9e4] bg-[#fbfdfc] p-3"><legend className="sr-only">{field.label}</legend>{(field.options.length ? field.options : [{ value: "", label: "No options configured", position: 0 }]).map((option, index) => <label key={previewOptionKey(option, index)} className="flex items-center gap-2 text-sm font-normal"><input aria-label={option.label} type="checkbox" disabled={!option.value} />{option.label}</label>)}</fieldset>;
  if (renderer === "checkbox") return <input aria-label={field.label} type="checkbox" className="ml-2 mt-1.5 inline-block h-4 w-4 align-middle accent-[#1f6a58]" />;
  if (renderer === "tags") return <div className={`${base} flex min-h-10 flex-wrap items-center gap-2`}><span className="rounded-full bg-[#e8f6ee] px-2 py-1 text-xs font-semibold text-[#1f6a58]">Example tag</span><span className="text-xs font-normal text-[#7f9d94]">{field.placeholder || "Type a tag and press Enter"}</span></div>;
  if (["additional_images", "media_upload", "supporting_document", "file_upload", "video"].includes(renderer)) return <RepeatablePreviewUpload renderer={renderer} label={field.label} placeholder={field.placeholder} />;
  if (renderer === "datetime") return <span className="mt-1.5 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
    <span className="min-w-0">
      <span className="block text-xs font-normal text-[#52736a]">{copy.previewDate}</span>
      <input aria-label={`${field.label} ${copy.previewDate}`} type="date" className={`${base} mt-1 min-w-0`} />
    </span>
    <span className="min-w-0">
      <span className="block text-xs font-normal text-[#52736a]">{copy.previewTime}</span>
      <input aria-label={`${field.label} ${copy.previewTime}`} type="time" className={`${base} mt-1 min-w-0`} />
    </span>
  </span>;
  return <input aria-label={field.label} type={renderer === "reference_url" || renderer === "url" ? "url" : renderer === "short_text" || renderer === "text_input" ? "text" : renderer} placeholder={field.placeholder} className={base} />;
}

function RepeatablePreviewUpload({ renderer, label, placeholder }: { renderer: string; label: string; placeholder: string }) {
  const [rows, setRows] = useState(() => [""]);
  const isImage = ["additional_images", "media_upload"].includes(renderer);
  const isDocument = ["supporting_document", "file_upload"].includes(renderer);
  const accept = isImage ? "image/*" : isDocument ? ".pdf,.doc,.docx,.zip" : "video/*";
  const updateRow = (index: number, value: string) => setRows((current) => current.map((row, rowIndex) => rowIndex === index ? value : row));
  return <div className="mt-1.5 space-y-2">
    {rows.map((row, index) => <div key={`${label}-${index}`} className="rounded-lg border border-[#dfe9e4] bg-[#fbfdfc] p-2">
      <input aria-label={`${label} URL ${index + 1}`} type="url" value={row} onChange={(event) => updateRow(index, event.target.value)} placeholder={placeholder || (renderer === "video" ? "Paste a YouTube, Vimeo, or video URL" : "Paste a URL or upload a file")} className={basePreviewInput} />
      <label className="mt-2 inline-flex cursor-pointer items-center rounded-full border border-[#cfe0d8] bg-white px-3 py-1.5 text-xs font-bold text-[#1f6a58]">Upload {isImage ? "image" : isDocument ? "document" : "video"}<input type="file" accept={accept} className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) updateRow(index, file.name); }} /></label>
    </div>)}
    <button type="button" onClick={() => setRows((current) => [...current, ""])} className="text-sm font-bold text-[#1f6a58]">+ Add {isImage ? "image" : isDocument ? "document" : "video"}</button>
  </div>;
}

const basePreviewInput = "mt-1.5 h-10 w-full rounded-lg border border-[#cfe0d8] bg-white px-3 text-sm outline-none focus:border-[#1f6a58]";

function fieldIdentifiers(field: ConfiguredField): string[] {
  return [field.coreKey ?? "", field.stableKey ?? "", field.label].map((value) => value.trim().toLowerCase().replace(/[\s-]+/g, "_"));
}

function isTrainingFieldVisible(field: ConfiguredField, deliveryMode: string, pricingType: string): boolean {
  const identifiers = fieldIdentifiers(field);
  const isDeliveryField = identifiers.includes("delivery_mode") || identifiers.some((value) => value.includes("delivery_mode"));
  const isPricingSelector = identifiers.includes("pricing_type") || identifiers.some((value) => value.includes("pricing_type"));
  const isPricingField = identifiers.some((value) => ["price", "currency", "promo_price", "coupon_code"].includes(value))
    || identifiers.some((value) => value.includes("promo_price") || value.includes("coupon_code"));
  const isVenueField = identifiers.some((value) => ["venue", "address", "venue_name", "venue_address"].includes(value));
  const isLiveField = identifiers.some((value) => ["meeting_link", "meeting_provider", "meeting_id", "meeting_passcode", "delivery_instructions"].includes(value))
    || identifiers.some((value) => value.includes("meeting_provider") || value.includes("meeting_link") || value.includes("delivery_instruction"));

  if (isDeliveryField || isPricingSelector) return true;
  if (isPricingField) return pricingType === "paid";
  if (isVenueField) return deliveryMode === "physical" || deliveryMode === "hybrid";
  if (isLiveField) return deliveryMode === "online" || deliveryMode === "hybrid";
  return true;
}

/** Renders fields entirely from local configuration state and never submits Event data. */
export function ConfigurationPreview({ configuration, registry = [] }: { configuration: FormConfiguration; registry?: readonly CoreFieldRegistryItem[] }) {
  const isTraining = configuration.type === "training";
  const [deliveryMode, setDeliveryMode] = useState("hybrid");
  const [pricingType, setPricingType] = useState<"free" | "paid">("free");
  const sections = [...configuration.sections].sort((a, b) => a.position - b.position).filter((section) => section.enabled);

  return <section className="rounded-2xl border border-[#dfe9e4] bg-[#f7fbf8] p-5">
    <h3 className="text-lg font-bold text-[#06201c]">{copy.preview}</h3>
    <p className="mt-1 text-sm text-[#52736a]">{isTraining ? "Preview what Enterprise Admin sees for each delivery and pricing choice." : copy.previewDescription}</p>
    {isTraining ? <div className="mt-4 grid gap-4 rounded-xl border border-[#bce8d1] bg-[#effaf4] p-4 sm:grid-cols-2">
      <label className="text-sm font-semibold text-[#355a51]">Preview delivery mode
        <select value={deliveryMode} onChange={(event) => setDeliveryMode(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#cfe0d8] bg-white px-3 py-2 text-sm">
          <option value="online">Live / Online</option>
          <option value="physical">Venue / Physical</option>
          <option value="hybrid">Hybrid</option>
          <option value="self_paced">Self-paced</option>
        </select>
      </label>
      <label className="text-sm font-semibold text-[#355a51]">Preview pricing
        <select value={pricingType} onChange={(event) => setPricingType(event.target.value as "free" | "paid")} className="mt-1.5 w-full rounded-lg border border-[#cfe0d8] bg-white px-3 py-2 text-sm">
          <option value="free">Free</option>
          <option value="paid">Paid</option>
        </select>
      </label>
      <p className="text-xs text-[#52736a] sm:col-span-2">Fields hidden by these choices will not be shown to Enterprise Admin. Required markers still come from this configuration.</p>
    </div> : null}
    <div className="mt-5 space-y-5">{sections.map((section) => {
      const fields = configuration.fields
        .filter((field) => field.sectionLocalId === section.localId && field.enabled)
        .filter((field) => !isTraining || isTrainingFieldVisible(field, deliveryMode, pricingType))
        .sort((a, b) => a.position - b.position);
      return <div key={section.localId} className="rounded-xl border border-[#dfe9e4] bg-white p-4"><h4 className="font-bold text-[#06201c]">{section.name}</h4>{section.description ? <p className="mt-1 text-sm text-[#52736a]">{section.description}</p> : null}<div className="mt-4 grid gap-4 md:grid-cols-2">{fields.length ? fields.map((field) => <fieldset key={field.localId} className="min-w-0"><label className="text-sm font-semibold text-[#355a51]">{field.label}{field.required ? " *" : ""}<PreviewField field={field} registry={registry} isTraining={isTraining} />{field.helpText ? <span className="mt-1 block text-xs font-normal text-[#52736a]">{field.helpText}</span> : null}</label></fieldset>) : <p className="text-sm text-[#52736a]">{copy.noFields}</p>}</div></div>;
    })}</div>
  </section>;
}
