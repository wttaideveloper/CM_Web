import { formConfigurationCopy as copy } from "../constants/form-configuration-copy";
import { getEventCompositeFieldDefinition } from "./event-composite-field-definitions";
import type { ConfiguredField, CoreFieldRegistryItem, FormConfiguration, FormSection } from "./form-configuration.types";

export const mockTenants = [
  { id: "tenant-aurora", name: copy.mock.tenants.aurora }, { id: "tenant-wellness", name: copy.mock.tenants.wellness }, { id: "tenant-horizon", name: copy.mock.tenants.horizon }, { id: "tenant-vital", name: copy.mock.tenants.vital },
];

/** Creates deterministic local seed identities; mock state never implies a server ID. */
export function createSeededSections(): FormSection[] {
  return Object.entries(copy.seededSections).map(([key, name], index) => ({ localId: `section-${key}`, serverId: null, stableKey: `section_${key}`, name, description: "", enabled: true, position: index + 1 }));
}

/** Creates local seed fields compatible with the future Event Form Configuration contract. */
export function createSeededFields(registry: readonly CoreFieldRegistryItem[], sections = createSeededSections()): ConfiguredField[] {
  type SeedDef = { key: string; section: string; placeholder?: string; helpText?: string; required?: boolean; renderer?: string; options?: readonly string[]; label?: string; validation?: { pattern?: string | null } };
  const trainingFields: SeedDef[] = [
    // 1. Basic Information — mirrors TrainingBasicsSection:25
    { key: "title", section: "section-basic", placeholder: "e.g. Diabetes Reversal — 12-Week Program", required: true, label: "Title" },
    { key: "subtitle", section: "section-basic", placeholder: "e.g. Reverse T2D with food, movement & sleep", label: "Subtitle" },
    { key: "description", section: "section-basic", placeholder: "What will learners achieve? Who is it for? What’s included?", renderer: "textarea", required: true, label: "Description" },
    { key: "category", section: "section-basic", required: true, label: "Category" },
    { key: "subcategory", section: "section-basic", label: "Subcategory" },
    { key: "tags", section: "section-basic", placeholder: "Type a tag and press Enter", label: "Tags" },
    { key: "learning_objectives", section: "section-basic", placeholder: "Type objective and press Enter", label: "Learning objectives" },
    { key: "requirements", section: "section-basic", placeholder: "Prerequisites or requirements", renderer: "textarea", label: "Requirements" },
    // 2. Schedule — mirrors TrainingScheduleSection:92
    { key: "start_date", section: "section-schedule", renderer: "datetime", label: "Start Date" },
    { key: "end_date", section: "section-schedule", renderer: "datetime", label: "End Date" },
    { key: "start_time", section: "section-schedule", renderer: "text", placeholder: "HH:MM", label: "Start time", validation: { pattern: "^([01]\\d|2[0-3]):([0-5]\\d)$" } },
    { key: "end_time", section: "section-schedule", renderer: "text", placeholder: "HH:MM", label: "End time", validation: { pattern: "^([01]\\d|2[0-3]):([0-5]\\d)$" } },
    { key: "enrolment_start", section: "section-schedule", renderer: "datetime", label: "Enrolment Start" },
    { key: "enrolment_end", section: "section-schedule", renderer: "datetime", label: "Enrolment End" },
    { key: "time_zone", section: "section-schedule", placeholder: "Asia/Kolkata", label: "Time Zone" },
    { key: "duration", section: "section-schedule", placeholder: "e.g. 4 weeks", label: "Duration" },
    { key: "access_duration_days", section: "section-schedule", placeholder: "e.g. 90", label: "Access duration (days)" },
    // 3. Location & Host — mirrors TrainingDeliverySection:54 (hybrid/physical/online)
    { key: "delivery_mode", section: "section-location", renderer: "select", options: ["hybrid", "physical", "online", "self_paced", "instructor_led", "blended"], label: "Delivery Mode" },
    { key: "course_type", section: "section-location", placeholder: "e.g. Workshop", label: "Course Type" },
    { key: "location_id", section: "section-location", placeholder: "Select or paste location ID", label: "Location" },
    { key: "venue", section: "section-location", placeholder: "e.g. Main Hall", label: "Venue" },
    { key: "address", section: "section-location", placeholder: "Full address", label: "Address" },
    { key: "meeting_link", section: "section-location", placeholder: "https://...", renderer: "url", label: "Meeting link" },
    { key: "delivery_instructions", section: "section-location", placeholder: "How to join, setup, etc.", renderer: "textarea", label: "Delivery instructions" },
    { key: "instructor_id", section: "section-location", label: "Instructor" },
    { key: "instructor_name", section: "section-location", placeholder: "Display name", label: "Instructor name" },
    { key: "instructor_bio", section: "section-location", renderer: "textarea", placeholder: "Short bio", label: "Instructor bio" },
    { key: "instructor_photo", section: "section-location", placeholder: "https://…", renderer: "url", label: "Instructor photo" },
    { key: "instructor_credentials", section: "section-location", placeholder: "e.g. MBBS, RYT-500 · 10y experience", renderer: "textarea", label: "Instructor credentials" },
    { key: "level", section: "section-location", renderer: "select", options: ["beginner", "intermediate", "advanced", "all"], label: "Level" },
    { key: "language", section: "section-location", renderer: "select", options: ["en", "hi", "es", "fr"], label: "Language" },
    // 4. Pricing & Tickets — mirrors TrainingPricingSection:141
    { key: "price", section: "section-pricing", label: "Price" },
    { key: "currency", section: "section-pricing", placeholder: "INR", label: "Currency" },
    { key: "promo_price", section: "section-pricing", label: "Promo price" },
    { key: "coupon_code", section: "section-pricing", label: "Coupon code" },
    // 5. Capacity & Registration — mirrors TrainingCapacitySection:158
    { key: "capacity", section: "section-capacity", label: "Capacity" },
    { key: "requires_approval", section: "section-capacity", renderer: "checkbox", label: "Requires approval" },
    { key: "access_expiry_type", section: "section-capacity", renderer: "select", options: ["never", "date", "days", "enrolment_day"], label: "Access expiry" },
    { key: "access_expiry_days", section: "section-capacity", placeholder: "e.g. 90", label: "Expiry days" },
    { key: "group_enrolment", section: "section-capacity", renderer: "checkbox", label: "Group enrolment" },
    { key: "max_group_size", section: "section-capacity", placeholder: "e.g. 5", label: "Max group size" },
    // 6. Images & Media — mirrors TrainingMediaSection:178
    { key: "primary_image", section: "section-media", renderer: "url", placeholder: "https://…", label: "Primary Image" },
    { key: "gallery_images", section: "section-media", renderer: "url", placeholder: "https://…", label: "Gallery images" },
    { key: "documents", section: "section-media", renderer: "url", placeholder: "https://…", label: "Documents" },
    { key: "promotional_video", section: "section-media", renderer: "url", placeholder: "https://…", label: "Videos" },
    // 7. Additional Configuration — mirrors TrainingCourseBuilderSection:192
    { key: "prerequisites", section: "section-additional", placeholder: "e.g. Complete Module 1", renderer: "textarea", label: "Prerequisites" },
    { key: "release_rule", section: "section-additional", renderer: "select", options: ["immediate", "date", "enrolment_day", "previous_lesson"], label: "Release rule" },
    { key: "scheduled_publication", section: "section-additional", renderer: "datetime", label: "Scheduled publication" },
    { key: "randomise", section: "section-additional", renderer: "checkbox", label: "Randomise" },
    { key: "is_mandatory", section: "section-additional", renderer: "checkbox", label: "Is mandatory" },
    { key: "faqs", section: "section-additional", placeholder: '[{"question":"...","answer":"..."}]', renderer: "textarea", label: "FAQs" },
    { key: "badges", section: "section-additional", placeholder: "Type badge and press Enter", label: "Badges" },
  ];
  const eventFields: Array<[string, string]> = [["title", "section-basic"], ["description", "section-basic"], ["category", "section-basic"], ["start_date", "section-schedule"], ["end_date", "section-schedule"], ["time_zone", "section-schedule"], ["location_id", "section-location"], ["delivery_mode", "section-location"], ["price", "section-pricing"], ["currency", "section-pricing"], ["ticket_types", "section-pricing"], ["capacity", "section-capacity"], ["primary_image", "section-media"], ["sessions", "section-additional"], ["custom_fields", "section-additional"]];
  const isTrainingRegistry = registry.length === 0 || registry.some(f => f.key === "instructor_name" || f.key === "learning_objectives" || f.key === "delivery_mode" || f.key === "promotional_video" || f.key === "tags" || f.key === "start_time");
  if (!isTrainingRegistry) {
    return eventFields.flatMap(([coreKey, sectionLocalId], index) => { const definition = registry.find((field) => field.key === coreKey); if (!definition) return []; const composite = getEventCompositeFieldDefinition(coreKey); return [{ localId: `field-core-${coreKey}`, serverId: null, stableKey: `core_${coreKey}`, source: "core" as const, coreKey, label: definition.displayName, sectionLocalId: sections.some((section) => section.localId === sectionLocalId) ? sectionLocalId : sections[0]?.localId ?? "", position: index + 1, valueType: definition.valueType, required: definition.requiredByDomain, renderer: definition.defaultRenderer, placeholder: "", helpText: "", options: [], validation: {}, ...(composite ? { compositeConfig: { enabled_fields: composite.subfields.map((subfield) => subfield.key), required_fields: [] } } : {}), enabled: true }]; });
  }
  // Training fields: core if in registry, else custom with generic stableKey — keeps tags etc. without "Unknown core_key: tags" / "Unknown custom field: tags"
  return trainingFields.flatMap((def, index) => {
    const definition = registry.find((field) => field.key === def.key);
    const composite = getEventCompositeFieldDefinition(def.key);
    const displayName = def.label ?? definition?.displayName ?? def.key.replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());
    const sectionLocalId = sections.some((section) => section.localId === def.section) ? def.section : sections[0]?.localId ?? "";
    const fieldOptions = def.options ? def.options.map((value, position) => ({ value, label: value.replaceAll("_", " "), position: position + 1 })) : [];
    if (definition) {
      return [{ localId: `field-${def.section}-${def.key}`, serverId: null, stableKey: `core_${def.key}`, source: "core" as const, coreKey: def.key, label: displayName, sectionLocalId, position: index + 1, valueType: definition.valueType, required: def.required ?? definition.requiredByDomain, renderer: definition.defaultRenderer, placeholder: def.placeholder ?? "", helpText: def.helpText ?? "", options: fieldOptions, validation: def.validation ?? {}, ...(composite ? { compositeConfig: { enabled_fields: composite.subfields.map((subfield) => subfield.key), required_fields: [] } } : {}), enabled: true } as ConfiguredField];
    }
    // Not in registry — emit as deterministic generic custom key with label Tags etc.,
    // so backend accepts it as custom (never `custom_tags`/`core_tags`) and enterprise maps via label to tags
    return [{ localId: `field-${def.section}-${def.key}`, serverId: null, stableKey: `field-custom-${def.section}-${def.key}`, source: "custom" as const, coreKey: null, label: displayName, sectionLocalId, position: index + 1, valueType: def.renderer === "url" ? "url" : def.renderer === "datetime" ? "datetime" : def.renderer === "checkbox" ? "boolean" : "string", required: def.required ?? false, renderer: def.renderer ?? "text", placeholder: def.placeholder ?? "", helpText: def.helpText ?? "", options: fieldOptions, validation: def.validation ?? {}, ...(composite ? { compositeConfig: { enabled_fields: composite.subfields.map((subfield) => subfield.key), required_fields: [] } } : {}), enabled: true } as ConfiguredField];
  });
}

export function createMockConfiguration(id = "default-event-form", registry: readonly CoreFieldRegistryItem[] = []): FormConfiguration {
  const sections = createSeededSections();
  return { id, type: "event", name: copy.mock.defaultName, description: copy.mock.defaultDescription, scope: "global", status: "published", active: true, version: 1, tenantIds: [], updatedAt: "2026-09-03", sections, fields: createSeededFields(registry, sections) };
}

export const mockFormConfigurations: FormConfiguration[] = [];
