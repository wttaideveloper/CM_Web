"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { CreateTrainingFormValues } from "./create-training-form";
import TrainingTaxonomyField from "./TrainingTaxonomyField";
import type { TrainingCategoryOption } from "./training-categories.service";
import TrainingMediaField from "./TrainingMediaField";
import TrainingFaqEditor from "./TrainingFaqEditor";
import { getTrainingCurrencyOptions, getTrainingTimeZoneOptions } from "./training-reference-options";

type UpdateForm = <Key extends keyof CreateTrainingFormValues>(key: Key, value: CreateTrainingFormValues[Key]) => void;

type SectionProps = {
  values: CreateTrainingFormValues;
  update: UpdateForm;
  errors: Record<string, string[]>;
  trainingCategories?: readonly TrainingCategoryOption[];
  categoriesLoading?: boolean;
  categoriesError?: boolean;
  retryCategories?: () => void;
  preserveLegacyCategoryValues?: boolean;
};

const inputClass = "mt-1.5 h-11 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm font-normal text-[#06201c] outline-none focus:border-[#1f6a58]";
const labelClass = "block text-sm font-semibold text-[#06201c]";

function FieldError({ error }: { error?: string[] }) {
  return error?.[0] ? <p className="mt-1 text-xs font-medium text-[#b42318]">{error[0]}</p> : null;
}
function SectionHeading({ title, description, tip }: { title: string; description: string; tip?: string }) {
  return (
    <div className="rounded-xl bg-[#f9fcfa] border border-[#e8f6ee] p-4">
      <h2 className="text-lg font-bold text-[#06201c]">{title}</h2>
      <p className="mt-1 text-sm leading-5 text-[#52736a]">{description}</p>
      {tip ? <p className="mt-2 rounded-lg bg-white border border-[#e1ebe6] px-3 py-2 text-xs leading-4 text-[#1f6a58]"><span className="font-semibold">Tip:</span> {tip}</p> : null}
    </div>
  );
}

/** Renders the required Training basics: title, category, description, and tags. */
export function TrainingBasicsSection({
  values,
  update,
  errors,
  trainingCategories = [],
  categoriesLoading = false,
  categoriesError = false,
  retryCategories,
  preserveLegacyCategoryValues = false,
}: SectionProps) {
  const addTag = (value: string) => {
    const tag = value.trim();
    if (tag && !values.tags.some((item) => item.toLocaleLowerCase() === tag.toLocaleLowerCase())) update("tags", [...values.tags, tag]);
  };
  const addObjective = (value: string) => {
    const obj = value.trim();
    if (obj && !values.learning_objectives.includes(obj)) update("learning_objectives", [...values.learning_objectives, obj]);
  };

  return (
    <section className="space-y-5">
      <SectionHeading title="Basic Information" description="Tell learners what this training is about — clear titles get 3× more enrolments." tip="Use a specific, benefit-driven title like ‘Diabetes Reversal — 12-Week Lifestyle Program’ instead of ‘Health Training’." />
      <label className={labelClass}>Training name <span className="text-[#b42318]">*</span><input id="training-field-title" value={values.title} onChange={(event) => update("title", event.target.value)} placeholder="e.g. Diabetes Reversal — 12-Week Program" className={inputClass} /><FieldError error={errors.title} /></label>
      <label className={labelClass}>Subtitle<input value={values.subtitle} onChange={(event) => update("subtitle", event.target.value)} placeholder="e.g. Reverse T2D with food, movement & sleep" className={inputClass} /></label>
      <label className={labelClass}>Description <span className="text-[#b42318]">*</span><textarea id="training-field-description" value={values.description} onChange={(event) => update("description", event.target.value)} rows={5} placeholder="What will learners achieve? Who is it for? What’s included?" className={`${inputClass} h-auto py-3`} /><FieldError error={errors.description} /></label>
      <div className="grid gap-4 md:grid-cols-2">
        <TrainingTaxonomyField
          field="category"
          label="Category"
          value={values.category}
          categoryValue={values.category}
          categories={trainingCategories}
          update={update}
          required
          error={errors.category?.[0]}
          categoriesLoading={categoriesLoading}
          categoriesError={categoriesError}
          onRetry={retryCategories}
          preserveLegacyValue={preserveLegacyCategoryValues}
        />
        <TrainingTaxonomyField
          field="subcategory"
          label="Subcategory"
          value={values.subcategory}
          categoryValue={values.category}
          categories={trainingCategories}
          update={update}
          error={errors.subcategory?.[0]}
          categoriesLoading={categoriesLoading}
          categoriesError={categoriesError}
          onRetry={retryCategories}
          preserveLegacyValue={preserveLegacyCategoryValues}
        />
      </div>
      <label className={labelClass}>Tags<input onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addTag(event.currentTarget.value); event.currentTarget.value = ""; } }} placeholder="Type a tag and press Enter" className={inputClass} /></label>
      <div className="flex flex-wrap gap-2">{values.tags.map((tag) => <button key={tag} type="button" onClick={() => update("tags", values.tags.filter((item) => item !== tag))} className="rounded-full bg-[#e8f6ee] px-3 py-1 text-xs font-bold text-[#1f6a58]">{tag} ×</button>)}</div>
      <label className={labelClass}>Learning objectives<input onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addObjective(event.currentTarget.value); event.currentTarget.value = ""; } }} placeholder="Type objective and press Enter" className={inputClass} /></label>
      <div className="flex flex-wrap gap-2">{values.learning_objectives.map((obj) => <button key={obj} type="button" onClick={() => update("learning_objectives", values.learning_objectives.filter((item) => item !== obj))} className="rounded-full bg-[#e8f6ee] px-3 py-1 text-xs font-bold text-[#1f6a58]">{obj} ×</button>)}</div>
      <label className={labelClass}>Requirements<textarea value={values.requirements} onChange={(event) => update("requirements", event.target.value)} rows={3} className={`${inputClass} h-auto py-3`} placeholder="Prerequisites or requirements" /></label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Target audience<input value={values.target_audience} onChange={(e) => update("target_audience", e.target.value)} placeholder="e.g. Beginners, patients" className={inputClass} /></label>
        <label className={labelClass}>Difficulty level<select value={values.difficulty_level} onChange={(e) => update("difficulty_level", e.target.value)} className={inputClass}><option value="">Select</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option><option value="expert">Expert</option></select></label>
      </div>
      <label className="flex items-center gap-3 text-sm font-semibold text-[#06201c]"><input type="checkbox" checked={values.offline_enabled} onChange={(e) => update("offline_enabled", e.target.checked)} className="h-4 w-4 rounded border-[#d7e5df] text-[#1f6a58]" />Offline enabled (downloadable content)</label>
    </section>
  );
}
/** Renders delivery mode, duration, and instructor — hybrid/physical/online like Event. */
export function TrainingDeliverySection({ values, update, errors }: SectionProps) {
  return (
    <section className="space-y-5">
      <SectionHeading title="Delivery & Instructor" description="Hybrid builds community — online scales it. Pick the format your learners prefer." tip="Physical needs a venue, Online needs a meeting link, Hybrid needs both. Learners filter by this." />
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Delivery mode<select value={values.delivery_mode} onChange={(event) => update("delivery_mode", event.target.value)} className={inputClass}><option value="online">Live</option><option value="physical">Venue</option><option value="hybrid">Hybrid</option><option value="self_paced">Self-paced</option></select></label>
        <label className={labelClass}>Course type<input value={values.course_type} onChange={(event) => update("course_type", event.target.value)} placeholder="e.g. Workshop" className={inputClass} /></label>
      </div>
      {values.delivery_mode === "hybrid" ? (
        <div className="rounded-xl border border-[#d6e9fd] bg-[#f2f9ff] px-4 py-3 text-sm text-[#1a5c91]">
          <p className="font-bold text-[#0b3d66]">Hybrid mode needs both</p>
          <p className="mt-1 text-xs">1. A live Google Meet / Zoom link below — learners join the online sessions with it.</p>
        </div>
      ) : null}
      {(values.delivery_mode === "physical" || values.delivery_mode === "hybrid" || values.delivery_mode === "in_person" || values.delivery_mode === "blended") ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <label className={labelClass}>Venue<input id="training-field-venue" value={values.venue} onChange={(event) => update("venue", event.target.value)} placeholder="e.g. Main Hall" className={inputClass} /></label>
            <label className={labelClass}>Address<input id="training-field-address" value={values.address} onChange={(event) => update("address", event.target.value)} placeholder="Full address" className={inputClass} /></label>
          </div>
        </>
      ) : null}
      {(values.delivery_mode === "online" || values.delivery_mode === "hybrid" || values.delivery_mode === "instructor_led" || values.delivery_mode === "blended") ? (
        <>
          <label className={labelClass}>Meeting link<input id="training-field-meeting_link" type="url" value={values.meeting_link} onChange={(event) => update("meeting_link", event.target.value)} placeholder="https://..." className={inputClass} /></label>
          <label className={labelClass}>Delivery instructions<textarea value={values.delivery_instructions} onChange={(event) => update("delivery_instructions", event.target.value)} rows={2} placeholder="How to join, setup, etc." className={`${inputClass} h-auto py-3`} /></label>
        </>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Duration<input value={values.duration} onChange={(event) => update("duration", event.target.value)} placeholder="e.g. 4 weeks" className={inputClass} /></label>
        <label className={labelClass}>Instructor ID<input id="training-field-instructor_id" value={values.instructor_id} onChange={(event) => update("instructor_id", event.target.value)} className={inputClass} /><FieldError error={errors.instructor_id} /></label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Level<select value={values.level} onChange={(e) => update("level", e.target.value)} className={inputClass}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option><option value="all">All levels</option></select></label>
        <label className={labelClass}>Language<select value={values.language} onChange={(e) => update("language", e.target.value)} className={inputClass}><option value="English">English</option><option value="Hindi">Hindi</option><option value="Spanish">Spanish</option><option value="French">French</option></select></label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Instructor name<input value={values.instructor_name} onChange={(event) => update("instructor_name", event.target.value)} placeholder="Display name" className={inputClass} /></label>
        <label className={labelClass}>Instructor bio<textarea value={values.instructor_bio} onChange={(event) => update("instructor_bio", event.target.value)} rows={2} placeholder="Short bio" className={`${inputClass} h-auto py-3`} /></label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Instructor photo URL<input type="url" value={values.instructor_photo} onChange={(event) => update("instructor_photo", event.target.value)} placeholder="https://…" className={inputClass} /></label>
        <label className={labelClass}>Instructor credentials<textarea value={values.instructor_credentials} onChange={(event) => update("instructor_credentials", event.target.value)} rows={2} placeholder="e.g. MBBS, RYT-500 · 10y experience" className={`${inputClass} h-auto py-3`} /></label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Instructor role<input value={values.instructor_role} onChange={(e) => update("instructor_role", e.target.value)} placeholder="e.g. Lead, Mentor" className={inputClass} /></label>
        {(values.delivery_mode === "online" || values.delivery_mode === "hybrid") ? (
          <label className={labelClass}>Meeting provider<select value={values.meeting_provider} onChange={(e) => update("meeting_provider", e.target.value)} className={inputClass}><option value="">Select</option><option value="zoom">Zoom</option><option value="meet">Google Meet</option><option value="teams">Teams</option></select></label>
        ) : null}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className={labelClass}>Session mode<input value={values.session_mode} onChange={(e) => update("session_mode", e.target.value)} placeholder="e.g. live, self-paced" className={inputClass} /></label>
      </div>
      <label className={labelClass}>Requirements<textarea value={values.requirements} onChange={(event) => update("requirements", event.target.value)} rows={3} className={`${inputClass} h-auto py-3`} /></label>
      <p className="text-xs text-[#7f9d94]">Hybrid = venue + online link · Physical = venue only · Online = meeting link only.</p>
    </section>
  );
}

/** Renders schedule and enrolment window fields. */
export function TrainingScheduleSection({ values, update, errors }: SectionProps) {
  const { t } = useTranslation("enterpriseTrainings");
  const timeZoneOptions = useMemo(() => getTrainingTimeZoneOptions(values.time_zone), [values.time_zone]);
  return (
    <section className="space-y-5">
      <SectionHeading title="Schedule" description="When does it run and when can people join? Dates drive calendar invites and reminders." tip="Start date powers the calendar file and ‘Upcoming’ filter. Enrolment closes auto-hides the Enrol button." />
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Start date<input id="training-field-start_date" type="datetime-local" value={values.start_date} onChange={(event) => update("start_date", event.target.value)} className={inputClass} /><FieldError error={errors.start_date} /></label>
        <label className={labelClass}>End date<input id="training-field-end_date" type="datetime-local" value={values.end_date} onChange={(event) => update("end_date", event.target.value)} className={inputClass} /><FieldError error={errors.end_date} /></label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Start time<input id="training-field-start_time" type="time" value={values.start_time} max={values.end_time || undefined} onChange={(event) => update("start_time", event.target.value)} className={inputClass} /><FieldError error={errors.start_time} /></label>
        <label className={labelClass}>End time<input id="training-field-end_time" type="time" value={values.end_time} min={values.start_time || undefined} onChange={(event) => update("end_time", event.target.value)} className={inputClass} /><FieldError error={errors.end_time} /></label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Enrolment opens<input id="training-field-enrolment_start" type="datetime-local" value={values.enrolment_start} onChange={(event) => update("enrolment_start", event.target.value)} className={inputClass} /><FieldError error={errors.enrolment_start} /></label>
        <label className={labelClass}>Enrolment closes<input id="training-field-enrolment_end" type="datetime-local" value={values.enrolment_end} min={values.enrolment_start || undefined} max={values.enrolment_start && values.start_date && values.enrolment_start > values.start_date ? undefined : values.start_date || undefined} onChange={(event) => update("enrolment_end", event.target.value)} className={inputClass} /><FieldError error={errors.enrolment_end} /></label>
      </div>
      <label className={labelClass}>Time zone<select id="training-field-time_zone" value={values.time_zone} onChange={(event) => update("time_zone", event.target.value)} className={inputClass}><option value="">{t("referenceOptions.selectTimeZone")}</option>{timeZoneOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Recurring<input value={values.recurring} onChange={(e) => update("recurring", e.target.value)} placeholder="e.g. weekly, none" className={inputClass} /></label>
        <label className={labelClass}>Schedule exceptions<textarea id="training-field-schedule_exceptions" value={values.schedule_exceptions} onChange={(e) => update("schedule_exceptions", e.target.value)} placeholder='JSON e.g. ["2026-09-25"]' rows={2} className={`${inputClass} h-auto py-2`} /><FieldError error={errors.schedule_exceptions} /></label>
      </div>
      <label className={labelClass}>Access duration (days)<input value={values.access_duration_days} onChange={(event) => update("access_duration_days", event.target.value)} placeholder="e.g. 90" className={inputClass} /></label>
    </section>
  );
}

/** Training Advanced — discussions, announcements, moderation, instructor notes, notes pdf, etc. */
export function TrainingAdvancedSection({ values, update, errors }: SectionProps) {
  return (
    <section className="space-y-5">
      <SectionHeading title="Advanced & Collaboration" description="Discussions, announcements, moderation and supplemental notes." tip="JSON fields accept an array or object, e.g. [] or [{}]. Leave empty to omit." />
      <UrlList label="Notes / Handouts (URLs)" values={values.instructor_notes} update={(next) => update("instructor_notes", next)} addLabel="noteHandout" />
      <label className={labelClass}>Instructor notes<input value={values.instructor_notes.join(", ")} onChange={(e) => update("instructor_notes", e.target.value.split(",").map((note) => note.trim()).filter(Boolean))} placeholder="Internal notes for the instructor, not shown to learners" className={inputClass} /></label>
      <label className={labelClass}>Notes PDF URL<input type="url" value={values.notes_pdf_url} onChange={(e) => update("notes_pdf_url", e.target.value)} placeholder="https://…" className={inputClass} /></label>
      <TrainingFaqEditor label="FAQs" value={values.faqs} onChange={(value) => update("faqs", value)} error={errors.faqs?.[0]} />
      <div>
        <label className={labelClass}>Milestone badges<input onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); const v = event.currentTarget.value.trim(); if (v && !values.badges.includes(v)) update("badges", [...values.badges, v]); event.currentTarget.value = ""; } }} placeholder="Type badge and press Enter" className={inputClass} /></label>
        <div className="mt-2 flex flex-wrap gap-2">{values.badges.map((badge) => <button key={badge} type="button" onClick={() => update("badges", values.badges.filter((item) => item !== badge))} className="rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-bold text-[#2563eb]">{badge} ×</button>)}</div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Discussions (JSON)<textarea value={values.discussions} onChange={(e) => update("discussions", e.target.value)} placeholder='[]' rows={3} className={`${inputClass} h-auto py-2`} /></label>
        <label className={labelClass}>Announcements (JSON)<textarea value={values.announcements} onChange={(e) => update("announcements", e.target.value)} placeholder='[]' rows={3} className={`${inputClass} h-auto py-2`} /></label>
      </div>
      <label className={labelClass}>Moderation history (JSON)<textarea value={values.moderation_history} onChange={(e) => update("moderation_history", e.target.value)} placeholder='[]' rows={3} className={`${inputClass} h-auto py-2`} /></label>
    </section>
  );
}

/** Media input shared by the Training create/edit wizard. */
function UrlList({ label, values, update, uploadImages = false, addLabel = "item" }: { label: string; values?: string[]; update: (next: string[]) => void; uploadImages?: boolean; addLabel?: "item" | "noteHandout" }) {
  const safeValues = Array.isArray(values) ? values : [];
  const { t } = useTranslation("enterpriseTrainings");
  const itemLabel = uploadImages ? t("media.image") : addLabel === "noteHandout" ? t("media.noteHandout") : t("media.item");
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className={labelClass}>{label}</p>
        <button type="button" onClick={() => update([...safeValues, ""])} className="text-sm font-semibold text-[#1f6a58]">+ {t("media.addItem", { item: itemLabel })}</button>
      </div>
      <div className="mt-2 space-y-2">
        {safeValues.map((value, index) => (
          <div key={index} className="flex flex-wrap items-start gap-2">
            <div className="min-w-0 flex-1">
              {uploadImages ? (
                <TrainingMediaField
                  fieldKey="gallery_images"
                  label={`${label} ${index + 1}`}
                  value={value}
                  kind="image"
                  accept="image/*"
                  purpose="image"
                  onChange={(next) => update(safeValues.map((current, item) => (item === index ? next : current)))}
                />
              ) : (
                <input
                  type="url"
                  value={value}
                  onChange={(event) => update(safeValues.map((current, item) => (item === index ? event.target.value : current)))}
                  className={`${inputClass.replace("mt-1.5 ", "")} min-w-0 flex-1`}
                  placeholder="https://…"
                />
              )}
            </div>
            <button type="button" onClick={() => update(safeValues.filter((_item, item) => item !== index))} className="mt-2 shrink-0 rounded-xl px-3 py-2 text-sm font-semibold text-[#b42318] hover:bg-[#fff6f5]">Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function OptionalTrainingVideo({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [isOpen, setIsOpen] = useState(Boolean(value));
  const { t } = useTranslation("enterpriseTrainings");
  if (!isOpen) {
    return <button type="button" onClick={() => setIsOpen(true)} className="text-sm font-semibold text-[#1f6a58]">+ {t("media.addVideo")}</button>;
  }
  return (
    <div>
      <TrainingMediaField
        fieldKey="promotional_video"
        label="Promotional video"
        value={value}
        kind="video"
        accept="video/*"
        purpose="lesson_video"
        onChange={onChange}
      />
      {!value ? <button type="button" onClick={() => setIsOpen(false)} className="mt-2 text-xs font-semibold text-[#52736a] underline">{t("media.cancel")}</button> : null}
    </div>
  );
}

/** Renders pricing. */
export function TrainingPricingSection({ values, update }: SectionProps) {
  const { t, i18n } = useTranslation("enterpriseTrainings");
  const language = i18n.resolvedLanguage ?? i18n.language;
  const currencyOptions = useMemo(() => getTrainingCurrencyOptions(values.currency, language), [values.currency, language]);
  return (
    <section className="space-y-5">
      <SectionHeading title="Pricing & Tickets" description="Free trainings get 8× more views — consider a free preview lesson." tip="Leave price empty for free. Early-bird? Use Promo price + coupon — learners love it." />
      <label className={labelClass}>Pricing<select value={values.pricing_type} onChange={(event) => update("pricing_type", event.target.value as "free" | "paid")} className={inputClass}><option value="free">Free</option><option value="paid">Paid</option></select></label>
      {values.pricing_type === "paid" ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <label className={labelClass}>Price<input id="training-field-price" value={values.price} onChange={(event) => update("price", event.target.value)} className={inputClass} /></label>
            <label className={labelClass}>Currency<select id="training-field-currency" value={values.currency} onChange={(event) => update("currency", event.target.value)} className={inputClass}><option value="">{t("referenceOptions.selectCurrency")}</option>{currencyOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className={labelClass}>Promo price<input value={values.promo_price} onChange={(event) => update("promo_price", event.target.value)} className={inputClass} /></label>
            <label className={labelClass}>Coupon code<input value={values.coupon_code} onChange={(event) => update("coupon_code", event.target.value)} className={inputClass} /></label>
          </div>
        </>
      ) : null}
    </section>
  );
}

/** Renders capacity & registration. */
export function TrainingCapacitySection({ values, update }: SectionProps) {
  return (
    <section className="space-y-5">
      <SectionHeading title="Capacity & Registration" description="Control who gets in and for how long they keep access." tip="‘Require approval’ is great for coaching cohorts. Access expiry auto-revokes content — great for certifications." />
      <label className={labelClass}>Capacity<input id="training-field-capacity" value={values.capacity} onChange={(event) => update("capacity", event.target.value)} className={inputClass} /></label>
      <label className="flex items-center gap-3 text-sm font-semibold text-[#06201c]"><input type="checkbox" checked={values.requires_approval} onChange={(event) => update("requires_approval", event.target.checked)} className="h-4 w-4 rounded border-[#d7e5df] text-[#1f6a58]" />Require approval for enrolment</label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Access duration (days)<input value={values.access_duration_days} onChange={(event) => update("access_duration_days", event.target.value)} placeholder="e.g. 90" className={inputClass} /></label>
        <label className={labelClass}>Access expiry<select value={values.access_expiry_type} onChange={(e) => update("access_expiry_type", e.target.value)} className={inputClass}><option value="never">Never</option><option value="date">By date</option><option value="days">After N days</option><option value="enrolment_day">Enrolment day + N</option></select></label>
      </div>
      <label className={labelClass}>Expiry days<input value={values.access_expiry_days} onChange={(event) => update("access_expiry_days", event.target.value)} placeholder="e.g. 90" className={inputClass} /></label>
    </section>
  );
}

function DocumentsList({ values, update }: { values: Array<{ url: string; visibility: string; downloadable: boolean }>; update: (next: Array<{ url: string; visibility: string; downloadable: boolean }>) => void }) {
  const { t } = useTranslation("enterpriseTrainings");
  return (
    <div>
      <div className="flex items-center justify-between"><p className={labelClass}>Documents</p><button type="button" onClick={() => update([...values, { url: "", visibility: "public", downloadable: true }])} className="text-sm font-semibold text-[#1f6a58]">+ {t("media.addDocument")}</button></div>
      <div className="mt-2 space-y-3">
        {values.map((doc, idx) => (
          <div key={idx} className="rounded-xl border border-[#d7e5df] bg-[#f9fcfa] p-3">
            <div className="flex flex-wrap items-start gap-2">
              <div className="min-w-0 flex-1">
                <TrainingMediaField
                  fieldKey="documents"
                  label={`Document ${idx + 1}`}
                  value={doc.url}
                  kind="document"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.rtf,application/pdf,text/plain"
                  purpose="lesson_document"
                  onChange={(url) => update(values.map((item, index) => (index === idx ? { ...item, url } : item)))}
                />
              </div>
              <button type="button" onClick={() => update(values.filter((_, i) => i !== idx))} className="mt-2 shrink-0 rounded-xl px-3 py-2 text-sm font-semibold text-[#b42318] hover:bg-[#fff6f5]">Remove</button>
            </div>
            <div className="mt-2 flex gap-3">
              <label className="flex items-center gap-1 text-xs font-semibold text-[#06201c]">Visibility<select value={doc.visibility} onChange={(e) => update(values.map((d, i) => (i === idx ? { ...d, visibility: e.target.value } : d)))} className="ml-1 rounded-lg border border-[#d7e5df] bg-white px-2 py-1 text-xs"><option value="public">public</option><option value="private">private</option></select></label>
              <label className="flex items-center gap-2 text-xs font-semibold text-[#06201c]"><input type="checkbox" checked={doc.downloadable} onChange={(e) => update(values.map((d, i) => (i === idx ? { ...d, downloadable: e.target.checked } : d)))} className="h-4 w-4 rounded border-[#d7e5df] text-[#1f6a58]" />Downloadable</label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Renders training images and media — mirrors the events Images & Media block. */
export function TrainingMediaSection({ values, update }: SectionProps) {
  return (
    <section className="space-y-5">
      <SectionHeading title="Images & Media" description="A great cover image lifts enrolments. Use 16:9, ≥1280px." tip="Primary image is the card + header. Gallery builds trust — add 2–3 real photos." />
      <div>
        <p className={labelClass}>Primary image</p>
        <TrainingMediaField
          fieldKey="primary_image"
          label="Primary image"
          value={values.primary_image}
          kind="image"
          accept="image/*"
          purpose="image"
          onChange={(url) => update("primary_image", url)}
        />
      </div>
      <p className="mt-1 text-xs text-[#7f9d94]">Shows on the training card and detail header when set.</p>
      <UrlList label="Gallery images" values={values.gallery_images} update={(next) => update("gallery_images", next)} uploadImages />
      <DocumentsList values={values.documents} update={(next) => update("documents", next)} />
      <div><p className={labelClass}>Videos</p><div className="mt-2"><OptionalTrainingVideo value={values.promotional_video} onChange={(next) => update("promotional_video", next)} /></div></div>
    </section>
  );
}

/** Additional Configuration — informational prerequisites and course resources. */
export function TrainingCourseBuilderSection({ values, update, errors }: SectionProps) {
  return (
    <section className="space-y-5">
      <SectionHeading title="Additional Configuration" description="Share prerequisite information and course-related notes with learners." />
      <label className={labelClass}>Prerequisites<textarea id="training-field-prerequisites" value={values.prerequisites} onChange={(e) => update("prerequisites", e.target.value)} placeholder="e.g. Complete Module 1" rows={2} className={`${inputClass} h-auto py-3`} /><FieldError error={errors.prerequisites} /></label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Notes PDF URL<input type="url" value={values.notes_pdf_url} onChange={(e) => update("notes_pdf_url", e.target.value)} placeholder="https://…" className={inputClass} /></label>
        <label className={labelClass}>Session mode<input value={values.session_mode} onChange={(e) => update("session_mode", e.target.value)} placeholder="e.g. live, cohort" className={inputClass} /></label>
      </div>
      <UrlList label="Notes / Handouts (URLs)" values={values.instructor_notes} update={(next) => update("instructor_notes", next)} addLabel="noteHandout" />
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Discussions (JSON)<textarea value={values.discussions} onChange={(e) => update("discussions", e.target.value)} rows={3} placeholder='[]' className={`${inputClass} h-auto py-2`} /></label>
        <label className={labelClass}>Announcements (JSON)<textarea value={values.announcements} onChange={(e) => update("announcements", e.target.value)} rows={3} placeholder='[]' className={`${inputClass} h-auto py-2`} /></label>
      </div>
      <label className={labelClass}>Moderation history (JSON)<textarea value={values.moderation_history} onChange={(e) => update("moderation_history", e.target.value)} rows={3} placeholder='[]' className={`${inputClass} h-auto py-2`} /></label>
    </section>
  );
}
