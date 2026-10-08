import { getEventCompositeFieldDefinition } from "./event-composite-field-definitions";
import type { ConfiguredField, CoreFieldRegistryItem, FormConfiguration } from "./form-configuration.types";
import { EVENT_DELIVERY_BUNDLE } from "./event-delivery-bundle";

export type PersistedAssignmentState = {
  isPersisted: boolean;
  isLoaded: boolean;
  tenantIds: readonly string[];
  enterpriseIds: readonly string[];
  isDirty: boolean;
  willPersistAssignments?: boolean;
};

/** A client-detectable publish issue tied to the configuration, a section, or a field. */
export type FormConfigurationValidationIssue = {
  severity?: "error" | "warning";
  code: "domain-required" | "missing-domain-required" | "invalid-renderer" | "invalid-composite-required-fields" | "missing-core-registry-entry" | "selective-tenant-required" | "selective-assignments-dirty" | "selective-assignments-loading" | "duplicate-core-key" | "invalid-delivery-bundle" | "subcategory-requires-category" | "paid-pricing-input-missing" | "invalid-training-visibility" | "invalid-training-upload-settings" | "missing-section-name" | "missing-field-label" | "invalid-field-validation" | "invalid-field-options";
  message: string;
  sectionLocalId?: string;
  fieldLocalId?: string;
};

function fieldName(field: ConfiguredField): string { return field.label || field.coreKey || "Field"; }

/** Validates only registry-derived publish rules without mutating persisted draft data. */
export function validateFormConfiguration(configuration: FormConfiguration, registry: readonly CoreFieldRegistryItem[], persistedAssignments?: PersistedAssignmentState): FormConfigurationValidationIssue[] {
  const scopeIssues = validateSelectiveAssignments(configuration, persistedAssignments);
  const duplicateCoreKeyIssues = validateDuplicateCoreKeys(configuration.fields);
  const trainingSettingsIssues = configuration.type === "training" ? validateTrainingFrontendSettings(configuration.fields) : [];
  const deliveryIssues = configuration.type === "event" ? validateEventDeliveryBundle(configuration) : [];
  const eventIssues = configuration.type === "event" ? validateEventConfiguration(configuration) : [];
  const requiredFieldIssues = registry.filter((item) => item.requiredByDomain && !["location", "location_id"].includes(item.key.replace(/^(core_|custom_)/, "").trim().toLowerCase()) && !configuration.fields.some((field) => field.enabled !== false && field.source === "core" && field.coreKey === item.key)).map((item) => ({ severity: "error" as const, code: "missing-domain-required" as const, message: `${item.displayName} is required by the ${configuration.type === "event" ? "Event" : "Training"} domain. Add it from + Add field.`, sectionLocalId: configuration.sections[0]?.localId }));
  const requiredSectionIssues = configuration.sections.flatMap((section) => section.enabled && !section.name.trim()
    ? [{ code: "missing-section-name" as const, message: "Give every enabled section a name before saving or publishing.", sectionLocalId: section.localId }]
    : []);
  return [...scopeIssues, ...duplicateCoreKeyIssues, ...trainingSettingsIssues, ...deliveryIssues, ...eventIssues, ...requiredFieldIssues, ...requiredSectionIssues, ...configuration.fields.flatMap((field) => {
    const runtimeSourced = field.source === "core" && Boolean(registry.find((item) => item.key === field.coreKey)?.valueSource || registry.find((item) => item.key === field.coreKey)?.sourceEndpoint);
    const commonIssues = validateFieldSettings(field, runtimeSourced, configuration.type);
    if (field.enabled && !field.label.trim()) commonIssues.push({ code: "missing-field-label", message: "Give every enabled field a label before saving or publishing.", sectionLocalId: field.sectionLocalId, fieldLocalId: field.localId });
    if (field.source !== "core") return [...commonIssues, ...validateCompositeRequiredFields(field)];
    const definition = registry.find((item) => item.key === field.coreKey);
    // Training registry is still backfilling 23 keys (tags, learning_objectives, start_time etc.) — allow publish and let server validate instead of blocking UI with 23 "not available" issues. Event still enforces strictly.
    if (!definition) {
      if (configuration.type === "training") return [...commonIssues, ...validateCompositeRequiredFields(field)];
      return [...commonIssues, { severity: "error" as const, code: "missing-core-registry-entry" as const, message: `${fieldName(field)} is not available in the authoritative field registry. Remove this field and add it again from + Add field after the registry loads.`, sectionLocalId: field.sectionLocalId, fieldLocalId: field.localId }];
    }
    const issues: FormConfigurationValidationIssue[] = [...commonIssues];
    if (definition.requiredByDomain && !field.required) issues.push({ severity: "error", code: "domain-required", message: `${fieldName(field)} is required by the ${configuration.type === "event" ? "Event" : "Training"} domain. Open the field editor and enable Required.`, sectionLocalId: field.sectionLocalId, fieldLocalId: field.localId });
    if (!definition.allowedRenderers.includes(field.renderer)) {
        if (configuration.type !== "training") issues.push({ severity: "error", code: "invalid-renderer", message: `${fieldName(field)} uses renderer '${field.renderer}', which is not allowed by the field registry. Open the field editor and choose an allowed renderer.`, sectionLocalId: field.sectionLocalId, fieldLocalId: field.localId });
    }
    return [...issues, ...validateCompositeRequiredFields(field)];
  })];
}

function validateFieldSettings(field: ConfiguredField, runtimeSourced: boolean, configurationType: FormConfiguration["type"]): FormConfigurationValidationIssue[] {
  const issues: FormConfigurationValidationIssue[] = [];
  const { min, max, minLength, maxLength, pattern } = field.validation;
  const invalidLength = [minLength, maxLength].some((value) => value !== undefined && value !== null && (!Number.isInteger(value) || value < 0));
  const invalidRange = minLength != null && maxLength != null && minLength > maxLength;
  const invalidNumberRange = (min != null && !Number.isFinite(min)) || (max != null && !Number.isFinite(max)) || (min != null && max != null && min > max);
  let invalidPattern = false;
  try {
    if (pattern) new RegExp(pattern);
  } catch {
    invalidPattern = true;
  }
  if (invalidLength || invalidRange || invalidNumberRange || invalidPattern) {
    const problem = invalidPattern
      ? "format rule is invalid"
      : invalidRange
        ? "minimum length exceeds maximum length"
        : invalidNumberRange
          ? "minimum value exceeds maximum value or contains an invalid number"
          : "length limits must be whole numbers of zero or greater";
    issues.push({
      code: "invalid-field-validation",
      message: `${fieldName(field)} has invalid validation settings: ${problem}. Correct them before saving or publishing.`,
      sectionLocalId: field.sectionLocalId,
      fieldLocalId: field.localId,
    });
  }
  if (!runtimeSourced && (field.renderer === "dropdown" || field.renderer === "select" || field.renderer === "multi_select")) {
    const invalidOptions = field.enabled
      && (field.options.some((option) => !option.label.trim() || !option.value.trim())
        || new Set(field.options.map((option) => option.value)).size !== field.options.length);
    if (invalidOptions || (field.enabled && field.options.length === 0)) {
      issues.push({
        code: "invalid-field-options",
        message: `${fieldName(field)} needs at least one option with a label and unique value.`,
        sectionLocalId: field.sectionLocalId,
        fieldLocalId: field.localId,
      });
    }
  }
  return issues;
}

function validateTrainingFrontendSettings(fields: readonly ConfiguredField[]): FormConfigurationValidationIssue[] {
  const result: FormConfigurationValidationIssue[] = [];
  for (const field of fields) {
    const settings = field.compositeConfig?.frontend_settings;
    if (!settings || typeof settings !== "object" || Array.isArray(settings)) continue;
    const raw = settings as Record<string, unknown>;
    const visibility = raw.visibility;
    if (visibility && typeof visibility === "object" && !Array.isArray(visibility)) {
      const condition = visibility as Record<string, unknown>;
      const hasSource = typeof condition.field_key === "string"
        && fields.some((candidate) => candidate.localId !== field.localId && trainingFieldKey(candidate) === condition.field_key);
      const validOperator = ["equals", "not_equals", "has_value", "is_empty"].includes(String(condition.operator));
      const requiresValue = condition.operator === "equals" || condition.operator === "not_equals";
      if (!hasSource || !validOperator || (requiresValue && typeof condition.value !== "string")) {
        result.push({ code: "invalid-training-visibility", message: `${fieldName(field)} has an invalid visibility rule. Choose an available field and a valid condition.`, sectionLocalId: field.sectionLocalId, fieldLocalId: field.localId });
      }
    }
    const upload = raw.upload;
    if (upload && typeof upload === "object" && !Array.isArray(upload)) {
      const settings = upload as Record<string, unknown>;
      const allowedTypes = settings.allowed_mime_types;
      const maximum = settings.max_file_size_mb;
      const invalidTypes = !Array.isArray(allowedTypes) || allowedTypes.length === 0 || !allowedTypes.every((item) => typeof item === "string");
      const invalidMaximum = maximum !== undefined && maximum !== null
        && (typeof maximum !== "number" || !Number.isInteger(maximum) || maximum < 1 || maximum > 500);
      if (invalidTypes || invalidMaximum) {
        result.push({ code: "invalid-training-upload-settings", message: `${fieldName(field)} must allow at least one file type and use a whole-number size limit from 1 to 500 MB.`, sectionLocalId: field.sectionLocalId, fieldLocalId: field.localId });
      }
    }
  }
  return result;
}

function trainingFieldKey(field: ConfiguredField): string {
  return (field.coreKey ?? field.stableKey ?? field.localId).replace(/^(core_|custom_)/, "");
}

function coreKeys(configuration: FormConfiguration): Set<string> { return new Set(configuration.fields.filter((field) => field.enabled !== false && field.source === "core" && field.coreKey).map((field) => field.coreKey as string)); }

function validateEventConfiguration(configuration: FormConfiguration): FormConfigurationValidationIssue[] {
  const keys = coreKeys(configuration);
  const issues: FormConfigurationValidationIssue[] = [];
  if (keys.has("subcategory") && !keys.has("category")) issues.push({ severity: "error", code: "subcategory-requires-category", message: "Subcategory requires Category to be included in the form. You can add Category from + Add field in the relevant section." });
  if (keys.has("pricing_type")) {
    const pricing = configuration.fields.find((field) => field.coreKey === "pricing_type");
    const hasPaid = !pricing || pricing.options.length === 0 || pricing.options.some((option) => option.value.toLowerCase() === "paid");
    if (hasPaid && !keys.has("price") && !keys.has("ticket_types")) issues.push({ severity: "error", code: "paid-pricing-input-missing", message: "When Pricing Type is included, keep either Price or Ticket Types in the form so paid events can be configured. You can add the missing field from + Add field in the Pricing & Tickets section." });
  }
  return issues;
}

function validateEventDeliveryBundle(configuration: FormConfiguration): FormConfigurationValidationIssue[] {
  const fields = configuration.fields.filter((field) => field.enabled !== false && field.source === "core" && field.coreKey);
  const present = new Map(EVENT_DELIVERY_BUNDLE.map((key) => [key, fields.filter((field) => field.coreKey === key)]));
  const delivery = present.get("delivery_mode")?.[0];
  const dependents = EVENT_DELIVERY_BUNDLE.slice(1).flatMap((key) => present.get(key) ?? []);
  if (!delivery && dependents.length === 0) return [];
  if (!delivery) return [{ severity: "error", code: "invalid-delivery-bundle", message: "Venue, Meeting Provider, and Meeting Link are managed by Delivery Mode and cannot remain independently. Re-add Delivery Mode from + Add field to restore the complete group." }];
  const missing = EVENT_DELIVERY_BUNDLE.slice(1).filter((key) => !(present.get(key)?.length));
  if (missing.length) return [{ severity: "error", code: "invalid-delivery-bundle", message: `Delivery Mode must stay together with Venue, Meeting Provider, and Meeting Link. Missing: ${missing.join(", ")}. Re-add Delivery Mode from + Add field to restore the complete group.`, sectionLocalId: delivery.sectionLocalId, fieldLocalId: delivery.localId }];
  const bundle = EVENT_DELIVERY_BUNDLE.map((key) => present.get(key)![0]);
  if (bundle.some((field) => field.sectionLocalId !== delivery.sectionLocalId)) return [{ severity: "error", code: "invalid-delivery-bundle", message: "Delivery Mode, Venue, Meeting Provider, and Meeting Link must remain in one section. Move the Delivery Mode group together or re-add Delivery Mode from + Add field.", sectionLocalId: delivery.sectionLocalId, fieldLocalId: delivery.localId }];
  const ordered = configuration.fields.filter((field) => field.sectionLocalId === delivery.sectionLocalId).sort((left, right) => left.position - right.position);
  const start = ordered.findIndex((field) => field.localId === delivery.localId);
  const actual = start >= 0 ? ordered.slice(start, start + EVENT_DELIVERY_BUNDLE.length).map((field) => field.coreKey) : [];
  return JSON.stringify(actual) === JSON.stringify(EVENT_DELIVERY_BUNDLE) ? [] : [{ severity: "error", code: "invalid-delivery-bundle", message: "Delivery Mode, Venue, Meeting Provider, and Meeting Link must be contiguous and in that order. Move the Delivery Mode group together or re-add Delivery Mode from + Add field.", sectionLocalId: delivery.sectionLocalId, fieldLocalId: delivery.localId }];
}

function validateSelectiveAssignments(configuration: FormConfiguration, persisted?: PersistedAssignmentState): FormConfigurationValidationIssue[] {
  if (configuration.scope !== "selective") return [];
  const noAssignmentsMessage = "Select at least one tenant or enterprise in Assignment before saving or publishing this selective configuration.";
  if (persisted?.willPersistAssignments) {
    return configuration.tenantIds.length === 0 && (configuration.enterpriseIds ?? []).length === 0
      ? [{ code: "selective-tenant-required", message: noAssignmentsMessage }]
      : [];
  }
  if (!persisted?.isPersisted) {
    return configuration.tenantIds.length === 0 && (configuration.enterpriseIds ?? []).length === 0
      ? [{ code: "selective-tenant-required", message: noAssignmentsMessage }]
      : [];
  }
  if (!persisted.isLoaded) return [{ severity: "error", code: "selective-assignments-loading", message: "Tenant assignments are still loading. Wait for Assignment to finish loading before saving or publishing." }];
  if (persisted.isDirty) return [{ severity: "error", code: "selective-assignments-dirty", message: "Save the changed tenant or enterprise assignments before saving or publishing this configuration." }];
  return persisted.tenantIds.length === 0 && persisted.enterpriseIds.length === 0
    ? [{ code: "selective-tenant-required", message: noAssignmentsMessage }]
    : [];
}

function validateDuplicateCoreKeys(fields: readonly ConfiguredField[]): FormConfigurationValidationIssue[] {
  const counts = fields.reduce<Map<string, number>>((result, field) => {
    if (field.source === "core" && field.coreKey) result.set(field.coreKey, (result.get(field.coreKey) ?? 0) + 1);
    return result;
  }, new Map());
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([coreKey]) => ({ severity: "error" as const, code: "duplicate-core-key" as const, message: `Core field '${coreKey}' appears more than once. Remove the duplicate field before saving or publishing.` }));
}

function validateCompositeRequiredFields(field: ConfiguredField): FormConfigurationValidationIssue[] {
  const requiredFields = field.compositeConfig?.required_fields ?? [];
  if (!requiredFields.length) return [];
  const composite = getEventCompositeFieldDefinition(field.coreKey);
  const enabledFields = field.compositeConfig?.enabled_fields ?? composite?.subfields.map((subfield) => subfield.key) ?? [];
  const invalidRequiredFields = requiredFields.filter((key) => !enabledFields.includes(key));
  return invalidRequiredFields.length ? [{ severity: "error", code: "invalid-composite-required-fields", message: `${fieldName(field)} has required nested fields that are not enabled: ${invalidRequiredFields.join(", ")}. Open ${fieldName(field)} in the field editor and enable those subfields, or remove them from Required.`, sectionLocalId: field.sectionLocalId, fieldLocalId: field.localId }] : [];
}
