"use client";

import type { CreateTrainingFormValues } from "./create-training-form";

type UpdateForm = <Key extends keyof CreateTrainingFormValues>(key: Key, value: CreateTrainingFormValues[Key]) => void;

type SectionProps = { values: CreateTrainingFormValues; update: UpdateForm; errors: Record<string, string[]> };

const inputClass = "mt-1.5 h-11 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm text-[#06201c] outline-none focus:border-[#1f6a58]";
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
export function TrainingBasicsSection({ values, update, errors }: SectionProps) {
  const addTag = (value: string) => {
    const tag = value.trim();
    if (tag && !values.tags.includes(tag)) update("tags", [...values.tags, tag]);
  };
  const addObjective = (value: string) => {
    const obj = value.trim();
    if (obj && !values.learning_objectives.includes(obj)) update("learning_objectives", [...values.learning_objectives, obj]);
  };

  return (
    <section className="space-y-5">
      <SectionHeading title="Basic Information" description="Tell learners what this training is about — clear titles get 3× more enrolments." tip="Use a specific, benefit-driven title like ‘Diabetes Reversal — 12-Week Lifestyle Program’ instead of ‘Health Training’." />
      <label className={labelClass}>Training name <span className="text-[#b42318]">*</span><input value={values.title} onChange={(event) => update("title", event.target.value)} placeholder="e.g. Diabetes Reversal — 12-Week Program" className={inputClass} /><FieldError error={errors.title} /></label>
      <label className={labelClass}>Subtitle<input value={values.subtitle} onChange={(event) => update("subtitle", event.target.value)} placeholder="e.g. Reverse T2D with food, movement & sleep" className={inputClass} /></label>
      <label className={labelClass}>Description <span className="text-[#b42318]">*</span><textarea value={values.description} onChange={(event) => update("description", event.target.value)} rows={5} placeholder="What will learners achieve? Who is it for? What’s included?" className={`${inputClass} h-auto py-3`} /><FieldError error={errors.description} /></label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Category<input value={values.category} onChange={(event) => update("category", event.target.value)} className={inputClass} /><FieldError error={errors.category} /></label>
        <label className={labelClass}>Subcategory<input value={values.subcategory} onChange={(event) => update("subcategory", event.target.value)} className={inputClass} /></label>
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
export function TrainingDeliverySection({ values, update }: SectionProps) {
  return (
    <section className="space-y-5">
      <SectionHeading title="Delivery & Instructor" description="Hybrid builds community — online scales it. Pick the format your learners prefer." tip="Physical needs a venue, Online needs a meeting link, Hybrid needs both. Learners filter by this." />
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Delivery mode<select value={values.delivery_mode} onChange={(event) => update("delivery_mode", event.target.value)} className={inputClass}><option value="online">Live online</option><option value="physical">Offline (physical venue)</option><option value="hybrid">Hybrid</option><option value="self_paced">Self-paced</option></select></label>
        <label className={labelClass}>Course type<input value={values.course_type} onChange={(event) => update("course_type", event.target.value)} placeholder="e.g. Workshop" className={inputClass} /></label>
      </div>
      {values.delivery_mode === "hybrid" ? (
        <div className="rounded-xl border border-[#d6e9fd] bg-[#f2f9ff] px-4 py-3 text-sm text-[#1a5c91]">
          <p className="font-bold text-[#0b3d66]">Hybrid mode needs both</p>
          <p className="mt-1 text-xs">1. A live Google Meet / Zoom link below — learners join the online sessions with it.</p>
          <p className="text-xs">2. The QR code / pass code in the check-in group — used for attendance on the day.</p>
          {!values.meeting_link.trim() || !values.qr_payload.trim() ? <p className="mt-2 text-xs font-bold text-[#b42318]">You are missing: {!values.meeting_link.trim() ? "meeting link" : ""}{!values.meeting_link.trim() && !values.qr_payload.trim() ? " and " : ""}{!values.qr_payload.trim() ? "QR payload" : ""}.</p> : null}
        </div>
      ) : null}
      {(values.delivery_mode === "physical" || values.delivery_mode === "hybrid" || values.delivery_mode === "in_person" || values.delivery_mode === "blended") ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <label className={labelClass}>Venue<input value={values.venue} onChange={(event) => update("venue", event.target.value)} placeholder="e.g. Main Hall" className={inputClass} /></label>
            <label className={labelClass}>Address<input value={values.address} onChange={(event) => update("address", event.target.value)} placeholder="Full address" className={inputClass} /></label>
          </div>
          <label className={labelClass}>Location ID<input value={values.location_id} onChange={(event) => update("location_id", event.target.value)} placeholder="Select or paste location ID" className={inputClass} /></label>
        </>
      ) : null}
      {(values.delivery_mode === "online" || values.delivery_mode === "hybrid" || values.delivery_mode === "instructor_led" || values.delivery_mode === "blended") ? (
        <>
          <label className={labelClass}>Meeting link<input type="url" value={values.meeting_link} onChange={(event) => update("meeting_link", event.target.value)} placeholder="https://..." className={inputClass} /></label>
          <label className={labelClass}>Delivery instructions<textarea value={values.delivery_instructions} onChange={(event) => update("delivery_instructions", event.target.value)} rows={2} placeholder="How to join, setup, etc." className={`${inputClass} h-auto py-3`} /></label>
        </>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Duration<input value={values.duration} onChange={(event) => update("duration", event.target.value)} placeholder="e.g. 4 weeks" className={inputClass} /></label>
        <label className={labelClass}>Instructor ID<input value={values.instructor_id} onChange={(event) => update("instructor_id", event.target.value)} className={inputClass} /></label>
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
        <label className={labelClass}>Meeting provider<select value={values.meeting_provider} onChange={(e) => update("meeting_provider", e.target.value)} className={inputClass}><option value="">Select</option><option value="zoom">Zoom</option><option value="meet">Google Meet</option><option value="teams">Teams</option><option value="in_person">In person</option></select></label>
      </div>
      <label className={labelClass}>Access information<textarea value={values.access_information} onChange={(e) => update("access_information", e.target.value)} rows={2} placeholder="How to access, prerequisites for entry" className={`${inputClass} h-auto py-3`} /></label>
      <div className="grid gap-4 md:grid-cols-3">
        <label className={labelClass}>Session mode<input value={values.session_mode} onChange={(e) => update("session_mode", e.target.value)} placeholder="e.g. live, self-paced" className={inputClass} /></label>
        {values.delivery_mode !== "online" && values.delivery_mode !== "self_paced" ? <label className="flex items-center gap-2 text-sm font-semibold text-[#06201c]"><input type="checkbox" checked={values.check_in} onChange={(e) => update("check_in", e.target.checked)} className="h-4 w-4 rounded border-[#d7e5df] text-[#1f6a58] focus:ring-[#1f6a58]" />Enable check-in</label> : null}
        {values.delivery_mode !== "online" && values.delivery_mode !== "self_paced" ? <label className={labelClass}>Pass code<input value={values.pass_code} onChange={(e) => update("pass_code", e.target.value)} placeholder="e.g. 1234" className={inputClass} /></label> : null}
      </div>
      {values.delivery_mode !== "online" && values.delivery_mode !== "self_paced" ? <label className={labelClass}>QR payload<input value={values.qr_payload} onChange={(e) => update("qr_payload", e.target.value)} placeholder="QR data" className={inputClass} /></label> : null}
      <label className={labelClass}>Requirements<textarea value={values.requirements} onChange={(event) => update("requirements", event.target.value)} rows={3} className={`${inputClass} h-auto py-3`} /></label>
      <p className="text-xs text-[#7f9d94]">Hybrid = venue + online link + QR (check-in) · Physical = venue only · Online = meeting link only (mirrors Event In Person/Online/Hybrid).</p>
    </section>
  );
}

/** Renders schedule and enrolment window fields. */
export function TrainingScheduleSection({ values, update, errors }: SectionProps) {
  return (
    <section className="space-y-5">
      <SectionHeading title="Schedule" description="When does it run and when can people join? Dates drive calendar invites and reminders." tip="Start date powers the calendar file and ‘Upcoming’ filter. Enrolment closes auto-hides the Enrol button." />
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Start date<input type="datetime-local" value={values.start_date} onChange={(event) => update("start_date", event.target.value)} className={inputClass} /><FieldError error={errors.start_date} /></label>
        <label className={labelClass}>End date<input type="datetime-local" value={values.end_date} onChange={(event) => update("end_date", event.target.value)} className={inputClass} /><FieldError error={errors.end_date} /></label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Start time<input type="time" value={values.start_time} onChange={(event) => update("start_time", event.target.value)} className={inputClass} /></label>
        <label className={labelClass}>End time<input type="time" value={values.end_time} onChange={(event) => update("end_time", event.target.value)} className={inputClass} /></label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Enrolment opens<input type="datetime-local" value={values.enrolment_start} onChange={(event) => update("enrolment_start", event.target.value)} className={inputClass} /><FieldError error={errors.enrolment_start} /></label>
        <label className={labelClass}>Enrolment closes<input type="datetime-local" value={values.enrolment_end} onChange={(event) => update("enrolment_end", event.target.value)} className={inputClass} /><FieldError error={errors.enrolment_end} /></label>
      </div>
      <label className={labelClass}>Time zone<input value={values.time_zone} onChange={(event) => update("time_zone", event.target.value)} className={inputClass} /></label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Recurring<input value={values.recurring} onChange={(e) => update("recurring", e.target.value)} placeholder="e.g. weekly, none" className={inputClass} /></label>
        <label className={labelClass}>Schedule exceptions<textarea value={values.schedule_exceptions} onChange={(e) => update("schedule_exceptions", e.target.value)} placeholder='JSON e.g. ["2026-09-25"]' rows={2} className={`${inputClass} h-auto py-2`} /></label>
      </div>
      <label className={labelClass}>Access duration (days)<input value={values.access_duration_days} onChange={(event) => update("access_duration_days", event.target.value)} placeholder="e.g. 90" className={inputClass} /></label>
    </section>
  );
}

/** Training Advanced — discussions, announcements, moderation, instructor notes, notes pdf, etc. */
export function TrainingAdvancedSection({ values, update }: SectionProps) {
  return (
    <section className="space-y-5">
      <SectionHeading title="Advanced & Collaboration" description="Discussions, announcements, moderation and supplemental notes." tip="JSON fields accept an array or object, e.g. [] or [{}]. Leave empty to omit." />
      <UrlList label="Notes / Handouts (URLs)" values={values.instructor_notes} update={(next) => update("instructor_notes", next)} />
      <label className={labelClass}>Instructor notes<input value={values.instructor_notes} onChange={(e) => update("instructor_notes", e.target.value)} placeholder="Internal notes for the instructor, not shown to learners" className={inputClass} /></label>
      <label className={labelClass}>Notes PDF URL<input type="url" value={values.notes_pdf_url} onChange={(e) => update("notes_pdf_url", e.target.value)} placeholder="https://…" className={inputClass} /></label>
      <label className={labelClass}>FAQs (JSON)<textarea value={values.faqs} onChange={(e) => update("faqs", e.target.value)} placeholder='[{"question":"...","answer":"..."}]' rows={3} className={`${inputClass} h-auto py-2`} /></label>
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
function UrlList({ label, values, update }: { label: string; values?: string[]; update: (next: string[]) => void }) {
  const safeValues = Array.isArray(values) ? values : [];
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className={labelClass}>{label}</p>
        <button type="button" onClick={() => update([...safeValues, ""])} className="text-sm font-semibold text-[#1f6a58]">+ Add</button>
      </div>
      <div className="mt-2 space-y-2">
        {safeValues.map((value, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="url"
              value={value}
              onChange={(event) => update(safeValues.map((current, item) => (item === index ? event.target.value : current)))}
              className={inputClass.replace("mt-1.5 ", "")}
              placeholder="https://…"
            />
            <button type="button" onClick={() => update(safeValues.filter((_item, item) => item !== index))} className="shrink-0 rounded-xl px-3 text-sm font-semibold text-[#b42318] hover:bg-[#fff6f5]">Remove</button>
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
      <SectionHeading title="Pricing & Tickets" description="Free trainings get 8× more views — consider a free preview lesson." tip="Leave price empty for free. Early-bird? Use Promo price + coupon — learners love it." />
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
      <SectionHeading title="Capacity & Registration" description="Control who gets in and for how long they keep access." tip="‘Require approval’ is great for coaching cohorts. Access expiry auto-revokes content — great for certifications." />
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

function DocumentsList({ values, update }: { values: Array<{ url: string; visibility: string; downloadable: boolean }>; update: (next: Array<{ url: string; visibility: string; downloadable: boolean }>) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className={labelClass}>Documents</p>
        <button type="button" onClick={() => update([...values, { url: "", visibility: "public", downloadable: true }])} className="text-sm font-semibold text-[#1f6a58]">+ Add</button>
      </div>
      <div className="mt-2 space-y-3">
        {values.map((doc, idx) => (
          <div key={idx} className="rounded-xl border border-[#d7e5df] bg-[#f9fcfa] p-3">
            <div className="flex gap-2">
              <input type="url" value={doc.url} onChange={(e) => update(values.map((d, i) => (i === idx ? { ...d, url: e.target.value } : d)))} placeholder="https://…" className={inputClass.replace("mt-1.5 ", "") + " flex-1"} />
              <button type="button" onClick={() => update(values.filter((_, i) => i !== idx))} className="shrink-0 rounded-xl px-3 text-sm font-semibold text-[#b42318] hover:bg-[#fff6f5]">Remove</button>
            </div>
            <div className="mt-2 flex gap-3">
              <label className="flex items-center gap-1 text-xs font-semibold text-[#06201c]">Visibility<select value={doc.visibility} onChange={(e) => update(values.map((d, i) => (i === idx ? { ...d, visibility: e.target.value } : d)))} className="ml-1 rounded-lg border border-[#d7e5df] bg-white px-2 py-1 text-xs"><option value="public">public</option><option value="private">private</option></select></label>
              <label className="flex items-center gap-2 text-xs font-semibold text-[#06201c]"><input type="checkbox" checked={doc.downloadable} onChange={(e) => update(values.map((d, i) => (i === idx ? { ...d, downloadable: e.target.checked } : d)))} className="h-4 w-4 rounded border-[#d7e5df] text-[#1f6a58]" />Downloadable</label>
            </div>
          </div>
        ))}
        {values.length === 0 ? <p className="text-xs text-[#7f9d94]">No documents yet — click + Add.</p> : null}
      </div>
    </div>
  );
}

/** Renders training images and media — mirrors the events Images & Media block. */
export function TrainingMediaSection({ values, update }: SectionProps) {
  return (
    <section className="space-y-5">
      <SectionHeading title="Images & Media" description="A great cover image lifts enrolments. Use 16:9, ≥1280px." tip="Primary image is the card + header. Gallery builds trust — add 2–3 real photos." />
      <label className={labelClass}>Primary image URL<input value={values.primary_image} onChange={(event) => update("primary_image", event.target.value)} className={inputClass} /></label>
      <p className="mt-1 text-xs text-[#7f9d94]">Shows on the training card and detail header when set.</p>
      <UrlList label="Gallery images" values={values.gallery_images} update={(next) => update("gallery_images", next)} />
      <DocumentsList values={values.documents} update={(next) => update("documents", next)} />
      <UrlList label="Videos" values={[values.promotional_video]} update={(next) => update("promotional_video", next[0] || "")} />
    </section>
  );
}

/** Additional Configuration — prerequisites, release, randomise, publication. */
export function TrainingCourseBuilderSection({ values, update }: SectionProps) {
  return (
    <section className="space-y-5">
      <SectionHeading title="Additional Configuration" description="Fine-tune the learning journey — when content unlocks and how it’s completed." tip="Prerequisites = ‘Complete Module 1 first’. Release = ‘Enrolment day + 3’ for drip content." />
      <label className={labelClass}>Prerequisites<textarea value={values.prerequisites} onChange={(e) => update("prerequisites", e.target.value)} placeholder="e.g. Complete Module 1" rows={2} className={`${inputClass} h-auto py-3`} /></label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Release rule<select value={values.release_rule} onChange={(e) => update("release_rule", e.target.value)} className={inputClass}><option value="immediate">Immediate</option><option value="date">By date</option><option value="enrolment_day">Enrolment day</option><option value="previous_lesson">Previous lesson</option></select></label>
        <label className={labelClass}>Scheduled publication<input type="datetime-local" value={values.scheduled_publication} onChange={(e) => update("scheduled_publication", e.target.value)} className={inputClass} /></label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex items-center gap-3 text-sm font-semibold text-[#06201c]"><input type="checkbox" checked={values.randomise} onChange={(e) => update("randomise", e.target.checked)} className="h-4 w-4 rounded border-[#d7e5df] text-[#1f6a58]" />Randomise questions/answers</label>
        <label className="flex items-center gap-3 text-sm font-semibold text-[#06201c]"><input type="checkbox" checked={values.is_mandatory} onChange={(e) => update("is_mandatory", e.target.checked)} className="h-4 w-4 rounded border-[#d7e5df] text-[#1f6a58]" />Mandatory lessons</label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Notes PDF URL<input type="url" value={values.notes_pdf_url} onChange={(e) => update("notes_pdf_url", e.target.value)} placeholder="https://…" className={inputClass} /></label>
        <label className={labelClass}>Session mode<input value={values.session_mode} onChange={(e) => update("session_mode", e.target.value)} placeholder="e.g. live, cohort" className={inputClass} /></label>
      </div>
      <UrlList label="Notes / Handouts (URLs)" values={values.instructor_notes} update={(next) => update("instructor_notes", next)} />
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>Discussions (JSON)<textarea value={values.discussions} onChange={(e) => update("discussions", e.target.value)} rows={3} placeholder='[]' className={`${inputClass} h-auto py-2`} /></label>
        <label className={labelClass}>Announcements (JSON)<textarea value={values.announcements} onChange={(e) => update("announcements", e.target.value)} rows={3} placeholder='[]' className={`${inputClass} h-auto py-2`} /></label>
      </div>
      <label className={labelClass}>Moderation history (JSON)<textarea value={values.moderation_history} onChange={(e) => update("moderation_history", e.target.value)} rows={3} placeholder='[]' className={`${inputClass} h-auto py-2`} /></label>
    </section>
  );
}
