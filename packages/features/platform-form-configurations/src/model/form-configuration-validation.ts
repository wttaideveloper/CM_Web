import { getEventCompositeFieldDefinition } from "./event-composite-field-definitions";
import type { ConfiguredField, CoreFieldRegistryItem, FormConfiguration } from "./form-configuration.types";

export type PersistedAssignmentState = {
  isPersisted: boolean;
  isLoaded: boolean;
  tenantIds: readonly string[];
  isDirty: boolean;
};

/** A client-detectable publish issue tied to the configuration, a section, or a field. */
export type FormConfigurationValidationIssue = {
  code: "domain-required" | "invalid-renderer" | "invalid-composite-required-fields" | "missing-core-registry-entry" | "selective-tenant-required" | "selective-assignments-dirty" | "selective-assignments-loading" | "duplicate-core-key";
  message: string;
  sectionLocalId?: string;
  fieldLocalId?: string;
};

function fieldName(field: ConfiguredField): string { return field.label || field.coreKey || "Field"; }

/** Validates only registry-derived publish rules without mutating persisted draft data. */
export function validateFormConfiguration(configuration: FormConfiguration, registry: readonly CoreFieldRegistryItem[], persistedAssignments?: PersistedAssignmentState): FormConfigurationValidationIssue[] {
  const scopeIssues = validateSelectiveAssignments(configuration, persistedAssignments);
  const duplicateCoreKeyIssues = validateDuplicateCoreKeys(configuration.fields);
  return [...scopeIssues, ...duplicateCoreKeyIssues, ...configuration.fields.flatMap((field) => {
    if (field.source !== "core") return validateCompositeRequiredFields(field);
    const definition = registry.find((item) => item.key === field.coreKey);
    if (!definition) return [{ code: "missing-core-registry-entry" as const, message: `${fieldName(field)} is not available in the authoritative field registry.`, sectionLocalId: field.sectionLocalId, fieldLocalId: field.localId }];
    const issues: FormConfigurationValidationIssue[] = [];
    if (definition.requiredByDomain && !field.required) issues.push({ code: "domain-required", message: `${fieldName(field)} must be required by the Event domain.`, sectionLocalId: field.sectionLocalId, fieldLocalId: field.localId });
    if (!definition.allowedRenderers.includes(field.renderer)) issues.push({ code: "invalid-renderer", message: `${fieldName(field)} uses renderer '${field.renderer}', which is not allowed by the field registry.`, sectionLocalId: field.sectionLocalId, fieldLocalId: field.localId });
    return [...issues, ...validateCompositeRequiredFields(field)];
  })];
}

function validateSelectiveAssignments(configuration: FormConfiguration, persisted?: PersistedAssignmentState): FormConfigurationValidationIssue[] {
  if (configuration.scope !== "selective") return [];
  if (!persisted?.isPersisted) {
    return configuration.tenantIds.length === 0
      ? [{ code: "selective-tenant-required", message: "Select at least one tenant before publishing this selective configuration." }]
      : [];
  }
  if (!persisted.isLoaded) return [{ code: "selective-assignments-loading", message: "Tenant assignments are still loading. Please wait before publishing." }];
  if (persisted.isDirty) return [{ code: "selective-assignments-dirty", message: "Save tenant assignments before publishing." }];
  return persisted.tenantIds.length === 0
    ? [{ code: "selective-tenant-required", message: "Select at least one tenant before publishing this selective configuration." }]
    : [];
}

function validateDuplicateCoreKeys(fields: readonly ConfiguredField[]): FormConfigurationValidationIssue[] {
  const counts = fields.reduce<Map<string, number>>((result, field) => {
    if (field.source === "core" && field.coreKey) result.set(field.coreKey, (result.get(field.coreKey) ?? 0) + 1);
    return result;
  }, new Map());
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([coreKey]) => ({ code: "duplicate-core-key" as const, message: `Core field '${coreKey}' appears more than once. Remove duplicate core fields before publishing.` }));
}

function validateCompositeRequiredFields(field: ConfiguredField): FormConfigurationValidationIssue[] {
  const requiredFields = field.compositeConfig?.required_fields ?? [];
  if (!requiredFields.length) return [];
  const composite = getEventCompositeFieldDefinition(field.coreKey);
  const enabledFields = field.compositeConfig?.enabled_fields ?? composite?.subfields.map((subfield) => subfield.key) ?? [];
  const invalidRequiredFields = requiredFields.filter((key) => !enabledFields.includes(key));
  return invalidRequiredFields.length ? [{ code: "invalid-composite-required-fields", message: `${fieldName(field)} has required nested fields that are not enabled: ${invalidRequiredFields.join(", ")}.`, sectionLocalId: field.sectionLocalId, fieldLocalId: field.localId }] : [];
}
