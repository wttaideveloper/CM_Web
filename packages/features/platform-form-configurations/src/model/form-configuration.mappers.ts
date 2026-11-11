import type { CreateEventFormConfigurationRequest, EventFormConfiguration, EventFormConfigurationVersion, EventFormFieldInput, EventFormSectionInput, UpdateEventFormConfigurationRequest } from "./event-form-configuration-api.types";
import type { ConfiguredField, FormConfiguration, FormFieldValidation, FormSection } from "./form-configuration.types";
import { normalizeConfigurationOrder, normalizeOptionPositions } from "./form-configuration-ordering";
import { isRemovedCreateEventField } from "./removed-form-fields";

export type EventFormFieldCandidate = EventFormFieldInput;
export type EventFormSectionCandidate = EventFormSectionInput;
export type EventFormConfigurationCreateCandidate = CreateEventFormConfigurationRequest;
export type EventFormConfigurationPatchCandidate = UpdateEventFormConfigurationRequest;

const mapValidation = (validation: FormFieldValidation) => ({ min_length: validation.minLength, max_length: validation.maxLength, min: validation.min, max: validation.max, pattern: validation.pattern });
const mapEventRendererForApi = (renderer: string): string => ({ rich_text: "rich_text_editor", dropdown: "select", radio: "radio_group", checkbox: "multi_select", time: "time_picker", media_upload: "image_uploader", file_upload: "document_uploader", video: "video_input", tags: "tag_input" }[renderer] ?? renderer);
const mapEventRendererForBuilder = (renderer: string): string => ({ rich_text_editor: "rich_text", select: "dropdown", radio_group: "radio", time_picker: "time", image_uploader: "media_upload", media: "media_upload", document_uploader: "file_upload", video_input: "video", tag_input: "tags" }[renderer] ?? renderer);
const mapField = (field: ConfiguredField, includeServerId: boolean): EventFormFieldCandidate => {
  const currentComposite = field.compositeConfig && typeof field.compositeConfig === "object" && !Array.isArray(field.compositeConfig) ? field.compositeConfig : {};
  const currentFrontendSettings = currentComposite.frontend_settings && typeof currentComposite.frontend_settings === "object" && !Array.isArray(currentComposite.frontend_settings) ? currentComposite.frontend_settings : {};
  return { ...(includeServerId && field.serverId ? { id: field.serverId } : {}), source: field.source, core_key: field.coreKey, stable_key: field.stableKey, label: field.label, renderer: mapEventRendererForApi(field.renderer), value_type: field.valueType, required: field.required, is_enabled: field.enabled, position: field.position, placeholder: field.placeholder || null, help_text: field.helpText || null, options: normalizeOptionPositions(field.options), validation: mapValidation(field.validation), composite_config: { ...currentComposite, frontend_settings: { ...currentFrontendSettings, content_visibility: field.contentVisibility ?? "published" } } };
};
const mapSections = (configuration: FormConfiguration, includeServerIds: boolean): EventFormSectionCandidate[] => { const normalized = normalizeConfigurationOrder(configuration.sections, configuration.fields); return normalized.sections.map((section: FormSection) => ({ ...(includeServerIds && section.serverId ? { id: section.serverId } : {}), stable_key: section.stableKey, label: section.name, description: section.description || null, position: section.position, is_enabled: section.enabled, content_visibility: section.contentVisibility ?? "published", fields: normalized.fields.filter((field) => field.sectionLocalId === section.localId && !isRemovedCreateEventField(field.coreKey ?? field.stableKey, field.label)).map((field) => mapField(field, includeServerIds)) })); };
/** Pure future create payload candidate. It intentionally excludes server IDs and write transport. */
export function toEventFormConfigurationCreateCandidate(configuration: FormConfiguration): EventFormConfigurationCreateCandidate { return { name: configuration.name, description: configuration.description || null, scope: configuration.scope, sections: mapSections(configuration, false) }; }
/** Pure future patch payload candidate. Scope and all write transport are intentionally excluded. */
export function toEventFormConfigurationPatchCandidate(configuration: FormConfiguration): EventFormConfigurationPatchCandidate { return { name: configuration.name, description: configuration.description || null, scope: configuration.scope, sections: mapSections(configuration, true) }; }

/** Maps a persisted configuration or immutable version into the existing local builder model. */
export function toBuilderFormConfiguration(configuration: EventFormConfiguration, version?: EventFormConfigurationVersion): FormConfiguration {
  const selectedVersion = version ?? configuration.draft_version ?? configuration.published_version;
  const sections = [...(selectedVersion?.sections ?? [])].sort((left, right) => left.position - right.position);
  const builderSections: FormSection[] = sections.map((section) => ({ localId: `section-${section.id}`, serverId: section.id, stableKey: section.stable_key, name: section.label, description: section.description ?? "", enabled: section.is_enabled, position: section.position, contentVisibility: section.content_visibility === "admin_only" ? "admin_only" : "published" }));
  const builderFields: ConfiguredField[] = sections.flatMap((section) => [...section.fields]
    .filter((field) => !isRemovedCreateEventField(field.core_key, field.label))
    .sort((left, right) => left.position - right.position)
    .map((field) => ({ localId: `field-${field.id}`, serverId: field.id, stableKey: field.stable_key, source: field.source, coreKey: field.core_key, label: field.label, sectionLocalId: `section-${section.id}`, position: field.position, valueType: field.value_type, required: field.required, renderer: mapEventRendererForBuilder(field.renderer), placeholder: field.placeholder ?? "", helpText: field.help_text ?? "", options: field.options, validation: { minLength: field.validation.min_length, maxLength: field.validation.max_length, min: field.validation.min, max: field.validation.max, pattern: field.validation.pattern }, contentVisibility: field.composite_config?.frontend_settings?.content_visibility === "admin_only" ? "admin_only" : "published", compositeConfig: field.composite_config ?? null, enabled: field.is_enabled })));
  return { id: configuration.id, type: "event", name: configuration.name, description: configuration.description ?? "", scope: configuration.scope, status: configuration.status, active: configuration.is_active, version: selectedVersion?.version ?? configuration.current_version, tenantIds: [], updatedAt: configuration.updated_at ?? "", sections: builderSections, fields: builderFields };
}
