"use client";

import type { EnterpriseLocationDto } from "@ihp/enterprises";

import type { CreateEventFormValues } from "./create-event-form";
import type { EventTypeDefinition } from "./events.service";
import EventModulesControls from "./EventModulesControls";

type UpdateForm = <Key extends keyof CreateEventFormValues>(key: Key, value: CreateEventFormValues[Key]) => void;

type SectionProps = { values: CreateEventFormValues; update: UpdateForm; errors: Record<string, string[]>; eventTypes?: readonly EventTypeDefinition[]; eventTypesLoading?: boolean; eventTypesError?: boolean };

const inputClass = "mt-1.5 h-11 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm font-normal text-[#06201c] outline-none focus:border-[#1f6a58]";
const labelClass = "block text-sm font-semibold text-[#06201c]";

function FieldError({ error, id }: { error?: string[]; id?: string }) {
  return error?.[0] ? <p id={id} role="alert" className="mt-1 text-xs font-medium text-[#b42318]">{error[0]}</p> : null;
}

/** Renders basic Event fields and the accessible tag chip editor. */
export function BasicInformationSection({ values, update, errors, eventTypes = [], eventTypesLoading = false, eventTypesError = false }: SectionProps) {
  const addTag = (value: string) => {
    const tag = value.trim();
    if (tag && !values.tags.includes(tag)) update("tags", [...values.tags, tag]);
  };

  return <section className="space-y-5"><SectionHeading title="Basic Information" description="Describe the event and its organizer." />
    <label className={labelClass}>Event name<input id="event-field-title" value={values.title} onChange={(event) => update("title", event.target.value)} className={inputClass} /> <FieldError error={errors.title} /></label>
    <label className={labelClass}>Description<textarea id="event-field-description" value={values.description} onChange={(event) => update("description", event.target.value)} rows={5} className={`${inputClass} h-auto py-3`} /> <FieldError error={errors.description} /></label>
    <label className={labelClass}>Event Type<select required value={values.event_type} disabled={eventTypesLoading || eventTypesError} onChange={(event) => update("event_type", event.target.value)} className={inputClass}><option value="">{eventTypesLoading ? "Loading Event Types..." : eventTypesError ? "Unable to load Event Types" : "Select an Event Type"}</option>{values.event_type && !eventTypes.some((item) => item.key === values.event_type || item.id === values.event_type) ? <option value={values.event_type}>{values.event_type} (legacy or inactive)</option> : null}{eventTypes.filter((item) => item.active || item.key === values.event_type || item.id === values.event_type).map((item) => <option key={item.id} value={item.key}>{item.name}{item.active ? "" : " (inactive)"}</option>)}</select><FieldError error={errors.event_type} />{eventTypesError ? <p className="mt-1 text-xs font-medium text-[#b42318]">Unable to load Event Types. Retry and try again.</p> : null}</label>
    {values.event_type && values.modules ? <EventModulesControls modules={values.modules} eventType={eventTypes.find((item) => item.key === values.event_type || item.id === values.event_type)} hasConfiguredTickets={values.ticket_types.length > 0} onChange={(next) => update("modules", next)} /> : null}
    <div className="grid gap-4 md:grid-cols-2"><TextField label="Category" field="category" values={values} update={update} errors={errors} placeholder="Choose or enter an event category" /><TextField label="Subcategory" field="subcategory" values={values} update={update} errors={errors} placeholder="Choose or enter an event subcategory" /></div>
    <label className={labelClass}>Tags<input onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addTag(event.currentTarget.value); event.currentTarget.value = ""; } }} placeholder="Type a tag and press Enter" aria-describedby="event-tags-help" className={inputClass} /><span id="event-tags-help" className="mt-1 block text-xs font-normal text-[#52736a]">Add one tag at a time; press Enter after each tag. Select a tag to remove it.</span></label>
    <div className="flex flex-wrap gap-2">{values.tags.map((tag) => <button key={tag} type="button" onClick={() => update("tags", values.tags.filter((item) => item !== tag))} className="rounded-full bg-[#e8f6ee] px-3 py-1 text-xs font-bold text-[#1f6a58]">{tag} ×</button>)}</div>
    <div className="grid gap-4 md:grid-cols-2"><label className={labelClass}>Organizer / Business<input id="event-field-organiser_name" value={values.organiser_name} readOnly className={`${inputClass} cursor-not-allowed bg-[#f1f4f3]`} /><FieldError error={errors.organiser_name} /></label><TextField label="Organizer contact" field="organiser_contact" values={values} update={update} errors={errors} /></div>
  </section>;
}

/** Renders the Event date, time, and registration-window controls. */
export function ScheduleSection({ values, update, errors }: SectionProps) {
  return <section className="space-y-5"><SectionHeading title="Schedule" description="All times are interpreted in the selected time zone." />
    <div className="grid gap-4 md:grid-cols-2"><DateField label="Start date and time" field="start_date" values={values} update={update} errors={errors} /><DateField label="End date and time" field="end_date" values={values} update={update} errors={errors} /></div>
    <label className={labelClass}>Time zone<select value={values.time_zone} onChange={(event) => update("time_zone", event.target.value)} className={inputClass}><option value={values.time_zone}>{values.time_zone}</option>{values.time_zone !== "Asia/Kolkata" ? <option value="Asia/Kolkata">Asia/Kolkata</option> : null}</select></label>
    <div className="grid gap-4 md:grid-cols-2"><DateField label="Registration opens" field="registration_open_at" values={values} update={update} errors={errors} /><DateField label="Registration closes" field="registration_close_at" values={values} update={update} errors={errors} /></div>
    <DateField label="Registration cutoff" field="registration_cutoff" values={values} update={update} errors={errors} />
  </section>;
}

type LocationSectionProps = SectionProps & { locations: EnterpriseLocationDto[]; selectedLocationId: string; setSelectedLocationId: (value: string) => void; isLoadingLocations: boolean; locationError: string | null };

/** Renders the real enterprise-location selector and in-person venue details. */
export function LocationAndHostSection({ values, update, errors, locations, selectedLocationId, setSelectedLocationId, isLoadingLocations, locationError }: LocationSectionProps) {
  return <section className="space-y-5"><SectionHeading title="Location & Host" description="Choose an existing enterprise location and describe the venue." />
    <label className={labelClass}>Delivery mode<select value={values.delivery_mode} className={inputClass} disabled><option value={values.delivery_mode}>{values.delivery_mode === "in_person" ? "In person" : values.delivery_mode}</option></select></label>
    <label className={labelClass}>Enterprise location<select id="event-field-location_id" value={selectedLocationId} onChange={(event) => setSelectedLocationId(event.target.value)} className={inputClass} disabled={isLoadingLocations || Boolean(locationError)}><option value="">{isLoadingLocations ? "Loading locations..." : "Select a location"}</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.location_name} — {location.city}</option>)}</select><FieldError error={errors.location_id} />{locationError ? <p className="mt-1 text-xs font-medium text-[#b42318]">{locationError}</p> : null}</label>
    <div className="grid gap-4 md:grid-cols-2"><TextField label="Venue name" field="venue_name" values={values} update={update} errors={errors} placeholder="e.g. Main Hall" /><TextField label="City" field="venue_city" values={values} update={update} errors={errors} placeholder="e.g. Chennai" /></div>
    <TextField label="Venue address" field="venue_address" values={values} update={update} errors={errors} placeholder="e.g. 123 Park Street" />
    <div className="grid gap-4 md:grid-cols-2"><TextField label="Latitude (optional)" field="venue_latitude" values={values} update={update} errors={errors} type="number" /><TextField label="Longitude (optional)" field="venue_longitude" values={values} update={update} errors={errors} type="number" /></div>
    <div className="grid gap-4 md:grid-cols-2"><TextField label="Meeting provider (optional)" field="meeting_provider" values={values} update={update} errors={errors} /><TextField label="Meeting link (optional)" field="meeting_link" values={values} update={update} errors={errors} type="url" /></div>
  </section>;
}

function SectionHeading({ title, description }: { title: string; description: string }) { return <div><h2 className="text-xl font-bold text-[#06201c]">{title}</h2><p className="mt-1 text-sm text-[#52736a]">{description}</p></div>; }
function TextField<Key extends keyof CreateEventFormValues>({ label, field, values, update, errors, type = "text", placeholder }: { label: string; field: Key; values: CreateEventFormValues; update: UpdateForm; errors: Record<string, string[]>; type?: string; placeholder?: string }) { const error = errors[field]?.[0]; const id = `event-field-${String(field)}`; return <label className={labelClass}>{label}<input id={id} type={type} value={String(values[field])} placeholder={placeholder} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} onChange={(event) => update(field, event.target.value as CreateEventFormValues[Key])} className={inputClass} /><FieldError error={errors[field]} id={`${id}-error`} /></label>; }
function DateField<Key extends "start_date" | "end_date" | "registration_cutoff" | "registration_open_at" | "registration_close_at">({ label, field, values, update, errors }: { label: string; field: Key; values: CreateEventFormValues; update: UpdateForm; errors: Record<string, string[]> }) { const error = errors[field]?.[0]; const id = `event-field-${field}`; return <div><label htmlFor={id} className={labelClass}>{label}</label><div className="flex items-center gap-2"><input id={id} type="datetime-local" value={values[field]} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} onChange={(event) => update(field, event.target.value)} className={`${inputClass} min-w-0 flex-1`} /><button type="button" onClick={() => update(field, "")} disabled={!values[field]} className="mt-1.5 shrink-0 rounded-full border border-[#d7e5df] px-3 py-2 text-xs font-semibold text-[#52736a] hover:bg-[#f4faf7] disabled:cursor-not-allowed disabled:opacity-50">Clear</button></div><FieldError error={errors[field]} id={`${id}-error`} /></div>; }
