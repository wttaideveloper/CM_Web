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
  pricing_type: "free" | "paid";
  price: string;
  currency: string;
  promo_price: string;
  coupon_code: string;
  requires_approval: boolean;
  access_duration_days: string;
  prerequisites: string;
  access_expiry_type: string;
  access_expiry_days: string;
  location_id: string;
  level: string;
  language: string;
  // --- Additional Training fields wired for POST/PUT ---
  recurring: string;
  schedule_exceptions: string;
  meeting_provider: string;
  instructor_role: string;
  instructor_notes: string[];
  notes_pdf_url: string;
  target_audience: string;
  difficulty_level: string;
  offline_enabled: boolean;
  session_mode: string;
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

function parseLearningObjectives(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((objective): objective is string => typeof objective === "string" && objective.trim().length > 0);
  }
  if (typeof value === "string") {
    return value.split(/\r?\n/).map((objective) => objective.trim()).filter(Boolean);
  }
  return [];
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
    pricing_type: "free",
    price: "",
    currency: "INR",
    promo_price: "",
    coupon_code: "",
    requires_approval: false,
    access_duration_days: "",
    prerequisites: "",
    access_expiry_type: "never",
    access_expiry_days: "",
    location_id: "",
    level: "beginner",
    language: "en",
    recurring: "",
    schedule_exceptions: "",
    meeting_provider: "",
    instructor_role: "",
    instructor_notes: [],
    notes_pdf_url: "",
    target_audience: "",
    difficulty_level: "",
    offline_enabled: false,
    session_mode: "",
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
    pricing_type: stringValue("pricing_type", training.price ? "paid" : "free") === "paid" ? "paid" : "free",
    price: training.price ?? "",
    currency: stringValue("currency", "INR"),
    promo_price: stringValue("promo_price"),
    coupon_code: stringValue("coupon_code"),
    requires_approval: record.requires_approval === true,
    access_duration_days: stringValue("access_duration_days"),
    prerequisites: stringValue("prerequisites"),
    access_expiry_type: stringValue("access_expiry_type", "never"),
    access_expiry_days: stringValue("access_expiry_days"),
    location_id: stringValue("location_id"),
    instructor_name: stringValue("instructor_name"),
    instructor_bio: stringValue("instructor_bio"),
    learning_objectives: parseLearningObjectives(record.learning_objectives),
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
    meeting_provider: stringValue("meeting_provider"),
    instructor_role: (() => { const ins = record.instructor as Record<string, unknown> | null; return typeof ins?.role === "string" ? ins.role : stringValue("instructor_role"); })(),
    instructor_notes: Array.isArray(record.instructor_notes) ? (record.instructor_notes as unknown[]).map(n => typeof (n as Record<string, unknown>)?.url === "string" ? (n as Record<string, unknown>).url as string : typeof n === "string" ? n : "").filter(Boolean) : Array.isArray(record.notes_pdf_url) ? [] : [],
    notes_pdf_url: stringValue("notes_pdf_url"),
    target_audience: stringValue("target_audience"),
    difficulty_level: stringValue("difficulty_level") || stringValue("difficultyLevel") || stringValue("level", "beginner"),
    offline_enabled: record.offline_enabled === true || record.offline_access_enabled === true,
    session_mode: stringValue("session_mode"),
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
  const isLive = values.delivery_mode === "online" || values.delivery_mode === "hybrid";
  const isVenue = values.delivery_mode === "physical" || values.delivery_mode === "hybrid";
  const isPaid = values.pricing_type === "paid";
  const galleryImages = values.gallery_images.map((url) => url.trim()).filter(Boolean);
  const documents = values.documents
    .filter((doc) => doc.url.trim())
    .map((doc, idx) => ({
      id: `doc-${idx}`,
      url: doc.url.trim(),
      name: doc.url.trim().split("/").pop() || `document-${idx}.pdf`,
      type: doc.url.trim().endsWith(".pdf") ? "pdf" : "file",
      size: null,
      visibility: doc.visibility,
      downloadable: doc.downloadable,
      title: doc.url.trim().split("/").pop() || `Document ${idx + 1}`,
    }));
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
    learning_objectives: values.learning_objectives.map((objective) => objective.trim()).filter(Boolean),
    primary_image: values.primary_image.trim() || null,
    gallery_images: galleryImages.length ? galleryImages : null,
    promotional_video: values.promotional_video.trim() || null,
    documents: documents.length ? documents : null,
    delivery_mode: values.delivery_mode || null,
    course_type: values.course_type.trim() || null,
    duration: values.duration.trim() || null,
    start_date: values.start_date || null,
    end_date: values.end_date || null,
    start_time: values.start_time || null,
    end_time: values.end_time || null,
    venue: isVenue ? values.venue.trim() || null : null,
    address: isVenue ? values.address.trim() || null : null,
    meeting_link: isLive ? values.meeting_link.trim() || null : null,
    delivery_instructions: isLive ? values.delivery_instructions.trim() || null : null,
    enrolment_start: values.enrolment_start || null,
    enrolment_end: values.enrolment_end || null,
    time_zone: values.time_zone || null,
    capacity: values.capacity.trim() || null,
    price: isPaid ? values.price.trim() || null : null,
    currency: isPaid ? values.currency.trim() || null : null,
    promo_price: isPaid ? values.promo_price.trim() || null : null,
    coupon_code: isPaid ? values.coupon_code.trim() || null : null,
    requires_approval: values.requires_approval,
    access_duration_days: values.access_duration_days.trim() || null,
    access_expiry_type: values.access_expiry_type || null,
    access_expiry_days: values.access_expiry_days.trim() || null,
location_id: isVenue ? values.location_id.trim() || null : null,
    level: values.level || values.difficulty_level || null,
    language: values.language || null,
    prerequisites: values.prerequisites.trim() || null,
    recurring: values.recurring.trim() || null,
    schedule_exceptions: (() => { try { return values.schedule_exceptions.trim() ? JSON.parse(values.schedule_exceptions) : null; } catch { return values.schedule_exceptions.trim() || null; } })(),
    meeting_provider: isLive ? values.meeting_provider.trim() || null : null,
    instructor: values.instructor_role.trim() ? { id: values.instructor_id.trim() || null, name: values.instructor_name.trim() || null, bio: values.instructor_bio.trim() || null, role: values.instructor_role.trim() || null } : null,
    instructor_notes: values.instructor_notes.length ? values.instructor_notes.map((url, idx) => ({ id: `note-${idx}`, title: `Note ${idx+1}`, url })) : null,
    notes_pdf_url: values.notes_pdf_url.trim() || null,
    target_audience: values.target_audience.trim() || null,
    offline_enabled: values.offline_enabled,
    offline_access_enabled: values.offline_enabled,
    session_mode: values.session_mode.trim() || null,
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
  const isLive = values.delivery_mode === "online" || values.delivery_mode === "hybrid";
  const isVenue = values.delivery_mode === "physical" || values.delivery_mode === "hybrid";
  const isPaid = values.pricing_type === "paid";
  const galleryImages = values.gallery_images.map((url) => url.trim()).filter(Boolean);
  const documents = values.documents
    .filter((doc) => doc.url.trim())
    .map((doc, idx) => ({
      id: `doc-${idx}`,
      url: doc.url.trim(),
      name: doc.url.trim().split("/").pop() || `document-${idx}.pdf`,
      type: doc.url.trim().endsWith(".pdf") ? "pdf" : "file",
      size: null,
      visibility: doc.visibility,
      downloadable: doc.downloadable,
      title: doc.url.trim().split("/").pop() || `Document ${idx + 1}`,
    }));
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
    learning_objectives: values.learning_objectives.map((objective) => objective.trim()).filter(Boolean),
    primary_image: values.primary_image.trim() || null,
    gallery_images: galleryImages.length ? galleryImages : null,
    promotional_video: values.promotional_video.trim() || null,
    documents: documents.length ? documents : null,
    delivery_mode: values.delivery_mode || null,
    course_type: values.course_type.trim() || null,
    duration: values.duration.trim() || null,
    start_date: values.start_date || null,
    end_date: values.end_date || null,
    start_time: values.start_time || null,
    end_time: values.end_time || null,
    venue: isVenue ? values.venue.trim() || null : null,
    address: isVenue ? values.address.trim() || null : null,
    meeting_link: isLive ? values.meeting_link.trim() || null : null,
    delivery_instructions: isLive ? values.delivery_instructions.trim() || null : null,
    enrolment_start: values.enrolment_start || null,
    enrolment_end: values.enrolment_end || null,
    time_zone: values.time_zone || null,
    capacity: values.capacity.trim() || null,
    price: isPaid ? values.price.trim() || null : null,
    currency: isPaid ? values.currency.trim() || null : null,
    promo_price: isPaid ? values.promo_price.trim() || null : null,
    coupon_code: isPaid ? values.coupon_code.trim() || null : null,
    requires_approval: values.requires_approval,
    access_duration_days: values.access_duration_days.trim() || null,
    access_expiry_type: values.access_expiry_type || null,
    access_expiry_days: values.access_expiry_days.trim() || null,
    location_id: isVenue ? values.location_id.trim() || null : null,
    level: values.level || values.difficulty_level || null,
    language: values.language || null,
    prerequisites: values.prerequisites.trim() || null,
recurring: values.recurring.trim() || null,
    schedule_exceptions: (() => { try { return values.schedule_exceptions.trim() ? JSON.parse(values.schedule_exceptions) : null; } catch { return values.schedule_exceptions.trim() || null; } })(),
    meeting_provider: isLive ? values.meeting_provider.trim() || null : null,
    instructor: values.instructor_role.trim() ? { id: values.instructor_id.trim() || null, name: values.instructor_name.trim() || null, bio: values.instructor_bio.trim() || null, role: values.instructor_role.trim() || null } : null,
    instructor_notes: values.instructor_notes.length ? values.instructor_notes.map((url, idx) => ({ id: `note-${idx}`, title: `Note ${idx+1}`, url })) : null,
    notes_pdf_url: values.notes_pdf_url.trim() || null,
    target_audience: values.target_audience.trim() || null,
    offline_enabled: values.offline_enabled,
    offline_access_enabled: values.offline_enabled,
    session_mode: values.session_mode.trim() || null,
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
export function validateTrainingForm(values: CreateTrainingFormValues, configuredRequiredKeys?: ReadonlySet<string>): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  const timeRe = /^([01]\d|2[0-3]):([0-5]\d)$/;
  const required = (key: string, value: string, message: string) => {
    if ((configuredRequiredKeys === undefined || configuredRequiredKeys.has(key)) && !value.trim()) errors[key] = [message];
  };
  required("title", values.title, "Title is required.");
  required("description", values.description, "Description is required.");
  required("category", values.category, "Category is required.");
  const isLive = values.delivery_mode === "online" || values.delivery_mode === "hybrid";
  const isVenue = values.delivery_mode === "physical" || values.delivery_mode === "hybrid";
  if (isLive && (configuredRequiredKeys === undefined || configuredRequiredKeys.has("meeting_link")) && !values.meeting_link.trim()) errors.meeting_link = ["Meeting link is required for Live mode."];
  if (isVenue && (configuredRequiredKeys === undefined || configuredRequiredKeys.has("venue")) && !values.venue.trim()) errors.venue = ["Venue is required for Venue or Hybrid mode."];
  if (isVenue && (configuredRequiredKeys === undefined || configuredRequiredKeys.has("address")) && !values.address.trim()) errors.address = ["Address is required for Venue or Hybrid mode."];
  if (values.start_time && !timeRe.test(values.start_time)) errors.start_time = ["Start time must be HH:MM (00:00–23:59)."];
  if (values.end_time && !timeRe.test(values.end_time)) errors.end_time = ["End time must be HH:MM (00:00–23:59)."];
  if (values.start_date && values.end_date && values.end_date < values.start_date) {
    errors.end_date = ["End date cannot be before the start date."];
  }
  const startCalendarDate = values.start_date.slice(0, 10);
  const endCalendarDate = values.end_date.slice(0, 10);
  if (startCalendarDate && startCalendarDate === endCalendarDate && values.start_time && values.end_time && timeRe.test(values.start_time) && timeRe.test(values.end_time) && values.end_time <= values.start_time) {
    errors.end_time = ["End time must be after start time on the same day."];
  }
  if (values.enrolment_start && values.enrolment_end && values.enrolment_end <= values.enrolment_start) {
    errors.enrolment_end = ["Enrolment end must be after enrolment start."];
  }
  if (values.enrolment_end && values.start_date && values.enrolment_end > values.start_date) {
    errors.enrolment_end = ["Enrolment must close on or before the Training start date and time."];
  }
  for (const [key, value] of [
    ["schedule_exceptions", values.schedule_exceptions],
    ["discussions", values.discussions],
    ["announcements", values.announcements],
    ["moderation_history", values.moderation_history],
    ["faqs", values.faqs],
  ] as const) {
    if (!value.trim()) continue;
    try {
      JSON.parse(value);
    } catch {
      errors[key] = ["Enter valid JSON or leave this field empty."];
    }
  }
  if (values.faqs.trim() && !errors.faqs) {
    try {
      if (!Array.isArray(JSON.parse(values.faqs))) errors.faqs = ["FAQs must be a JSON array."];
    } catch {
      // Invalid JSON is already reported above.
    }
  }
  const capacity = values.capacity.trim() ? Number(values.capacity) : null;
  if (capacity !== null && (!Number.isFinite(capacity) || capacity <= 0)) errors.capacity = ["Capacity must be greater than zero."];
  const price = values.pricing_type === "paid" && values.price.trim() ? Number(values.price) : null;
  if (values.pricing_type === "paid" && !values.price.trim()) errors.price = ["Price is required for Paid training."];
  if (price !== null && (!Number.isFinite(price) || price < 0)) errors.price = ["Price must be zero or greater."];
  if (values.pricing_type === "paid" && !values.currency.trim()) errors.currency = ["Currency is required for Paid training."];
  return errors;
}