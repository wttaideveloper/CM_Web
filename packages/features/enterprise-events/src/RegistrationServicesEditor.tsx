"use client";

import { useEffect, useState } from "react";
import { updateRegistrationAccommodationSelections, updateRegistrationMealSelections, type AccommodationOption, type EventRegistration, type MealOption } from "./events.service";

export default function RegistrationServicesEditor({ eventId, registration, meals, accommodation, onSaved }: { eventId: string; registration: EventRegistration; meals?: { options: readonly MealOption[] } | null; accommodation?: { options: readonly AccommodationOption[] } | null; onSaved: (next: Partial<EventRegistration>) => void }) {
  if (!(meals?.options?.length || accommodation?.options?.length)) return null;
  const [mealSelections, setMealSelections] = useState<string[]>([...(registration.meal_selections ?? [])]);
  const [accommodationSelections, setAccommodationSelections] = useState<string[]>([...(registration.accommodation_selections ?? [])]);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => { setMealSelections([...(registration.meal_selections ?? [])]); setAccommodationSelections([...(registration.accommodation_selections ?? [])]); }, [registration]);
  const toggle = (current: string[], id: string) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id];
  const save = async (kind: "meals" | "accommodation") => {
    try {
      const selections = kind === "meals" ? mealSelections : accommodationSelections;
      await (kind === "meals" ? updateRegistrationMealSelections(eventId, registration.id, selections) : updateRegistrationAccommodationSelections(eventId, registration.id, selections));
      onSaved(kind === "meals" ? { meal_selections: selections } : { accommodation_selections: selections });
      setMessage(`${kind === "meals" ? "Meal" : "Accommodation"} selections saved.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save selections."); }
  };
  const group = (title: string, options: readonly (MealOption | AccommodationOption)[], selected: string[], setSelected: (next: string[]) => void, kind: "meals" | "accommodation") => options.length ? <section className="mt-6 space-y-2"><h3 className="text-xs font-bold uppercase tracking-[.12em] text-[#52736a]">{title}</h3>{options.map((option) => { const checked = selected.includes(option.id); return <label key={option.id} className="flex items-start gap-2 rounded-xl bg-[#f9fcfa] px-3 py-2 text-sm"><input type="checkbox" checked={checked} disabled={!option.active && !checked} onChange={() => setSelected(toggle(selected, option.id))} /><span><span className="font-semibold">{option.name}</span>{!option.active ? <span className="ml-2 text-xs text-[#b42318]">Inactive, already selected</span> : null}{"date" in option && option.date ? <span className="block text-xs text-[#52736a]">{option.date}</span> : null}</span></label>; })}<button type="button" onClick={() => void save(kind)} className="mt-2 rounded-full bg-[#1f6a58] px-3 py-1 text-xs font-bold text-white">Save {title.toLowerCase()}</button></section> : null;
  return <div className="fixed inset-y-0 right-0 z-[60] w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl"><h2 className="text-xl font-bold text-[#06201c]">Attendee Services</h2>{group("Meals", meals?.options ?? [], mealSelections, setMealSelections, "meals")}{group("Accommodation", accommodation?.options ?? [], accommodationSelections, setAccommodationSelections, "accommodation")}{message ? <p role="status" className="mt-3 text-xs font-semibold text-[#31594d]">{message}</p> : null}</div>;
}
