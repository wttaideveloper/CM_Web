import type {
  CreateProgramPayload,
  Program,
  UpdateProgramPayload,
} from "./programs.service";

/** All local values maintained by the Program editor workspace. */
export interface CreateProgramFormValues {
  title: string;
  description: string;
  category: string;
  provider_id: string;
  duration_weeks: string;
  eligibility: string;
  start_date: string;
  end_date: string;
  enrolment_start: string;
  enrolment_end: string;
  enrol_type: string;
  delivery_mode: string;
  price: string;
  currency: string;
  capacity: string;
}

/** Returns blank values for a newly opened Program editor workspace. */
export function createEmptyProgramForm(): CreateProgramFormValues {
  return {
    title: "",
    description: "",
    category: "",
    provider_id: "",
    duration_weeks: "",
    eligibility: "",
    start_date: "",
    end_date: "",
    enrolment_start: "",
    enrolment_end: "",
    enrol_type: "fixed_date",
    delivery_mode: "in_person",
    price: "",
    currency: "INR",
    capacity: "",
  };
}

/** Maps a Program response into editable form values. */
export function programToFormValues(program: Program): CreateProgramFormValues {
  const record = program as unknown as Record<string, unknown>;
  const stringValue = (key: string, fallback = "") => {
    const value = record[key];
    return typeof value === "string" ? value : fallback;
  };
  return {
    title: program.title ?? "",
    description: program.description ?? "",
    category: program.category ?? "",
    provider_id: stringValue("provider_id"),
    duration_weeks: stringValue("duration_weeks"),
    eligibility: stringValue("eligibility"),
    start_date: stringValue("start_date"),
    end_date: stringValue("end_date"),
    enrolment_start: stringValue("enrolment_start"),
    enrolment_end: stringValue("enrolment_end"),
    enrol_type: stringValue("enrol_type", "fixed_date"),
    delivery_mode: program.delivery_mode ?? "in_person",
    price: program.price ?? "",
    currency: stringValue("currency", "INR"),
    capacity: stringValue("capacity"),
  };
}

/** Builds a confirmed Create Program payload without response-only fields. */
export function buildCreateProgramPayload(values: CreateProgramFormValues, tenantId: string, enterpriseId: string): CreateProgramPayload {
  return {
    tenant_id: tenantId,
    enterprise_id: enterpriseId,
    title: values.title.trim(),
    description: values.description.trim() || null,
    category: values.category.trim(),
    provider_id: values.provider_id.trim() || null,
    duration_weeks: values.duration_weeks.trim() || null,
    eligibility: values.eligibility.trim() ? { description: values.eligibility.trim() } : null,
    start_date: values.start_date || null,
    end_date: values.end_date || null,
    enrolment_start: values.enrolment_start || null,
    enrolment_end: values.enrolment_end || null,
    enrol_type: values.enrol_type || null,
    delivery_mode: values.delivery_mode || null,
    price: values.price.trim() || null,
    currency: values.currency.trim() || null,
    capacity: values.capacity.trim() || null,
  };
}

/** Builds a partial Update payload from changed form values. */
export function buildUpdateProgramPayload(values: CreateProgramFormValues): UpdateProgramPayload {
  return {
    title: values.title.trim(),
    description: values.description.trim() || null,
    category: values.category.trim(),
    provider_id: values.provider_id.trim() || null,
    duration_weeks: values.duration_weeks.trim() || null,
    eligibility: values.eligibility.trim() ? { description: values.eligibility.trim() } : null,
    start_date: values.start_date || null,
    end_date: values.end_date || null,
    enrolment_start: values.enrolment_start || null,
    enrolment_end: values.enrolment_end || null,
    enrol_type: values.enrol_type || null,
    delivery_mode: values.delivery_mode || null,
    price: values.price.trim() || null,
    currency: values.currency.trim() || null,
    capacity: values.capacity.trim() || null,
  };
}

/** Validates the current form values, returning per-field messages. */
export function validateProgramForm(values: CreateProgramFormValues): Record<string, string[]> {
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