import type {
  CreateTrainingPayload,
  Training,
  UpdateTrainingPayload,
} from "./trainings.service";

/** All local values maintained by the Training editor workspace. */
export interface CreateTrainingFormValues {
  title: string;
  description: string;
  category: string;
  subcategory: string;
  tags: string[];
  instructor_id: string;
  instructor_name: string;
  instructor_bio: string;
  requirements: string;
  learning_objectives: string[];
  primary_image: string;
  gallery_images: string[];
  promotional_video: string;
  documents: Array<{ url: string; visibility: string; downloadable: boolean }>;
  delivery_mode: string;
  course_type: string;
  duration: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  address: string;
  meeting_link: string;
  delivery_instructions: string;
  enrolment_start: string;
  enrolment_end: string;
  time_zone: string;
  capacity: string;
  price: string;
  currency: string;
  promo_price: string;
  coupon_code: string;
  requires_approval: boolean;
  access_duration_days: string;
  prerequisites: string;
  release_rule: string;
  randomise: boolean;
  scheduled_publication: string;
  is_mandatory: boolean;
  group_enrolment: boolean;
  max_group_size: string;
  access_expiry_type: string;
  access_expiry_days: string;
  location_id: string;
  level: string;
  language: string;
  // --- Missing schema gaps wired for POST/PUT ---
  recurring: string;
  schedule_exceptions: string;
  access_information: string;
  meeting_provider: string;
  instructor_role: string;
  instructor_notes: string[];
  notes_pdf_url: string;
  target_audience: string;
  difficulty_level: string;
  offline_enabled: boolean;
  session_mode: string;
  check_in: boolean;
  pass_code: string;
  qr_payload: string;
  discussions: string;
  announcements: string;
  moderation_history: string;
  // --- Phase 1 learner-facing depth ---
  subtitle: string;
  faqs: string;
  instructor_photo: string;
  instructor_credentials: string;
  badges: string[];
}

/** Returns blank values for a newly opened Training editor workspace. */
export function createEmptyTrainingForm(): CreateTrainingFormValues {
  return {
    title: "",
    description: "",
    category: "",
    subcategory: "",
    tags: [],
    instructor_id: "",
    instructor_name: "",
    instructor_bio: "",
    requirements: "",
    learning_objectives: [],
    primary_image: "",
    gallery_images: [],
    promotional_video: "",
    documents: [],
    delivery_mode: "hybrid",
    course_type: "",
    duration: "",
    start_date: "",
    end_date: "",
    start_time: "",
    end_time: "",
    venue: "",
    address: "",
    meeting_link: "",
    delivery_instructions: "",
    enrolment_start: "",
    enrolment_end: "",
    time_zone: "Asia/Kolkata",
    capacity: "",
    price: "",
    currency: "INR",
    promo_price: "",
    coupon_code: "",
    requires_approval: false,
    access_duration_days: "",
    prerequisites: "",
    release_rule: "immediate",
    randomise: false,
    scheduled_publication: "",
    is_mandatory: false,
    group_enrolment: false,
    max_group_size: "",
    access_expiry_type: "never",
    access_expiry_days: "",
    location_id: "",
    level: "beginner",
    language: "en",
    recurring: "",
    schedule_exceptions: "",
    access_information: "",
    meeting_provider: "",
    instructor_role: "",
    instructor_notes: [],
    notes_pdf_url: "",
    target_audience: "",
    difficulty_level: "",
    offline_enabled: false,
    session_mode: "",
    check_in: false,
    pass_code: "",
    qr_payload: "",
    discussions: "",
    announcements: "",
    moderation_history: "",
    subtitle: "",
    faqs: "",
    instructor_photo: "",
    instructor_credentials: "",
    badges: [],
  };
}

/** Maps a Training response into editable form values. */
export function trainingToFormValues(training: Training): CreateTrainingFormValues {
  const record = training as unknown as Record<string, unknown>;
  const stringValue = (key: string, fallback = "") => {
    const value = record[key];
    return typeof value === "string" ? value : fallback;
  };
  return {
    title: training.title ?? "",
    description: training.description ?? "",
    category: training.category ?? "",
    subcategory: training.subcategory ?? "",
    tags: Array.isArray(training.tags) ? training.tags.filter((tag): tag is string => typeof tag === "string") : [],
    instructor_id: training.instructor_id ?? "",
    requirements: stringValue("requirements"),
    primary_image: stringValue("primary_image"),
    gallery_images: Array.isArray(record.gallery_images) ? record.gallery_images.filter((value): value is string => typeof value === "string" && value.trim().length > 0) : [],
    promotional_video: stringValue("promotional_video"),
    delivery_mode: training.delivery_mode ?? "hybrid",
    course_type: training.course_type ?? "",
    duration: stringValue("duration"),
    start_date: stringValue("start_date"),
    end_date: stringValue("end_date"),
    enrolment_start: stringValue("enrolment_start"),
    enrolment_end: stringValue("enrolment_end"),
    time_zone: stringValue("time_zone", "Asia/Kolkata"),
    capacity: training.capacity ?? "",
    price: training.price ?? "",
    currency: stringValue("currency", "INR"),
    promo_price: stringValue("promo_price"),
    coupon_code: stringValue("coupon_code"),
    requires_approval: record.requires_approval === true,
    access_duration_days: stringValue("access_duration_days"),
    prerequisites: stringValue("prerequisites"),
    randomise: record.randomise === true || record.randomize === true,
    scheduled_publication: stringValue("scheduled_publication"),
    is_mandatory: record.is_mandatory === true || record.mandatory === true,
    group_enrolment: record.group_enrolment === true || record.group_enrollment === true,
    max_group_size: stringValue("max_group_size"),
    access_expiry_type: stringValue("access_expiry_type", "never"),
    access_expiry_days: stringValue("access_expiry_days"),
    location_id: stringValue("location_id"),
    instructor_name: stringValue("instructor_name"),
    instructor_bio: stringValue("instructor_bio"),
    learning_objectives: Array.isArray(record.learning_objectives) ? record.learning_objectives.filter((v): v is string => typeof v === "string") : [],
    documents: Array.isArray(record.documents) ? (record.documents as unknown[]).map((d) => { if (typeof d === "string" && d.trim()) return { url: d, visibility: "public", downloadable: true }; if (d && typeof d === "object" && typeof (d as Record<string, unknown>).url === "string") { const r = d as Record<string, unknown>; return { url: r.url as string, visibility: typeof r.visibility === "string" ? r.visibility as string : "public", downloadable: typeof r.downloadable === "boolean" ? r.downloadable as boolean : true }; } return null; }).filter((v): v is { url: string; visibility: string; downloadable: boolean } => v !== null && Boolean(v.url)) : [],
    start_time: stringValue("start_time"),
    end_time: stringValue("end_time"),
    venue: stringValue("venue"),
    address: stringValue("address"),
    meeting_link: stringValue("meeting_link"),
    delivery_instructions: stringValue("delivery_instructions"),
    level: stringValue("level", "beginner"),
    language: stringValue("language", "en"),
    recurring: stringValue("recurring"),
    schedule_exceptions: (() => { const v = record.schedule_exceptions; return Array.isArray(v) ? JSON.stringify(v) : typeof v === "string" ? v : ""; })(),
    access_information: stringValue("access_information"),
    meeting_provider: stringValue("meeting_provider"),
    instructor_role: (() => { const ins = record.instructor as Record<string, unknown> | null; return typeof ins?.role === "string" ? ins.role : stringValue("instructor_role"); })(),
    instructor_notes: Array.isArray(record.instructor_notes) ? (record.instructor_notes as unknown[]).map(n => typeof (n as Record<string, unknown>)?.url === "string" ? (n as Record<string, unknown>).url as string : typeof n === "string" ? n : "").filter(Boolean) : Array.isArray(record.notes_pdf_url) ? [] : [],
    notes_pdf_url: stringValue("notes_pdf_url"),
    target_audience: stringValue("target_audience"),
    difficulty_level: stringValue("difficulty_level") || stringValue("difficultyLevel") || stringValue("level", "beginner"),
    offline_enabled: record.offline_enabled === true || record.offline_access_enabled === true,
    session_mode: stringValue("session_mode"),
    check_in: (() => { const v = record.check_in; return typeof v === "boolean" ? v : v === true || v === "true"; })(),
    pass_code: stringValue("pass_code"),
    qr_payload: stringValue("qr_payload"),
    release_rule: (() => { const v = record.release_rule; if (typeof v === "string") return v; if (v && typeof v === "object") return typeof (v as Record<string, unknown>).type === "string" ? (v as Record<string, unknown>).type as string : "immediate"; return "immediate"; })(),
    discussions: (() => { const v = record.discussions; return Array.isArray(v) ? JSON.stringify(v) : typeof v === "string" ? v : ""; })(),
    announcements: (() => { const v = record.announcements; return Array.isArray(v) ? JSON.stringify(v) : typeof v === "string" ? v : ""; })(),
    moderation_history: (() => { const v = record.moderation_history; return Array.isArray(v) ? JSON.stringify(v) : typeof v === "string" ? v : ""; })(),
    subtitle: stringValue("subtitle"),
    faqs: (() => { const v = record.faqs; return Array.isArray(v) ? JSON.stringify(v) : typeof v === "string" ? v : ""; })(),
    instructor_photo: stringValue("instructor_photo"),
    instructor_credentials: stringValue("instructor_credentials"),
    badges: Array.isArray(record.badges) ? (record.badges as unknown[]).map(b => typeof b === "string" ? b : typeof (b as Record<string, unknown>)?.title === "string" ? (b as Record<string, unknown>).title as string : typeof (b as Record<string, unknown>)?.name === "string" ? (b as Record<string, unknown>).name as string : "").filter(Boolean) : [],
  };
}

/** Builds a confirmed Create Training payload without response-only fields.
 * NOTE: delivery_mode is restricted to "where" values only: hybrid/physical/online. */
export function buildCreateTrainingPayload(values: CreateTrainingFormValues, tenantId: string, enterpriseId: string): CreateTrainingPayload {
  return {
    tenant_id: tenantId,
    enterprise_id: enterpriseId,
    title: values.title.trim(),
    description: values.description.trim() || null,
    category: values.category.trim(),
    subcategory: values.subcategory.trim() || null,
    tags: values.tags,
    instructor_id: values.instructor_id.trim() || null,
    instructor_name: values.instructor_name.trim() || null,
    instructor_bio: values.instructor_bio.trim() || null,
    requirements: values.requirements.trim() || null,
    learning_objectives: values.learning_objectives.length ? values.learning_objectives : null,
    primary_image: values.primary_image.trim() || null,
    gallery_images: values.gallery_images.length ? values.gallery_images : null,
    promotional_video: values.promotional_video.trim() || null,
    documents: values.documents.length ? values.documents.map((doc, idx) => ({ id: `doc-${idx}`, url: doc.url, name: doc.url.split("/").pop() || `document-${idx}.pdf`, type: doc.url.endsWith(".pdf") ? "pdf" : "file", size: null, visibility: doc.visibility, downloadable: doc.downloadable, title: doc.url.split("/").pop() || `Document ${idx+1}` })) : null,
    delivery_mode: values.delivery_mode || null,
    course_type: values.course_type.trim() || null,
    duration: values.duration.trim() || null,
    start_date: values.start_date || null,
    end_date: values.end_date || null,
    start_time: values.start_time || null,
    end_time: values.end_time || null,
    venue: values.venue.trim() || null,
    address: values.address.trim() || null,
    meeting_link: values.meeting_link.trim() || null,
    delivery_instructions: values.delivery_instructions.trim() || null,
    enrolment_start: values.enrolment_start || null,
    enrolment_end: values.enrolment_end || null,
    time_zone: values.time_zone || null,
    capacity: values.capacity.trim() || null,
    price: values.price.trim() || null,
    currency: values.currency.trim() || null,
    promo_price: values.promo_price.trim() || null,
    coupon_code: values.coupon_code.trim() || null,
    requires_approval: values.requires_approval,
    access_duration_days: values.access_duration_days.trim() || null,
location_id: values.location_id.trim() || null,
    level: values.level || values.difficulty_level || null,
    language: values.language || null,
    prerequisites: values.prerequisites.trim() || null,
release_rule: values.release_rule.trim() ? { type: values.release_rule.trim() } : null,
    randomise: values.randomise,
    scheduled_publication: values.scheduled_publication.trim() || null,
    is_mandatory: values.is_mandatory,
    recurring: values.recurring.trim() || null,
    schedule_exceptions: (() => { try { return values.schedule_exceptions.trim() ? JSON.parse(values.schedule_exceptions) : null; } catch { return values.schedule_exceptions.trim() || null; } })(),
    access_information: values.access_information.trim() || null,
    meeting_provider: values.meeting_provider.trim() || null,
    instructor: values.instructor_role.trim() ? { id: values.instructor_id.trim() || null, name: values.instructor_name.trim() || null, bio: values.instructor_bio.trim() || null, role: values.instructor_role.trim() || null } : null,
    instructor_notes: values.instructor_notes.length ? values.instructor_notes.map((url, idx) => ({ id: `note-${idx}`, title: `Note ${idx+1}`, url })) : null,
    notes_pdf_url: values.notes_pdf_url.trim() || null,
    target_audience: values.target_audience.trim() || null,
    offline_enabled: values.offline_enabled,
    offline_access_enabled: values.offline_enabled,
    session_mode: values.session_mode.trim() || null,
    check_in: values.check_in,
    pass_code: values.pass_code.trim() || null,
    qr_payload: values.qr_payload.trim() || null,
    discussions: (() => { try { return values.discussions.trim() ? JSON.parse(values.discussions) : null; } catch { return values.discussions.trim() || null; } })(),
    announcements: (() => { try { return values.announcements.trim() ? JSON.parse(values.announcements) : null; } catch { return values.announcements.trim() || null; } })(),
    moderation_history: (() => { try { return values.moderation_history.trim() ? JSON.parse(values.moderation_history) : null; } catch { return values.moderation_history.trim() || null; } })(),
    subtitle: values.subtitle.trim() || null,
    faqs: (() => { try { return values.faqs.trim() ? JSON.parse(values.faqs) : null; } catch { return values.faqs.trim() || null; } })(),
    instructor_photo: values.instructor_photo.trim() || null,
    instructor_credentials: values.instructor_credentials.trim() || null,
    badges: values.badges.length ? values.badges : null,
  } as unknown as CreateTrainingPayload;
}

/** Builds a partial Update payload from changed form values. */
export function buildUpdateTrainingPayload(values: CreateTrainingFormValues): UpdateTrainingPayload {
  return {
    title: values.title.trim(),
    description: values.description.trim() || null,
    category: values.category.trim(),
    subcategory: values.subcategory.trim() || null,
    tags: values.tags,
    instructor_id: values.instructor_id.trim() || null,
    instructor_name: values.instructor_name.trim() || null,
    instructor_bio: values.instructor_bio.trim() || null,
    requirements: values.requirements.trim() || null,
    learning_objectives: values.learning_objectives.length ? values.learning_objectives : null,
    primary_image: values.primary_image.trim() || null,
    gallery_images: values.gallery_images.length ? values.gallery_images : null,
    promotional_video: values.promotional_video.trim() || null,
    documents: values.documents.length ? values.documents.map((doc, idx) => ({ id: `doc-${idx}`, url: doc.url, name: doc.url.split("/").pop() || `document-${idx}.pdf`, type: doc.url.endsWith(".pdf") ? "pdf" : "file", size: null, visibility: doc.visibility, downloadable: doc.downloadable, title: doc.url.split("/").pop() || `Document ${idx+1}` })) : null,
    delivery_mode: values.delivery_mode || null,
    course_type: values.course_type.trim() || null,
    duration: values.duration.trim() || null,
    start_date: values.start_date || null,
    end_date: values.end_date || null,
    start_time: values.start_time || null,
    end_time: values.end_time || null,
    venue: values.venue || null,
    address: values.address || null,
    meeting_link: values.meeting_link.trim() || null,
    delivery_instructions: values.delivery_instructions || null,
    enrolment_start: values.enrolment_start || null,
    enrolment_end: values.enrolment_end || null,
    time_zone: values.time_zone || null,
    capacity: values.capacity.trim() || null,
    price: values.price.trim() || null,
    currency: values.currency.trim() || null,
    promo_price: values.promo_price.trim() || null,
    coupon_code: values.coupon_code.trim() || null,
    requires_approval: values.requires_approval,
    access_duration_days: values.access_duration_days.trim() || null,
    location_id: values.location_id.trim() || null,
    level: values.level || values.difficulty_level || null,
    language: values.language || null,
    prerequisites: values.prerequisites.trim() || null,
release_rule: values.release_rule.trim() ? { type: values.release_rule.trim() } : null,
    randomise: values.randomise,
    scheduled_publication: values.scheduled_publication.trim() || null,
    is_mandatory: values.is_mandatory,
recurring: values.recurring.trim() || null,
    schedule_exceptions: (() => { try { return values.schedule_exceptions.trim() ? JSON.parse(values.schedule_exceptions) : null; } catch { return values.schedule_exceptions.trim() || null; } })(),
    access_information: values.access_information.trim() || null,
    meeting_provider: values.meeting_provider.trim() || null,
    instructor: values.instructor_role.trim() ? { id: values.instructor_id.trim() || null, name: values.instructor_name.trim() || null, bio: values.instructor_bio.trim() || null, role: values.instructor_role.trim() || null } : null,
    instructor_notes: values.instructor_notes.length ? values.instructor_notes.map((url, idx) => ({ id: `note-${idx}`, title: `Note ${idx+1}`, url })) : null,
    notes_pdf_url: values.notes_pdf_url.trim() || null,
    target_audience: values.target_audience.trim() || null,
    offline_enabled: values.offline_enabled,
    offline_access_enabled: values.offline_enabled,
    session_mode: values.session_mode.trim() || null,
    check_in: values.check_in,
    pass_code: values.pass_code.trim() || null,
    qr_payload: values.qr_payload.trim() || null,
    discussions: (() => { try { return values.discussions.trim() ? JSON.parse(values.discussions) : null; } catch { return values.discussions.trim() || null; } })(),
    announcements: (() => { try { return values.announcements.trim() ? JSON.parse(values.announcements) : null; } catch { return values.announcements.trim() || null; } })(),
    moderation_history: (() => { try { return values.moderation_history.trim() ? JSON.parse(values.moderation_history) : null; } catch { return values.moderation_history.trim() || null; } })(),
    subtitle: values.subtitle.trim() || null,
    faqs: (() => { try { return values.faqs.trim() ? JSON.parse(values.faqs) : null; } catch { return values.faqs.trim() || null; } })(),
    instructor_photo: values.instructor_photo.trim() || null,
    instructor_credentials: values.instructor_credentials.trim() || null,
    badges: values.badges.length ? values.badges : null,
  } as unknown as UpdateTrainingPayload;
}

/** Validates the current form values, returning per-field messages. */
export function validateTrainingForm(values: CreateTrainingFormValues): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  const timeRe = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!values.title.trim()) errors.title = ["Title is required."];
  if (!values.description.trim()) errors.description = ["Description is required."];
  if (!values.category.trim()) errors.category = ["Category is required."];
  if (values.delivery_mode === "hybrid" && !values.meeting_link.trim()) errors.meeting_link = ["Hybrid mode requires the Google Meet / Zoom meeting link."];
  if (values.delivery_mode === "hybrid" && !values.qr_payload.trim()) errors.qr_payload = ["Hybrid mode requires the QR payload (check-in code)."];
  if (values.delivery_mode === "online" && !values.meeting_link.trim()) errors.meeting_link = ["Online mode requires the Google Meet / Zoom meeting link."];
  if (values.start_time && !timeRe.test(values.start_time)) errors.start_time = ["Start time must be HH:MM (00:00–23:59)."];
  if (values.end_time && !timeRe.test(values.end_time)) errors.end_time = ["End time must be HH:MM (00:00–23:59)."];
  if (values.start_date && values.end_date && values.end_date < values.start_date) {
    errors.end_date = ["End date cannot be before the start date."];
  }
  if (values.enrolment_start && values.enrolment_end && values.enrolment_end < values.enrolment_start) {
    errors.enrolment_end = ["Enrolment end cannot be before enrolment start."];
  }
  return errors;
}