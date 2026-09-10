"use client";

import type { CreateProgramFormValues } from "./create-program-form";
import type { ProgramFormField, ProgramFormSection } from "./program-form-config.service";

type UpdateForm = <Key extends keyof CreateProgramFormValues>(key: Key, value: CreateProgramFormValues[Key]) => void;

const inputClass = "mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm text-[#06201c] outline-none focus:border-[#1f6a58]";

const CORE_FIELDS: Record<string, keyof CreateProgramFormValues> = {
  title: "title",
  description: "description",
  category: "category",
  provider_id: "provider_id",
  duration_weeks: "duration_weeks",
  eligibility: "eligibility",
  start_date: "start_date",
  end_date: "end_date",
  enrolment_start: "enrolment_start",
  enrolment_end: "enrolment_end",
  enrol_type: "enrol_type",
  delivery_mode: "delivery_mode",
  price: "price",
  currency: "currency",
  capacity: "capacity",
};

function scalar(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

export default function ConfiguredCreateProgramSection({
  section,
  values,
  update,
  errors,
  customValues,
  setCustomValues,
}: {
  section: ProgramFormSection;
  values: CreateProgramFormValues;
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
          <ConfiguredField key={field.id} field={field} values={values} update={update} errors={errors} customValues={customValues} setCustomValues={setCustomValues} />
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
  field: ProgramFormField;
  values: CreateProgramFormValues;
  update: UpdateForm;
  errors: Record<string, string[]>;
  customValues: Record<string, unknown>;
  setCustomValues: (next: Record<string, unknown>) => void;
}) {
  const key = field.key;
  const required = field.required ? " *" : "";
  const error = errors[key]?.[0];
  const coreField = CORE_FIELDS[key];
  if (coreField) {
    const value = coreField === "eligibility" ? scalar(values[coreField as keyof CreateProgramFormValues]) : scalar(values[coreField as keyof CreateProgramFormValues]);
    const isBoolean = field.type === "checkbox";
    const setValue = (next: string) => update(coreField as keyof CreateProgramFormValues, next as never);
    const options = field.options ?? [];
    if (isBoolean) return <label className="flex items-center gap-2 text-sm font-semibold text-[#06201c]"><input type="checkbox" checked={Boolean(values[coreField as keyof CreateProgramFormValues])} onChange={(e) => setValue(String(e.target.checked))} />{field.label}{required}</label>;
    if (options.length) return <label className="block text-sm font-semibold text-[#06201c]">{field.label}{required}{field.helpText ? <span className="ml-1 font-normal text-[#52736a]">{field.helpText}</span> : null}<select value={value} onChange={(e) => setValue(e.target.value)} className={inputClass}><option value="">Select an option</option>{options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}</select>{error ? <p className="mt-1 text-xs text-[#b42318]">{error}</p> : null}</label>;
    if (field.type === "textarea") return <label className="block text-sm font-semibold text-[#06201c] md:col-span-2">{field.label}{required}<textarea value={value} placeholder={field.placeholder} onChange={(e) => setValue(e.target.value)} className={`${inputClass} h-24 resize-y py-2`} />{error ? <p className="mt-1 text-xs text-[#b42318]">{error}</p> : null}</label>;
    const inputType = field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "datetime" ? "datetime-local" : "text";
    return <label className="block text-sm font-semibold text-[#06201c]">{field.label}{required}<input type={inputType} value={value} placeholder={field.placeholder} onChange={(e) => setValue(e.target.value)} className={inputClass} />{error ? <p className="mt-1 text-xs text-[#b42318]">{error}</p> : null}</label>;
  }
  const raw = customValues[key];
  const value = scalar(raw);
  const isBoolean = field.type === "checkbox";
  const options = field.options ?? [];
  const setValue = (next: string | boolean | number) => setCustomValues({ ...customValues, [key]: next });
  if (isBoolean) return <label className="flex items-center gap-2 text-sm font-semibold text-[#06201c]"><input type="checkbox" checked={raw === true || raw === "true"} onChange={(e) => setValue(e.target.checked)} />{field.label}{required}</label>;
  if (options.length) return <label className="block text-sm font-semibold text-[#06201c]">{field.label}{required}<select value={value} onChange={(e) => setValue(e.target.value)} className={inputClass}><option value="">Select</option>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select>{error ? <p className="mt-1 text-xs text-[#b42318]">{error}</p> : null}</label>;
  if (field.type === "textarea") return <label className="block text-sm font-semibold text-[#06201c]">{field.label}{required}<textarea value={value} placeholder={field.placeholder} onChange={(e) => setValue(e.target.value)} className={`${inputClass} h-24 resize-y py-2`} />{error ? <p className="mt-1 text-xs text-[#b42318]">{error}</p> : null}</label>;
  return <label className="block text-sm font-semibold text-[#06201c]">{field.label}{required}<input type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"} value={value} placeholder={field.placeholder} onChange={(e) => setValue(e.target.value)} className={inputClass} />{error ? <p className="mt-1 text-xs text-[#b42318]">{error}</p> : null}</label>;
}
