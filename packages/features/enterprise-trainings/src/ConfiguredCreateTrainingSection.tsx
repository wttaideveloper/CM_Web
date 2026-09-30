"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { CreateTrainingFormValues } from "./create-training-form";
import type { TrainingFormField, TrainingFormSection } from "./training-form-config.service";
import { isTrainingFormFieldVisible } from "./training-form-field-settings";
import TrainingMediaField from "./TrainingMediaField";
import TrainingTaxonomyField from "./TrainingTaxonomyField";
import type { TrainingCategoryOption } from "./training-categories.service";
import { getEnabledTrainingDeliverySubfields, getTrainingDeliveryCompositeKey, isTrainingAccessInformationField, isTrainingDeliveryCompositeChild } from "./training-delivery-fields";
import { getTrainingCurrencyOptions, getTrainingTimeZoneOptions, preserveTrainingReferenceValue } from "./training-reference-options";

type UpdateForm = <Key extends keyof CreateTrainingFormValues>(key: Key, value: CreateTrainingFormValues[Key]) => void;

const inputClass = "mt-1.5 h-10 w-full min-w-0 max-w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm font-normal text-[#06201c] outline-none focus:border-[#1f6a58]";
const TRAINING_DELIVERY_MODE_OPTIONS = ["hybrid", "physical", "online", "self_paced"] as const;

const CORE_FIELDS: Record<string, keyof CreateTrainingFormValues> = {
  title: "title",
  description: "description",
  category: "category",
  subcategory: "subcategory",
  tags: "tags",
  learning_objectives: "learning_objectives",
  instructor_id: "instructor_id",
  instructor_name: "instructor_name",
  instructor_bio: "instructor_bio",
  requirements: "requirements",
  primary_image: "primary_image",
  gallery_images: "gallery_images",
  promotional_video: "promotional_video",
  documents: "documents",
  notes_documents: "instructor_notes",
  delivery_mode: "delivery_mode",
  course_type: "course_type",
  duration: "duration",
  start_date: "start_date",
  end_date: "end_date",
  start_time: "start_time",
  end_time: "end_time",
  venue: "venue",
  address: "address",
  meeting_link: "meeting_link",
  delivery_instructions: "delivery_instructions",
  enrolment_start: "enrolment_start",
  enrolment_end: "enrolment_end",
  time_zone: "time_zone",
  capacity: "capacity",
  pricing_type: "pricing_type",
  price: "price",
  currency: "currency",
  promo_price: "promo_price",
  coupon_code: "coupon_code",
  requires_approval: "requires_approval",
  access_duration_days: "access_duration_days",
  prerequisites: "prerequisites",
  access_expiry_type: "access_expiry_type",
  access_expiry_days: "access_expiry_days",
  location_id: "location_id",
  level: "level",
  language: "language",
  recurring: "recurring",
  schedule_exceptions: "schedule_exceptions",
  meeting_provider: "meeting_provider",
  instructor_role: "instructor_role",
  instructor_notes: "instructor_notes",
  notes_pdf_url: "notes_pdf_url",
  target_audience: "target_audience",
  difficulty_level: "difficulty_level",
  offline_enabled: "offline_enabled",
  session_mode: "session_mode",
  discussions: "discussions",
  announcements: "announcements",
  moderation_history: "moderation_history",
  subtitle: "subtitle",
  faqs: "faqs",
  instructor_photo: "instructor_photo",
  instructor_credentials: "instructor_credentials",
  badges: "badges",
};

const DELIVERY_FIELDS_REMOVED_FROM_TRAINING = ["check_in", "pass_code", "qr_payload"];

function OptionalTrainingMediaField({
  field,
  addLabel,
  value,
  kind,
  purpose,
  accept,
  allowedMimeTypes,
  onChange,
}: {
  field: TrainingFormField;
  addLabel: "video" | "notesPdf";
  value: string;
  kind: "video" | "document";
  purpose: "lesson_video" | "lesson_document";
  accept: string;
  allowedMimeTypes?: readonly string[];
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(Boolean(value));
  const { t } = useTranslation("enterpriseTrainings");
  if (!isOpen) {
    const buttonLabel = addLabel === "video" ? t("media.addVideo") : t("media.addNotesPdf");
    return (
      <button type="button" onClick={() => setIsOpen(true)} className="text-sm font-semibold text-[#1f6a58]">
        + {buttonLabel}
      </button>
    );
  }
  return (
    <div>
      <TrainingMediaField
        fieldKey={field.key}
        label={addLabel === "video" ? t("media.video") : t("media.notesPdf")}
        value={value}
        kind={kind}
        accept={accept}
        purpose={purpose}
        allowedMimeTypes={allowedMimeTypes ?? field.frontendSettings?.upload?.allowed_mime_types}
        maxFileSizeMb={field.frontendSettings?.upload?.max_file_size_mb}
        placeholder={field.placeholder ?? "https://…"}
        onChange={onChange}
      />
      {!value ? <button type="button" onClick={() => setIsOpen(false)} className="mt-2 text-xs font-semibold text-[#52736a] underline">{t("media.cancel")}</button> : null}
    </div>
  );
}

function scalar(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function numberRangeError(value: unknown, label: string, min?: number | null, max?: number | null): string | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const numericValue = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(numericValue)) return undefined;
  if (min != null && numericValue < min) return `${label} must be at least ${min}.`;
  if (max != null && numericValue > max) return `${label} must be at most ${max}.`;
  return undefined;
}

function clampNumberToRange(value: string, min?: number | null, max?: number | null): { value: string; bound: "minimum" | "maximum" | null } {
  if (!value.trim()) return { value, bound: null };
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return { value, bound: null };
  if (min != null && numericValue < min) return { value: String(min), bound: "minimum" };
  if (max != null && numericValue > max) return { value: String(max), bound: "maximum" };
  return { value, bound: null };
}

/** Drops the upper bound when intermediate values invert the range so the native picker never receives an impossible window. */
function boundedDateTimeMax(min: string | undefined, max: string | number | undefined): string | number | undefined {
  if (min && typeof max === "string" && min > max) return undefined;
  return max;
}
function trainingInputType(field: TrainingFormField, key: string): string {
  if (key === "start_time" || key === "end_time" || field.type === "time") return "time";
  const isDateTime = [field.type, field.valueType].some((value) =>
    typeof value === "string"
    && (value.trim().toLowerCase().replace(/[-_ ]/g, "") === "datetime" || value.trim().toLowerCase() === "datetime-local"),
  );
  if (isDateTime) return "datetime-local";
  if (field.type === "date" || field.valueType === "date") return "date";
  if (field.type === "number") return "number";
  if (field.type === "url") return "url";
  return "text";
}

function isDeliveryFieldApplicable(field: TrainingFormField, deliveryMode: string): boolean {
  const identifiers = [field.key, field.stable_key ?? "", field.label].map((value) => value.trim().toLowerCase().replace(/[\s-]+/g, "_"));
  const isLocationField = identifiers.some((value) => ["location", "location_id"].includes(value))
    || identifiers.some((value) => value.includes("location_id"));
  if (isLocationField) return false;
  const isVenueField = identifiers.some((value) => ["venue", "address", "venue_name", "venue_address"].includes(value));
  const isLiveField = identifiers.some((value) => ["meeting_link", "meeting_provider", "meeting_id", "meeting_passcode", "delivery_instructions"].includes(value))
    || identifiers.some((value) => value.includes("meeting_provider") || value.includes("meeting_link") || value.includes("delivery_instruction"));
  if (isVenueField) return deliveryMode === "physical" || deliveryMode === "hybrid";
  if (isLiveField) return deliveryMode === "online" || deliveryMode === "hybrid";
  return true;
}

function isPricingFieldApplicable(field: TrainingFormField, pricingType: string): boolean {
  const identifiers = [field.key, field.stable_key ?? "", field.label].map((value) => value.trim().toLowerCase().replace(/[\s-]+/g, "_"));
  const isPricingField = identifiers.some((value) => ["price", "currency", "promo_price", "coupon_code"].includes(value))
    || identifiers.some((value) => value.includes("promo_price") || value.includes("coupon_code"));
  return !isPricingField || pricingType === "paid";
}

function getTrainingSectionTip(title: string): string | null {
  const normalized = title.trim().toLowerCase();
  if (normalized.includes("basic")) return "Use a specific, benefit-driven title and explain who the training is for and what learners will achieve.";
  if (normalized.includes("schedule")) return "Set the enrolment window carefully: closing enrolment hides the enrolment action from learners.";
  if (normalized.includes("location") || normalized.includes("delivery")) return "Physical needs a venue, Live needs a meeting link, and Hybrid needs both.";
  if (normalized.includes("pricing")) return "Choose Free or Paid first. Paid trainings can include a promo price and coupon code.";
  if (normalized.includes("capacity") || normalized.includes("registration")) return "Require approval for selective cohorts and set access expiry when learners should lose access automatically.";
  if (normalized.includes("media") || normalized.includes("image")) return "Use a clear 16:9 primary image; adding a few gallery images helps learners understand the experience.";
  if (normalized.includes("additional") || normalized.includes("configuration")) return "Use prerequisites and release rules to control the learning journey and drip content.";
  return null;
}

/** Renders one server-authoritative Training form section in configured field order. */
export default function ConfiguredCreateTrainingSection({
  section,
  allFields,
  values,
  update,
  errors,
  customValues,
  setCustomValues,
  trainingCategories,
  categoriesLoading,
  categoriesError,
  retryCategories,
  preserveLegacyCategoryValues,
}: {
  section: TrainingFormSection;
  allFields: readonly TrainingFormField[];
  values: CreateTrainingFormValues;
  update: UpdateForm;
  errors: Record<string, string[]>;
  customValues: Record<string, unknown>;
  setCustomValues: (next: Record<string, unknown>) => void;
  trainingCategories: readonly TrainingCategoryOption[];
  categoriesLoading: boolean;
  categoriesError: boolean;
  retryCategories: () => void;
  preserveLegacyCategoryValues: boolean;
}) {
  const fields = [...section.fields]
    .filter((field) => field.enabled !== false)
    .filter((field) => !isTrainingAccessInformationField(field))
    .filter((field) => !DELIVERY_FIELDS_REMOVED_FROM_TRAINING.includes(field.key))
    .filter((field) => !isTrainingDeliveryCompositeChild(field, allFields))
    .filter((field) => isDeliveryFieldApplicable(field, values.delivery_mode))
    .filter((field) => isPricingFieldApplicable(field, values.pricing_type))
    .filter((field) => isTrainingFormFieldVisible(field, allFields, values, customValues))
    .sort((a, b) => a.order - b.order);
  const isPricingSection = section.title.trim().toLowerCase().includes("pricing");
  const sectionTip = getTrainingSectionTip(section.title);
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-[#06201c]">{section.title || "Section"}</h2>
        {section.description ? <p className="mt-1 break-words text-sm text-[#52736a]">{section.description}</p> : null}
        {sectionTip ? <p className="mt-2 rounded-lg border border-[#e1ebe6] bg-white px-3 py-2 text-xs leading-4 text-[#1f6a58]"><span className="font-semibold">Tip:</span> {sectionTip}</p> : null}
      </div>
      {isPricingSection ? (
        <label className="block text-sm font-semibold text-[#06201c]">
          Pricing
          <select
            value={values.pricing_type}
            onChange={(event) => update("pricing_type", event.target.value as "free" | "paid")}
            className={inputClass}
          >
            <option value="free">Free</option>
            <option value="paid">Paid</option>
          </select>
        </label>
      ) : null}
      {values.delivery_mode === "online" ? (
        <div className="rounded-xl border border-[#d6e9fd] bg-[#f2f9ff] px-4 py-3 text-sm text-[#1a5c91]">
          <p className="font-bold text-[#0b3d66]">Online mode only needs the meeting link — Google Meet or Zoom.</p>
        </div>
      ) : null}
      <div className="grid min-w-0 gap-4 md:grid-cols-[repeat(2,minmax(0,1fr))]">
        {fields.map((field) => (
          <div key={field.id} className="min-w-0 break-words" data-training-field={field.key}>
            <ConfiguredField
              field={field}
              values={values}
              update={update}
              errors={errors}
              customValues={customValues}
              setCustomValues={setCustomValues}
              trainingCategories={trainingCategories}
              categoriesLoading={categoriesLoading}
              categoriesError={categoriesError}
              retryCategories={retryCategories}
              preserveLegacyCategoryValues={preserveLegacyCategoryValues}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function ConfiguredField({
  field,
  values,
  update,
  errors,
  customValues,
  setCustomValues,
  trainingCategories,
  categoriesLoading,
  categoriesError,
  retryCategories,
  preserveLegacyCategoryValues,
}: {
  field: TrainingFormField;
  values: CreateTrainingFormValues;
  update: UpdateForm;
  errors: Record<string, string[]>;
  customValues: Record<string, unknown>;
  setCustomValues: (next: Record<string, unknown>) => void;
  trainingCategories: readonly TrainingCategoryOption[];
  categoriesLoading: boolean;
  categoriesError: boolean;
  retryCategories: () => void;
  preserveLegacyCategoryValues: boolean;
}) {
  const [rangeAdjustment, setRangeAdjustment] = useState<"minimum" | "maximum" | null>(null);
  const [tagDraftError, setTagDraftError] = useState<string | null>(null);
  const { t, i18n } = useTranslation("enterpriseTrainings");
  const key = field.key;
  const required = field.required ? " *" : "";
  const error = errors[key]?.[0] ?? (field.apiKey ? errors[field.apiKey]?.[0] : undefined) ?? (field.stable_key ? errors[field.stable_key]?.[0] : undefined);
  const coreField = field.source === "custom" ? undefined : CORE_FIELDS[key] ?? (field.apiKey ? CORE_FIELDS[field.apiKey] : undefined) ?? (field.stable_key ? CORE_FIELDS[field.stable_key] : undefined);
  const inputType = trainingInputType(field, key);
  const deliveryMode = values.delivery_mode;
  if (!isPricingFieldApplicable(field, values.pricing_type)) return null;
  const deliveryComposite = getTrainingDeliveryCompositeKey(field);
  if (deliveryComposite) {
    const requiredFields = new Set(field.frontendSettings?.requiredFields ?? []);
    const subfields = getEnabledTrainingDeliverySubfields(field, deliveryComposite);
    return (
      <fieldset aria-label={field.label} className="min-w-0 space-y-3 md:col-span-2">
        {field.helpText ? <p className="-mt-2 text-xs font-normal text-[#52736a]">{field.helpText}</p> : null}
        <div className="grid min-w-0 gap-3 md:grid-cols-2">
          {subfields.map((subfield) => {
            const required = Boolean(subfield.requiredByDomain || requiredFields.has(subfield.key));
            return (
              <label key={subfield.key} className="min-w-0 text-sm font-semibold text-[#06201c]">
                {subfield.label}{required ? " *" : ""}
                {subfield.type === "select" ? (
                  <select id={`training-field-${subfield.valueKey}`} value={scalar(values[subfield.valueKey as keyof CreateTrainingFormValues])} onChange={(event) => update(subfield.valueKey as keyof CreateTrainingFormValues, event.target.value as never)} className={inputClass}>
                    <option value="">Select a provider</option>
                    <option value="zoom">Zoom</option>
                    <option value="meet">Google Meet</option>
                    <option value="teams">Microsoft Teams</option>
                  </select>
                ) : subfield.type === "textarea" ? (
                  <textarea id={`training-field-${subfield.valueKey}`} value={scalar(values[subfield.valueKey as keyof CreateTrainingFormValues])} onChange={(event) => update(subfield.valueKey as keyof CreateTrainingFormValues, event.target.value as never)} rows={2} className={`${inputClass} h-auto py-2`} />
                ) : (
                  <input id={`training-field-${subfield.valueKey}`} type={subfield.type} value={scalar(values[subfield.valueKey as keyof CreateTrainingFormValues])} onChange={(event) => update(subfield.valueKey as keyof CreateTrainingFormValues, event.target.value as never)} placeholder={field.placeholder} className={inputClass} />
                )}
                {errors[subfield.valueKey]?.[0] ? <p className="mt-1 text-xs font-normal text-[#b42318]">{errors[subfield.valueKey][0]}</p> : null}
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }
  if (field.source !== "custom" && (coreField === "time_zone" || coreField === "currency")) {
    const value = scalar(values[coreField]);
    const standardOptions = coreField === "time_zone"
      ? getTrainingTimeZoneOptions(value)
      : getTrainingCurrencyOptions(value, i18n.resolvedLanguage ?? i18n.language);
    const allowedValues = field.configuredOptions?.map((option) => option.value);
    const filteredOptions = allowedValues?.length
      ? standardOptions.filter((option) => allowedValues.includes(option.value))
      : standardOptions;
    const options = allowedValues?.length
      ? filteredOptions
      : preserveTrainingReferenceValue(filteredOptions, value);
    const isValueAllowed = options.some((option) => option.value === value);
    return (
      <label className="block text-sm font-semibold text-[#06201c]">
        {field.label}{required}{field.helpText ? <span className="ml-1 font-normal text-[#52736a]">{field.helpText}</span> : null}
        <select id={`training-field-${field.id}`} value={isValueAllowed ? value : ""} required={field.required} aria-invalid={Boolean(error) || undefined} onChange={(event) => update(coreField, event.target.value)} className={inputClass}>
          <option value="">{t(coreField === "time_zone" ? "referenceOptions.selectTimeZone" : "referenceOptions.selectCurrency")}</option>
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        {error ? <p role="alert" className="mt-1 text-xs text-[#b42318]">{error}</p> : null}
      </label>
    );
  }
  // Core field - bind to values
  if (coreField) {
    const value = coreField === "tags" ? values.tags.join(", ") : Array.isArray((values as unknown as Record<string, unknown>)[coreField]) ? ((values as unknown as Record<string, unknown>)[coreField] as string[]).join(", ") : scalar((values as unknown as Record<string, unknown>)[coreField]);
    const isBoolean = field.type === "checkbox";
    const isNumber = field.type === "number";
    const rangeError = isNumber ? numberRangeError(value, field.label, field.validation?.min, field.validation?.max) : undefined;
    const displayedError = error ?? rangeError;
    const setValue = (next: string) => {
      if (coreField === "tags") update("tags", next.split(",").map((s) => s.trim()).filter(Boolean));
      else if (coreField === "gallery_images") update("gallery_images", next.split(",").map((s) => s.trim()).filter(Boolean) as never);
      else update(coreField as keyof CreateTrainingFormValues, (isBoolean ? next === "true" : isNumber ? next : next) as never);
    };
    const setNumberValue = (next: string) => {
      const adjusted = clampNumberToRange(next, field.validation?.min, field.validation?.max);
      setRangeAdjustment(adjusted.bound);
      setValue(adjusted.value);
    };
    if (coreField === "category" || coreField === "subcategory") {
      return (
        <TrainingTaxonomyField
          field={coreField}
          label={field.label}
          value={value}
          categoryValue={values.category}
          categories={trainingCategories}
          update={update}
          required={field.required}
          error={error}
          categoriesLoading={categoriesLoading}
          categoriesError={categoriesError}
          onRetry={retryCategories}
          preserveLegacyValue={preserveLegacyCategoryValues}
          helpText={field.helpText}
          includeOther
        />
      );
    }
    const options = field.options ?? [];
    if (coreField === "pricing_type") {
      return <label className="block text-sm font-semibold text-[#06201c]">{field.label}{required}<select value={value || "free"} onChange={(e) => setValue(e.target.value)} className={inputClass}><option value="free">Free</option><option value="paid">Paid</option></select>{error ? <p className="mt-1 text-xs text-[#b42318]">{error}</p> : null}</label>;
    }
    // Tags / learning_objectives / badges chip editor (press Enter)
    if (coreField === "tags" || coreField === "learning_objectives" || coreField === "badges") {
      const arr = coreField === "tags" ? values.tags : coreField === "badges" ? values.badges : values.learning_objectives;
      const placeholder = field.placeholder ?? (coreField === "tags" ? "Type a tag and press Enter" : coreField === "badges" ? "Type badge and press Enter" : "Type objective and press Enter");
      return (
        <div className="block text-sm font-semibold text-[#06201c] md:col-span-2">
          <p>{field.label}{required}{field.helpText ? <span className="ml-1 font-normal text-[#52736a]">{field.helpText}</span> : null}</p>
          <input
            defaultValue=""
            placeholder={placeholder}
            minLength={coreField === "tags" ? field.validation?.minLength ?? undefined : undefined}
            pattern={coreField === "tags" ? field.validation?.pattern ?? undefined : undefined}
            aria-invalid={Boolean(tagDraftError || error) || undefined}
            onChange={() => setTagDraftError(null)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              const input = event.currentTarget;
              const tag = input.value.trim();
              if (!tag) return;
              if (coreField === "tags") {
                const validation = field.validation;
                if (validation?.minLength != null && tag.length < validation.minLength) {
                  setTagDraftError(`${field.label} must be at least ${validation.minLength} characters.`);
                  return;
                }
                if (validation?.maxLength != null && tag.length > validation.maxLength) {
                  setTagDraftError(`${field.label} must be at most ${validation.maxLength} characters.`);
                  return;
                }
                if (validation?.pattern) {
                  try {
                    if (!new RegExp(validation.pattern).test(tag)) {
                      setTagDraftError(`${field.label} has an invalid format.`);
                      return;
                    }
                  } catch {
                    setTagDraftError(`${field.label} has an invalid validation pattern.`);
                    return;
                  }
                }
              }
              if (!(arr as string[]).includes(tag)) {
                update(coreField as keyof CreateTrainingFormValues, [...(arr as string[]), tag] as never);
              }
              input.value = "";
              setTagDraftError(null);
            }}
            className={inputClass}
          />
          {(arr as string[]).length > 0 ? <div className="mt-2 flex flex-wrap gap-2">{(arr as string[]).map((item) => <span key={item} className="inline-flex items-center gap-1 rounded-full bg-[#e8f6ee] px-3 py-1 text-xs font-bold text-[#1f6a58]">{item}<button type="button" onClick={() => update(coreField as keyof CreateTrainingFormValues, (arr as string[]).filter((t) => t !== item) as never)}>×</button></span>)}</div> : null}
          {tagDraftError ? <p role="alert" className="mt-1 text-xs text-[#b42318]">{tagDraftError}</p> : error ? <p className="mt-1 text-xs text-[#b42318]">{error}</p> : null}
        </div>
      );
    }
    if (coreField === "primary_image") {
      return (
        <div className="block text-sm font-semibold text-[#06201c] md:col-span-2">
          <p>{field.label}{required}{field.helpText ? <span className="ml-1 font-normal text-[#52736a]">{field.helpText}</span> : null}</p>
          <TrainingMediaField
            fieldKey={field.key}
            label={field.label}
            value={scalar(values.primary_image)}
            kind="image"
            accept={field.frontendSettings?.upload?.allowed_mime_types?.join(",") ?? "image/*"}
            purpose="image"
            allowedMimeTypes={field.frontendSettings?.upload?.allowed_mime_types}
            maxFileSizeMb={field.frontendSettings?.upload?.max_file_size_mb}
            placeholder={field.placeholder ?? "https://…"}
            onChange={(url) => update("primary_image", url)}
          />
          {error ? <p className="mt-1 text-xs text-[#b42318]">{error}</p> : null}
        </div>
      );
    }
    if (coreField === "promotional_video") {
      return (
        <div className="block text-sm font-semibold text-[#06201c] md:col-span-2">
          <p>{field.label}{required}{field.helpText ? <span className="ml-1 font-normal text-[#52736a]">{field.helpText}</span> : null}</p>
          <div className="mt-2">
            <OptionalTrainingMediaField
              field={field}
              addLabel="video"
              value={scalar(values.promotional_video)}
              kind="video"
              accept={field.frontendSettings?.upload?.allowed_mime_types?.join(",") ?? "video/*"}
              purpose="lesson_video"
              onChange={(url) => update("promotional_video", url)}
            />
          </div>
          {error ? <p className="mt-1 text-xs text-[#b42318]">{error}</p> : null}
        </div>
      );
    }
    if (coreField === "gallery_images") {
      const arr = (values[coreField as keyof CreateTrainingFormValues] as string[]) ?? [];
      return (
        <div className="block text-sm font-semibold text-[#06201c] md:col-span-2">
          <label>{field.label}{required}{field.helpText ? <span className="ml-1 font-normal text-[#52736a]">{field.helpText}</span> : null}</label>
          <div className="mt-2 space-y-2">
            {arr.map((val, idx) => (
              <div key={idx} className="flex flex-wrap items-start gap-2">
                <div className="min-w-0 flex-1">
                  <TrainingMediaField
                    fieldKey={field.key}
                    label={`${field.label} ${idx + 1}`}
                    value={val}
                    kind="image"
                    accept={field.frontendSettings?.upload?.allowed_mime_types?.join(",") ?? "image/*"}
                    purpose="image"
                    allowedMimeTypes={field.frontendSettings?.upload?.allowed_mime_types}
                    maxFileSizeMb={field.frontendSettings?.upload?.max_file_size_mb}
                    placeholder={field.placeholder ?? "https://…"}
                    onChange={(url) => update("gallery_images", arr.map((current, i) => (i === idx ? url : current)))}
                  />
                </div>
                <button type="button" onClick={() => update("gallery_images", arr.filter((_, i) => i !== idx))} className="mt-2 shrink-0 rounded-xl px-3 py-2 text-sm font-semibold text-[#b42318] hover:bg-[#fff6f5]">Remove</button>
              </div>
            ))}
            <button type="button" onClick={() => update("gallery_images", [...arr, ""])} className="text-sm font-semibold text-[#1f6a58]">+ {t("media.addImage")}</button>
          </div>
          {error ? <p className="mt-1 text-xs text-[#b42318]">{error}</p> : null}
        </div>
      );
    }
    if (coreField === "documents" || coreField === "instructor_notes") {
      const isNotes = coreField === "instructor_notes";
      const docs = isNotes
        ? values.instructor_notes.map((url) => ({ url, visibility: "public", downloadable: true }))
        : values.documents;
      const updateDocs = (next: typeof docs) => isNotes
        ? update("instructor_notes", next.map((item) => item.url))
        : update("documents", next);
      const accept = field.frontendSettings?.upload?.allowed_mime_types?.join(",") ?? ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.rtf,application/pdf,text/plain";
      return (
        <div className="block text-sm font-semibold text-[#06201c] md:col-span-2">
          <label>{field.label}{required}{field.helpText ? <span className="ml-1 font-normal text-[#52736a]">{field.helpText}</span> : null}</label>
          <div className="mt-2 space-y-3">
            {docs.map((doc, idx) => (
              <div key={idx} className="rounded-xl border border-[#d7e5df] bg-[#f9fcfa] p-3">
                <div className="flex flex-wrap items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <TrainingMediaField
                      fieldKey={field.key}
                      label={`${field.label} ${idx + 1}`}
                      value={doc.url}
                      kind="document"
                      accept={accept}
                      purpose="lesson_document"
                      allowedMimeTypes={field.frontendSettings?.upload?.allowed_mime_types}
                      maxFileSizeMb={field.frontendSettings?.upload?.max_file_size_mb}
                      placeholder={field.placeholder ?? "https://…"}
                      onChange={(url) => updateDocs(docs.map((current, item) => (item === idx ? { ...current, url } : current)))}
                    />
                  </div>
                  <button type="button" onClick={() => updateDocs(docs.filter((_, i) => i !== idx))} className="mt-2 shrink-0 rounded-xl px-3 py-2 text-sm font-semibold text-[#b42318] hover:bg-[#fff6f5]">Remove</button>
                </div>
                {!isNotes ? <div className="mt-2 flex gap-3">
                  <label className="flex items-center gap-1 text-xs font-semibold text-[#06201c]">Visibility<select value={doc.visibility} onChange={(e) => updateDocs(docs.map((d, i) => (i === idx ? { ...d, visibility: e.target.value } : d)))} className="ml-1 rounded-lg border border-[#d7e5df] bg-white px-2 py-1 text-xs"><option value="public">public</option><option value="private">private</option></select></label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-[#06201c]"><input type="checkbox" checked={doc.downloadable} onChange={(e) => updateDocs(docs.map((d, i) => (i === idx ? { ...d, downloadable: e.target.checked } : d)))} className="h-4 w-4 rounded border-[#d7e5df] text-[#1f6a58]" />Downloadable</label>
                </div> : null}
              </div>
            ))}
            <button
              type="button"
              onClick={() => updateDocs([...docs, { url: "", visibility: "public", downloadable: true }])}
              className="text-sm font-semibold text-[#1f6a58]"
            >
              + {isNotes ? t("media.addNoteHandout") : t("media.addDocument")}
            </button>
          </div>
          {error ? <p className="mt-1 text-xs text-[#b42318]">{error}</p> : null}
        </div>
      );
    }
    if (coreField === "notes_pdf_url") {
      return (
        <div className="block text-sm font-semibold text-[#06201c] md:col-span-2">
          <p>{field.label}{required}{field.helpText ? <span className="ml-1 font-normal text-[#52736a]">{field.helpText}</span> : null}</p>
          <div className="mt-2">
            <OptionalTrainingMediaField
              field={field}
              addLabel="notesPdf"
              value={scalar(values.notes_pdf_url)}
              kind="document"
              accept="application/pdf,.pdf"
              purpose="lesson_document"
              allowedMimeTypes={field.frontendSettings?.upload?.allowed_mime_types ?? ["application/pdf"]}
              onChange={(url) => update("notes_pdf_url", url)}
            />
          </div>
          {error ? <p className="mt-1 text-xs text-[#b42318]">{error}</p> : null}
        </div>
      );
    }
    if (isBoolean) {
      const checked = values[coreField as keyof CreateTrainingFormValues] === true || values[coreField as keyof CreateTrainingFormValues] === "true";
      return <div><label className="flex items-center gap-2 text-sm font-semibold text-[#06201c]"><input type="checkbox" checked={checked} aria-invalid={Boolean(error) || undefined} onChange={(e) => setValue(String(e.target.checked))} />{field.label}{required}</label>{error ? <p role="alert" className="mt-1 text-xs text-[#b42318]">{error}</p> : null}</div>;
    }
    if (field.type === "multiselect") {
      const selected = Array.isArray((values as unknown as Record<string, unknown>)[coreField]) ? ((values as unknown as Record<string, unknown>)[coreField] as string[]) : [];
      return <fieldset className="block text-sm font-semibold text-[#06201c]"><legend>{field.label}{required}</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{options.map((option) => <label key={option} className="flex items-center gap-2 text-sm font-normal"><input type="checkbox" checked={selected.includes(option)} onChange={(event) => update(coreField as keyof CreateTrainingFormValues, (event.target.checked ? [...selected, option] : selected.filter((item) => item !== option)) as never)} />{option}</label>)}</div>{error ? <p className="mt-1 text-xs text-[#b42318]">{error}</p> : null}</fieldset>;
    }
    if (options.length && inputType !== "date" && inputType !== "datetime-local" && inputType !== "time") {
      // Delivery mode keeps the API's online/physical values while showing learner-facing Live/Venue labels.
      // Language codes from the server config render and submit as full names (English, not en).
      const DELIVERY_LABELS: Record<string, string> = { online: "Live", physical: "Venue", hybrid: "Hybrid", self_paced: "Self-paced" };
      const LANGUAGE_NAMES: Record<string, string> = { en: "English", hi: "Hindi", es: "Spanish", fr: "French" };
      const isDelivery = coreField === "delivery_mode";
      const isLang = coreField === "language";
      const visibleOptions = isDelivery ? [...TRAINING_DELIVERY_MODE_OPTIONS] : options;
      const isUnsupportedDeliveryValue = isDelivery && Boolean(value) && !visibleOptions.includes(value);
      const langOptions = isLang ? [...new Set(visibleOptions.map((opt) => LANGUAGE_NAMES[opt.toLowerCase()] ?? opt))] : visibleOptions;
      const selectValue = isUnsupportedDeliveryValue ? "" : isDelivery && !value ? "self_paced" : isLang ? (LANGUAGE_NAMES[(value || "").toLowerCase()] ?? value) : value;
      const shownOptions = isLang ? langOptions : visibleOptions;
      return (
        <label className="block text-sm font-semibold text-[#06201c]">
          {field.label}{required}{field.helpText ? <span className="ml-1 font-normal text-[#52736a]">{field.helpText}</span> : null}
          <select value={selectValue} onChange={(event) => { setValue(event.target.value); }} className={inputClass}>
            {isDelivery
              ? isUnsupportedDeliveryValue ? <option value="" disabled>Select a supported delivery mode</option> : null
              : <option value="">Select an option</option>}
            {shownOptions.map((opt) => <option key={opt} value={opt}>{isDelivery ? (DELIVERY_LABELS[opt] ?? opt) : opt}</option>)}
          </select>
          {error ? <p className="mt-1 text-xs text-[#b42318]">{error}</p> : null}
        </label>
      );
    }
    if (field.type === "textarea") {
      return <label className="block text-sm font-semibold text-[#06201c] md:col-span-2">{field.label}{required}{field.helpText ? <span className="ml-1 font-normal text-[#52736a]">{field.helpText}</span> : null}<textarea value={value} placeholder={field.placeholder} onChange={(e) => setValue(e.target.value)} className={`${inputClass} h-24 resize-y py-2`} />{error ? <p className="mt-1 text-xs text-[#b42318]">{error}</p> : null}</label>;
    }
    const inputId = `training-field-${field.id}`;
    const input = <input id={inputId} type={inputType} value={value} required={field.required} placeholder={field.placeholder} min={coreField === "enrolment_end" ? values.enrolment_start || undefined : field.validation?.min ?? undefined} max={(coreField === "enrolment_end" ? boundedDateTimeMax(values.enrolment_start || undefined, (values.start_date || field.validation?.max) ?? undefined) : field.validation?.max) ?? undefined} step={isNumber ? "any" : undefined} minLength={field.validation?.minLength ?? undefined} aria-invalid={displayedError ? true : undefined} aria-describedby={displayedError ? `${field.id}-error` : undefined} onChange={(e) => isNumber ? setNumberValue(e.target.value) : setValue(e.target.value)} pattern={field.validation?.pattern ?? undefined} className={inputClass} />;
    return <div className="block text-sm font-semibold text-[#06201c]"><label htmlFor={inputId}>{field.label}{required}{field.helpText ? <span className="ml-1 font-normal text-[#52736a]">{field.helpText}</span> : null}</label>{input}{field.validation?.maxLength != null ? <p className="mt-1 text-xs text-[#7f9d94]">{value.length}/{field.validation?.maxLength} characters</p> : null}{displayedError ? <p id={`${field.id}-error`} role="alert" className="mt-1 text-xs text-[#b42318]">{displayedError}</p> : null}{rangeAdjustment ? <p role="status" className="mt-1 text-xs text-[#52736a]">{t(`numberRange.adjustedTo${rangeAdjustment === "minimum" ? "Minimum" : "Maximum"}`, { value: rangeAdjustment === "minimum" ? field.validation?.min : field.validation?.max })}</p> : null}</div>;
  }
  // Custom field
  const raw = customValues[key];
  const value = scalar(raw);
  const isBoolean = field.type === "checkbox";
  const isNumber = field.type === "number";
  const rangeError = isNumber ? numberRangeError(raw, field.label, field.validation?.min, field.validation?.max) : undefined;
  const displayedError = error ?? rangeError;
  const options = field.options ?? [];
  const setValue = (next: string | boolean | number | string[] | null) => setCustomValues({ ...customValues, [key]: next });
  if (isBoolean) return <div><label className="flex items-center gap-2 text-sm font-semibold text-[#06201c]"><input type="checkbox" checked={raw === true || raw === "true"} aria-invalid={Boolean(error) || undefined} onChange={(e) => setValue(e.target.checked)} />{field.label}{required}</label>{error ? <p role="alert" className="mt-1 text-xs text-[#b42318]">{error}</p> : null}</div>;
  if (field.type === "multiselect") {
    const selected = Array.isArray(raw) ? raw.map(String) : [];
    return <fieldset className="block text-sm font-semibold text-[#06201c]"><legend>{field.label}{required}</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{options.map((option) => <label key={option} className="flex items-center gap-2 text-sm font-normal"><input type="checkbox" checked={selected.includes(option)} onChange={(event) => setValue(event.target.checked ? [...selected, option] : selected.filter((item) => item !== option))} />{option}</label>)}</div>{error ? <p className="mt-1 text-xs text-[#b42318]">{error}</p> : null}</fieldset>;
  }
  if (options.length && inputType !== "date" && inputType !== "datetime-local" && inputType !== "time") return <label className="block text-sm font-semibold text-[#06201c]">{field.label}{required}<select value={value} onChange={(e) => setValue(e.target.value)} className={inputClass}><option value="">Select</option>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select>{error ? <p className="mt-1 text-xs text-[#b42318]">{error}</p> : null}</label>;
  if (field.type === "textarea") return <label className="block text-sm font-semibold text-[#06201c]">{field.label}{required}<textarea value={value} placeholder={field.placeholder} minLength={field.validation?.minLength ?? undefined} onChange={(e) => setValue(e.target.value)} className={`${inputClass} h-24 resize-y py-2`} />{error ? <p className="mt-1 text-xs text-[#b42318]">{error}</p> : null}</label>;
  const inputId = `training-field-${field.id}`;
  const input = <input id={inputId} type={inputType} value={value} placeholder={field.placeholder} min={field.validation?.min ?? undefined} max={field.validation?.max ?? undefined} step={isNumber ? "any" : undefined} minLength={field.validation?.minLength ?? undefined} pattern={field.validation?.pattern ?? undefined} aria-invalid={displayedError ? true : undefined} aria-describedby={displayedError ? `${field.id}-error` : undefined} onChange={(e) => { if (!isNumber) { setValue(e.target.value); return; } const adjusted = clampNumberToRange(e.target.value, field.validation?.min, field.validation?.max); setRangeAdjustment(adjusted.bound); setValue(adjusted.value === "" ? null : Number(adjusted.value)); }} className={inputClass} />;
  return <div className="block text-sm font-semibold text-[#06201c]"><label htmlFor={inputId}>{field.label}{required}{field.helpText ? <span className="ml-1 font-normal text-[#52736a]">{field.helpText}</span> : null}</label>{input}{field.validation?.maxLength != null ? <p className="mt-1 text-xs text-[#7f9d94]">{value.length}/{field.validation?.maxLength} characters</p> : null}{displayedError ? <p id={`${field.id}-error`} role="alert" className="mt-1 text-xs text-[#b42318]">{displayedError}</p> : null}{rangeAdjustment ? <p role="status" className="mt-1 text-xs text-[#52736a]">{t(`numberRange.adjustedTo${rangeAdjustment === "minimum" ? "Minimum" : "Maximum"}`, { value: rangeAdjustment === "minimum" ? field.validation?.min : field.validation?.max })}</p> : null}</div>;
}
