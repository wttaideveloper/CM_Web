"use client";

import { useEffect, useRef, useState } from "react";
import { DateTimeLocalInput } from "@ihp/ui";
import { eventServiceOptionMaxLength } from "./event-field-limits";
import type { CreateEventFormValues } from "./create-event-form";

type Props = { values: CreateEventFormValues; update: <Key extends keyof CreateEventFormValues>(key: Key, value: CreateEventFormValues[Key]) => void; errors?: Record<string, string[]> };
export type EventServiceOption = { id?: string | null; name: string; description?: string | null; date?: string | null; active?: boolean; price?: string | null; currency?: string | null; capacity?: string | null; purchase_start_at?: string | null; purchase_end_at?: string | null; service_start_at?: string | null; service_end_at?: string | null };
type ServiceKind = "meals" | "accommodation";

function dateOnly(value: string): string { return value ? value.slice(0, 10) : ""; }
function formatMealDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[2]}/${match[3]}/${match[1]}` : "";
}
function parseMealDate(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const [, month, day, year] = match;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (parsed.getUTCFullYear() !== Number(year) || parsed.getUTCMonth() !== Number(month) - 1 || parsed.getUTCDate() !== Number(day)) return null;
  return `${year}-${month}-${day}`;
}
function MealDateField({ value, min, max, disabled, onChange }: { value: string; min?: string; max?: string; disabled: boolean; onChange: (value: string | null) => void }) {
  const [draft, setDraft] = useState(() => formatMealDate(value));
  const pickerRef = useRef<HTMLInputElement>(null);
  useEffect(() => setDraft(formatMealDate(value)), [value]);
  const updateDraft = (nextValue: string) => {
    const digits = nextValue.replace(/\D/g, "").slice(0, 8);
    const formatted = digits.length <= 2 ? digits : digits.length <= 4 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    setDraft(formatted);
    const parsed = parseMealDate(formatted);
    if (parsed) onChange(parsed);
    else if (!formatted) onChange(null);
  };
  return <div className="relative mt-1 flex h-10 items-center"><input type="text" inputMode="numeric" placeholder="MM/DD/YYYY" aria-label="Meal date (MM/DD/YYYY)" disabled={disabled} value={draft} onChange={(event) => updateDraft(event.target.value)} onBlur={() => { if (!draft || parseMealDate(draft)) return; setDraft(formatMealDate(value)); }} className="h-full w-full rounded-xl border border-[#d7e5df] px-3 pr-12 disabled:bg-[#f4faf7]" /><button type="button" aria-label="Open meal date calendar" disabled={disabled} onClick={() => { const picker = pickerRef.current as (HTMLInputElement & { showPicker?: () => void }) | null; if (!picker) return; if (typeof picker.showPicker === "function") picker.showPicker(); else picker.click(); }} className="absolute right-2 z-10 rounded-md px-2 py-1 text-sm text-[#52736a] hover:bg-[#f4faf7] disabled:opacity-50">▦</button><input ref={pickerRef} type="date" min={min} max={max} disabled={disabled} value={value} onChange={(event) => { onChange(event.target.value || null); setDraft(formatMealDate(event.target.value)); }} tabIndex={-1} aria-hidden="true" className="pointer-events-none absolute h-px w-px opacity-0" /></div>;
}
function scheduleText(start: string, end: string): string { return start && end ? `${start.replace("T", " ")} - ${end.replace("T", " ")}` : "Select the Event start and end time first."; }

type OptionEditorProps = { option: EventServiceOption; index: number; kind: ServiceKind; enabled: boolean; currencyOptions: readonly { value: string; label: string }[]; eventStart: string; eventEnd: string; onChange: (index: number, option: EventServiceOption) => void; onRemove: (index: number) => void; errors?: Record<string, string[]> };

export function EventServiceOptionEditor({ option, index, kind, enabled, currencyOptions, eventStart, eventEnd, onChange, onRemove, errors = {} }: OptionEditorProps) {
  const update = (patch: Partial<EventServiceOption>) => onChange(index, { ...option, ...patch });
  const errorFor = (field: string): string | undefined => errors[`${kind}.${index}.${field}`]?.[0];
  const nameError = errorFor("name");
  const descriptionError = errorFor("description");
  const nameLimit = eventServiceOptionMaxLength(kind, "name");
  const descriptionLimit = eventServiceOptionMaxLength(kind, "description");
  const serviceBounds = { min: eventStart || undefined, max: eventEnd || undefined };
  const field = (label: string, key: keyof EventServiceOption, type = "text", bounds?: { min?: string; max?: string }) => <label className="block min-w-0 text-sm font-semibold">{label}{type === "datetime-local" ? <DateTimeLocalInput id={`event-service-${kind}-${option.id ?? index}-${key}`} persistDraft min={bounds?.min} max={bounds?.max} disabled={!enabled} value={String(option[key] ?? "")} onChange={(value) => update({ [key]: value || null })} className="mt-1 h-10 w-full min-w-0 rounded-xl border border-[#d7e5df] px-3 disabled:bg-[#f4faf7]" /> : <input type={type} min={bounds?.min} max={bounds?.max} disabled={!enabled} value={String(option[key] ?? "")} onChange={(event) => update({ [key]: event.target.value || null })} className="mt-1 h-10 w-full min-w-0 rounded-xl border border-[#d7e5df] px-3 disabled:bg-[#f4faf7]" />}</label>;
  return <div className="grid min-w-0 gap-3 overflow-hidden rounded-xl border border-[#edf3f0] p-3 md:grid-cols-2">
    <label className="block min-w-0 text-sm font-semibold">Name<input id={`event-field-${kind}-${index}-name`} required disabled={!enabled} maxLength={nameLimit} value={option.name} aria-invalid={Boolean(nameError) || undefined} aria-describedby={nameError ? `${kind}-${index}-name-error` : undefined} onChange={(event) => update({ name: event.target.value })} className="mt-1 h-10 w-full min-w-0 rounded-xl border border-[#d7e5df] px-3 disabled:bg-[#f4faf7]" /><span className="mt-1 block text-xs font-normal text-[#52736a]">{option.name.length}/{nameLimit} characters</span>{nameError ? <span id={`${kind}-${index}-name-error`} role="alert" className="mt-1 block text-xs font-normal text-[#b42318]">{nameError}</span> : null}</label>
    <label className="block min-w-0 text-sm font-semibold">Description<input id={`event-field-${kind}-${index}-description`} disabled={!enabled} maxLength={descriptionLimit} value={option.description ?? ""} aria-invalid={Boolean(descriptionError) || undefined} aria-describedby={descriptionError ? `${kind}-${index}-description-error` : undefined} onChange={(event) => update({ description: event.target.value })} className="mt-1 h-10 w-full min-w-0 rounded-xl border border-[#d7e5df] px-3 disabled:bg-[#f4faf7]" /><span className="mt-1 block text-xs font-normal text-[#52736a]">{(option.description ?? "").length}/{descriptionLimit} characters</span>{descriptionError ? <span id={`${kind}-${index}-description-error`} role="alert" className="mt-1 block text-xs font-normal text-[#b42318]">{descriptionError}</span> : null}</label>
    {kind === "meals" ? <label className="block min-w-0 text-sm font-semibold">Date<MealDateField value={option.date ?? ""} min={dateOnly(eventStart) || undefined} max={dateOnly(eventEnd) || undefined} disabled={!enabled} onChange={(date) => update({ date })} /></label> : null}
    {field("Price", "price", "number")}
    {currencyOptions.length ? <label className="block min-w-0 text-sm font-semibold">Currency<select disabled={!enabled} value={option.currency ?? ""} onChange={(event) => update({ currency: event.target.value })} className="mt-1 h-10 w-full min-w-0 rounded-xl border border-[#d7e5df] px-3 disabled:bg-[#f4faf7]"><option value="">Select currency</option>{currencyOptions.map((currency) => <option key={currency.value} value={currency.value}>{currency.label}</option>)}</select></label> : field("Currency", "currency")}
    {field("Capacity", "capacity", "number")}{field("Available to buy from", "purchase_start_at", "datetime-local")}{field("Available to buy until", "purchase_end_at", "datetime-local")}{field("Service starts", "service_start_at", "datetime-local", serviceBounds)}{field("Service ends", "service_end_at", "datetime-local", { min: option.service_start_at || eventStart || undefined, max: eventEnd || undefined })}
    {kind === "accommodation" ? <div className="flex min-w-0 flex-wrap items-center gap-2 md:col-span-2"><button type="button" disabled={!enabled || !eventStart || !eventEnd} onClick={() => update({ service_start_at: eventStart || null, service_end_at: eventEnd || null })} className="h-9 self-start rounded-full border border-[#1f6a58] px-3 text-xs font-bold text-[#1f6a58] disabled:opacity-50">Use event schedule</button></div> : null}
    <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" disabled={!enabled} checked={option.active !== false} onChange={(event) => update({ active: event.target.checked })} /> Active</label>
    <button type="button" disabled={!enabled} onClick={() => onRemove(index)} className="justify-self-start rounded-full px-2 py-1 text-sm font-bold text-[#b42318] hover:bg-[#fff1f0] hover:underline focus:bg-[#fff1f0] focus:underline focus:outline-none focus:ring-2 focus:ring-[#b42318] focus:ring-offset-2 disabled:opacity-50">Remove</button>
  </div>;
}

export function EventServiceOptionsEditor({ kind, title, options, enabled, currencyOptions = [], eventStart, eventEnd, onAdd, onChange, onRemove, error, errors = {} }: { kind: ServiceKind; title: string; options: readonly EventServiceOption[]; enabled: boolean; currencyOptions?: readonly { value: string; label: string }[]; eventStart: string; eventEnd: string; onAdd: () => void; onChange: (index: number, option: EventServiceOption) => void; onRemove: (index: number) => void; error?: string; errors?: Record<string, string[]> }) {
  if (!enabled && options.length === 0) return null;
  return <section data-event-field={kind} tabIndex={-1} className={`mt-6 min-w-0 overflow-hidden rounded-2xl border border-[#d7e5df] bg-white p-5 ${error ? "ring-2 ring-inset ring-[#f3d0cb]" : ""}`}><div className="flex min-w-0 items-center justify-between gap-3"><div className="min-w-0"><h2 className="text-lg font-bold text-[#06201c]">{title}</h2>{!enabled ? <p className="mt-1 text-xs font-semibold text-[#52736a]">{title} is disabled for this Event Type. Existing values are preserved.</p> : null}</div><button type="button" disabled={!enabled} onClick={onAdd} className="shrink-0 rounded-full border border-[#1f6a58] px-3 py-1 text-sm font-bold text-[#1f6a58] disabled:opacity-50">Add option</button></div><p className="mt-2 break-words rounded-lg bg-[#f4faf7] px-3 py-2 text-xs text-[#52736a]"><strong>Event schedule:</strong> {scheduleText(eventStart, eventEnd)}</p>{error ? <p role="alert" className="mt-2 text-xs font-semibold text-[#b42318]">{error}</p> : null}<div className="mt-4 min-w-0 space-y-3">{options.map((option, index) => <EventServiceOptionEditor key={option.id ?? index} option={option} index={index} kind={kind} enabled={enabled} currencyOptions={currencyOptions} eventStart={eventStart} eventEnd={eventEnd} errors={errors} onChange={onChange} onRemove={onRemove} />)}</div></section>;
}

export default function EventServicesEditor({ values, update, currencyOptions = [], errors }: Props & { currencyOptions?: readonly { value: string; label: string }[] }) {
  const meals = values.meals ?? { options: [] };
  const accommodation = values.accommodation ?? { options: [] };
  const updateOptions = (key: ServiceKind, options: EventServiceOption[]) => update(key, (key === "meals" ? { ...meals, options } : { ...accommodation, options }) as CreateEventFormValues[typeof key]);
  const section = (key: ServiceKind, title: string, options: readonly EventServiceOption[]) => values.modules?.[key] === true ? <EventServiceOptionsEditor kind={key} title={title} options={options} enabled currencyOptions={currencyOptions} eventStart={values.start_date} eventEnd={values.end_date} errors={errors} error={errors?.[key]?.[0]} onAdd={() => updateOptions(key, [...options, { name: "", description: "", ...(key === "meals" ? { date: "" } : {}) }])} onChange={(index, option) => updateOptions(key, options.map((item, itemIndex) => itemIndex === index ? option : item))} onRemove={(index) => updateOptions(key, options.filter((_, itemIndex) => itemIndex !== index))} /> : null;
  return <>{section("meals", "Meals", meals.options ?? [])}{section("accommodation", "Accommodation", accommodation.options ?? [])}</>;
}
