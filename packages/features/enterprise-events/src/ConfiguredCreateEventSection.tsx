"use client";

import { useState } from "react";

import type { EnterpriseLocationDto } from "@ihp/enterprises";

import type { CreateEventFormValues, EventCustomFieldFormValue, EventTicketFormValue } from "./create-event-form";
import type { ActiveEventFormField, ActiveEventFormSection, EventCategory } from "./events.service";
import type { EventSessionInput } from "./events.service";

type UpdateForm = <Key extends keyof CreateEventFormValues>(key: Key, value: CreateEventFormValues[Key]) => void;
type Props = { section: ActiveEventFormSection; values: CreateEventFormValues; update: UpdateForm; errors: Record<string, string[]>; customValues: Record<string, string | string[] | boolean | number | null>; setCustomValues: (next: Record<string, string | string[] | boolean | number | null>) => void; locations: EnterpriseLocationDto[]; locationId: string; setLocationId: (value: string) => void; categories: readonly EventCategory[]; categoriesLoading: boolean; categoriesError: boolean; };

const inputClass = "mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm text-[#06201c] outline-none focus:border-[#1f6a58]";
const CORE_FIELDS: Record<string, keyof CreateEventFormValues> = { title: "title", description: "description", category: "category", subcategory: "subcategory", tags: "tags", organiser_name: "organiser_name", organiser_contact: "organiser_contact", start_date: "start_date", start_datetime: "start_date", end_date: "end_date", end_datetime: "end_date", registration_cutoff: "registration_cutoff", registration_open_at: "registration_open_at", registration_close_at: "registration_close_at", timezone: "time_zone", time_zone: "time_zone", event_type: "delivery_mode", delivery_mode: "delivery_mode", meeting_provider: "meeting_provider", meeting_link: "meeting_link", price: "price", currency: "currency", capacity: "capacity", min_participants: "min_participants", max_participants: "max_participants", primary_image: "primary_image", gallery_images: "gallery_images", videos: "videos", documents: "documents" };
const COMPOSITES = new Set(["venue", "ticket_types", "sessions", "registration_questions", "registration_fields", "custom_fields", "media", "gallery_images", "videos", "documents"]);

function keyFor(field: ActiveEventFormField): string { return field.source === "core" ? field.core_key ?? field.stable_key ?? field.id : field.stable_key ?? field.id; }
function isCompositeSubfieldEnabled(field: ActiveEventFormField, key: string): boolean { const enabled = field.composite_config?.enabled_fields ?? []; return enabled.length === 0 || enabled.includes(key); }
function isCompositeSubfieldRequired(field: ActiveEventFormField, key: string): boolean { return (field.composite_config?.required_fields ?? []).includes(key); }
function scalar(value: unknown): string { return typeof value === "string" || typeof value === "number" ? String(value) : ""; }
function fieldType(field: ActiveEventFormField, key: string): string {
  if (["start_date", "start_datetime", "end_date", "end_datetime", "registration_cutoff", "registration_open_at", "registration_close_at"].includes(key)) return "datetime-local";
  if (["date", "session_date"].includes(key)) return "date";
  if (["start_time", "end_time"].includes(key)) return "time";
  if (field.renderer === "textarea") return "textarea";
  if (field.renderer === "number" || field.value_type === "number" || ["price", "capacity", "min_participants", "max_participants", "venue_latitude", "venue_longitude"].includes(key)) return "number";
  if (field.renderer === "url" || field.value_type === "url" || ["primary_image", "gallery_images", "videos", "documents", "meeting_link"].includes(key)) return "url";
  return "text";
}
function toDateTimeLocalNow(): string { const now = new Date(); now.setSeconds(0, 0); const offset = now.getTimezoneOffset() * 60_000; return new Date(now.getTime() - offset).toISOString().slice(0, 16); }
function temporalBounds(key: string, type: string, values: CreateEventFormValues): { min?: string; max?: string } {
  if (type !== "datetime-local") return {};
  if (["start_date", "start_datetime", "registration_open_at"].includes(key)) return { min: toDateTimeLocalNow() };
  if (["end_date", "end_datetime"].includes(key)) return { min: values.start_date || toDateTimeLocalNow() };
  if (key === "registration_close_at") return { min: values.registration_open_at || toDateTimeLocalNow(), ...(values.start_date ? { max: values.start_date } : {}) };
  if (key === "registration_cutoff") {
    const maximum = [values.start_date, values.registration_close_at].filter(Boolean).sort()[0];
    return { ...(values.registration_open_at ? { min: values.registration_open_at } : {}), ...(maximum ? { max: maximum } : {}) };
  }
  return {};
}

/** Renders one server-authoritative Event form section in configured field order. */
export default function ConfiguredCreateEventSection({ section, values, update, errors, customValues, setCustomValues, locations, locationId, setLocationId, categories, categoriesLoading, categoriesError }: Props) {
  const fields = [...section.fields].sort((left, right) => left.position - right.position);
  return <section className="space-y-4"><div><h2 className="text-xl font-bold text-[#06201c]">{section.label}</h2>{section.description ? <p className="mt-1 text-sm text-[#52736a]">{section.description}</p> : null}</div><div className="grid gap-4 md:grid-cols-2">{fields.map((field) => <ConfiguredField key={field.id} field={field} values={values} update={update} errors={errors} customValues={customValues} setCustomValues={setCustomValues} locations={locations} locationId={locationId} setLocationId={setLocationId} categories={categories} categoriesLoading={categoriesLoading} categoriesError={categoriesError} />)}</div></section>;
}

function ConfiguredField(props: Omit<Props, "section"> & { field: ActiveEventFormField }) {
  const { field, values, update, errors, customValues, setCustomValues, locations, locationId, setLocationId, categories, categoriesLoading, categoriesError } = props;
  const key = keyFor(field); const required = field.required ? " *" : ""; const error = errors[key]?.[0];
  if (field.source === "core" && (key === "location" || key === "location_id")) return <label className="block text-sm font-semibold text-[#06201c]">{field.label}{required}<select value={locationId} onChange={(event) => setLocationId(event.target.value)} className={inputClass}><option value="">Select a location</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.location_name} — {location.city}</option>)}</select>{error ? <p className="mt-1 text-xs text-[#b42318]">{error}</p> : null}</label>;
  if (field.source === "core" && (key === "category" || key === "subcategory")) return <CategoryTaxonomySelect field={field} keyName={key} values={values} update={update} error={error} categories={categories} loading={categoriesLoading} hasError={categoriesError} />;
  if (field.source === "core" && (COMPOSITES.has(key) || ["ticket_types", "sessions", "registration_fields"].includes(field.renderer))) return <CompositeField field={field} values={values} update={update} error={error} />;
  if (field.source === "core" && key === "tags") return <TagsEditor field={field} values={values} update={update} error={error} />;
  if (field.source === "core" && key === "duration_type") return <label className="block text-sm font-semibold text-[#06201c]">{field.label}{required}<select value="custom" disabled className={inputClass}><option value="custom">Custom</option></select>{error ? <p className="mt-1 text-xs text-[#b42318]">{error}</p> : null}</label>;
  if (field.source === "core" && (key === "delivery_mode" || key === "event_type")) return <label className="block text-sm font-semibold text-[#06201c]">{field.label}{required}<select value={values.delivery_mode} onChange={(event) => update("delivery_mode", event.target.value)} className={inputClass}><option value="in_person">In Person</option></select>{error ? <p className="mt-1 text-xs text-[#b42318]">{error}</p> : null}</label>;
  const coreField = field.source === "core" ? CORE_FIELDS[key] : undefined;
  const value = coreField ? (coreField === "tags" ? values.tags.join(", ") : Array.isArray(values[coreField]) ? (values[coreField] as string[]).join(", ") : scalar(values[coreField])) : scalar(customValues[key]);
  const isBoolean = field.value_type === "boolean" || field.renderer === "checkbox";
  const isNumber = field.value_type === "number" || field.renderer === "number";
  const setValue = (next: string) => { if (coreField) { if (coreField === "tags") update("tags", next.split(",").map((item) => item.trim()).filter(Boolean)); else if (["gallery_images", "videos", "documents"].includes(coreField)) update(coreField, next.split(",").map((item) => item.trim()).filter(Boolean) as CreateEventFormValues[typeof coreField]); else update(coreField, next as CreateEventFormValues[typeof coreField]); } else setCustomValues({ ...customValues, [key]: isBoolean ? next === "true" : isNumber ? Number(next) : next }); };
  const options = [...field.options].sort((left, right) => left.position - right.position);
  const type = fieldType(field, key);
  const bounds = temporalBounds(key, type, values);
  if (isBoolean) return <label className="flex items-center gap-2 text-sm font-semibold text-[#06201c]"><input type="checkbox" checked={coreField ? value === "true" : customValues[key] === true} onChange={(event) => setValue(String(event.target.checked))} />{field.label}{required}</label>;
  return <label className="block text-sm font-semibold text-[#06201c]">{field.label}{required}{field.help_text ? <span className="ml-1 font-normal text-[#52736a]">{field.help_text}</span> : null}{options.length || field.value_type === "enum" || key === "currency" ? <select value={value} onChange={(event) => setValue(event.target.value)} className={inputClass}><option value="">Select an option</option>{options.length ? options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>) : <option value={value}>{value}</option>}</select> : type === "textarea" ? <textarea value={value} required={field.required} placeholder={field.placeholder ?? undefined} minLength={field.validation.min_length ?? undefined} maxLength={field.validation.max_length ?? undefined} onChange={(event) => setValue(event.target.value)} className={`${inputClass} h-24 resize-y py-2`} /> : <input type={type} value={value} required={field.required} placeholder={field.placeholder ?? undefined} minLength={field.validation.min_length ?? undefined} maxLength={field.validation.max_length ?? undefined} min={bounds.min ?? field.validation.min ?? undefined} max={bounds.max ?? field.validation.max ?? undefined} pattern={field.validation.pattern ?? undefined} onChange={(event) => setValue(event.target.value)} className={inputClass} />}{error ? <p className="mt-1 text-xs text-[#b42318]">{error}</p> : null}</label>;
}

/** Renders backend-owned category taxonomy without persisting taxonomy identifiers in the Event payload. */
function CategoryTaxonomySelect({ field, keyName, values, update, error, categories, loading, hasError }: { field: ActiveEventFormField; keyName: "category" | "subcategory"; values: CreateEventFormValues; update: UpdateForm; error?: string; categories: readonly EventCategory[]; loading: boolean; hasError: boolean }) {
  const parents = categories.filter((category) => category.parent_id === null);
  const selectedParent = parents.find((category) => category.name === values.category);
  const children = selectedParent ? categories.filter((category) => category.parent_id === selectedParent.id) : [];
  const isSubcategory = keyName === "subcategory";
  const value = isSubcategory ? values.subcategory : values.category;
  const disabled = loading || hasError || (isSubcategory && !selectedParent) || (!isSubcategory && parents.length === 0) || (isSubcategory && selectedParent !== undefined && children.length === 0);
  const placeholder = loading
    ? "Loading categories..."
    : hasError
      ? "Unable to load categories"
      : isSubcategory && !selectedParent
        ? "Select a category first"
        : isSubcategory && children.length === 0
          ? "No subcategories available"
          : "No categories available";
  const queryError = hasError ? "Unable to load Event categories." : undefined;

  return <label className="block text-sm font-semibold text-[#06201c]">{field.label}{field.required ? " *" : ""}{field.help_text ? <span className="ml-1 font-normal text-[#52736a]">{field.help_text}</span> : null}<select value={value} required={field.required} disabled={disabled} onChange={(event) => {
    const next = event.target.value;
    if (isSubcategory) {
      update("subcategory", next);
      return;
    }
    const nextParent = parents.find((category) => category.name === next);
    const keepsSubcategory = nextParent !== undefined && categories.some((category) => category.parent_id === nextParent.id && category.name === values.subcategory);
    update("category", next);
    if (!keepsSubcategory) update("subcategory", "");
  }} className={inputClass}><option value="">{placeholder}</option>{(isSubcategory ? children : parents).map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}</select>{error || queryError ? <p className="mt-1 text-xs text-[#b42318]">{error ?? queryError}</p> : null}</label>;
}

function TagsEditor({ field, values, update, error }: { field: ActiveEventFormField; values: CreateEventFormValues; update: UpdateForm; error?: string }) {
  const [draft, setDraft] = useState("");
  const addTag = () => {
    const tag = draft.trim();
    if (!tag || values.tags.some((item) => item.toLocaleLowerCase() === tag.toLocaleLowerCase())) return;
    update("tags", [...values.tags, tag]);
    setDraft("");
  };

  return <div className="block text-sm font-semibold text-[#06201c]"><label htmlFor={`event-tags-${field.id}`}>{field.label}{field.required ? " *" : ""}{field.help_text ? <span className="ml-1 font-normal text-[#52736a]">{field.help_text}</span> : null}</label><input id={`event-tags-${field.id}`} value={draft} required={field.required && values.tags.length === 0} placeholder={field.placeholder ?? "Type a tag and press Enter"} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addTag(); } }} className={inputClass} />{values.tags.length > 0 ? <div className="mt-2 flex flex-wrap gap-2">{values.tags.map((tag) => <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-[#e8f6ee] px-3 py-1 text-xs font-bold text-[#1f6a58]">{tag}<button type="button" onClick={() => update("tags", values.tags.filter((item) => item !== tag))} aria-label={`Remove ${tag}`} className="rounded-full px-0.5 text-[#1f6a58] hover:bg-[#cdebd8]">×</button></span>)}</div> : null}{error ? <p className="mt-1 text-xs text-[#b42318]">{error}</p> : null}</div>;
}

function CompositeField({ field, values, update, error }: { field: ActiveEventFormField; values: CreateEventFormValues; update: UpdateForm; error?: string }) {
  const key = keyFor(field);
  if (key === "venue") return <div className="grid gap-4 md:grid-cols-2">{isCompositeSubfieldEnabled(field, "name") ? <Simple field={field} required={isCompositeSubfieldRequired(field, "name")} label={field.label} value={values.venue_name} onChange={(value) => update("venue_name", value)} /> : null}{isCompositeSubfieldEnabled(field, "address") ? <Simple field={field} required={isCompositeSubfieldRequired(field, "address")} label="Address" value={values.venue_address} onChange={(value) => update("venue_address", value)} /> : null}{isCompositeSubfieldEnabled(field, "city") ? <Simple field={field} required={isCompositeSubfieldRequired(field, "city")} label="City" value={values.venue_city} onChange={(value) => update("venue_city", value)} /> : null}</div>;
  if (key === "ticket_types" || field.renderer === "ticket_types") return <TicketTypesEditor field={field} values={values} update={update} error={error} />;
  if (key === "sessions" || field.renderer === "sessions") return <SessionsEditor field={field} values={values} update={update} error={error} />;
  if (["custom_fields", "registration_questions", "registration_fields"].includes(key) || field.renderer === "registration_fields") return <RegistrationEditor field={field} values={values} update={update} error={error} />;
  if (["primary_image", "gallery_images", "videos", "documents", "media"].includes(key)) return <MediaEditor field={field} values={values} update={update} error={error} />;
  return null;
}
function Simple({ field, required, label, value, onChange }: { field: ActiveEventFormField; required: boolean; label: string; value: string; onChange: (value: string) => void }) { return <label className="block text-sm font-semibold text-[#06201c]">{label}{required ? " *" : ""}<input required={required} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass} /></label>; }
function TicketTypesEditor({ field, values, update, error }: { field: ActiveEventFormField; values: CreateEventFormValues; update: UpdateForm; error?: string }) { const patch = (index: number, name: keyof EventTicketFormValue, value: string) => update("ticket_types", values.ticket_types.map((item, current) => current === index ? { ...item, [name]: value } : item)); const fields: Array<keyof EventTicketFormValue> = ["name", "price", "currency", "capacity"]; return <CompositeList title={field.label} onAdd={() => update("ticket_types", [...values.ticket_types, { id: "", name: "", price: "", currency: values.currency, capacity: "" }])} error={error}>{values.ticket_types.map((item, index) => <div key={index} className="grid gap-3 md:grid-cols-2">{fields.filter((name) => isCompositeSubfieldEnabled(field, name)).map((name) => <label key={name} className="block text-sm font-semibold">{name}{isCompositeSubfieldRequired(field, name) ? " *" : ""}<input required={isCompositeSubfieldRequired(field, name)} type={name === "price" || name === "capacity" ? "number" : "text"} value={item[name]} onChange={(event) => patch(index, name, event.target.value)} className={inputClass} /></label>)}<button type="button" onClick={() => update("ticket_types", values.ticket_types.filter((_, current) => current !== index))}>Remove</button></div>)}</CompositeList>; }
function SessionsEditor({ field, values, update, error }: { field: ActiveEventFormField; values: CreateEventFormValues; update: UpdateForm; error?: string }) {
  const patch = (index: number, name: keyof EventSessionInput, value: string) => {
    update("sessions", values.sessions.map((item, current) => current === index ? { ...item, [name]: value } : item));
  };
  const fields: Array<keyof EventSessionInput> = ["session_date", "title", "speaker", "start_time", "end_time", "location"];
  const eventStartDate = values.start_date.slice(0, 10) || undefined;
  const eventEndDate = values.end_date.slice(0, 10) || undefined;

  return <CompositeList title={field.label} onAdd={() => update("sessions", [...values.sessions, { session_date: "", title: "", speaker: "", start_time: "", end_time: "", location: "" }])} error={error}>
    {values.sessions.map((item, index) => <div key={index} className="grid gap-3 md:grid-cols-2">
      {fields.filter((name) => isCompositeSubfieldEnabled(field, name)).map((name) => <label key={name} className="block text-sm font-semibold">
        {name}{isCompositeSubfieldRequired(field, name) ? " *" : ""}
        <input
          required={isCompositeSubfieldRequired(field, name)}
          type={name === "session_date" ? "date" : name === "start_time" || name === "end_time" ? "time" : "text"}
          value={item[name] ?? ""}
          min={name === "session_date" ? eventStartDate : undefined}
          max={name === "session_date" ? eventEndDate : undefined}
          onChange={(event) => patch(index, name, event.target.value)}
          className={inputClass}
        />
      </label>)}
      <button type="button" onClick={() => update("sessions", values.sessions.filter((_, current) => current !== index))}>Remove</button>
    </div>)}
  </CompositeList>;
}
function RegistrationEditor({ field, values, update, error }: { field: ActiveEventFormField; values: CreateEventFormValues; update: UpdateForm; error?: string }) { const patch = (index: number, name: keyof EventCustomFieldFormValue, value: string | string[]) => update("custom_fields", values.custom_fields.map((item, current) => current === index ? { ...item, [name]: value } as EventCustomFieldFormValue : item)); return <CompositeList title={field.label} onAdd={() => update("custom_fields", [...values.custom_fields, { label: "", type: "select", options: [] }])} error={error}>{values.custom_fields.map((item, index) => <div key={index} className="grid gap-3 md:grid-cols-2">{isCompositeSubfieldEnabled(field, "label") ? <Simple field={field} required={isCompositeSubfieldRequired(field, "label")} label="Label" value={item.label} onChange={(value) => patch(index, "label", value)} /> : null}{isCompositeSubfieldEnabled(field, "type") ? <label>Type<select value={item.type} onChange={(event) => patch(index, "type", event.target.value)} className={inputClass}><option value="select">Select</option></select></label> : null}{isCompositeSubfieldEnabled(field, "options") ? <Simple field={field} required={isCompositeSubfieldRequired(field, "options")} label="Options" value={item.options.join(", ")} onChange={(value) => patch(index, "options", value.split(",").map((part) => part.trim()).filter(Boolean))} /> : null}<button type="button" onClick={() => update("custom_fields", values.custom_fields.filter((_, current) => current !== index))}>Remove</button></div>)}</CompositeList>; }
function MediaEditor({ field, values, update, error }: { field: ActiveEventFormField; values: CreateEventFormValues; update: UpdateForm; error?: string }) { const key = keyFor(field); const formKey = key === "primary_image" ? "primary_image" : key === "gallery_images" ? "gallery_images" : key === "videos" ? "videos" : "documents"; const list = formKey === "primary_image" ? [values.primary_image] : values[formKey]; return <CompositeList title={field.label} error={error}>{list.map((item, index) => <div key={index} className="flex gap-2"><input type="url" required={field.required || isCompositeSubfieldRequired(field, "url")} value={item} onChange={(event) => { if (formKey === "primary_image") update("primary_image", event.target.value); else update(formKey, list.map((value, current) => current === index ? event.target.value : value)); }} className={inputClass} />{formKey !== "primary_image" ? <button type="button" onClick={() => update(formKey, list.filter((_, current) => current !== index))}>Remove</button> : null}</div>)}{formKey !== "primary_image" ? <button type="button" onClick={() => update(formKey, [...list, ""])}>Add</button> : null}</CompositeList>; }
function CompositeList({ title, onAdd, error, children }: { title: string; onAdd?: () => void; error?: string; children: React.ReactNode }) { return <div className="space-y-2 rounded-xl border border-[#d7e5df] p-3"><div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{title}</h3>{onAdd ? <button type="button" onClick={onAdd} className="min-h-9 px-2 text-sm font-semibold text-[#1f6a58]">Add</button> : null}</div>{children}{error ? <p className="text-xs text-[#b42318]">{error}</p> : null}</div>; }
