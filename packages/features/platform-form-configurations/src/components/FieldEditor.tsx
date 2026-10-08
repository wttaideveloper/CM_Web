"use client";

import { useState } from "react";

import { formConfigurationCopy as copy } from "../constants/form-configuration-copy";
import { trainingFormConfigurationCopy } from "../constants/training-form-configuration-copy";
import { getEventCompositeFieldDefinition } from "../model/event-composite-field-definitions";
import { getTrainingCompositeFieldDefinition } from "../model/training-composite-field-definitions";
import { getEventCoreFieldSemantic, isEventCoreFieldRuntimeSourced } from "../model/event-core-field-semantics";
import { normalizeOptionPositions } from "../model/form-configuration-ordering";
import { isTrainingDeliveryModeField, TRAINING_DELIVERY_MODE_OPTIONS } from "../model/training-delivery-mode-options";
import type { ConfiguredField, CoreFieldRegistryItem, FormFieldOption, FormFieldValidation, FormRenderer } from "../model/form-configuration.types";
import { CompositeFieldEditor } from "./CompositeFieldEditor";
import { isEventDeliveryDependentKey } from "../model/event-delivery-bundle";
import { TrainingFieldSettingsEditor } from "./TrainingFieldSettingsEditor";
import { getStandardReferenceOptions, type StandardReferenceField } from "../model/standard-reference-options";

const renderers = Object.keys(copy.fieldTypes) as FormRenderer[];
const textEntryRenderers = new Set(["text", "textarea", "url"]);

function isTrainingTagInputField(field: ConfiguredField): boolean {
  const key = (field.coreKey ?? field.stableKey ?? "").replace(/^(core_|custom_)/, "").toLowerCase();
  const label = field.label.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return ["learning_objectives", "tags"].some((name) => key === name || key.endsWith(`_${name}`) || label === name);
}

function isTrainingTagsField(field: ConfiguredField): boolean {
  const key = (field.coreKey ?? field.stableKey ?? "").replace(/^(core_|custom_)/, "").toLowerCase();
  const label = field.label.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return ["tags", "learning_objectives"].some((name) => key === name || key.endsWith(`_${name}`) || label === name);
}

function frontendSettingsForInputMode(field: ConfiguredField, mode: "text" | "tags"): NonNullable<ConfiguredField["compositeConfig"]>["frontend_settings"] {
  const current = field.compositeConfig?.frontend_settings;
  const settings = current && typeof current === "object" && !Array.isArray(current)
    ? { ...(current as Record<string, unknown>) }
    : {};
  settings.input_mode = mode;
  return settings;
}

function valueTypeForRenderer(renderer: FormRenderer): string {
  if (renderer === "number") return "number";
  if (renderer === "checkbox") return "boolean";
  if (renderer === "multi_select") return "string[]";
  return "string";
}

const formatPresets = [
  { value: "", label: "No special format", description: "Accept any text; use the length limits above if needed.", pattern: null },
  { value: "letters-spaces", label: "Letters and spaces", description: "For names or labels. Example: Ana María", pattern: "^[A-Za-z ]+$" },
  { value: "letters-numbers-spaces", label: "Letters, numbers, and spaces", description: "For general text that may include numbers. Example: Room 204", pattern: "^[A-Za-z0-9 ]+$" },
  { value: "email", label: "Email address", description: "For values such as name@example.com.", pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" },
  { value: "phone", label: "Phone number", description: "Allows digits, spaces, parentheses, +, and hyphens (7–20 characters).", pattern: "^\\+?[0-9() -]{7,20}$" },
] as const;

/** Edits a selected field while preserving registry and taxonomy constraints. */
export function FieldEditor({ field, registry, trainingFields, isTrainingConfiguration = false, validationErrors = [], onChange, onRemoveFromForm }: { field: ConfiguredField; registry: readonly CoreFieldRegistryItem[]; trainingFields?: readonly ConfiguredField[]; isTrainingConfiguration?: boolean; validationErrors?: readonly string[]; onChange: (patch: Partial<ConfiguredField>) => void; onRemoveFromForm: () => void }) {
  const core = field.coreKey ? registry.find((item) => item.key === field.coreKey) : undefined;
  const taxonomySemantic = field.source === "core" ? getEventCoreFieldSemantic(field.coreKey) : undefined;
  const trainingDeliveryMode = isTrainingConfiguration && isTrainingDeliveryModeField(field);
  const trainingReferenceField = isTrainingConfiguration && field.source === "core"
    && (field.coreKey === "currency" || field.coreKey === "time_zone")
    ? field.coreKey as StandardReferenceField
    : null;
  const trainingTaxonomyField = isTrainingConfiguration
    && field.source === "core"
    && (field.coreKey === "category" || field.coreKey === "subcategory");
  const registryRuntimeSourced = Boolean(core?.valueSource || core?.sourceEndpoint);
  const runtimeSourced = field.source === "core" && !trainingDeliveryMode && (isEventCoreFieldRuntimeSourced(field.coreKey) || registryRuntimeSourced);
  const trainingTagInputField = isTrainingConfiguration && isTrainingTagInputField(field);
  const trainingTagsField = isTrainingConfiguration && isTrainingTagsField(field);
  const rawFrontendSettings = field.compositeConfig?.frontend_settings;
  const configuredInputMode = rawFrontendSettings && typeof rawFrontendSettings === "object" && !Array.isArray(rawFrontendSettings)
    ? (rawFrontendSettings as Record<string, unknown>).input_mode
    : undefined;
  const trainingInputMode = trainingTagsField
    ? "tags"
    : configuredInputMode === "text" || configuredInputMode === "tags"
    ? configuredInputMode
    : field.renderer === "tags" || field.label.trim().toLowerCase() === "learning objectives" ? "tags" : "text";
  const allowedRenderers = (core?.allowedRenderers ?? renderers)
    .map((renderer) => isTrainingConfiguration && renderer === "select" ? "dropdown" : renderer)
    .filter((renderer) => !isTrainingConfiguration || (renderer !== "multi_select" && renderer !== "select"));
  const fieldRenderers = trainingTagInputField
    ? trainingTagsField ? ["tags"] : [...new Set(["text", ...allowedRenderers, "tags"])]
    : allowedRenderers;
  const displayedRenderer = trainingTagInputField
    ? trainingInputMode === "tags" ? "tags" : fieldRenderers.includes(field.renderer) ? field.renderer : "text"
    : field.renderer;
  const optionsReadOnly = trainingDeliveryMode || taxonomySemantic?.optionsSource === "domain_owned";
  const compositeDefinition = isTrainingConfiguration
    ? getTrainingCompositeFieldDefinition(field.coreKey ?? field.stableKey, field.label)
    : field.source === "core" ? getEventCompositeFieldDefinition(field.coreKey) : undefined;
  const rendererCanChange = !runtimeSourced && !trainingDeliveryMode && fieldRenderers.length > 1
    && (!core || (core.configurable.renderer && (core.allowedRenderers.length > 1 || trainingTagInputField)));
  const changeRenderer = (renderer: string) => {
    if (trainingTagInputField) {
      const inputMode = renderer === "tags" ? "tags" : "text";
      const nextCompositeConfig = { ...field.compositeConfig, frontend_settings: frontendSettingsForInputMode(field, inputMode) };
      if (renderer === "tags") {
        onChange({ compositeConfig: nextCompositeConfig });
        return;
      }
      onChange({ renderer: renderer as FormRenderer, valueType: valueTypeForRenderer(renderer), compositeConfig: nextCompositeConfig });
      return;
    }
    onChange({ renderer: renderer as FormRenderer, valueType: valueTypeForRenderer(renderer) });
  };
  const isDeliveryDependent = !isTrainingConfiguration && isEventDeliveryDependentKey(field.coreKey);
  const canRemoveFromForm = field.source === "custom" || !core || (core.removable && !isDeliveryDependent);
  const trainingTagsMode = trainingTagInputField && displayedRenderer === "tags";
  const textValidation = !trainingTagsMode && !(isTrainingConfiguration && field.renderer === "url") && (field.valueType === "string" || field.valueType === "url") && textEntryRenderers.has(field.renderer) && !runtimeSourced && !trainingDeliveryMode;
  const numberValidation = !trainingTagsMode && field.valueType === "number";
  const updateOption = (index: number, patch: Partial<FormFieldOption>) => onChange({ options: normalizeOptionPositions(field.options.map((option, optionIndex) => optionIndex === index ? { ...option, ...patch } : option)) });
  const moveOption = (index: number, amount: number) => { const target = index + amount; if (target < 0 || target >= field.options.length) return; const options = [...field.options]; [options[index], options[target]] = [options[target], options[index]]; onChange({ options: normalizeOptionPositions(options) }); };
  const setValidation = (patch: Partial<FormFieldValidation>) => onChange({ validation: { ...field.validation, ...patch } });

  return <article data-delivery-bundle-field={isDeliveryDependent ? field.coreKey ?? undefined : undefined} className="min-w-0 max-w-full rounded-xl border border-[#dfe9e4] bg-white p-4"><style>{`article fieldset > div > div { min-width: 0; grid-template-columns: minmax(0, 1fr); } @media (min-width: 640px) { article fieldset > div > div { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto; } } article fieldset > div > div > input { min-width: 0; width: 100%; } article fieldset > div > div > span { display: flex; flex-wrap: wrap; } article button[aria-label="Delete"] { font-size: 0; } article button[aria-label="Delete"]::after { content: "Remove"; font-size: 0.875rem; } article[data-delivery-bundle-field="delivery_mode"]::before { content: "Delivery Mode controls Venue, Meeting Provider, and Meeting Link. Removing Delivery Mode removes these related fields; moving it moves them together."; display: block; margin-bottom: 1rem; border: 1px solid #cfe0d8; border-radius: 0.75rem; background: #f4faf7; padding: 0.75rem; color: #355a51; font-size: 0.875rem; line-height: 1.4; } article[data-delivery-bundle-field="venue"]::before, article[data-delivery-bundle-field="meeting_provider"]::before, article[data-delivery-bundle-field="meeting_link"]::before { content: "Managed by Delivery Mode. This field cannot be removed or moved independently."; display: block; margin-bottom: 1rem; border: 1px solid #dfe9e4; border-radius: 0.75rem; background: #f8fbf9; padding: 0.75rem; color: #52736a; font-size: 0.875rem; line-height: 1.4; }`}</style>
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-bold text-[#06201c]">{field.label} <span className="ml-2 rounded-full bg-[#eef6f2] px-2 py-0.5 text-xs text-[#1f6a58]">{field.source === "core" ? copy.core : copy.custom}</span></p>{canRemoveFromForm ? <button type="button" onClick={onRemoveFromForm} className="text-sm font-semibold text-[#b42318]">{copy.removeFromForm}</button> : <span className="text-xs text-[#52736a]">{copy.cannotRemoveFromForm}</span>}</div>
    {validationErrors.length ? <div role="alert" className="mt-3 rounded-lg border border-[#f0c8c4] bg-[#fff8f7] p-3 text-sm font-semibold text-[#b42318]">{validationErrors.map((message) => <p key={message}>{message}</p>)}</div> : null}
    <p className="mt-3 text-xs leading-5 text-[#52736a]">{isTrainingConfiguration ? copy.trainingFieldEditorUserHelp : copy.eventFieldEditorUserHelp}</p>
    {core && !taxonomySemantic && !trainingDeliveryMode && !core.allowedRenderers.includes(field.renderer) ? <button type="button" onClick={() => onChange({ renderer: core.defaultRenderer, valueType: core.valueType })} className="mt-3 rounded-full border border-[#cfe0d8] px-3 py-1.5 text-sm font-bold text-[#1f6a58]">Use registry renderer: {core.defaultRenderer}</button> : null}
    {core && core.requiredByDomain && !field.required ? <button type="button" onClick={() => onChange({ required: true })} className="mt-3 rounded-full border border-[#cfe0d8] px-3 py-1.5 text-sm font-bold text-[#1f6a58]">Mark required by the {isTrainingConfiguration ? "Training" : "Event"} domain</button> : null}
    {compositeDefinition && (isTrainingConfiguration || core) ? (
      <CompositeFieldEditor field={field} core={core} definition={compositeDefinition} onChange={onChange} />
    ) : (
      <>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {!core || core.configurable.label ? <TextControl label={copy.label} value={field.label} onChange={(label) => onChange({ label })} /> : null}
          {rendererCanChange ? <SelectControl label={copy.renderer} value={displayedRenderer} onChange={changeRenderer} options={fieldRenderers.map((renderer) => [renderer, renderer === "tags" ? copy.tagsInput : (isTrainingConfiguration ? trainingFormConfigurationCopy.fieldTypes[renderer as keyof typeof trainingFormConfigurationCopy.fieldTypes] : copy.fieldTypes[renderer as keyof typeof copy.fieldTypes]) ?? renderer])} /> : null}
          {!core || core.configurable.placeholder ? <TextControl label={copy.placeholder} value={field.placeholder} onChange={(placeholder) => onChange({ placeholder })} /> : null}
          {!core || core.configurable.helpText ? <TextAreaControl label={copy.helpText} value={field.helpText} onChange={(helpText) => onChange({ helpText })} /> : null}
          <label className="flex items-center gap-2 pt-6 text-sm text-[#355a51]">
            <input type="checkbox" checked={field.required} disabled={Boolean(core && (!core.configurable.required || (core.requiredByDomain && field.required)))} onChange={(event) => onChange({ required: core?.requiredByDomain ? true : event.target.checked })} />
            {copy.required}
            {core && !core.configurable.required ? <span className="text-xs text-[#52736a]">(managed by the field definition)</span> : null}
          </label>
          <label className="flex items-center gap-2 pt-6 text-sm text-[#355a51]">
            <input type="checkbox" checked={field.enabled} disabled={Boolean(core && !core.hideable)} onChange={(event) => onChange({ enabled: event.target.checked, ...(!event.target.checked ? { required: false } : {}) })} />
            {copy.enabled}
          </label>
          <p className="md:col-span-2 text-xs leading-5 text-[#52736a]">{copy.fieldEnabledHelp}</p>
        </div>
        {trainingReferenceField ? <StandardReferenceOptionEditor field={trainingReferenceField} options={field.options} onChange={(options) => onChange({ options })} /> : (!runtimeSourced && (field.renderer === "dropdown" || (!isTrainingConfiguration && (field.renderer === "select" || field.renderer === "multi_select")))) ? (optionsReadOnly ? <ReadOnlyOptionEditor options={trainingDeliveryMode ? TRAINING_DELIVERY_MODE_OPTIONS : field.options} domainName={trainingDeliveryMode ? "Training" : "Event"} /> : <OptionEditor options={field.options} onChange={(options) => onChange({ options: normalizeOptionPositions(options) })} onUpdate={updateOption} onMove={moveOption} />) : null}
      </>
    )}
    {trainingTaxonomyField ? (
      <fieldset className="mt-4 rounded-xl border border-[#edf3f0] bg-[#f7fbf8] p-3">
        <legend className="px-1 text-sm font-semibold text-[#355a51]">System-provided choices</legend>
        <p className="text-sm text-[#52736a]">Training categories and subcategories are managed in the Training taxonomy.</p>
        <a href="/categories" className="mt-3 inline-flex rounded-full border border-[#1f6a58] px-3 py-2 text-sm font-bold text-[#1f6a58] hover:bg-[#e8f6ee]">
          Manage Training categories
        </a>
      </fieldset>
    ) : null}
    {textValidation ? <ValidationEditor validation={field.validation} onChange={setValidation} text /> : null}
    {(!core || core.configurable.validation) && numberValidation ? <ValidationEditor validation={field.validation} onChange={setValidation} /> : null}
    {trainingFields ? <TrainingFieldSettingsEditor field={field} onChange={(settings) => onChange({ compositeConfig: { ...field.compositeConfig, frontend_settings: settings } })} /> : null}
  </article>;
}

function ValidationEditor({ validation, onChange, text = false }: { validation: FormFieldValidation; onChange: (patch: Partial<FormFieldValidation>) => void; text?: boolean }) {
  if (!text) return <fieldset className="mt-4 grid gap-3 rounded-xl border border-[#edf3f0] p-3 sm:grid-cols-2"><legend className="px-1 text-sm font-semibold text-[#355a51]">{copy.validation}</legend><NumberControl label={copy.minimum} value={validation.min} onChange={(min) => onChange({ min })} /><NumberControl label={copy.maximum} value={validation.max} onChange={(max) => onChange({ max })} /></fieldset>;
  const minInvalid = validation.minLength !== null && validation.minLength !== undefined && validation.minLength < 0;
  const maxInvalid = validation.maxLength !== null && validation.maxLength !== undefined && validation.maxLength < 0;
  const rangeInvalid = validation.minLength !== null && validation.maxLength !== null && validation.minLength !== undefined && validation.maxLength !== undefined && validation.minLength > validation.maxLength;
  let patternInvalid = false; try { if (validation.pattern) new RegExp(validation.pattern); } catch { patternInvalid = true; }
  const selectedPreset = formatPresets.find((preset) => preset.pattern === (validation.pattern ?? null));
  const formatChoice = selectedPreset?.value ?? "";
  const hasExistingCustomPattern = Boolean(validation.pattern) && !selectedPreset;
  const setFormatChoice = (value: string) => {
    const preset = formatPresets.find((item) => item.value === value);
    onChange({ pattern: preset?.pattern ?? null });
  };
  return <fieldset className="mt-4 rounded-xl border border-[#edf3f0] p-3"><legend className="px-1 text-sm font-semibold text-[#355a51]">{copy.validation}</legend><p className="mb-3 text-xs font-normal text-[#52736a]">{copy.validationIntro}</p><div className="grid gap-3 sm:grid-cols-2"><NumberControl label={copy.minLength} placeholder="e.g. 3" value={validation.minLength} onChange={(minLength) => onChange({ minLength })} /><NumberControl label={copy.maxLength} placeholder="e.g. 100" value={validation.maxLength} onChange={(maxLength) => onChange({ maxLength })} /></div>{minInvalid ? <p className="mt-2 text-xs font-semibold text-[#b42318]">Minimum characters cannot be less than 0.</p> : null}{maxInvalid ? <p className="mt-2 text-xs font-semibold text-[#b42318]">Maximum characters cannot be less than 0.</p> : null}{rangeInvalid ? <p className="mt-2 text-xs font-semibold text-[#b42318]">Minimum characters cannot be greater than maximum characters.</p> : null}<div className="mt-4"><label className="text-sm font-semibold text-[#355a51]"><span>{copy.formatType}</span><select aria-label={copy.formatType} value={formatChoice} onChange={(event) => setFormatChoice(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#cfe0d8] bg-white px-3 py-2 font-normal">{formatPresets.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}</select></label>{hasExistingCustomPattern ? <p className="mt-1 text-xs font-normal text-[#52736a]">{copy.existingCustomFormatRetained}</p> : <p className="mt-1 text-xs font-normal text-[#52736a]">{formatPresets.find((preset) => preset.value === formatChoice)?.description}</p>}{patternInvalid ? <p className="mt-1 text-xs font-semibold text-[#b42318]">This existing format rule is not valid. Choose a preset to replace it.</p> : null}</div></fieldset>;
}
function makeOptionValue(label: string, options: readonly FormFieldOption[], currentIndex: number): string { const base = label.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "option"; let value = base; let suffix = 2; while (options.some((option, index) => index !== currentIndex && option.value === value)) value = `${base}_${suffix++}`; return value; }
function StandardReferenceOptionEditor({ field, options, onChange }: { field: StandardReferenceField; options: readonly FormFieldOption[]; onChange: (options: FormFieldOption[]) => void }) {
  const [searchValue, setSearchValue] = useState("");
  const availableOptions = getStandardReferenceOptions(field);
  const selectedValues = new Set(options.map((option) => option.value));
  const selectedOption = availableOptions.find((option) => option.value === searchValue);
  const normalizedOptions = options.map((option, index) => ({
    ...option,
    label: availableOptions.find((available) => available.value === option.value)?.label ?? option.label,
    position: index + 1,
  }));

  return <fieldset className="mt-4 min-w-0 rounded-xl border border-[#edf3f0] p-3"><legend className="px-1 text-sm font-semibold text-[#355a51]">{copy.options}</legend><p className="mb-3 text-xs text-[#52736a]">{copy.referenceOptionHelp}</p><label className="block text-sm font-semibold text-[#355a51]">{copy.searchReferenceOption}<input list={`training-reference-${field}`} value={searchValue} onChange={(event) => setSearchValue(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#cfe0d8] px-3 py-2 font-normal" /><datalist id={`training-reference-${field}`}>{availableOptions.filter((option) => !selectedValues.has(option.value)).map((option) => <option key={option.value} value={option.value} label={option.label} />)}</datalist></label><button type="button" disabled={!selectedOption || selectedValues.has(searchValue)} onClick={() => { if (!selectedOption) return; onChange([...normalizedOptions, { ...selectedOption, position: normalizedOptions.length + 1 }]); setSearchValue(""); }} className="mt-3 text-sm font-bold text-[#1f6a58] disabled:cursor-not-allowed disabled:opacity-50">{copy.addReferenceOption}</button>{normalizedOptions.length ? <ul className="mt-3 space-y-2">{normalizedOptions.map((option) => <li key={option.value} className="flex items-center justify-between gap-3 rounded-lg border border-[#dfe9e4] bg-white px-3 py-2 text-sm text-[#284940]"><span>{option.label}</span><button type="button" aria-label={copy.removeReferenceOption.replace("{{value}}", option.label)} onClick={() => onChange(normalizedOptions.filter((item) => item.value !== option.value).map((item, index) => ({ ...item, position: index + 1 })))} className="text-sm font-semibold text-[#b42318]">{copy.delete}</button></li>)}</ul> : <p className="mt-3 text-xs text-[#52736a]">{copy.noReferenceOptionsSelected}</p>}</fieldset>;
}
function ReadOnlyOptionEditor({ options, domainName }: { options: readonly FormFieldOption[]; domainName: string }) { return <fieldset className="mt-4 min-w-0 rounded-xl border border-[#edf3f0] bg-[#fbfdfc] p-3"><legend className="px-1 text-sm font-semibold text-[#355a51]">{copy.options}</legend><p className="mb-3 text-xs text-[#52736a]">Options are managed by the {domainName} domain.</p><ul className="space-y-2">{options.map((option) => <li key={option.value} className="rounded-lg border border-[#dfe9e4] bg-white px-3 py-2 text-sm text-[#284940]">{option.label}</li>)}</ul></fieldset>; }
function OptionEditor({ options, onChange, onUpdate, onMove }: { options: FormFieldOption[]; onChange: (options: FormFieldOption[]) => void; onUpdate: (index: number, patch: Partial<FormFieldOption>) => void; onMove: (index: number, amount: number) => void }) { return <fieldset className="mt-4 min-w-0 rounded-xl border border-[#edf3f0] p-3"><legend className="px-1 text-sm font-semibold text-[#355a51]">{copy.options}</legend><div className="min-w-0 space-y-2">{options.map((option, index) => <div key={`option-${index}`} className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"><input aria-label={copy.optionLabel} value={option.label} onChange={(event) => onUpdate(index, { label: event.target.value, ...(option.value ? {} : { value: makeOptionValue(event.target.value, options, index) }) })} className="min-w-0 w-full rounded-lg border border-[#cfe0d8] px-2 py-1.5 text-sm" /><button type="button" aria-label={copy.delete} title={copy.delete} onClick={() => onChange(options.filter((_, itemIndex) => itemIndex !== index))} className="text-sm font-semibold text-[#b42318]">Remove</button></div>)}</div><button type="button" onClick={() => { const label = copy.newOption; onChange([...options, { label, value: makeOptionValue(label, options, -1), position: options.length + 1 }]); }} className="mt-3 text-sm font-bold text-[#1f6a58]">{copy.addOption}</button></fieldset>; }
function TextControl({ label, value, placeholder, onChange }: { label: string; value: string; placeholder?: string; onChange: (value: string) => void }) { return <label className="text-sm font-semibold text-[#355a51]"><span>{label}</span><input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#cfe0d8] px-3 py-2 font-normal" /></label>; }
function TextAreaControl({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="text-sm font-semibold text-[#355a51]"><span>{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 min-h-24 w-full rounded-lg border border-[#cfe0d8] px-3 py-2 font-normal" /></label>; }
function NumberControl({ label, value, placeholder, onChange }: { label: string; value: number | null | undefined; placeholder?: string; onChange: (value: number | null) => void }) { return <label className="text-sm font-semibold text-[#355a51]"><span>{label}</span><input type="number" placeholder={placeholder} value={value ?? ""} onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))} className="mt-1.5 w-full rounded-lg border border-[#cfe0d8] px-3 py-2 font-normal" /></label>; }
function SelectControl({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: readonly (readonly [string, string])[] }) { return <label className="text-sm font-semibold text-[#355a51]"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#cfe0d8] bg-white px-3 py-2 font-normal">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>; }
