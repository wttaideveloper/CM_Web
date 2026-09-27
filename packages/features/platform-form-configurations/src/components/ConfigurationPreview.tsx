"use client";

import { formConfigurationCopy as copy } from "../constants/form-configuration-copy";
import { getEventCompositeFieldDefinition } from "../model/event-composite-field-definitions";
import { getEventCoreFieldSemantic, isEventCoreFieldRuntimeSourced } from "../model/event-core-field-semantics";
import type { ConfiguredField, CoreFieldRegistryItem, FormConfiguration, FormFieldOption } from "../model/form-configuration.types";
import { useState } from "react";

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
  const isLiveField = identifiers.some((value) => ["meeting_link", "meeting_provider", "meeting_id", "meeting_passcode", "access_information", "delivery_instructions"].includes(value))
    || identifiers.some((value) => value.includes("meeting_provider") || value.includes("meeting_link") || value.includes("delivery_instruction") || value.includes("access_information"));

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
      return <div key={section.localId} className="rounded-xl border border-[#dfe9e4] bg-white p-4"><h4 className="font-bold text-[#06201c]">{section.name}</h4>{section.description ? <p className="mt-1 text-sm text-[#52736a]">{section.description}</p> : null}<div className="mt-4 grid gap-4 md:grid-cols-2">{fields.length ? fields.map((field) => <label key={field.localId} className="text-sm font-semibold text-[#355a51]">{field.label}{field.required ? " *" : ""}<PreviewField field={field} registry={registry} />{field.helpText ? <span className="mt-1 block text-xs font-normal text-[#52736a]">{field.helpText}</span> : null}</label>) : <p className="text-sm text-[#52736a]">{copy.noFields}</p>}</div></div>;
    })}</div>
  </section>;
}
