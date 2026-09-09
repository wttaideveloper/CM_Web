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
  requirements: string;
  primary_image: string;
  gallery_images: string[];
  promotional_video: string;
  delivery_mode: string;
  course_type: string;
  duration: string;
  start_date: string;
  end_date: string;
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
    requirements: "",
    primary_image: "",
    gallery_images: [],
    promotional_video: "",
    delivery_mode: "self_paced",
    course_type: "",
    duration: "",
    start_date: "",
    end_date: "",
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
    delivery_mode: training.delivery_mode ?? "self_paced",
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
  };
}

/** Builds a confirmed Create Training payload without response-only fields. */
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
    requirements: values.requirements.trim() || null,
    primary_image: values.primary_image.trim() || null,
    gallery_images: values.gallery_images,
    promotional_video: values.promotional_video.trim() || null,
    delivery_mode: values.delivery_mode || null,
    course_type: values.course_type.trim() || null,
    duration: values.duration.trim() || null,
    start_date: values.start_date || null,
    end_date: values.end_date || null,
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
  };
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
    requirements: values.requirements.trim() || null,
    primary_image: values.primary_image.trim() || null,
    gallery_images: values.gallery_images,
    promotional_video: values.promotional_video.trim() || null,
    delivery_mode: values.delivery_mode || null,
    course_type: values.course_type.trim() || null,
    duration: values.duration.trim() || null,
    start_date: values.start_date || null,
    end_date: values.end_date || null,
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
  };
}

/** Validates the current form values, returning per-field messages. */
export function validateTrainingForm(values: CreateTrainingFormValues): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  if (!values.title.trim()) errors.title = ["Title is required."];
  if (!values.category.trim()) errors.category = ["Category is required."];
  if (values.start_date && values.end_date && values.end_date < values.start_date) {
    errors.end_date = ["End date cannot be before the start date."];
  }
  if (values.enrolment_start && values.enrolment_end && values.enrolment_end < values.enrolment_start) {
    errors.enrolment_end = ["Enrolment end cannot be before enrolment start."];
  }
  return errors;
}