import type { CreateEventFormValues } from "./create-event-form";
import type { ActiveEventFormConfiguration, ActiveEventFormField } from "./events.service";

type CustomValues = Record<string, string | string[] | boolean | number | null>;

const coreValueKeys: Record<string, keyof CreateEventFormValues> = {
  title: "title",
  description: "description",
  category: "category",
  subcategory: "subcategory",
  tags: "tags",
  organiser_name: "organiser_name",
  organiser_contact: "organiser_contact",
  start_date: "start_date",
  start_datetime: "start_date",
  end_date: "end_date",
  end_datetime: "end_date",
  duration_type: "duration_type",
  registration_cutoff: "registration_cutoff",
  registration_open_at: "registration_open_at",
  registration_close_at: "registration_close_at",
  timezone: "time_zone",
  time_zone: "time_zone",
  event_type: "event_type",
  delivery_mode: "delivery_mode",
  pricing_type: "pricing_type",
  meeting_provider: "meeting_provider",
  meeting_link: "meeting_link",
  price: "price",
  currency: "currency",
  ticket_types: "ticket_types",
  sessions: "sessions",
  venue: "venue_name",
  capacity: "capacity",
  min_participants: "min_participants",
  max_participants: "max_participants",
  primary_image: "primary_image",
  gallery_images: "gallery_images",
  videos: "videos",
  documents: "documents",
  custom_fields: "custom_fields",
  registration_questions: "custom_fields",
  registration_fields: "custom_fields",
};

const venueValues: Record<string, keyof CreateEventFormValues> = {
  name: "venue_name",
  address: "venue_address",
  city: "venue_city",
  "coordinates.lat": "venue_latitude",
  "coordinates.lng": "venue_longitude",
};

const customFieldValues: Record<string, keyof CreateEventFormValues["custom_fields"][number]> = {
  label: "label",
  type: "type",
  options: "options",
};

function keyFor(field: ActiveEventFormField): string {
  return field.source === "core" ? field.core_key ?? field.stable_key ?? field.id : field.stable_key ?? field.id;
}

function isDeliveryFieldApplicable(key: string, deliveryMode: string): boolean {
  if (!deliveryMode) return true;
  if (["venue", "location", "location_id"].includes(key)) return deliveryMode !== "online";
  if (["meeting_provider", "meeting_link"].includes(key)) return deliveryMode === "online" || deliveryMode === "hybrid";
  return true;
}

function isModuleEnabled(key: string, values: CreateEventFormValues): boolean {
  if (["pricing_type", "price", "currency", "ticket_types"].includes(key) && values.modules?.tickets === false) return false;
  if (key === "sessions" && values.modules?.sessions === false) return false;
  if (["meeting_provider", "meeting_link"].includes(key) && values.modules?.online_meeting === false) return false;
  if (["custom_fields", "registration_questions", "registration_fields"].includes(key) && values.modules?.custom_questions === false) return false;
  return true;
}

function hasValue(value: unknown, requiredBoolean = false): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) {
    return value.some((item) => typeof item === "string" ? item.trim() !== "" : typeof item === "object" && item !== null && "url" in item && typeof item.url === "string" && item.url.trim() !== "");
  }
  if (requiredBoolean && typeof value === "boolean") return value;
  return true;
}

function coreValue(field: ActiveEventFormField, key: string, values: CreateEventFormValues): unknown {
  if (field.source !== "core") return undefined;
  if (key === "venue") return [values.venue_name, values.venue_address, values.venue_city, values.venue_latitude, values.venue_longitude];
  if (key === "media") return [values.primary_image, ...values.gallery_images, ...values.videos, ...values.documents];
  const valueKey = coreValueKeys[key] ?? (key in values ? key as keyof CreateEventFormValues : undefined);
  return valueKey ? values[valueKey] : undefined;
}

function missingRequiredCompositeChild(
  field: ActiveEventFormField,
  key: string,
  values: CreateEventFormValues,
): string | null {
  if (field.source !== "core") return null;
  const requiredFields = field.composite_config?.required_fields ?? [];
  if (!requiredFields.length) return null;

  if (key === "venue") {
    const missing = requiredFields.find((child) => {
      const valueKey = venueValues[child];
      return valueKey && !hasValue(values[valueKey]);
    });
    return missing ?? null;
  }
  if (key === "ticket_types") {
    const missing = values.ticket_types.some((ticket) => requiredFields.some((child) => {
      const value = ticket[child as keyof typeof ticket];
      return !hasValue(value);
    }));
    return missing ? requiredFields[0] : null;
  }
  if (["custom_fields", "registration_questions", "registration_fields"].includes(key) || field.renderer === "registration_fields") {
    const missing = values.custom_fields.some((customField) => requiredFields.some((child) => {
      const valueKey = customFieldValues[child];
      return valueKey ? !hasValue(customField[valueKey]) : false;
    }));
    return missing ? requiredFields[0] : null;
  }
  if (["primary_image", "gallery_images", "videos", "documents", "media"].includes(key)) {
    const media = key === "primary_image"
      ? [values.primary_image]
      : key === "gallery_images"
        ? values.gallery_images
        : key === "videos"
          ? values.videos
          : key === "documents"
            ? values.documents
            : [values.primary_image, ...values.gallery_images, ...values.videos, ...values.documents];
    if (requiredFields.includes("url") && !media.some((item) => hasValue(item))) return "url";
    if (requiredFields.includes("url") && media.some((item) => !hasValue(item))) return "url";
  }
  return null;
}

/** Validates required fields in the active Enterprise Event form, including configured composites. */
export function validateRequiredConfiguredEventFields(
  configuration: ActiveEventFormConfiguration,
  values: CreateEventFormValues,
  customValues: CustomValues,
): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  for (const section of configuration.sections) {
    if (!section.is_enabled) continue;
    for (const field of section.fields) {
      if (field.is_enabled === false) continue;
      const key = keyFor(field);
      if (values.pricing_type === "free" && ["price", "currency", "ticket_types"].includes(key)) continue;
      if (!isDeliveryFieldApplicable(key, values.delivery_mode) || !isModuleEnabled(key, values)) continue;
      if (field.source === "core" && ["location", "location_id"].includes(key.replace(/^(core_|custom_)/, "").trim().toLowerCase())) continue;

      const isBoolean = field.value_type === "boolean" || field.renderer === "checkbox";
      const value = field.source === "core" ? coreValue(field, key, values) : customValues[key];
      if (field.required && !hasValue(value, isBoolean)) {
        errors[key] = [`${field.label} is required.`];
        continue;
      }

      const missingChild = missingRequiredCompositeChild(field, key, values);
      if (missingChild) errors[key] = [`${field.label}: ${missingChild} is required.`];
    }
  }

  return errors;
}
