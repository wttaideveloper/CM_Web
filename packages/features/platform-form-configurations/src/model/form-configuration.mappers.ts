import type { CreateEventFormConfigurationRequest, EventFormConfiguration, EventFormConfigurationVersion, EventFormFieldInput, EventFormSectionInput, UpdateEventFormConfigurationRequest } from "./event-form-configuration-api.types";
import type { ConfiguredField, FormConfiguration, FormFieldValidation, FormSection } from "./form-configuration.types";
import { normalizeConfigurationOrder, normalizeOptionPositions } from "./form-configuration-ordering";

export type EventFormFieldCandidate = EventFormFieldInput;
export type EventFormSectionCandidate = EventFormSectionInput;
export type EventFormConfigurationCreateCandidate = CreateEventFormConfigurationRequest;
export type EventFormConfigurationPatchCandidate = UpdateEventFormConfigurationRequest;

const mapValidation = (validation: FormFieldValidation) => ({ min_length: validation.minLength, max_length: validation.maxLength, min: validation.min, max: validation.max, pattern: validation.pattern });
const mapField = (field: ConfiguredField, includeServerId: boolean): EventFormFieldCandidate => ({ ...(includeServerId && field.serverId ? { id: field.serverId } : {}), source: field.source, core_key: field.coreKey, stable_key: field.stableKey, label: field.label, renderer: field.renderer, value_type: field.valueType, required: field.required, is_enabled: field.enabled, position: field.position, placeholder: field.placeholder || null, help_text: field.helpText || null, options: normalizeOptionPositions(field.options), validation: mapValidation(field.validation), ...(field.compositeConfig !== undefined ? { composite_config: field.compositeConfig } : {}) });
const mapSections = (configuration: FormConfiguration, includeServerIds: boolean): EventFormSectionCandidate[] => { const normalized = normalizeConfigurationOrder(configuration.sections, configuration.fields); return normalized.sections.map((section: FormSection) => ({ ...(includeServerIds && section.serverId ? { id: section.serverId } : {}), stable_key: section.stableKey, label: section.name, description: section.description || null, position: section.position, is_enabled: section.enabled, fields: normalized.fields.filter((field) => field.sectionLocalId === section.localId).map((field) => mapField(field, includeServerIds)) })); };
/** Pure future create payload candidate. It intentionally excludes server IDs and write transport. */
export function toEventFormConfigurationCreateCandidate(configuration: FormConfiguration): EventFormConfigurationCreateCandidate { return { name: configuration.name, description: configuration.description || null, scope: configuration.scope, sections: mapSections(configuration, false) }; }
/** Pure future patch payload candidate. Scope and all write transport are intentionally excluded. */
export function toEventFormConfigurationPatchCandidate(configuration: FormConfiguration): EventFormConfigurationPatchCandidate { return { name: configuration.name, description: configuration.description || null, scope: configuration.scope, sections: mapSections(configuration, true) }; }

/** Maps a persisted configuration or immutable version into the existing local builder model. */
export function toBuilderFormConfiguration(configuration: EventFormConfiguration, version?: EventFormConfigurationVersion): FormConfiguration {
  const selectedVersion = version ?? configuration.draft_version ?? configuration.published_version;
  const sections = [...(selectedVersion?.sections ?? [])].sort((left, right) => left.position - right.position);
  const builderSections: FormSection[] = sections.map((section) => ({ localId: `section-${section.id}`, serverId: section.id, stableKey: section.stable_key, name: section.label, description: section.description ?? "", enabled: section.is_enabled, position: section.position }));
  const builderFields: ConfiguredField[] = sections.flatMap((section) => [...section.fields]
    .sort((left, right) => left.position - right.position)
    .map((field) => ({ localId: `field-${field.id}`, serverId: field.id, stableKey: field.stable_key, source: field.source, coreKey: field.core_key, label: field.label, sectionLocalId: `section-${section.id}`, position: field.position, valueType: field.value_type, required: field.required, renderer: field.renderer, placeholder: field.placeholder ?? "", helpText: field.help_text ?? "", options: field.options, validation: { minLength: field.validation.min_length, maxLength: field.validation.max_length, min: field.validation.min, max: field.validation.max, pattern: field.validation.pattern }, compositeConfig: field.composite_config ?? null, enabled: field.is_enabled })));
  return { id: configuration.id, type: "event", name: configuration.name, description: configuration.description ?? "", scope: configuration.scope, status: configuration.status, active: configuration.is_active, version: selectedVersion?.version ?? configuration.current_version, tenantIds: [], updatedAt: configuration.updated_at ?? "", sections: builderSections, fields: builderFields };
}
