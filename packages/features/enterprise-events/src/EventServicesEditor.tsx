"use client";

import type { CreateEventFormValues } from "./create-event-form";

type Props = { values: CreateEventFormValues; update: <Key extends keyof CreateEventFormValues>(key: Key, value: CreateEventFormValues[Key]) => void };
type Option = { id?: string | null; name: string; description?: string | null; date?: string | null; active?: boolean };

export default function EventServicesEditor({ values, update }: Props) {
  const meals = values.meals ?? { options: [] };
  const accommodation = values.accommodation ?? { options: [] };
  const updateOptions = (key: "meals" | "accommodation", options: Option[]) => update(key, (key === "meals" ? { ...meals, options } : { ...accommodation, options }) as CreateEventFormValues[typeof key]);
  const section = (key: "meals" | "accommodation", title: string, options: readonly Option[]) => {
    const enabled = values.modules?.[key] !== false;
    if (!enabled && options.length === 0) return null;
    return <section className="mt-6 rounded-2xl border border-[#d7e5df] bg-white p-5"><div className="flex items-center justify-between"><div><h2 className="text-lg font-bold text-[#06201c]">{title}</h2>{!enabled ? <p className="mt-1 text-xs font-semibold text-[#52736a]">{title} is disabled for this Event Type. Existing values are preserved.</p> : null}</div><button type="button" disabled={!enabled} onClick={() => updateOptions(key, [...options, { name: "", description: "", ...(key === "meals" ? { date: "" } : {}) }])} className="rounded-full border border-[#1f6a58] px-3 py-1 text-sm font-bold text-[#1f6a58] disabled:opacity-50">Add option</button></div><div className="mt-4 space-y-3">{options.map((option, index) => <div key={option.id ?? index} className="grid gap-3 rounded-xl border border-[#edf3f0] p-3 md:grid-cols-2"><label className="text-sm font-semibold">Name<input required disabled={!enabled} value={option.name} onChange={(event) => updateOptions(key, options.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 disabled:bg-[#f4faf7]" /></label><label className="text-sm font-semibold">Description<input disabled={!enabled} value={option.description ?? ""} onChange={(event) => updateOptions(key, options.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item))} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 disabled:bg-[#f4faf7]" /></label>{key === "meals" ? <label className="text-sm font-semibold">Date<input type="date" disabled={!enabled} value={option.date ?? ""} onChange={(event) => updateOptions(key, options.map((item, itemIndex) => itemIndex === index ? { ...item, date: event.target.value } : item))} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] px-3 disabled:bg-[#f4faf7]" /></label> : null}<label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" disabled={!enabled} checked={option.active !== false} onChange={(event) => updateOptions(key, options.map((item, itemIndex) => itemIndex === index ? { ...item, active: event.target.checked } : item))} /> Active</label><button type="button" disabled={!enabled} onClick={() => updateOptions(key, options.filter((_, itemIndex) => itemIndex !== index))} className="justify-self-start text-sm font-bold text-[#b42318] disabled:opacity-50">Remove</button></div>)}</div></section>;
  };
  return <>{section("meals", "Meals", meals.options ?? [])}{section("accommodation", "Accommodation", accommodation.options ?? [])}</>;
}
