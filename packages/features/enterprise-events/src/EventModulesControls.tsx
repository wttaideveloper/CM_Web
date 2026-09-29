"use client";

import type { EventModules, EventTypeDefinition } from "./events.service";

const MODULES: ReadonlyArray<[keyof EventModules, string]> = [["registration", "Registration"], ["tickets", "Tickets"], ["sessions", "Sessions"], ["check_in", "Check-in"], ["online_meeting", "Online Meeting"], ["custom_questions", "Custom Questions"], ["meals", "Meals"], ["accommodation", "Accommodation"]];

export default function EventModulesControls({ modules, eventType, hasConfiguredTickets, onChange }: { modules: EventModules | null; eventType?: EventTypeDefinition; hasConfiguredTickets: boolean; onChange: (modules: EventModules) => void }) {
  if (!modules) return null;
  return <section className="mt-6 rounded-2xl border border-[#d7e5df] bg-white p-5"><h2 className="text-lg font-bold text-[#06201c]">Event Capabilities</h2><p className="mt-1 text-sm text-[#52736a]">Choose which operational capabilities are enabled for this Event.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{MODULES.map(([key, label]) => { const required = eventType?.required_modules[key] === true; const allowed = eventType?.allowed_modules[key] !== false; const blockedByTickets = key === "tickets" && modules[key] && hasConfiguredTickets; return <label key={key} className="flex items-center justify-between rounded-xl border border-[#edf3f0] px-4 py-3 text-sm font-semibold"><span>{label}{required ? " (required)" : ""}{blockedByTickets ? <small className="ml-2 block font-normal text-[#b42318]">Remove configured ticket types first.</small> : null}</span><input type="checkbox" checked={modules[key]} disabled={required || blockedByTickets || (!allowed && !modules[key])} onChange={(event) => onChange({ ...modules, [key]: event.target.checked })} className="h-4 w-4 accent-[#1f6a58]" /></label>; })}</div></section>;
}
