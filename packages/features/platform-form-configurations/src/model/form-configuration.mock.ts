import { formConfigurationCopy as copy } from "../constants/form-configuration-copy";
import { getEventCompositeFieldDefinition } from "./event-composite-field-definitions";
import type { ConfiguredField, CoreFieldRegistryItem, FormConfiguration, FormSection } from "./form-configuration.types";

export const mockTenants = [
  { id: "tenant-aurora", name: copy.mock.tenants.aurora }, { id: "tenant-wellness", name: copy.mock.tenants.wellness }, { id: "tenant-horizon", name: copy.mock.tenants.horizon }, { id: "tenant-vital", name: copy.mock.tenants.vital },
];

/** Creates deterministic local seed identities; mock state never implies a server ID. */
export function createSeededSections(): FormSection[] {
  return Object.entries(copy.seededSections).map(([key, name], index) => ({ localId: `section-${key}`, serverId: null, stableKey: `section_${key}`, name, description: "", enabled: true, position: index + 1 }));
}

/** Creates local seed fields compatible with the future Event Form Configuration contract. */
export function createSeededFields(registry: readonly CoreFieldRegistryItem[], sections = createSeededSections()): ConfiguredField[] {
  const fields: Array<[string, string]> = [["title", "section-basic"], ["description", "section-basic"], ["category", "section-basic"], ["start_date", "section-schedule"], ["end_date", "section-schedule"], ["time_zone", "section-schedule"], ["location_id", "section-location"], ["delivery_mode", "section-location"], ["price", "section-pricing"], ["currency", "section-pricing"], ["ticket_types", "section-pricing"], ["capacity", "section-capacity"], ["primary_image", "section-media"], ["sessions", "section-additional"], ["custom_fields", "section-additional"]];
  return fields.flatMap(([coreKey, sectionLocalId], index) => { const definition = registry.find((field) => field.key === coreKey); if (!definition) return []; const composite = getEventCompositeFieldDefinition(coreKey); return [{ localId: `field-core-${coreKey}`, serverId: null, stableKey: `core_${coreKey}`, source: "core" as const, coreKey, label: definition.displayName, sectionLocalId: sections.some((section) => section.localId === sectionLocalId) ? sectionLocalId : sections[0]?.localId ?? "", position: index + 1, valueType: definition.valueType, required: definition.requiredByDomain, renderer: definition.defaultRenderer, placeholder: "", helpText: "", options: [], validation: {}, ...(composite ? { compositeConfig: { enabled_fields: composite.subfields.map((subfield) => subfield.key), required_fields: [] } } : {}), enabled: true }]; });
}

export function createMockConfiguration(id = "default-event-form", registry: readonly CoreFieldRegistryItem[] = []): FormConfiguration {
  const sections = createSeededSections();
  return { id, type: "event", name: copy.mock.defaultName, description: copy.mock.defaultDescription, scope: "global", status: "published", active: true, version: 1, tenantIds: [], updatedAt: "2026-09-03", sections, fields: createSeededFields(registry, sections) };
}

export const mockFormConfigurations: FormConfiguration[] = [];
