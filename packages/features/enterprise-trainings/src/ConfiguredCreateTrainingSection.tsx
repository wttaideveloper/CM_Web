"use client";

import type { CreateTrainingFormValues } from "./create-training-form";
import type { TrainingFormField, TrainingFormSection } from "./training-form-config.service";

type UpdateForm = <Key extends keyof CreateTrainingFormValues>(key: Key, value: CreateTrainingFormValues[Key]) => void;

const inputClass = "mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm text-[#06201c] outline-none focus:border-[#1f6a58]";

const CORE_FIELDS: Record<string, keyof CreateTrainingFormValues> = {
  title: "title",
  description: "description",
  category: "category",
  subcategory: "subcategory",
  tags: "tags",
  instructor_id: "instructor_id",
  requirements: "requirements",
  primary_image: "primary_image",
  gallery_images: "gallery_images",
  promotional_video: "promotional_video",
  delivery_mode: "delivery_mode",
  course_type: "course_type",
  duration: "duration",
  start_date: "start_date",
  end_date: "end_date",
  enrolment_start: "enrolment_start",
  enrolment_end: "enrolment_end",
  time_zone: "time_zone",
  capacity: "capacity",
  price: "price",
  currency: "currency",
  promo_price: "promo_price",
  coupon_code: "coupon_code",
  requires_approval: "requires_approval",
  access_duration_days: "access_duration_days",
  prerequisites: "prerequisites",
  release_rule: "release_rule",
  randomise: "randomise",
  scheduled_publication: "scheduled_publication",
  is_mandatory: "is_mandatory",
  group_enrolment: "group_enrolment",
  max_group_size: "max_group_size",
  access_expiry_type: "access_expiry_type",
  access_expiry_days: "access_expiry_days",
  location_id: "location_id",
};

function scalar(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

/** Renders one server-authoritative Training form section in configured field order. */
export default function ConfiguredCreateTrainingSection({
  section,
  values,
  update,
  errors,
  customValues,
  setCustomValues,
}: {
  section: TrainingFormSection;
  values: CreateTrainingFormValues;
  update: UpdateForm;
  errors: Record<string, string[]>;
  customValues: Record<string, unknown>;
  setCustomValues: (next: Record<string, unknown>) => void;
}) {
  const fields = [...section.fields].sort((a, b) => a.order - b.order);
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-[#06201c]">{section.title || "Section"}</h2>
        {section.description ? <p className="mt-1 text-sm text-[#52736a]">{section.description}</p> : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((field) => (
          <ConfiguredField
            key={field.id}
            field={field}
            values={values}
            update={update}
            errors={errors}
            customValues={customValues}
            setCustomValues={setCustomValues}
          />
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
}: {
  field: TrainingFormField;
  values: CreateTrainingFormValues;
  update: UpdateForm;
  errors: Record<string, string[]>;
  customValues: Record<string, unknown>;
  setCustomValues: (next: Record<string, unknown>) => void;
}) {
  const key = field.key;
  const required = field.required ? " *" : "";
  const error = errors[key]?.[0];
  const coreField = CORE_FIELDS[key];
  // Core field - bind to values
  if (coreField) {
    const value = coreField === "tags" ? values.tags.join(", ") : Array.isArray((values as unknown as Record<string, unknown>)[coreField]) ? ((values as unknown as Record<string, unknown>)[coreField] as string[]).join(", ") : scalar((values as unknown as Record<string, unknown>)[coreField]);
    const isBoolean = field.type === "checkbox";
    const isNumber = field.type === "number";
    const setValue = (next: string) => {
      if (coreField === "tags") update("tags", next.split(",").map((s) => s.trim()).filter(Boolean));
      else if (coreField === "gallery_images") update("gallery_images", next.split(",").map((s) => s.trim()).filter(Boolean) as never);
      else update(coreField as keyof CreateTrainingFormValues, (isBoolean ? next === "true" : isNumber ? next : next) as never);
    };
    const options = field.options ?? [];
    // Tags editor
    if (coreField === "tags") {
      return (
        <div className="block text-sm font-semibold text-[#06201c] md:col-span-2">
          <label>{field.label}{required}{field.helpText ? <span className="ml-1 font-normal text-[#52736a]">{field.helpText}</span> : null}</label>
          <input value={value} placeholder={field.placeholder ?? "Type a tag and press Enter"} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const vals = value.split(",").map(s=>s.trim()).filter(Boolean); if (e.currentTarget.value.trim() && !vals.includes(e.currentTarget.value.trim())) setValue([...vals, e.currentTarget.value.trim()].join(", ")); e.currentTarget.value=""; } }} className={inputClass} />
          {values.tags.length > 0 ? <div className="mt-2 flex flex-wrap gap-2">{values.tags.map((tag) => <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-[#e8f6ee] px-3 py-1 text-xs font-bold text-[#1f6a58]">{tag}<button type="button" onClick={() => update("tags", values.tags.filter((t) => t !== tag))}>×</button></span>)}</div> : null}
          {error ? <p className="mt-1 text-xs text-[#b42318]">{error}</p> : null}
        </div>
      );
    }
    if (isBoolean) {
      return <label className="flex items-center gap-2 text-sm font-semibold text-[#06201c]"><input type="checkbox" checked={Boolean(values[coreField as keyof CreateTrainingFormValues])} onChange={(e) => setValue(String(e.target.checked))} />{field.label}{required}</label>;
    }
    if (options.length) {
      return <label className="block text-sm font-semibold text-[#06201c]">{field.label}{required}{field.helpText ? <span className="ml-1 font-normal text-[#52736a]">{field.helpText}</span> : null}<select value={value} onChange={(e) => setValue(e.target.value)} className={inputClass}><option value="">Select an option</option>{options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}</select>{error ? <p className="mt-1 text-xs text-[#b42318]">{error}</p> : null}</label>;
    }
    if (field.type === "textarea") {
      return <label className="block text-sm font-semibold text-[#06201c] md:col-span-2">{field.label}{required}{field.helpText ? <span className="ml-1 font-normal text-[#52736a]">{field.helpText}</span> : null}<textarea value={value} placeholder={field.placeholder} onChange={(e) => setValue(e.target.value)} className={`${inputClass} h-24 resize-y py-2`} />{error ? <p className="mt-1 text-xs text-[#b42318]">{error}</p> : null}</label>;
    }
    const inputType = field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "datetime" ? "datetime-local" : field.type === "url" ? "url" : "text";
    return <label className="block text-sm font-semibold text-[#06201c]">{field.label}{required}{field.helpText ? <span className="ml-1 font-normal text-[#52736a]">{field.helpText}</span> : null}<input type={inputType} value={value} placeholder={field.placeholder} onChange={(e) => setValue(e.target.value)} className={inputClass} />{error ? <p className="mt-1 text-xs text-[#b42318]">{error}</p> : null}</label>;
  }
  // Custom field
  const raw = customValues[key];
  const value = scalar(raw);
  const isBoolean = field.type === "checkbox";
  const isNumber = field.type === "number";
  const options = field.options ?? [];
  const setValue = (next: string | boolean | number) => setCustomValues({ ...customValues, [key]: next });
  if (isBoolean) return <label className="flex items-center gap-2 text-sm font-semibold text-[#06201c]"><input type="checkbox" checked={raw === true || raw === "true"} onChange={(e) => setValue(e.target.checked)} />{field.label}{required}</label>;
  if (options.length) return <label className="block text-sm font-semibold text-[#06201c]">{field.label}{required}<select value={value} onChange={(e) => setValue(e.target.value)} className={inputClass}><option value="">Select</option>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select>{error ? <p className="mt-1 text-xs text-[#b42318]">{error}</p> : null}</label>;
  if (field.type === "textarea") return <label className="block text-sm font-semibold text-[#06201c]">{field.label}{required}<textarea value={value} placeholder={field.placeholder} onChange={(e) => setValue(e.target.value)} className={`${inputClass} h-24 resize-y py-2`} />{error ? <p className="mt-1 text-xs text-[#b42318]">{error}</p> : null}</label>;
  const inputType2 = field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "datetime" ? "datetime-local" : field.type === "url" ? "url" : "text";
  return <label className="block text-sm font-semibold text-[#06201c]">{field.label}{required}{field.helpText ? <span className="ml-1 font-normal text-[#52736a]">{field.helpText}</span> : null}<input type={inputType2} value={value} placeholder={field.placeholder} onChange={(e) => setValue(isNumber ? Number(e.target.value) : e.target.value)} className={inputClass} />{error ? <p className="mt-1 text-xs text-[#b42318]">{error}</p> : null}</label>;
}
