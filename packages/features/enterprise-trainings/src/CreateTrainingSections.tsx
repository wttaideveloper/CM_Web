"use client";

import type { CreateTrainingFormValues } from "./create-training-form";

type UpdateForm = <Key extends keyof CreateTrainingFormValues>(key: Key, value: CreateTrainingFormValues[Key]) => void;

type SectionProps = { values: CreateTrainingFormValues; update: UpdateForm; errors: Record<string, string[]> };

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

/** Renders the required Training basics: title, category, description, and tags. */
export function TrainingBasicsSection({ values, update, errors }: SectionProps) {
  const addTag = (value: string) => {
    const tag = value.trim();
    if (tag && !values.tags.includes(tag)) update("tags", [...values.tags, tag]);
  };

  return (
    <section className="space-y-5">
      <SectionHeading title="Basic Information" description="Describe the training and how it will be delivered." />
      <label className={labelClass}>Training name<input value={values.title} onChange={(event) => update("title", event.target.value)} className={inputClass} /><FieldError error={errors.title} /></label>
      <label className={labelClass}>Description<textarea value={values.description} onChange={(event) => update("description", event.target.value)} rows={5} className={`${inputClass} h-auto py-3`} /><FieldError error={errors.description} /></label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Category<input value={values.category} onChange={(event) => update("category", event.target.value)} className={inputClass} /><FieldError error={errors.category} /></label>
        <label className={labelClass}>Subcategory<input value={values.subcategory} onChange={(event) => update("subcategory", event.target.value)} className={inputClass} /></label>
      </div>
      <label className={labelClass}>Tags<input onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addTag(event.currentTarget.value); event.currentTarget.value = ""; } }} placeholder="Type a tag and press Enter" className={inputClass} /></label>
      <div className="flex flex-wrap gap-2">{values.tags.map((tag) => <button key={tag} type="button" onClick={() => update("tags", values.tags.filter((item) => item !== tag))} className="rounded-full bg-[#e8f6ee] px-3 py-1 text-xs font-bold text-[#1f6a58]">{tag} ×</button>)}</div>
    </section>
  );
}

/** Renders delivery mode, duration, and instructor — hybrid/physical/online like Event. */
export function TrainingDeliverySection({ values, update }: SectionProps) {
  return (
    <section className="space-y-5">
      <SectionHeading title="Delivery & Instructor" description="Choose how participants experience this training." />
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Delivery mode<select value={values.delivery_mode} onChange={(event) => update("delivery_mode", event.target.value)} className={inputClass}><option value="hybrid">Hybrid</option><option value="physical">Physical (In Person)</option><option value="online">Online</option><option value="self_paced">Self paced</option><option value="instructor_led">Instructor led</option><option value="blended">Blended</option></select></label>
        <label className={labelClass}>Course type<input value={values.course_type} onChange={(event) => update("course_type", event.target.value)} placeholder="e.g. Workshop" className={inputClass} /></label>
      </div>
      {(values.delivery_mode === "physical" || values.delivery_mode === "hybrid" || values.delivery_mode === "in_person") ? (
        <label className={labelClass}>Location ID<input value={values.location_id} onChange={(event) => update("location_id", event.target.value)} placeholder="Select or paste location ID" className={inputClass} /></label>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Duration<input value={values.duration} onChange={(event) => update("duration", event.target.value)} placeholder="e.g. 4 weeks" className={inputClass} /></label>
        <label className={labelClass}>Instructor ID<input value={values.instructor_id} onChange={(event) => update("instructor_id", event.target.value)} className={inputClass} /></label>
      </div>
      <label className={labelClass}>Requirements<textarea value={values.requirements} onChange={(event) => update("requirements", event.target.value)} rows={3} className={`${inputClass} h-auto py-3`} /></label>
      <p className="text-xs text-[#7f9d94]">Hybrid = venue + online link · Physical = venue only · Online = meeting link only (mirrors Event In Person/Online/Hybrid).</p>
    </section>
  );
}

/** Renders schedule and enrolment window fields. */
export function TrainingScheduleSection({ values, update, errors }: SectionProps) {
  return (
    <section className="space-y-5">
      <SectionHeading title="Schedule" description="Set the training window and enrolment period." />
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Start date<input type="datetime-local" value={values.start_date} onChange={(event) => update("start_date", event.target.value)} className={inputClass} /><FieldError error={errors.start_date} /></label>
        <label className={labelClass}>End date<input type="datetime-local" value={values.end_date} onChange={(event) => update("end_date", event.target.value)} className={inputClass} /><FieldError error={errors.end_date} /></label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Enrolment opens<input type="datetime-local" value={values.enrolment_start} onChange={(event) => update("enrolment_start", event.target.value)} className={inputClass} /><FieldError error={errors.enrolment_start} /></label>
        <label className={labelClass}>Enrolment closes<input type="datetime-local" value={values.enrolment_end} onChange={(event) => update("enrolment_end", event.target.value)} className={inputClass} /><FieldError error={errors.enrolment_end} /></label>
      </div>
      <label className={labelClass}>Time zone<input value={values.time_zone} onChange={(event) => update("time_zone", event.target.value)} className={inputClass} /></label>
      <label className={labelClass}>Access duration (days)<input value={values.access_duration_days} onChange={(event) => update("access_duration_days", event.target.value)} placeholder="e.g. 90" className={inputClass} /></label>
    </section>
  );
}

/** Media input shared by the Training create/edit wizard. */
function UrlList({ label, values, update }: { label: string; values: string[]; update: (next: string[]) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className={labelClass}>{label}</p>
        <button type="button" onClick={() => update([...values, ""])} className="text-sm font-semibold text-[#1f6a58]">+ Add</button>
      </div>
      <div className="mt-2 space-y-2">
        {values.map((value, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="url"
              value={value}
              onChange={(event) => update(values.map((current, item) => (item === index ? event.target.value : current)))}
              className={inputClass.replace("mt-1.5 ", "")}
              placeholder="https://…"
            />
            <button type="button" onClick={() => update(values.filter((_item, item) => item !== index))} className="shrink-0 rounded-xl px-3 text-sm font-semibold text-[#b42318] hover:bg-[#fff6f5]">Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Renders pricing. */
export function TrainingPricingSection({ values, update }: SectionProps) {
  return (
    <section className="space-y-5">
      <SectionHeading title="Pricing & Tickets" description="Set the price and ticket options." />
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Price<input value={values.price} onChange={(event) => update("price", event.target.value)} className={inputClass} /></label>
        <label className={labelClass}>Currency<input value={values.currency} onChange={(event) => update("currency", event.target.value)} className={inputClass} /></label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Promo price<input value={values.promo_price} onChange={(event) => update("promo_price", event.target.value)} className={inputClass} /></label>
        <label className={labelClass}>Coupon code<input value={values.coupon_code} onChange={(event) => update("coupon_code", event.target.value)} className={inputClass} /></label>
      </div>
    </section>
  );
}

/** Renders capacity & registration. */
export function TrainingCapacitySection({ values, update }: SectionProps) {
  return (
    <section className="space-y-5">
      <SectionHeading title="Capacity & Registration" description="Set seats, approval and access window." />
      <label className={labelClass}>Capacity<input value={values.capacity} onChange={(event) => update("capacity", event.target.value)} className={inputClass} /></label>
      <label className="flex items-center gap-3 text-sm font-semibold text-[#06201c]"><input type="checkbox" checked={values.requires_approval} onChange={(event) => update("requires_approval", event.target.checked)} className="h-4 w-4 rounded border-[#d7e5df] text-[#1f6a58]" />Require approval for enrolment</label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Access duration (days)<input value={values.access_duration_days} onChange={(event) => update("access_duration_days", event.target.value)} placeholder="e.g. 90" className={inputClass} /></label>
        <label className={labelClass}>Access expiry<select value={values.access_expiry_type} onChange={(e) => update("access_expiry_type", e.target.value)} className={inputClass}><option value="never">Never</option><option value="date">By date</option><option value="days">After N days</option><option value="enrolment_day">Enrolment day + N</option></select></label>
      </div>
      <label className={labelClass}>Expiry days<input value={values.access_expiry_days} onChange={(event) => update("access_expiry_days", event.target.value)} placeholder="e.g. 90" className={inputClass} /></label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex items-center gap-3 text-sm font-semibold text-[#06201c]"><input type="checkbox" checked={values.group_enrolment} onChange={(e) => update("group_enrolment", e.target.checked)} className="h-4 w-4 rounded border-[#d7e5df] text-[#1f6a58]" />Group enrolment</label>
        <label className={labelClass}>Max group size<input value={values.max_group_size} onChange={(e) => update("max_group_size", e.target.value)} placeholder="e.g. 5" className={inputClass} /></label>
      </div>
    </section>
  );
}

/** Renders training images and media — mirrors the events Images & Media block. */
export function TrainingMediaSection({ values, update }: SectionProps) {
  return (
    <section className="space-y-5">
      <SectionHeading title="Images & Media" description="Add hosted URLs. Uploads are not configured in this workspace." />
      <label className={labelClass}>Primary image URL<input value={values.primary_image} onChange={(event) => update("primary_image", event.target.value)} className={inputClass} /></label>
      <p className="mt-1 text-xs text-[#7f9d94]">Shows on the training card and detail header when set.</p>
      <UrlList label="Gallery images" values={values.gallery_images} update={(next) => update("gallery_images", next)} />
      <UrlList label="Videos" values={[values.promotional_video]} update={(next) => update("promotional_video", next[0] || "")} />
    </section>
  );
}

/** Additional Configuration — prerequisites, release, randomise, publication. */
export function TrainingCourseBuilderSection({ values, update }: SectionProps) {
  return (
    <section className="space-y-5">
      <SectionHeading title="Additional Configuration" description="Prerequisites, release rules, randomisation and publication." />
      <label className={labelClass}>Prerequisites<textarea value={values.prerequisites} onChange={(e) => update("prerequisites", e.target.value)} placeholder="e.g. Complete Module 1" rows={2} className={`${inputClass} h-auto py-3`} /></label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Release rule<select value={values.release_rule} onChange={(e) => update("release_rule", e.target.value)} className={inputClass}><option value="immediate">Immediate</option><option value="date">By date</option><option value="enrolment_day">Enrolment day</option><option value="previous_lesson">Previous lesson</option></select></label>
        <label className={labelClass}>Scheduled publication<input type="datetime-local" value={values.scheduled_publication} onChange={(e) => update("scheduled_publication", e.target.value)} className={inputClass} /></label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex items-center gap-3 text-sm font-semibold text-[#06201c]"><input type="checkbox" checked={values.randomise} onChange={(e) => update("randomise", e.target.checked)} className="h-4 w-4 rounded border-[#d7e5df] text-[#1f6a58]" />Randomise questions/answers</label>
        <label className="flex items-center gap-3 text-sm font-semibold text-[#06201c]"><input type="checkbox" checked={values.is_mandatory} onChange={(e) => update("is_mandatory", e.target.checked)} className="h-4 w-4 rounded border-[#d7e5df] text-[#1f6a58]" />Mandatory lessons</label>
      </div>
    </section>
  );
}