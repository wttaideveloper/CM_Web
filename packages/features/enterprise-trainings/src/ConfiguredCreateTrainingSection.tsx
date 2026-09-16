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
  learning_objectives: "learning_objectives",
  instructor_id: "instructor_id",
  instructor_name: "instructor_name",
  instructor_bio: "instructor_bio",
  requirements: "requirements",
  primary_image: "primary_image",
  gallery_images: "gallery_images",
  promotional_video: "promotional_video",
  documents: "documents",
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
  level: "level",
  language: "language",
  recurring: "recurring",
  schedule_exceptions: "schedule_exceptions",
  access_information: "access_information",
  meeting_provider: "meeting_provider",
  instructor_role: "instructor_role",
  instructor_notes: "instructor_notes",
  notes_documents: "notes_documents",
  notes_pdf_url: "notes_pdf_url",
  target_audience: "target_audience",
  difficulty_level: "difficulty_level",
  offline_enabled: "offline_enabled",
  session_mode: "session_mode",
  check_in: "check_in",
  pass_code: "pass_code",
  qr_payload: "qr_payload",
  discussions: "discussions",
  announcements: "announcements",
  moderation_history: "moderation_history",
  subtitle: "subtitle",
  faqs: "faqs",
  instructor_photo: "instructor_photo",
  instructor_credentials: "instructor_credentials",
  badges: "badges",
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
      {values.delivery_mode === "hybrid" ? (
        <div className="rounded-xl border border-[#d6e9fd] bg-[#f2f9ff] px-4 py-3 text-sm text-[#1a5c91]">
          <p className="font-bold text-[#0b3d66]">Hybrid mode requires both a meeting link (Google Meet / Zoom) and a QR payload (check-in code).</p>
          {!values.meeting_link.trim() || !values.qr_payload.trim() ? <p className="mt-1 text-xs font-bold text-[#b42318]">Missing: {!values.meeting_link.trim() ? "meeting link" : ""}{!values.meeting_link.trim() && !values.qr_payload.trim() ? " and " : ""}{!values.qr_payload.trim() ? "QR payload" : ""}.</p> : null}
        </div>
      ) : null}
      {values.delivery_mode === "online" ? (
        <div className="rounded-xl border border-[#d6e9fd] bg-[#f2f9ff] px-4 py-3 text-sm text-[#1a5c91]">
          <p className="font-bold text-[#0b3d66]">Online mode only needs the meeting link — Google Meet or Zoom. No QR code required.</p>
        </div>
      ) : null}
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
      <ConfiguredDeliveryFields values={values} update={update} errors={errors} />
    </section>
  );
}

const deliveryInputClass = "mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm text-[#06201c] outline-none focus:border-[#1f6a58]";

/** Auto-renders delivery-mode fields (meeting link / QR payload / pass code / check-in) in the configurable
 * form even when the Super Admin form config does not include them. Mirrors the static builder's rules:
 * hybrid → meeting link + QR (required); online → meeting link only; physical/offline → QR (optional). */
function ConfiguredDeliveryFields({
  values,
  update,
  errors,
}: {
  values: CreateTrainingFormValues;
  update: UpdateForm;
  errors: Record<string, string[]>;
}) {
  const mode = values.delivery_mode;
  if (!mode) return null;
  const showMeeting = mode === "hybrid" || mode === "online";
  const showQr = mode !== "online";
  const required = mode === "hybrid";
  const errFor = (k: string) => (errors[k]?.length ? <p className="mt-1 text-xs text-[#b42318]">{errors[k][0]}</p> : null);
  return (
    <div className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[.08em] text-[#7f9d94]">Live session access (auto for {mode})</p>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        {showMeeting ? (
          <label className="block text-sm font-semibold text-[#06201c]">Meeting link{required ? " *" : ""} (Google Meet / Zoom)
            <input type="url" value={values.meeting_link} onChange={(e) => update("meeting_link", e.target.value)} placeholder="https://meet.google.com/..." className={deliveryInputClass} />
            {errFor("meeting_link")}
          </label>
        ) : null}
        {showQr ? (
          <label className="block text-sm font-semibold text-[#06201c]">QR payload{required ? " *" : ""} (check-in code)
            <input value={values.qr_payload} onChange={(e) => update("qr_payload", e.target.value)} placeholder={required ? "e.g. TRAINING-2026" : "Optional check-in code"} className={deliveryInputClass} />
            {errFor("qr_payload")}
          </label>
        ) : null}
        {showQr ? (
          <label className="block text-sm font-semibold text-[#06201c]">Pass code{required ? " *" : ""}
            <input value={values.pass_code} onChange={(e) => update("pass_code", e.target.value)} placeholder="e.g. 1234" className={deliveryInputClass} />
            {errFor("pass_code")}
          </label>
        ) : null}
        {showQr ? (
          <label className="flex items-center gap-2 text-sm font-semibold text-[#06201c]">
            <input type="checkbox" checked={values.check_in} onChange={(e) => update("check_in", e.target.checked)} className="h-4 w-4 rounded border-[#d7e5df] text-[#1f6a58] focus:ring-[#1f6a58]" />
            Enable check-in for this training{required ? " *" : ""}
          </label>
        ) : null}
      </div>
      {mode === "hybrid" ? <p className="mt-2 text-xs text-[#7f9d94]">Hybrid = venue + online link + QR. Fill the meeting link and QR payload before submitting.</p> : null}
      {mode === "online" ? <p className="mt-2 text-xs text-[#7f9d94]">Online = meeting link only. No venue or QR code needed.</p> : null}
      {mode === "physical" ? <p className="mt-2 text-xs text-[#7f9d94]">Physical = venue only. QR is optional — you can submit without a check-in code.</p> : null}
    </div>
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
  // Delivery-mode visibility — mirror static builder: hybrid shows meeting link + QR, online shows
  // meeting link only, physical/offline shows QR (optional) only.
  const deliveryMode = values.delivery_mode;
  const isMeetingLinkField = key === "meeting_link" || key === "delivery_instructions";
  const isQrField = key === "qr_payload" || key === "pass_code" || key === "check_in";
  if (isMeetingLinkField && deliveryMode !== "online" && deliveryMode !== "hybrid") return null;
  if (isQrField && deliveryMode === "online") return null;
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
    // Tags / learning_objectives / badges chip editor (press Enter)
    if (coreField === "tags" || coreField === "learning_objectives" || coreField === "badges") {
      const arr = coreField === "tags" ? values.tags : coreField === "badges" ? values.badges : values.learning_objectives;
      const placeholder = field.placeholder ?? (coreField === "tags" ? "Type a tag and press Enter" : coreField === "badges" ? "Type badge and press Enter" : "Type objective and press Enter");
      return (
        <div className="block text-sm font-semibold text-[#06201c] md:col-span-2">
          <label>{field.label}{required}{field.helpText ? <span className="ml-1 font-normal text-[#52736a]">{field.helpText}</span> : null}</label>
          <input defaultValue="" placeholder={placeholder} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const v = (e.currentTarget as HTMLInputElement).value.trim(); if (v && !(arr as string[]).includes(v)) update(coreField as keyof CreateTrainingFormValues, [...(arr as string[]), v] as never); (e.currentTarget as HTMLInputElement).value = ""; } }} className={inputClass} />
          {(arr as string[]).length > 0 ? <div className="mt-2 flex flex-wrap gap-2">{(arr as string[]).map((item) => <span key={item} className="inline-flex items-center gap-1 rounded-full bg-[#e8f6ee] px-3 py-1 text-xs font-bold text-[#1f6a58]">{item}<button type="button" onClick={() => update(coreField as keyof CreateTrainingFormValues, (arr as string[]).filter((t) => t !== item) as never)}>×</button></span>)}</div> : null}
          {error ? <p className="mt-1 text-xs text-[#b42318]">{error}</p> : null}
        </div>
      );
    }
    // Gallery / notes_documents UrlList with + Add — like TrainingMediaSection:219
    if (coreField === "gallery_images" || coreField === "notes_documents") {
      const arr = (values[coreField as keyof CreateTrainingFormValues] as string[]) ?? [];
      return (
        <div className="block text-sm font-semibold text-[#06201c] md:col-span-2">
          <div className="flex items-center justify-between">
            <label>{field.label}{required}{field.helpText ? <span className="ml-1 font-normal text-[#52736a]">{field.helpText}</span> : null}</label>
            <button type="button" onClick={() => update(coreField as keyof CreateTrainingFormValues, [...arr, ""] as never)} className="text-sm font-semibold text-[#1f6a58]">+ Add</button>
          </div>
          <div className="mt-2 space-y-2">
            {arr.map((val, idx) => (
              <div key={idx} className="flex gap-2">
                <input type="url" value={val} onChange={(e) => update(coreField as keyof CreateTrainingFormValues, arr.map((c, i) => (i === idx ? e.target.value : c)) as never)} placeholder={field.placeholder ?? "https://…"} className={inputClass.replace("mt-1.5 ", "")} />
                <button type="button" onClick={() => update(coreField as keyof CreateTrainingFormValues, arr.filter((_, i) => i !== idx) as never)} className="shrink-0 rounded-xl px-3 text-sm font-semibold text-[#b42318] hover:bg-[#fff6f5]">Remove</button>
              </div>
            ))}
            {arr.length === 0 ? <p className="text-xs text-[#7f9d94]">No {field.label.toLowerCase()} yet — click + Add.</p> : null}
          </div>
          {error ? <p className="mt-1 text-xs text-[#b42318]">{error}</p> : null}
        </div>
      );
    }
    if (coreField === "documents") {
      const docs = (values.documents as Array<{ url: string; visibility: string; downloadable: boolean }>) ?? [];
      return (
        <div className="block text-sm font-semibold text-[#06201c] md:col-span-2">
          <div className="flex items-center justify-between">
            <label>{field.label}{required}{field.helpText ? <span className="ml-1 font-normal text-[#52736a]">{field.helpText}</span> : null}</label>
            <button type="button" onClick={() => update("documents", [...docs, { url: "", visibility: "public", downloadable: true }] as never)} className="text-sm font-semibold text-[#1f6a58]">+ Add</button>
          </div>
          <div className="mt-2 space-y-3">
            {docs.map((doc, idx) => (
              <div key={idx} className="rounded-xl border border-[#d7e5df] bg-[#f9fcfa] p-3">
                <div className="flex gap-2">
                  <input type="url" value={doc.url} onChange={(e) => update("documents", docs.map((d, i) => (i === idx ? { ...d, url: e.target.value } : d)) as never)} placeholder={field.placeholder ?? "https://…"} className={inputClass.replace("mt-1.5 ", "") + " flex-1"} />
                  <button type="button" onClick={() => update("documents", docs.filter((_, i) => i !== idx) as never)} className="shrink-0 rounded-xl px-3 text-sm font-semibold text-[#b42318] hover:bg-[#fff6f5]">Remove</button>
                </div>
                <div className="mt-2 flex gap-3">
                  <label className="flex items-center gap-1 text-xs font-semibold text-[#06201c]">Visibility<select value={doc.visibility} onChange={(e) => update("documents", docs.map((d, i) => (i === idx ? { ...d, visibility: e.target.value } : d)) as never)} className="ml-1 rounded-lg border border-[#d7e5df] bg-white px-2 py-1 text-xs"><option value="public">public</option><option value="private">private</option></select></label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-[#06201c]"><input type="checkbox" checked={doc.downloadable} onChange={(e) => update("documents", docs.map((d, i) => (i === idx ? { ...d, downloadable: e.target.checked } : d)) as never)} className="h-4 w-4 rounded border-[#d7e5df] text-[#1f6a58]" />Downloadable</label>
                </div>
              </div>
            ))}
            {docs.length === 0 ? <p className="text-xs text-[#7f9d94]">No documents yet — click + Add.</p> : null}
          </div>
          {error ? <p className="mt-1 text-xs text-[#b42318]">{error}</p> : null}
        </div>
      );
    }
    if (isBoolean) {
      return <label className="flex items-center gap-2 text-sm font-semibold text-[#06201c]"><input type="checkbox" checked={Boolean(values[coreField as keyof CreateTrainingFormValues])} onChange={(e) => setValue(String(e.target.checked))} />{field.label}{required}</label>;
    }
    if (options.length) {
      // Delivery mode shows only Live online | Offline | Hybrid | Self-paced; keep a legacy stored value visible for old trainings.
      const visibleOptions = coreField === "delivery_mode" ? options.filter((opt) => opt === "online" || opt === "physical" || opt === "hybrid" || opt === "self_paced") : options;
      if (coreField === "delivery_mode" && value && !visibleOptions.includes(value)) visibleOptions.push(value);
      return <label className="block text-sm font-semibold text-[#06201c]">{field.label}{required}{field.helpText ? <span className="ml-1 font-normal text-[#52736a]">{field.helpText}</span> : null}<select value={value} onChange={(e) => setValue(e.target.value)} className={inputClass}><option value="">Select an option</option>{visibleOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}</select>{error ? <p className="mt-1 text-xs text-[#b42318]">{error}</p> : null}</label>;
    }
    if (field.type === "textarea") {
      return <label className="block text-sm font-semibold text-[#06201c] md:col-span-2">{field.label}{required}{field.helpText ? <span className="ml-1 font-normal text-[#52736a]">{field.helpText}</span> : null}<textarea value={value} placeholder={field.placeholder} onChange={(e) => setValue(e.target.value)} className={`${inputClass} h-24 resize-y py-2`} />{error ? <p className="mt-1 text-xs text-[#b42318]">{error}</p> : null}</label>;
    }
     const isTimeField = key === "start_time" || key === "end_time" || field.type === "time";
     const inputType = isTimeField ? "time" : field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "datetime" ? "datetime-local" : field.type === "url" ? "url" : "text";
    return <label className="block text-sm font-semibold text-[#06201c]">{field.label}{required}{field.helpText ? <span className="ml-1 font-normal text-[#52736a]">{field.helpText}</span> : null}<input type={inputType} value={value} placeholder={field.placeholder} onChange={(e) => setValue(e.target.value)} pattern={field.validation?.pattern ?? undefined} className={inputClass} />{error ? <p className="mt-1 text-xs text-[#b42318]">{error}</p> : null}</label>;
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
  const isTimeField2 = key === "start_time" || key === "end_time" || field.type === "time";
  const inputType2 = isTimeField2 ? "time" : field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "datetime" ? "datetime-local" : field.type === "url" ? "url" : "text";
  return <label className="block text-sm font-semibold text-[#06201c]">{field.label}{required}{field.helpText ? <span className="ml-1 font-normal text-[#52736a]">{field.helpText}</span> : null}<input type={inputType2} value={value} placeholder={field.placeholder} pattern={field.validation?.pattern ?? undefined} onChange={(e) => setValue(isNumber ? Number(e.target.value) : e.target.value)} className={inputClass} />{error ? <p className="mt-1 text-xs text-[#b42318]">{error}</p> : null}</label>;
}
