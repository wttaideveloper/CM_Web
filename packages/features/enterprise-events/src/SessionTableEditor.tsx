"use client";

import { useMemo, useState, type ReactNode } from "react";

import type { EventSessionRecord } from "./events.service";
import { getEventSessionDates, getSessionTimeBounds, parseEventLocalDateTime } from "./event-session-date";

export interface SessionDraft {
  id?: string;
  session_date: string;
  title: string;
  speaker: string;
  start_time: string;
  end_time: string;
  location: string;
  meeting_link?: string | null;
}

type SessionField = "session_date" | "title" | "speaker" | "start_time" | "end_time" | "location" | "meeting_link";

interface Props {
  mode: "create" | "manage";
  eventStart: string;
  eventEnd: string;
  sessions: readonly SessionDraft[];
  persistedSessions?: readonly EventSessionRecord[];
  enabledFields?: readonly string[];
  requiredFields?: readonly string[];
  label?: string;
  error?: string;
  onSessionsChange: (sessions: SessionDraft[]) => void;
  onAddSession?: () => void;
  onEditPersisted?: (session: EventSessionRecord & { id: string }) => void;
  onDeletePersisted?: (session: EventSessionRecord & { id: string }) => void;
  renderPersistedActions?: (session: EventSessionRecord & { id: string }) => ReactNode;
  onSaveNewSessions?: (sessions: SessionDraft[]) => Promise<void>;
}

type GeneratorRule = { id: number; duration: number; count: number; custom: boolean };
type Range = { start: number; end: number };

const fields: Array<{ key: SessionField; label: string }> = [
  { key: "title", label: "Session Name" },
  { key: "session_date", label: "Date" },
  { key: "start_time", label: "Start" },
  { key: "end_time", label: "End" },
  { key: "speaker", label: "Speaker" },
  { key: "location", label: "Location" },
  { key: "meeting_link", label: "Meeting Link" },
];
const presets = [15, 30, 45, 60, 90, 120];

export default function SessionTableEditor({
  mode,
  eventStart,
  eventEnd,
  sessions,
  persistedSessions = [],
  enabledFields,
  requiredFields = [],
  label = "Sessions / Agenda",
  error,
  onSessionsChange,
  onAddSession,
  onEditPersisted,
  onDeletePersisted,
  renderPersistedActions,
  onSaveNewSessions,
}: Props) {
  const [rules, setRules] = useState<GeneratorRule[]>([{ id: 1, duration: 60, count: 1, custom: false }]);
  const [nextRuleId, setNextRuleId] = useState(2);
  const [generatorError, setGeneratorError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const enabled = (field: SessionField) => enabledFields === undefined || enabledFields.length === 0 || enabledFields.includes(field);
  const required = (field: SessionField) => requiredFields.includes(field);
  const availableFields = fields.filter((field) => enabled(field.key));
  const event = useMemo(() => buildEventWindow(eventStart, eventEnd), [eventEnd, eventStart]);
  const persistedOccupied = useMemo(() => event ? normalizeOccupied(persistedSessions, event) : [], [event, persistedSessions]);
  const combinedOccupied = useMemo(() => event ? normalizeOccupied([...persistedSessions, ...sessions], event) : [], [event, persistedSessions, sessions]);
  const persistedGaps = useMemo(() => findFreeGaps(event?.windows ?? [], persistedOccupied), [event, persistedOccupied]);
  const generationGaps = useMemo(() => findFreeGaps(event?.windows ?? [], combinedOccupied), [event, combinedOccupied]);
  const requestedMinutes = useMemo(() => durationOfSessions(sessions), [sessions]);
  const scheduledMinutes = persistedOccupied.reduce((total, range) => total + range.end - range.start, 0);
  const availableMinutes = persistedGaps.reduce((total, range) => total + range.end - range.start, 0);
  const remainingMinutes = generationGaps.reduce((total, range) => total + range.end - range.start, 0);
  const rows = useMemo(() => [
    ...persistedSessions.map((session) => ({ session: toDraft(session), persisted: true, source: session })),
    ...sessions.map((session) => ({ session, persisted: false, source: undefined })),
  ].sort((left, right) => compareSessions(left.session, right.session)), [persistedSessions, sessions]);

  const addLocalSession = () => {
    const date = event?.dates[0] ?? "";
    onSessionsChange([...sessions, blankSession(date)]);
  };
  const updateLocal = (index: number, field: SessionField, value: string) => {
    onSessionsChange(sessions.map((session, current) => current === index ? { ...session, [field]: value } : session));
  };
  const generate = () => {
    setGeneratorError(null);
    if (!event) {
      setGeneratorError("Enter a valid Event start and end time before generating sessions.");
      return;
    }
    const requestedGenerationMinutes = rules.reduce((total, rule) => total + rule.duration * rule.count, 0);
    const generationAvailableMinutes = generationGaps.reduce((total, range) => total + range.end - range.start, 0);
    if (requestedGenerationMinutes > generationAvailableMinutes) {
      setGeneratorError("Requested sessions exceed available Event time.");
      return;
    }
    const generated = generateSlots(rules, generationGaps);
    if (!generated) {
      const largest = Math.max(...rules.map((rule) => rule.duration));
      setGeneratorError(`No continuous ${largest}-minute slot is available.`);
      return;
    }
    onSessionsChange([...sessions, ...generated]);
  };
  const saveGenerated = async () => {
    if (!onSaveNewSessions) return;
    setSaveError(null);
    const validation = validateSessions(sessions, eventStart, eventEnd, enabledFields, requiredFields, persistedSessions);
    if (validation) {
      setSaveError(validation);
      return;
    }
    setIsSaving(true);
    try {
      await onSaveNewSessions([...sessions]);
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : "Some sessions could not be saved. Please retry the remaining rows.");
    } finally {
      setIsSaving(false);
    }
  };

  return <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-lg font-bold text-[#06201c]">{label}</h2>
      <button type="button" onClick={mode === "create" ? addLocalSession : onAddSession} className="inline-flex h-10 items-center justify-center rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white shadow-sm">+ Add Session</button>
    </div>
    <div className="mt-4 grid gap-3 rounded-xl bg-[#f4faf7] p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
      <Summary label="Event start" value={event ? formatClock(event.start) : "Unavailable"} />
      <Summary label="Event end" value={event ? formatClock(event.end) : "Unavailable"} />
      <Summary label="Event duration" value={event ? formatMinutes(event.end - event.start) : "Unavailable"} />
      <Summary label={mode === "manage" ? "Already scheduled" : "Already added / planned"} value={formatMinutes(mode === "manage" ? scheduledMinutes : durationOfSessions(sessions))} />
      <Summary label="Available time" value={formatMinutes(availableMinutes)} />
      <Summary label="Requested" value={formatMinutes(requestedMinutes)} />
      <Summary label="Remaining after generation" value={formatMinutes(remainingMinutes)} />
    </div>
    {!event ? <p className="mt-3 text-sm font-semibold text-[#b42318]">Valid Event start and end times are required. Session generation is disabled.</p> : null}
    <div className="mt-5 rounded-xl border border-[#edf3f0] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="font-bold text-[#06201c]">Generate sessions</h3><p className="mt-1 text-xs text-[#52736a]">Slots are placed in the earliest available continuous gaps.</p></div>
        <button type="button" onClick={generate} disabled={!event || rules.reduce((total, rule) => total + rule.duration * rule.count, 0) <= 0} className="rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Generate Sessions</button>
      </div>
      <div className="mt-3 space-y-2">
        {rules.map((rule, index) => <div key={rule.id} className="flex flex-wrap items-center gap-2 text-sm">
          <select value={rule.custom ? "custom" : rule.duration} onChange={(event) => updateRule(rule.id, event.target.value)} className="h-9 rounded-lg border border-[#d7e5df] px-2">
            {presets.map((preset) => <option key={preset} value={preset}>{preset} min</option>)}<option value="custom">Custom duration</option>
          </select>
          {rule.custom ? <label className="flex items-center gap-2">Custom <input type="number" min="1" value={rule.duration} onChange={(event) => updateRuleDuration(rule.id, event.target.value)} className="h-9 w-24 rounded-lg border border-[#d7e5df] px-2" /></label> : null}
          <span>×</span><button type="button" aria-label={`Decrease duration group ${index + 1} count`} onClick={() => updateRuleCount(rule.id, rule.count - 1)} className="h-8 w-8 rounded-full border border-[#d7e5df] font-bold">−</button><span className="min-w-5 text-center font-bold">{rule.count}</span><button type="button" aria-label={`Increase duration group ${index + 1} count`} onClick={() => updateRuleCount(rule.id, rule.count + 1)} className="h-8 w-8 rounded-full border border-[#d7e5df] font-bold">+</button>
          {rules.length > 1 ? <button type="button" onClick={() => setRules(rules.filter((item) => item.id !== rule.id))} className="ml-2 text-xs font-semibold text-[#b42318]">Remove</button> : null}
        </div>)}
      </div>
      <button type="button" onClick={() => { setRules([...rules, { id: nextRuleId, duration: 60, count: 1, custom: false }]); setNextRuleId(nextRuleId + 1); }} className="mt-3 text-sm font-semibold text-[#1f6a58]">+ Add duration group</button>
      {generatorError ? <p role="alert" className="mt-3 text-sm font-semibold text-[#b42318]">{generatorError}</p> : null}
    </div>
    <div className="mt-5 overflow-x-auto rounded-xl border border-[#d7e5df]">
      <table className="w-full min-w-[980px] border-collapse text-left text-sm"><thead className="bg-[#f4faf7] text-xs uppercase tracking-wide text-[#52736a]"><tr>{availableFields.map((field) => <th key={field.key} className="whitespace-nowrap px-3 py-3">{field.label}{required(field.key) ? " *" : ""}</th>)}<th className="whitespace-nowrap px-3 py-3">Status</th><th className="whitespace-nowrap px-3 py-3">Actions</th></tr></thead><tbody>
        {rows.map(({ session, persisted, source }, rowIndex) => {
          const localIndex = sessions.findIndex((item) => item === session);
          return <tr key={session.id ?? `new-${rowIndex}`} className="border-t border-[#edf3f0] align-top">{availableFields.map((field) => <td key={field.key} className="px-3 py-3">{persisted ? renderPersistedValue(session, field.key) : <SessionCell field={field.key} session={session} eventStart={eventStart} eventEnd={eventEnd} required={required(field.key)} onChange={(value) => updateLocal(localIndex, field.key, value)} />}</td>)}<td className="px-3 py-3">{persisted ? <span className="text-xs font-semibold text-[#52736a]">Persisted</span> : <span className="rounded-full bg-[#fff4d6] px-2 py-1 text-xs font-bold text-[#735c1e]">New</span>}</td><td className="px-3 py-3">{persisted && source && "id" in source && source.id ? <div className="flex flex-wrap gap-2 text-xs font-semibold"><button type="button" onClick={() => onEditPersisted?.(source as EventSessionRecord & { id: string })} className="text-[#1f6a58] underline">Edit</button><button type="button" onClick={() => onDeletePersisted?.(source as EventSessionRecord & { id: string })} className="text-[#b42318] underline">Delete</button>{renderPersistedActions?.(source as EventSessionRecord & { id: string })}</div> : !persisted ? <button type="button" onClick={() => onSessionsChange(sessions.filter((_, index) => index !== localIndex))} className="text-xs font-semibold text-[#b42318] underline">Remove</button> : null}</td></tr>;
        })}
        {rows.length === 0 ? <tr><td colSpan={availableFields.length + 2} className="px-3 py-8 text-center text-sm font-semibold text-[#52736a]">No sessions added.</td></tr> : null}
      </tbody></table>
    </div>
    {error ? <p role="alert" className="mt-3 text-sm font-semibold text-[#b42318]">{error}</p> : null}
    {saveError ? <p role="alert" className="mt-3 text-sm font-semibold text-[#b42318]">{saveError}</p> : null}
    {mode === "manage" && sessions.length > 0 ? <button type="button" onClick={() => void saveGenerated()} disabled={isSaving} className="mt-4 rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{isSaving ? "Saving New Sessions..." : "Save New Sessions"}</button> : null}
  </section>;

  function updateRule(id: number, value: string) {
    const custom = value === "custom";
    const duration = custom ? rules.find((rule) => rule.id === id)?.duration ?? 60 : Number(value);
    setRules(rules.map((rule) => rule.id === id ? { ...rule, custom, duration: Number.isFinite(duration) && duration > 0 ? duration : 1 } : rule));
  }
  function updateRuleDuration(id: number, value: string) {
    const duration = Number(value);
    setRules(rules.map((rule) => rule.id === id ? { ...rule, duration: Number.isFinite(duration) && duration > 0 ? Math.floor(duration) : 1 } : rule));
  }
  function updateRuleCount(id: number, count: number) {
    setRules(rules.map((rule) => rule.id === id ? { ...rule, count: Math.max(1, Math.min(99, count)) } : rule));
  }
}

function Summary({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-semibold uppercase tracking-wide text-[#7f9d94]">{label}</p><p className="mt-1 font-bold text-[#06201c]">{value}</p></div>; }

function SessionCell({ field, session, eventStart, eventEnd, required, onChange }: { field: SessionField; session: SessionDraft; eventStart: string; eventEnd: string; required: boolean; onChange: (value: string) => void }) {
  const value = session[field] ?? "";
  if (field === "session_date") {
    return <input type="date" value={value} required={required} min={getEventSessionDates(eventStart, eventEnd)[0]} max={getEventSessionDates(eventStart, eventEnd).at(-1)} onChange={(event) => onChange(event.target.value)} className="h-9 w-36 rounded-lg border border-[#d7e5df] px-2" />;
  }
  const type = field === "start_time" || field === "end_time" ? "time" : field === "meeting_link" ? "url" : "text";
  const bounds = getSessionTimeBounds(session.session_date, eventStart, eventEnd);
  return <input type={type} value={value} required={required} min={type === "time" ? bounds.min : undefined} max={type === "time" ? bounds.max : undefined} onChange={(event) => onChange(event.target.value)} placeholder={field === "meeting_link" ? "https://" : undefined} className="h-9 min-w-28 rounded-lg border border-[#d7e5df] px-2" />;
}

function renderPersistedValue(session: SessionDraft, field: SessionField) {
  const value = session[field] ?? "";
  if (!value) return <span className="text-[#7f9d94]">—</span>;
  if (field === "meeting_link") return <a href={String(value)} target="_blank" rel="noreferrer" className="font-semibold text-[#1f6a58] underline">Open link</a>;
  return <span>{field === "session_date" ? formatDate(String(value)) : String(value)}</span>;
}

function blankSession(date: string): SessionDraft { return { session_date: date, title: "", speaker: "", start_time: "", end_time: "", location: "", meeting_link: "" }; }
function toDraft(session: EventSessionRecord): SessionDraft { return { ...(session.id ? { id: session.id } : {}), session_date: session.session_date ?? "", title: session.title, speaker: session.speaker ?? "", start_time: session.start_time ?? "", end_time: session.end_time ?? "", location: session.location ?? "", meeting_link: session.meeting_link ?? "" }; }
function compareSessions(left: SessionDraft, right: SessionDraft): number { return `${left.session_date}T${left.start_time || "99:99"}`.localeCompare(`${right.session_date}T${right.start_time || "99:99"}`); }
function formatDate(value: string): string { return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)); }
function formatMinutes(value: number): string { if (value < 60) return `${value}m`; const hours = Math.floor(value / 60); const minutes = value % 60; return minutes ? `${hours}h ${minutes}m` : `${hours}h`; }
function formatClock(value: number): string { return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(new Date(value * 60_000)); }

function buildEventWindow(startValue: string, endValue: string): { start: number; end: number; dates: string[]; windows: Range[] } | null {
  const start = parseEventLocalDateTime(startValue); const end = parseEventLocalDateTime(endValue);
  if (!start || !end) return null;
  const startMinute = wallMinute(start.date, start.time); const endMinute = wallMinute(end.date, end.time);
  if (endMinute <= startMinute) return null;
  const dates = getEventSessionDates(startValue, endValue); if (!dates.length) return null;
  const windows = dates.map((date) => ({ start: Math.max(startMinute, wallMinute(date, "00:00")), end: Math.min(endMinute, wallMinute(date, "24:00")) })).filter((range) => range.end > range.start);
  return { start: startMinute, end: endMinute, dates, windows };
}
function wallMinute(date: string, time: string): number { const [year, month, day] = date.split("-").map(Number); const [hour, minute] = time === "24:00" ? [24, 0] : time.split(":").map(Number); return Date.UTC(year, month - 1, day, hour, minute) / 60_000; }
function sessionRange(session: SessionDraft): Range | null { if (!session.session_date || !session.start_time || !session.end_time) return null; const start = wallMinute(session.session_date, session.start_time); const end = wallMinute(session.session_date, session.end_time); return end > start ? { start, end } : null; }
function normalizeOccupied(items: readonly (SessionDraft | EventSessionRecord)[], event: { start: number; end: number }): Range[] { return items.map((item) => sessionRange("title" in item ? toDraft(item as EventSessionRecord) : item)).filter((range): range is Range => Boolean(range && range.end > event.start && range.start < event.end)).map((range) => ({ start: Math.max(range.start, event.start), end: Math.min(range.end, event.end) })).sort((left, right) => left.start - right.start).reduce<Range[]>((merged, range) => { const previous = merged.at(-1); if (previous && range.start <= previous.end) previous.end = Math.max(previous.end, range.end); else merged.push({ ...range }); return merged; }, []); }
function findFreeGaps(windows: readonly Range[], occupied: readonly Range[]): Range[] { const gaps: Range[] = []; for (const window of windows) { let cursor = window.start; for (const range of occupied.filter((item) => item.end > window.start && item.start < window.end)) { if (range.start > cursor) gaps.push({ start: cursor, end: Math.min(range.start, window.end) }); cursor = Math.max(cursor, range.end); } if (cursor < window.end) gaps.push({ start: cursor, end: window.end }); } return gaps.filter((gap) => gap.end > gap.start); }
function generateSlots(rules: readonly GeneratorRule[], initialGaps: readonly Range[]): SessionDraft[] | null { const gaps = initialGaps.map((gap) => ({ ...gap })); const result: SessionDraft[] = []; for (const rule of rules) for (let count = 0; count < rule.count; count++) { const index = gaps.findIndex((gap) => gap.end - gap.start >= rule.duration); if (index < 0) return null; const gap = gaps[index]; const start = gap.start; const end = start + rule.duration; result.push({ ...blankSession(dateFromMinute(start)), start_time: timeFromMinute(start), end_time: timeFromMinute(end) }); if (end === gap.end) gaps.splice(index, 1); else gaps[index] = { start: end, end: gap.end }; } return result; }
function dateFromMinute(value: number): string { return new Date(value * 60_000).toISOString().slice(0, 10); }
function timeFromMinute(value: number): string { const date = new Date(value * 60_000); return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`; }

export function validateSessions(sessions: readonly SessionDraft[], eventStart: string, eventEnd: string, enabledFields?: readonly string[], requiredFields: readonly string[] = [], occupiedSessions: readonly EventSessionRecord[] = []): string | null {
  const event = buildEventWindow(eventStart, eventEnd); if (!event) return "Enter valid Event start and end times before saving sessions.";
  const enabled = (field: SessionField) => enabledFields === undefined || enabledFields.length === 0 || enabledFields.includes(field);
  const required = (field: SessionField) => requiredFields.includes(field);
  const dates = new Set(event.dates);
  for (const session of sessions) {
    if (enabled("session_date") && (!dates.has(session.session_date) || !session.session_date)) return "Each session must use a date within the Event schedule.";
    for (const field of fields.map((item) => item.key)) if (enabled(field) && required(field) && !String(session[field] ?? "").trim()) return `${fieldLabel(field)} is required for every session.`;
    const range = sessionRange(session); if (enabled("start_time") && enabled("end_time") && (!range || range.start < event.start || range.end > event.end)) return "Each session must have valid times within the Event schedule.";
    if (enabled("meeting_link") && session.meeting_link && !isUrl(session.meeting_link)) return "Meeting links must be valid URLs.";
  }
  return null;
}
function fieldLabel(field: SessionField): string { return fields.find((item) => item.key === field)?.label ?? field; }
function isUrl(value: string): boolean { try { new URL(value); return true; } catch { return false; } }
function durationOfSessions(sessions: readonly SessionDraft[]): number { return sessions.reduce((total, session) => { const range = sessionRange(session); return total + (range ? range.end - range.start : 0); }, 0); }
