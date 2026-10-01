"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentEnterprise, useTenant } from "@ihp/enterprise-runtime";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { TrainingBasicsSection, TrainingCapacitySection, TrainingCourseBuilderSection, TrainingDeliverySection, TrainingMediaSection, TrainingPricingSection, TrainingScheduleSection } from "./CreateTrainingSections";
import { buildCreateTrainingPayload, buildUpdateTrainingPayload, createEmptyTrainingForm, trainingToFormValues, validateTrainingForm, type CreateTrainingFormValues } from "./create-training-form";
import { createTraining, TrainingsApiError, updateTraining, type Training } from "./trainings.service";
import { useActiveTrainingFormConfiguration, useTrainingHistoricalFormConfiguration } from "./training-form-configuration.queries";
import type { TrainingFormConfig, TrainingFormField, TrainingFormSection } from "./training-form-config.service";
import { useTrainingCategories } from "./training-categories.queries";
import { canEditTraining } from "./training-status";
import ConfiguredCreateTrainingSection from "./ConfiguredCreateTrainingSection";
import { isTrainingFormFieldVisible, TRAINING_OTHER_OPTION_VALUE } from "./training-form-field-settings";
import { getRequiredTrainingDeliverySubfields, getRequiredTrainingDeliveryValueKeys, getTrainingDeliveryCompositeValueKeys, isTrainingAccessInformationField } from "./training-delivery-fields";

const steps = ["Basic Information", "Schedule", "Location & Host", "Pricing & Tickets", "Capacity & Registration", "Images & Media", "Additional Configuration"] as const;
const stepFields: ReadonlyArray<readonly string[]> = [
  ["title", "description", "category", "subcategory", "tags", "instructor_id", "requirements"],
  ["start_date", "end_date", "start_time", "end_time", "enrolment_start", "enrolment_end", "time_zone", "duration", "schedule_exceptions"],
  ["location_id", "delivery_mode", "course_type"],
  ["price", "currency", "promo_price", "coupon_code"],
  ["capacity", "requires_approval", "access_duration_days", "access_expiry_type", "access_expiry_days"],
  ["primary_image", "gallery_images", "promotional_video"],
  ["prerequisites", "faqs", "discussions", "announcements", "moderation_history"],
];
// One static section component per entry in `steps`, in the same order — retained
// only for editing older Trainings whose historical form configuration is unavailable.
const staticSectionComponents = [
  TrainingBasicsSection,
  TrainingScheduleSection,
  TrainingDeliverySection,
  TrainingPricingSection,
  TrainingCapacitySection,
  TrainingMediaSection,
  TrainingCourseBuilderSection,
] as const;

type TrainingEditorProps = { mode?: "create" | "edit"; initialTraining?: Training };

function trainingFieldId(key: string): string {
  return `training-field-${key.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function getTrainingFieldAliases(field: TrainingFormField): string[] {
  return [...new Set([field.key, field.apiKey ?? "", field.stable_key ?? "", ...getTrainingDeliveryCompositeValueKeys(field)])];
}

function getTrainingFieldIdentityAliases(field: TrainingFormField): string[] {
  return [...getTrainingFieldAliases(field), field.id, field.label].filter(Boolean);
}

function normalizeTrainingFieldKey(value: string): string {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^(core|custom)_/, "")
    .replace(/^_+|_+$/g, "");
}

function hasConfiguredValue(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined;
}

function isConfiguredTrainingFieldApplicable(field: TrainingFormField, deliveryMode: string, pricingType: string): boolean {
  const identifiers = [field.key, field.stable_key ?? "", field.label].map((value) => value.trim().toLowerCase().replace(/[\s-]+/g, "_"));
  const isLocationField = identifiers.some((value) => ["location", "location_id"].includes(value))
    || identifiers.some((value) => value.includes("location_id"));
  if (isLocationField) return false;
  const isPricingField = identifiers.some((value) => ["price", "currency", "promo_price", "coupon_code"].includes(value))
    || identifiers.some((value) => value.includes("promo_price") || value.includes("coupon_code"));
  if (isPricingField) return pricingType === "paid";
  const isVenueField = identifiers.some((value) => ["venue", "address", "venue_name", "venue_address"].includes(value));
  const isLiveField = identifiers.some((value) => ["meeting_link", "meeting_provider", "meeting_id", "meeting_passcode", "delivery_instructions"].includes(value))
    || identifiers.some((value) => value.includes("meeting_provider") || value.includes("meeting_link") || value.includes("delivery_instruction"));
  if (isVenueField) return deliveryMode === "physical" || deliveryMode === "hybrid";
  if (isLiveField) return deliveryMode === "online" || deliveryMode === "hybrid";
  return true;
}

function validateConfiguredSection(
  section: TrainingFormSection,
  values: CreateTrainingFormValues,
  customValues: Record<string, unknown>,
  allFields: readonly TrainingFormField[],
): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  for (const field of section.fields) {
    if (field.enabled === false
      || isTrainingAccessInformationField(field)
      || !isConfiguredTrainingFieldApplicable(field, values.delivery_mode, values.pricing_type)
      || !isTrainingFormFieldVisible(field, allFields, values, customValues)) continue;
    const aliases = getTrainingFieldAliases(field);
    const valueKey = field.source === "custom" ? undefined : aliases.find((candidate) => candidate in values);
    const key = (valueKey ?? field.key) as keyof CreateTrainingFormValues;
    const value = valueKey
      ? values[key]
      : aliases.map((candidate) => customValues[candidate]).find((candidate) => candidate !== undefined);
    if (value === TRAINING_OTHER_OPTION_VALUE) {
      errors[field.key] = ["Custom entries are not saveable until the Training API documents their configuration and submission format. Select a configured option to save."];
      continue;
    }
    const isBoolean = field.type === "checkbox";
    if (field.required && (!hasConfiguredValue(value) || (isBoolean && value !== true && value !== "true"))) {
      errors[field.key] = [`${field.label} is required.`];
      continue;
    }
    const normalizedFieldKey = normalizeTrainingFieldKey(field.apiKey ?? field.stable_key ?? field.key);
    if (field.source !== "custom"
      && field.configuredOptions?.length
      && ["currency", "time_zone"].includes(normalizedFieldKey)
      && typeof value === "string"
      && value.trim()
      && !field.configuredOptions.some((option) => option.value === value)) {
      errors[field.key] = [`${field.label} is not an available option. Choose a value from the list.`];
      continue;
    }
    if (!hasConfiguredValue(value)) continue;
    const validation = field.validation;
    const textValues: string[] = typeof value === "string"
      ? [value]
      : Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string")
        : [];
    const pattern = validation?.pattern;
    if (pattern && textValues.length > 0) {
      try {
        if (textValues.some((text) => !new RegExp(pattern).test(text))) {
          errors[field.key] = [`${field.label} has an invalid format.`];
        }
      } catch {
        errors[field.key] = [`${field.label} has an invalid validation pattern.`];
      }
    }
    const minLength = validation?.minLength;
    if (minLength != null && textValues.some((text) => text.length < minLength)) {
      errors[field.key] = [`${field.label} must be at least ${minLength} characters.`];
    }
    const maxLength = validation?.maxLength;
    if (maxLength != null && textValues.some((text) => text.length > maxLength)) {
      errors[field.key] = [`${field.label} must be at most ${maxLength} characters.`];
    }
    const isNumber = field.type === "number" || field.valueType === "number";
    const numericValue = isNumber
      ? typeof value === "number"
        ? value
        : typeof value === "string" && value.trim()
          ? Number(value)
          : null
      : null;
    if (numericValue !== null && Number.isFinite(numericValue) && validation?.min != null && numericValue < validation.min) {
      errors[field.key] = [`${field.label} must be at least ${validation.min}.`];
    }
    if (numericValue !== null && Number.isFinite(numericValue) && validation?.max != null && numericValue > validation.max) {
      errors[field.key] = [`${field.label} must be at most ${validation.max}.`];
    }
  }

  return errors;
}

function hydrateConfiguredCustomValues(initialTraining: Training | undefined, activeForm: TrainingFormConfig | null): Record<string, unknown> {
  if (!initialTraining || !activeForm) return {};
  const raw = initialTraining as unknown as Record<string, unknown>;
  const cv = (raw.custom_values ?? raw.customValues) as Record<string, unknown> | Array<{ field_id: string; value: unknown }> | undefined;
  let hydrated: Record<string, unknown> = {};
  if (Array.isArray(cv)) {
    const byId = new Map(cv.map((entry) => [entry.field_id, entry.value]));
    for (const section of activeForm.sections) {
      for (const field of section.fields) {
        const fieldKey = field.key ?? field.apiKey ?? "";
        if (!fieldKey) continue;
        const value = byId.get(field.id) ?? (cv as unknown as Record<string, unknown>)[fieldKey] ?? (field.apiKey ? (cv as unknown as Record<string, unknown>)[field.apiKey] : undefined);
        if (value !== undefined) hydrated[fieldKey] = value;
      }
    }
  } else if (cv && typeof cv === "object") {
    hydrated = Object.fromEntries(Object.entries(cv as Record<string, unknown>));
  } else {
    const known = new Set(Object.keys(createEmptyTrainingForm()));
    for (const [key, value] of Object.entries(raw)) {
      if (!known.has(key) && value != null && value !== "") hydrated[key] = value as unknown;
    }
  }
  return hydrated;
}

/** Renders the shared Enterprise Admin Training editor — uses active Super Admin form (global→enterprise-assigned) when present, else static fallback. */
export default function CreateTrainingScreen({ mode = "create", initialTraining }: TrainingEditorProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  const { enterpriseId } = useCurrentEnterprise();
  const activeFormQ = useActiveTrainingFormConfiguration(mode === "create");
  const historicalFormQ = useTrainingHistoricalFormConfiguration(initialTraining?.id, mode === "edit" && Boolean(initialTraining));
  const activeForm = (mode === "create" ? activeFormQ.data : historicalFormQ.data) ?? null;
  const formConfigLoading = mode === "create" ? activeFormQ.isLoading : historicalFormQ.isLoading;
  const formConfigError = mode === "create" ? activeFormQ.error : historicalFormQ.error;
  const trainingCategoriesQuery = useTrainingCategories(!formConfigLoading);
  const trainingCategories = useMemo(() => trainingCategoriesQuery.data ?? [], [trainingCategoriesQuery.data]);
  const [activeStep, setActiveStep] = useState(0);
  const [initialValues] = useState(() => (initialTraining ? trainingToFormValues(initialTraining) : createEmptyTrainingForm()));
  const [values, setValues] = useState<CreateTrainingFormValues>(() => (initialTraining ? trainingToFormValues(initialTraining) : createEmptyTrainingForm()));
  const [customValues, setCustomValues] = useState<Record<string, unknown>>(() => hydrateConfiguredCustomValues(initialTraining, activeForm));
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingFocusField, setPendingFocusField] = useState<string | null>(null);

  // Backend rejects custom_values keys that collide with top-level TrainingCreate fields
  // (e.g. stale `tags` stored as custom → `400 Unknown custom field: tags`). Only send
  // custom keys that exist in the active form and are not top-level payload keys.
  const sanitizeCustomValues = (basePayload: Record<string, unknown>, raw: Record<string, unknown>): Record<string, unknown> | undefined => {
    const topLevelKeys = new Set(Object.keys(basePayload));
    const knownCoreKeys = new Set([
      "title", "description", "category", "subcategory", "tags", "learning_objectives", "requirements",
      "start_date", "end_date", "start_time", "end_time", "enrolment_start", "enrolment_end", "time_zone",
      "duration", "access_duration_days", "delivery_mode", "course_type", "location_id", "venue", "address",
      "meeting_link", "meeting_provider", "delivery_instructions", "instructor_id", "instructor_name",
      "instructor_bio", "level", "language", "target_audience", "price", "currency",
      "promo_price", "coupon_code", "capacity", "requires_approval", "access_expiry_type", "access_expiry_days",
      "primary_image", "gallery_images",
      "documents", "promotional_video", "notes_pdf_url", "instructor_notes", "prerequisites",
      "subtitle", "faqs", "instructor_photo",
      "instructor_credentials", "badges",
    ]);
    const canonicalFieldKeys = new Map<string, string>();
    for (const section of activeForm?.sections ?? []) {
      for (const field of section.fields) {
        const aliases = getTrainingFieldIdentityAliases(field).map(normalizeTrainingFieldKey).filter(Boolean);
        const preferred = normalizeTrainingFieldKey(field.apiKey ?? field.key);
        if (!preferred) continue;
        const coreField = aliases.find((alias) => knownCoreKeys.has(alias));
        for (const alias of aliases) canonicalFieldKeys.set(alias, coreField ?? preferred);
      }
    }
    const formKeys = new Set((activeForm?.sections ?? []).flatMap((sec) => sec.fields.flatMap((fld) => [fld.key, fld.apiKey].filter((key): key is string => Boolean(key)))));
    const selected = new Map<string, unknown>();
    for (const [key, value] of Object.entries(raw)) {
      const rawNormalizedKey = normalizeTrainingFieldKey(key);
      const normalizedKey = canonicalFieldKeys.get(rawNormalizedKey) ?? rawNormalizedKey;
      if (!key || value === undefined || value === null || value === "") continue;
      if (topLevelKeys.has(key)) continue;
      if (knownCoreKeys.has(normalizedKey)) continue;
      if ([...knownCoreKeys].some((coreKey) => normalizedKey.startsWith(`${coreKey}_`)) && !formKeys.has(key)) continue;
      if (formKeys.size > 0 && !formKeys.has(key) && !formKeys.has(normalizedKey)) continue;
      selected.set(key, value);
    }
    return selected.size ? Object.fromEntries(selected) : undefined;
  };
  const getConfiguredCustomValues = (): Record<string, unknown> => {
    if (!activeForm) return {};
    const allFields = activeForm.sections.flatMap((section) => section.fields);
    return Object.fromEntries(
      activeForm.sections
        .flatMap((section) => section.fields)
        .filter((field) => field.source === "custom" && isTrainingFormFieldVisible(field, allFields, values, customValues))
        .map((field) => {
          const configuredKey = field.apiKey ?? field.key;
          const value =
            (field.apiKey && customValues[field.apiKey] !== undefined ? customValues[field.apiKey] : undefined)
            ?? (field.key in values ? values[field.key as keyof CreateTrainingFormValues] : undefined)
            ?? customValues[field.key]
            ?? customValues[field.apiKey ?? field.key];
          const normalizedAliases = getTrainingFieldIdentityAliases(field).map(normalizeTrainingFieldKey);
          const isLearningObjectives = normalizedAliases.includes("learning_objectives");
          const customValue = isLearningObjectives && Array.isArray(value)
            ? value.filter((objective): objective is string => typeof objective === "string").join("\n")
            : value;
          return [configuredKey, customValue] as const;
        })
        .filter(([, value]) => value !== undefined && value !== null && value !== ""),
    );
  };
  const getVisibleCustomValues = (): Record<string, unknown> => {
    if (!activeForm) return customValues;
    const allFields = activeForm.sections.flatMap((section) => section.fields);
    const visibleCustomKeys = new Set(allFields
      .filter((field) => field.source === "custom" && isTrainingFormFieldVisible(field, allFields, values, customValues))
      .flatMap((field) => [field.key, field.apiKey, field.stable_key].filter((key): key is string => Boolean(key))));
    return Object.fromEntries(Object.entries(customValues).filter(([key]) => visibleCustomKeys.has(key)));
  };
  const applyConfiguredPayload = <T extends Record<string, unknown>>(payload: T): T => {
    if (!activeForm) return payload;
    const allFields = activeForm.sections.flatMap((section) => section.fields);
    const configuredKeys = new Set(allFields
      .filter((field) => isTrainingFormFieldVisible(field, allFields, values, customValues))
      .flatMap((field) => {
        const aliases = getTrainingFieldIdentityAliases(field).map(normalizeTrainingFieldKey);
        const coreField = aliases.find((alias) => Object.prototype.hasOwnProperty.call(payload, alias));
        return coreField ? [coreField] : [field.key];
      }));
    const alwaysIncluded = new Set([
      "tenant_id",
      "enterprise_id",
      "form_configuration_version_id",
      "delivery_mode",
      "venue",
      "address",
      "meeting_link",
      "delivery_instructions",
      "meeting_provider",
      "price",
      "currency",
      "promo_price",
      "coupon_code",
    ]);
    return Object.fromEntries(Object.entries(payload).filter(([key]) => configuredKeys.has(key) || alwaysIncluded.has(key))) as T;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (mode === "edit") {
        if (!initialTraining) throw new Error("The training could not be loaded.");
        if (!canEditTraining(initialTraining.status)) throw new Error("This Training cannot be edited in its current lifecycle state.");
        const baseUpdate = applyConfiguredPayload(buildUpdateTrainingPayload(values) as unknown as Record<string, unknown>);
        const custom = sanitizeCustomValues(baseUpdate as unknown as Record<string, unknown>, { ...getVisibleCustomValues(), ...getConfiguredCustomValues() });
        // Keep sessions: edit form has no sessions editor, so carry the stored array through —
        // otherwise a replace-semantics PUT would wipe it. Never drop server data on edit.
        const initialRaw = initialTraining as unknown as Record<string, unknown>;
        const keptSessions = Array.isArray(initialRaw.sessions) ? (initialRaw.sessions as unknown[]) : undefined;
        const updated = await updateTraining(initialTraining.id, { ...baseUpdate, ...(keptSessions ? { sessions: keptSessions } : {}), ...(custom ? { custom_values: custom } : {}) } as Parameters<typeof updateTraining>[1]);
        return updated;
      }
      if (!tenantId || !enterpriseId) throw new Error("A tenant and enterprise are required.");
      const basePayload = applyConfiguredPayload(buildCreateTrainingPayload(values, tenantId, enterpriseId) as unknown as Record<string, unknown>);
      const custom = sanitizeCustomValues(basePayload as unknown as Record<string, unknown>, { ...getVisibleCustomValues(), ...getConfiguredCustomValues() });
      const payload = (activeForm
        ? { ...basePayload, form_configuration_version_id: activeForm.version_id ?? activeForm.id, ...(custom ? { custom_values: custom } : {}) }
        : basePayload) as unknown as Parameters<typeof createTraining>[0];
      return createTraining(payload);
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["trainings", "list"] });
      window.scrollTo({ top: 0, behavior: "auto" });
      if (initialTraining) {
        await queryClient.invalidateQueries({ queryKey: ["trainings", "detail", initialTraining.id] });
        router.push(`/admin/trainings/${initialTraining.id}`);
      } else {
        router.push(`/admin/trainings/${(data as { id: string }).id}`);
      }
    },
    onError: (error) => {
      if (error instanceof TrainingsApiError) {
        setErrors((current) => ({ ...current, ...error.fieldErrors }));
        setSubmitError(error.status === 401 || error.status === 403 ? "Your session cannot save this training. Please sign in again." : error.message);
      } else {
        setSubmitError(error instanceof Error ? error.message : "Unable to save training.");
      }
    },
  });

  const update = <Key extends keyof CreateTrainingFormValues>(key: Key, value: CreateTrainingFormValues[Key]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: [] }));
    setSubmitError(null);
  };
  useEffect(() => {
    if (!pendingFocusField) return;
    const configuredField = activeForm?.sections
      .flatMap((section) => section.fields)
      .find((field) => getTrainingFieldAliases(field).some((alias) =>
        alias === pendingFocusField || normalizeTrainingFieldKey(alias) === normalizeTrainingFieldKey(pendingFocusField),
      ));
    const fieldKey = configuredField?.key ?? pendingFocusField;
    const direct = [pendingFocusField, fieldKey]
      .map((key) => document.getElementById(trainingFieldId(key)))
      .find((element) => element !== null);
    const wrapper = [...document.querySelectorAll<HTMLElement>("[data-training-field]")]
      .find((element) => element.dataset.trainingField === fieldKey);
    const target = direct ?? wrapper?.querySelector<HTMLElement>("input, select, textarea, button") ?? wrapper;
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    if (target instanceof HTMLElement && target.matches("input, select, textarea, button")) {
      target.focus({ preventScroll: true });
    } else {
      target.querySelector<HTMLElement>("input, select, textarea, button")?.focus({ preventScroll: true });
    }
    setPendingFocusField(null);
  }, [activeForm, activeStep, pendingFocusField]);

  const allErrors = useMemo(() => {
    const allFields = activeForm?.sections.flatMap((section) => section.fields) ?? [];
    const configuredRequiredKeys = activeForm
      ? new Set(allFields.filter((field) => field.enabled !== false && !isTrainingAccessInformationField(field) && isTrainingFormFieldVisible(field, allFields, values, customValues)).flatMap((field) => [
        ...(field.required ? getTrainingFieldAliases(field) : []),
        ...getRequiredTrainingDeliveryValueKeys(field),
      ]))
      : undefined;
    const validationErrors = validateTrainingForm(values, configuredRequiredKeys);
    if (activeForm) {
      for (const field of allFields) {
        if (field.enabled === false || !isTrainingFormFieldVisible(field, allFields, values, customValues)) continue;
        for (const subfield of getRequiredTrainingDeliverySubfields(field)) {
          const value = values[subfield.valueKey as keyof CreateTrainingFormValues];
          if (!hasConfiguredValue(value) && !validationErrors[subfield.valueKey]) {
            validationErrors[subfield.valueKey] = [`${subfield.label} is required.`];
          }
        }
      }
    }
    if (mode === "create" && trainingCategoriesQuery.data) {
      const visibleTaxonomyFields = allFields.filter((field) =>
        isTrainingFormFieldVisible(field, allFields, values, customValues),
      );
      const categoryEnabled = !activeForm || visibleTaxonomyFields.some((field) =>
        field.source === "core" && getTrainingFieldAliases(field).includes("category"),
      );
      const subcategoryField = activeForm
        ? visibleTaxonomyFields.find((field) => field.source === "core" && getTrainingFieldAliases(field).includes("subcategory"))
        : undefined;
      const category = trainingCategories.find((item) => item.parent_id === null && item.name === values.category);
      if (categoryEnabled && values.category && !category) {
        validationErrors.category = ["Choose a valid Training category."];
      }
      if (subcategoryField) {
        const subcategories = category
          ? trainingCategories.filter((item) => item.parent_id === category.id)
          : [];
        if (!category && subcategoryField.required) {
          validationErrors.subcategory = ["Choose a Training category before selecting a subcategory."];
        } else if (values.subcategory && !subcategories.some((item) => item.name === values.subcategory)) {
          validationErrors.subcategory = ["Choose a valid subcategory for the selected Training category."];
        }
      } else if (!activeForm && values.subcategory && category
        && !trainingCategories.some((item) => item.parent_id === category.id && item.name === values.subcategory)) {
        validationErrors.subcategory = ["Choose a valid subcategory for the selected Training category."];
      }
    }
    if (!activeForm) return validationErrors;
    const configuredKeys = new Set(activeForm.sections.flatMap((section) => section.fields.filter((field) => !isTrainingAccessInformationField(field)).flatMap(getTrainingFieldAliases)));
    const businessRuleKeys = new Set(["delivery_mode", "meeting_link", "venue", "address", "price", "currency"]);
    for (const key of Object.keys(validationErrors)) {
      if (!configuredKeys.has(key) && !businessRuleKeys.has(key)) delete validationErrors[key];
    }
    for (const section of activeForm.sections) {
      for (const field of section.fields) {
        if (isTrainingAccessInformationField(field)) continue;
        if (!isConfiguredTrainingFieldApplicable(field, values.delivery_mode, values.pricing_type)
          || !isTrainingFormFieldVisible(field, allFields, values, customValues)) {
          for (const alias of getTrainingFieldAliases(field)) delete validationErrors[alias];
        }
      }
    }
    const configuredErrors = activeForm.sections
      .flatMap((section) => Object.entries(validateConfiguredSection(section, values, customValues, allFields)))
      .reduce<Record<string, string[]>>((result, [key, messages]) => ({ ...result, [key]: messages }), {});
    Object.assign(validationErrors, configuredErrors);
    return validationErrors;
  }, [activeForm, customValues, mode, trainingCategories, trainingCategoriesQuery.data, values]);
  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues);
  const getSectionFieldKeys = (index: number): string[] => activeForm
    ? configuredSections[index]?.fields.flatMap(getTrainingFieldAliases) ?? []
    : [...(stepFields[index] ?? [])];
  const focusValidationError = (key: string, nextErrors: Record<string, string[]>) => {
    setErrors(nextErrors);
    setPendingFocusField(key);
  };
  const continueToNext = () => {
    if (activeForm) {
      const currentSection = configuredSections[activeStep];
      if (currentSection) {
        const allFields = activeForm.sections.flatMap((section) => section.fields);
        const configuredErrors = validateConfiguredSection(currentSection, values, customValues, allFields);
        const currentErrors = Object.fromEntries(
          Object.entries({ ...allErrors, ...configuredErrors }).filter(([field]) =>
            currentSection.fields.some((configuredField: TrainingFormField) => getTrainingFieldAliases(configuredField).includes(field)),
          ),
        );
        if (Object.keys(currentErrors).length > 0) {
          const firstError = Object.keys(currentErrors)[0];
          focusValidationError(firstError, currentErrors);
          return;
        }
      }
      setErrors({});
      setActiveStep((current) => Math.min(current + 1, editorSteps.length - 1));
      return;
    }
    const currentFields = stepFields[activeStep] ?? [];
    const currentErrors = Object.fromEntries(Object.entries(allErrors).filter(([field]) => currentFields.includes(field)));
    if (Object.keys(currentErrors).length > 0) {
      const firstError = Object.keys(currentErrors)[0];
      focusValidationError(firstError, currentErrors);
      return;
    }
    setErrors({});
    setActiveStep((current) => Math.min(current + 1, steps.length - 1));
  };
  const submit = () => {
    if (mode === "edit" && !isDirty) return;
    if (Object.keys(allErrors).length > 0) {
      const firstError = Object.keys(allErrors).find((key) => allErrors[key]?.length);
      if (firstError) {
        const sectionIndex = editorSteps.findIndex((_, index) => getSectionFieldKeys(index).includes(firstError));
        if (sectionIndex >= 0) setActiveStep(sectionIndex);
        focusValidationError(firstError, allErrors);
      } else setErrors(allErrors);
      setSubmitError("Review the highlighted fields before saving.");
      return;
    }
    setSubmitError(null);
    saveMutation.mutate();
  };

  const configuredSections = activeForm ? activeForm.sections
    .map((section) => ({ ...section, fields: section.fields.filter((field) => field.enabled !== false) }))
    .filter((section) => section.fields.length > 0)
    .sort((left, right) => left.order - right.order) : [];
  const editorSteps = activeForm ? [...configuredSections.map(s => s.title || "Section"), "Review & Submit"] : [...steps];
  const sharedProps = {
    values,
    update,
    errors,
    trainingCategories,
    categoriesLoading: trainingCategoriesQuery.isLoading,
    categoriesError: trainingCategoriesQuery.isError,
    retryCategories: () => { void trainingCategoriesQuery.refetch(); },
    preserveLegacyCategoryValues: mode === "edit",
  };
  const StaticSection = staticSectionComponents[activeStep] ?? staticSectionComponents[0];
  const backHref = initialTraining ? `/admin/trainings/${initialTraining.id}` : "/admin/trainings";
  const title = mode === "edit" ? "Edit Training" : "Create Training";
  const isCreateBlockedByEnterprise = mode === "create" && !enterpriseId;

  // Bounded, one-time loading gate (react-query already retries once) so the editor never
  // flashes the static form and then swaps to the dynamic one a moment later.
  if (formConfigLoading) {
    return <div role="status" className="rounded-2xl border border-[#d7e5df] bg-[#f9fcfa] px-5 py-12 text-center text-sm font-semibold text-[#52736a]">{mode === "edit" ? "Loading this Training's form configuration…" : "Loading the Training form configuration…"}</div>;
  }
  const refetchFormConfig = () => void (mode === "edit" ? historicalFormQ.refetch() : activeFormQ.refetch());
  if (mode === "create" && !activeForm) {
    return (
      <div className="w-full">
        <header className="flex flex-col gap-4 border-b border-[#edf3f0] pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link href="/admin/trainings" className="text-sm font-semibold text-[#1f6a58]">Back to Trainings</Link>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">TRAINING FORM</p>
            <h1 className="mt-2 text-2xl font-bold text-[#06201c] sm:text-3xl">Create Training</h1>
          </div>
          <Link href="/admin/trainings" className="inline-flex h-11 items-center justify-center rounded-full border border-[#d7e5df] px-5 text-sm font-semibold text-[#52736a]">Cancel</Link>
        </header>
        <section role={formConfigError ? "alert" : "status"} className="mt-6 rounded-2xl border border-[#eadbb8] bg-[#fffaf0] p-6">
          <h2 className="text-lg font-bold text-[#735c1e]">
            {formConfigError ? "Unable to load the active Training form configuration." : "No active Super Admin Training form configuration is available."}
          </h2>
          <p className="mt-2 text-sm text-[#735c1e]">
            {formConfigError
              ? "Retry loading the active form configuration before creating a Training."
              : "Ask your Super Admin to publish an active Training form configuration before creating a Training."}
          </p>
          <button type="button" onClick={refetchFormConfig} className="mt-4 h-10 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white">
            Retry
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="w-full">
      {mode === "create" && formConfigError ? (
        <div role="alert" className="mb-3 rounded-xl border border-[#eadbb8] bg-[#fffaf0] px-4 py-2 text-xs font-semibold text-[#735c1e]">Could not refresh the active Training form configuration. The previously loaded form remains available. <button type="button" onClick={refetchFormConfig} className="underline">Retry</button></div>
      ) : activeForm ? (
        <div className="mb-3 rounded-xl border border-[#bce8d1] bg-[#effaf4] px-4 py-2 text-xs font-semibold text-[#167550]">{mode === "edit" ? `Historical form: ${activeForm.title}` : `Using Super Admin form: ${activeForm.title}`} {activeForm.is_global ? "(Global)" : `(${activeForm.enterprise_ids.length} enterprises)`} — {configuredSections.length} sections, {configuredSections.reduce((sum, s) => sum + s.fields.length, 0)} fields.</div>
      ) : formConfigError ? (
        <div role="alert" className="mb-3 rounded-xl border border-[#eadbb8] bg-[#fffaf0] px-4 py-2 text-xs font-semibold text-[#735c1e]">Could not load the historical Training form configuration — using the standard edit form instead. <button type="button" onClick={refetchFormConfig} className="underline">Retry</button></div>
      ) : null}
      <header className="flex flex-col gap-4 border-b border-[#edf3f0] pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href={backHref} className="text-sm font-semibold text-[#1f6a58]">Back to {mode === "edit" ? "Training" : "Trainings"}</Link>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">{mode === "edit" ? initialTraining?.status ?? "TRAINING" : "DRAFT TRAINING"}</p>
          <h1 className="mt-2 text-2xl font-bold text-[#06201c] sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm text-[#52736a] sm:text-base">{mode === "edit" ? initialTraining?.title : "Build and review a new training for your enterprise."}</p>
        </div>
        <Link href={backHref} className="inline-flex h-11 items-center justify-center rounded-full border border-[#d7e5df] px-5 text-sm font-semibold text-[#52736a]">Cancel</Link>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav aria-label="Training editor sections" className="rounded-2xl border border-[#e1ebe6] bg-white p-3 shadow-sm">
          {activeForm ? (
            editorSteps.map((step, index) => (
              <button key={`${step}-${index}`} type="button" onClick={() => setActiveStep(index)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold ${getSectionFieldKeys(index).some((key) => errors[key]?.length) ? "text-[#b42318]" : activeStep === index ? "bg-[#e8f6ee] text-[#1f6a58]" : "text-[#52736a] hover:bg-[#f9fcfa]"}`}>
                <span className={`flex h-6 w-6 items-center justify-center rounded-full border border-current text-xs ${getSectionFieldKeys(index).some((key) => errors[key]?.length) ? "bg-[#fff1f0] font-bold" : ""}`}>{getSectionFieldKeys(index).some((key) => errors[key]?.length) ? "!" : index + 1}</span>
                {step}
              </button>
            ))
          ) : (
            steps.map((step, index) => (
              <button key={step} type="button" onClick={() => setActiveStep(index)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold ${getSectionFieldKeys(index).some((key) => errors[key]?.length) ? "text-[#b42318]" : activeStep === index ? "bg-[#e8f6ee] text-[#1f6a58]" : "text-[#52736a] hover:bg-[#f9fcfa]"}`}>
                <span className={`flex h-6 w-6 items-center justify-center rounded-full border border-current text-xs ${getSectionFieldKeys(index).some((key) => errors[key]?.length) ? "bg-[#fff1f0] font-bold" : ""}`}>{getSectionFieldKeys(index).some((key) => errors[key]?.length) ? "!" : index + 1}</span>
                {step}
              </button>
            ))
          )}
        </nav>
        <main className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm sm:p-7">
          {activeForm ? (
            activeStep < configuredSections.length ? (
              <ConfiguredCreateTrainingSection section={configuredSections[activeStep]} allFields={activeForm.sections.flatMap((section) => section.fields)} values={values} update={update} errors={errors} customValues={customValues} setCustomValues={setCustomValues} trainingCategories={trainingCategories} categoriesLoading={trainingCategoriesQuery.isLoading} categoriesError={trainingCategoriesQuery.isError} retryCategories={() => { void trainingCategoriesQuery.refetch(); }} preserveLegacyCategoryValues={mode === "edit"} />
            ) : (
              <section className="space-y-4">
                <h2 className="text-xl font-bold text-[#06201c]">Review & Submit</h2>
                <p className="text-sm text-[#52736a]">Review all sections from the Super Admin global form before creating.</p>
                <div className="grid gap-3">
                  {configuredSections.map((sec) => (
                    <div key={sec.id} className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] px-4 py-3">
                      <p className="text-sm font-bold text-[#06201c]">{sec.title}</p>
                      <div className="mt-2 space-y-1 text-sm text-[#52736a]">
                        {sec.fields.filter((field) => !isTrainingAccessInformationField(field) && isConfiguredTrainingFieldApplicable(field, values.delivery_mode, values.pricing_type) && isTrainingFormFieldVisible(field, activeForm.sections.flatMap((section) => section.fields), values, customValues)).map((field) => {
                          const raw = field.key in values ? values[field.key as keyof CreateTrainingFormValues] : customValues[field.key];
                          const displayValue = Array.isArray(raw) ? raw.join(", ") : typeof raw === "boolean" ? (raw ? "Yes" : "No") : raw === null || raw === undefined || raw === "" ? "Not provided" : String(raw);
                          return <p key={field.id}><span className="font-semibold text-[#06201c]">{field.label}:</span> {displayValue}</p>;
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )
          ) : (
            <StaticSection {...sharedProps} />
          )}
          {isCreateBlockedByEnterprise ? <div role="status" className="mt-6 rounded-xl border border-[#eadbb8] bg-[#fffaf0] px-4 py-3 text-sm font-semibold text-[#735c1e]">Creating a Training is unavailable until an Enterprise is linked. The current backend TrainingCreate contract requires an enterprise_id.</div> : null}
          {submitError ? <div role="alert" className="mt-6 rounded-xl border border-[#f3d0cb] bg-[#fff6f5] px-4 py-3 text-sm font-semibold text-[#b42318]">{submitError}</div> : null}
          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[#edf3f0] pt-5 sm:flex-row sm:justify-between">
            {activeStep > 0 ? <button type="button" onClick={() => setActiveStep((current) => current - 1)} disabled={saveMutation.isPending} className="h-11 rounded-full border border-[#d7e5df] px-5 text-sm font-semibold text-[#52736a] disabled:opacity-50">Back</button> : null}
            {(activeForm ? activeStep === editorSteps.length - 1 : activeStep === steps.length - 1) ? (
              <button type="button" onClick={submit} disabled={saveMutation.isPending || isCreateBlockedByEnterprise || (mode === "edit" && !isDirty)} className="h-11 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm disabled:opacity-60">
                {saveMutation.isPending ? (mode === "edit" ? "Saving..." : "Creating...") : mode === "edit" ? "Save Changes" : "Create Training"}
              </button>
            ) : (
              <button type="button" onClick={continueToNext} className="h-11 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm">Continue</button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}