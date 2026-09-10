"use client";

import type { CreateProgramFormValues } from "./create-program-form";

type UpdateForm = <Key extends keyof CreateProgramFormValues>(key: Key, value: CreateProgramFormValues[Key]) => void;

type SectionProps = { values: CreateProgramFormValues; update: UpdateForm; errors: Record<string, string[]> };

const inputClass = "mt-1.5 h-11 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm text-[#06201c] outline-none focus:border-[#1f6a58]";
const labelClass = "block text-sm font-semibold text-[#06201c]";

function FieldError({ error }: { error?: string[] }) {
  return error?.[0] ? <p className="mt-1 text-xs font-medium text-[#b42318]">{error[0]}</p> : null;
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-[#06201c]">{title}</h2>
      <p className="mt-1 text-sm text-[#52736a]">{description}</p>
    </div>
  );
}

/** Renders the required Program basics: title, category, description. */
export function ProgramBasicsSection({ values, update, errors }: SectionProps) {
  return (
    <section className="space-y-5">
      <SectionHeading title="Basic Information" description="Describe the program and who it is for." />
      <label className={labelClass}>Program name<input value={values.title} onChange={(event) => update("title", event.target.value)} className={inputClass} /><FieldError error={errors.title} /></label>
      <label className={labelClass}>Description<textarea value={values.description} onChange={(event) => update("description", event.target.value)} rows={5} className={`${inputClass} h-auto py-3`} /><FieldError error={errors.description} /></label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Category<input value={values.category} onChange={(event) => update("category", event.target.value)} className={inputClass} /><FieldError error={errors.category} /></label>
        <label className={labelClass}>Provider ID<input value={values.provider_id} onChange={(event) => update("provider_id", event.target.value)} className={inputClass} /></label>
      </div>
      <label className={labelClass}>Eligibility<textarea value={values.eligibility} onChange={(event) => update("eligibility", event.target.value)} rows={3} className={`${inputClass} h-auto py-3`} placeholder="e.g. Open to all employees" /></label>
    </section>
  );
}

/** Renders delivery mode, enrolment type, and duration. */
export function ProgramDeliverySection({ values, update }: SectionProps) {
  return (
    <section className="space-y-5">
      <SectionHeading title="Delivery & Enrolment" description="Choose how this program runs and how participants enrol." />
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Delivery mode<select value={values.delivery_mode} onChange={(event) => update("delivery_mode", event.target.value)} className={inputClass}><option value="in_person">In person</option><option value="online">Online</option><option value="hybrid">Hybrid</option></select></label>
        <label className={labelClass}>Enrolment type<select value={values.enrol_type} onChange={(event) => update("enrol_type", event.target.value)} className={inputClass}><option value="fixed_date">Fixed date</option><option value="enrol_anytime">Enrol anytime</option></select></label>
      </div>
      <label className={labelClass}>Duration (weeks)<input value={values.duration_weeks} onChange={(event) => update("duration_weeks", event.target.value)} placeholder="e.g. 12" className={inputClass} /></label>
    </section>
  );
}

/** Renders schedule and enrolment window fields. */
export function ProgramScheduleSection({ values, update, errors }: SectionProps) {
  return (
    <section className="space-y-5">
      <SectionHeading title="Schedule" description="Set the program window and enrolment period." />
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Start date<input type="datetime-local" value={values.start_date} onChange={(event) => update("start_date", event.target.value)} className={inputClass} /><FieldError error={errors.start_date} /></label>
        <label className={labelClass}>End date<input type="datetime-local" value={values.end_date} onChange={(event) => update("end_date", event.target.value)} className={inputClass} /><FieldError error={errors.end_date} /></label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Enrolment opens<input type="datetime-local" value={values.enrolment_start} onChange={(event) => update("enrolment_start", event.target.value)} className={inputClass} /><FieldError error={errors.enrolment_start} /></label>
        <label className={labelClass}>Enrolment closes<input type="datetime-local" value={values.enrolment_end} onChange={(event) => update("enrolment_end", event.target.value)} className={inputClass} /><FieldError error={errors.enrolment_end} /></label>
      </div>
    </section>
  );
}

/** Renders pricing and capacity fields. */
export function ProgramPricingSection({ values, update }: SectionProps) {
  return (
    <section className="space-y-5">
      <SectionHeading title="Pricing & Capacity" description="Set the price and participant capacity." />
      <div className="grid gap-4 md:grid-cols-3">
        <label className={labelClass}>Price<input value={values.price} onChange={(event) => update("price", event.target.value)} className={inputClass} /></label>
        <label className={labelClass}>Currency<input value={values.currency} onChange={(event) => update("currency", event.target.value)} className={inputClass} /></label>
        <label className={labelClass}>Capacity<input value={values.capacity} onChange={(event) => update("capacity", event.target.value)} className={inputClass} /></label>
      </div>
    </section>
  );
}