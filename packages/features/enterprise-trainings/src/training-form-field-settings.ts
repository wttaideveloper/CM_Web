import type { CreateTrainingFormValues } from "./create-training-form";
import type { TrainingFormField } from "./training-form-config.service";

/** Local-only sentinel marking the "Other (custom value)" choice before its text is resolved. */
export const TRAINING_OTHER_OPTION_VALUE = "__ihp_training_other_option__";

function hasValue(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined;
}

function configuredValue(
  field: TrainingFormField,
  values: CreateTrainingFormValues,
  customValues: Record<string, unknown>,
): unknown {
  if (field.key in values) return values[field.key as keyof CreateTrainingFormValues];
  for (const key of [field.apiKey, field.stable_key, field.key]) {
    if (key && customValues[key] !== undefined) return customValues[key];
  }
  return undefined;
}

function isUnsupportedTrainingField(field: TrainingFormField): boolean {
  const normalize = (value: string) => value.trim().toLowerCase().replace(/^(core_|custom_)/, "").replace(/[\s-]+/g, "_");
  const unsupportedKeys = new Set(["course_type", "course_types", "badge", "badges", "milestone_badges", "prerequisite", "prerequisites"]);
  const keys = [field.key, field.apiKey, field.stable_key].filter((key): key is string => Boolean(key));
  return keys.some((key) => unsupportedKeys.has(normalize(key)))
    || unsupportedKeys.has(normalize(field.label));
}

export function isTrainingFormFieldVisible(
  field: TrainingFormField,
  allFields: readonly TrainingFormField[],
  values: CreateTrainingFormValues,
  customValues: Record<string, unknown>,
): boolean {
  if (isUnsupportedTrainingField(field)) return false;
  return evaluateFieldVisibility(field, allFields, values, customValues, new Set());
}

function evaluateFieldVisibility(
  field: TrainingFormField,
  allFields: readonly TrainingFormField[],
  values: CreateTrainingFormValues,
  customValues: Record<string, unknown>,
  visited: ReadonlySet<TrainingFormField>,
): boolean {
  if (field.enabled === false || visited.has(field)) return false;
  const condition = field.frontendSettings?.visibility;
  if (!condition) return true;
  const source = allFields.find((candidate) =>
    candidate.key.replace(/^(core_|custom_)/, "") === condition.field_key
    || candidate.stable_key?.replace(/^(core_|custom_)/, "") === condition.field_key,
  );
  if (!source) return false;
  if (!evaluateFieldVisibility(source, allFields, values, customValues, new Set([...visited, field]))) return false;
  const value = configuredValue(source, values, customValues);
  if (condition.operator === "has_value") return hasValue(value);
  if (condition.operator === "is_empty") return !hasValue(value);
  const matches = Array.isArray(value)
    ? value.some((item) => String(item) === condition.value)
    : String(value ?? "") === (condition.value ?? "");
  return condition.operator === "equals" ? matches : !matches;
}
