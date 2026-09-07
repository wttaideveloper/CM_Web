"use client";

import type { EventFormCompositeConfig } from "../model/event-form-configuration-api.types";
import type { EventCompositeFieldDefinition } from "../model/event-composite-field-definitions";
import type { ConfiguredField, CoreFieldRegistryItem } from "../model/form-configuration.types";

type CompositeFieldEditorProps = {
  field: ConfiguredField;
  core: CoreFieldRegistryItem;
  definition: EventCompositeFieldDefinition;
  onChange: (patch: Partial<ConfiguredField>) => void;
};

const configuredSubfieldKeys = (field: ConfiguredField, definition: EventCompositeFieldDefinition): string[] => field.compositeConfig?.enabled_fields ?? definition.subfields.map((subfield) => subfield.key);

/** Edits backend-persisted semantic settings for a recognised composite Event core field. */
export function CompositeFieldEditor({ field, core, definition, onChange }: CompositeFieldEditorProps) {
  const enabledFields = configuredSubfieldKeys(field, definition);
  const requiredFields = field.compositeConfig?.required_fields ?? [];
  const updateCompositeConfig = (nextEnabledFields: string[], nextRequiredFields: string[]) => {
    const compositeConfig: EventFormCompositeConfig = {
      ...field.compositeConfig,
      enabled_fields: nextEnabledFields,
      required_fields: nextRequiredFields.filter((key) => nextEnabledFields.includes(key)),
    };
    onChange({ compositeConfig });
  };
  const setEnabled = (key: string, enabled: boolean) => {
    const nextEnabledFields = enabled ? [...enabledFields, key] : enabledFields.filter((item) => item !== key);
    updateCompositeConfig(nextEnabledFields, requiredFields);
  };
  const setRequired = (key: string, required: boolean) => updateCompositeConfig(enabledFields, required ? [...requiredFields, key] : requiredFields.filter((item) => item !== key));

  return <div className="mt-4 space-y-4">
    <div className="rounded-xl border border-[#dfe9e4] bg-[#f7fbf8] p-3">
      <p className="font-semibold text-[#06201c]">{definition.title}</p>
      <p className="mt-1 text-sm text-[#52736a]">{definition.description}</p>
      <p className="mt-2 text-xs text-[#52736a]">Renderer: <code>{field.renderer}</code></p>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      {core.configurable.label ? <TextControl label="Label" value={field.label} onChange={(label) => onChange({ label })} /> : null}
      {core.configurable.helpText ? <TextControl label="Help text" value={field.helpText} onChange={(helpText) => onChange({ helpText })} /> : null}
      {core.configurable.required ? <CheckboxControl label="Required" checked={field.required} disabled={core.requiredByDomain} onChange={(required) => onChange({ required })} /> : null}
      <CheckboxControl label="Enabled" checked={field.enabled} disabled={!core.hideable} onChange={(enabled) => onChange({ enabled })} />
    </div>
    {definition.subfields.length ? <fieldset className="rounded-xl border border-[#edf3f0] p-3">
      <legend className="px-1 text-sm font-semibold text-[#355a51]">Available {definition.fieldNoun} fields</legend>
      <div className="space-y-2">
        {definition.subfields.map((subfield, index) => <div key={subfield.key}>
          {subfield.group && (index === 0 || definition.subfields[index - 1]?.group !== subfield.group) ? <p className="pb-1 pt-2 text-xs font-bold uppercase tracking-wide text-[#52736a]">{subfield.group}</p> : null}
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg bg-[#f7fbf8] px-3 py-2">
            <CheckboxControl label={subfield.label} checked={enabledFields.includes(subfield.key)} onChange={(enabled) => setEnabled(subfield.key, enabled)} />
            <CheckboxControl label="Required" checked={requiredFields.includes(subfield.key)} disabled={!enabledFields.includes(subfield.key)} onChange={(required) => setRequired(subfield.key, required)} />
          </div>
        </div>)}
      </div>
    </fieldset> : <p className="rounded-xl border border-[#edf3f0] bg-[#f7fbf8] p-3 text-sm text-[#52736a]">This {definition.fieldNoun} capability has no nested fields to configure.</p>}
  </div>;
}

function CheckboxControl({ label, checked, disabled = false, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex items-center gap-2 text-sm text-[#355a51]"><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />{label}</label>;
}

function TextControl({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="text-sm font-semibold text-[#355a51]"><span>{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#cfe0d8] px-3 py-2 font-normal" /></label>;
}
