"use client";

import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";

type DateTimeLocalInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
};

function isValidDateParts(year: string, month: string, day: string): boolean {
  const numericYear = Number(year);
  const numericMonth = Number(month);
  const numericDay = Number(day);
  const candidate = new Date(0);
  candidate.setUTCFullYear(numericYear, numericMonth - 1, numericDay);
  return year.length === 4 && numericYear >= 1 && numericMonth >= 1 && numericMonth <= 12
    && numericDay >= 1 && candidate.getUTCFullYear() === numericYear
    && candidate.getUTCMonth() === numericMonth - 1 && candidate.getUTCDate() === numericDay;
}

/** Keeps date and time editing independent while preserving the datetime-local value used by existing forms. */
export default function DateTimeLocalInput({ value, onChange, min, max, className, id, required, disabled, ...props }: DateTimeLocalInputProps) {
  const initialDate = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const [year, setYear] = useState(initialDate?.[1] ?? "");
  const [month, setMonth] = useState(initialDate?.[2] ?? "");
  const [day, setDay] = useState(initialDate?.[3] ?? "");
  const [timeValue, setTimeValue] = useState(() => value.match(/T(\d{2}:\d{2})/)?.[1] ?? "");
  const yearInput = useRef<HTMLInputElement>(null);
  const monthInput = useRef<HTMLInputElement>(null);
  const dayInput = useRef<HTMLInputElement>(null);
  const timeInput = useRef<HTMLInputElement>(null);
  const calendarInput = useRef<HTMLInputElement>(null);
  const lastEmittedValue = useRef(value);
  useEffect(() => {
    if (value === lastEmittedValue.current) return;
    const dateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    setYear(dateMatch?.[1] ?? "");
    setMonth(dateMatch?.[2] ?? "");
    setDay(dateMatch?.[3] ?? "");
    setTimeValue(value.match(/T(\d{2}:\d{2})/)?.[1] ?? "");
    lastEmittedValue.current = value;
  }, [value]);
  const dateValue = isValidDateParts(year, month, day) ? `${year}-${month}-${day}` : "";
  const minDate = min?.slice(0, 10);
  const maxDate = max?.slice(0, 10);
  const fieldLabel = typeof props["aria-label"] === "string" ? props["aria-label"] : id ?? "Date and time";
  const emit = (date: string, time: string) => {
    const nextValue = date && time ? `${date}T${time}` : "";
    lastEmittedValue.current = nextValue;
    onChange(nextValue);
  };
  const updateDate = (nextYear: string, nextMonth: string, nextDay: string, nextTime = timeValue) => {
    setYear(nextYear);
    setMonth(nextMonth);
    setDay(nextDay);
    emit(isValidDateParts(nextYear, nextMonth, nextDay) ? `${nextYear}-${nextMonth}-${nextDay}` : "", nextTime);
  };
  const updateDatePart = (part: "day" | "month" | "year", rawValue: string) => {
    const next = rawValue.replace(/\D/g, "").slice(0, part === "year" ? 4 : 2);
    const nextDay = part === "day" ? next : day;
    const nextMonth = part === "month" ? next : month;
    const nextYear = part === "year" ? next : year;
    updateDate(nextYear, nextMonth, nextDay);
    if (part === "month" && next.length === 2) dayInput.current?.focus();
    if (part === "day" && next.length === 2) yearInput.current?.focus();
  };
  const inputClassName = className ?? "mt-1 h-10 w-full min-w-0 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm font-normal text-[#06201c] outline-none focus:border-[#1f6a58]";
  const segmentClassName = "h-full min-w-0 bg-transparent px-0.5 text-center text-sm font-normal text-[#06201c] outline-none placeholder:text-[#7f9d94]";

  return (
    <div className={`${inputClassName} relative flex min-w-0 items-center gap-1 !px-3`} role="group" aria-label={`${fieldLabel} date and time`}>
      <div className="flex min-w-0 shrink-0 items-center gap-0.5" role="group" aria-label={`${fieldLabel} date`}>
        <input {...props} ref={monthInput} id={id ? `${id}-month` : undefined} type="text" inputMode="numeric" autoComplete="off" maxLength={2} value={month} placeholder="MM" required={required} disabled={disabled} aria-label={`${fieldLabel} month`} className={`${segmentClassName} w-9`} onChange={(event) => updateDatePart("month", event.target.value)} />
        <span aria-hidden="true">-</span>
        <input {...props} ref={dayInput} id={id ? `${id}-day` : undefined} type="text" inputMode="numeric" autoComplete="off" maxLength={2} value={day} placeholder="DD" required={required} disabled={disabled} aria-label={`${fieldLabel} day`} className={`${segmentClassName} w-9`} onChange={(event) => updateDatePart("day", event.target.value)} />
        <span aria-hidden="true">-</span>
        <input {...props} ref={yearInput} id={id ? `${id}-year` : undefined} type="text" inputMode="numeric" autoComplete="off" maxLength={4} value={year} placeholder="YYYY" required={required} disabled={disabled} aria-label={`${fieldLabel} year (4 digits)`} className={`${segmentClassName} w-16`} onKeyDown={(event) => { const input = event.currentTarget; if (year.length === 4 && input.selectionStart === 4 && input.selectionEnd === 4 && /^\d$/.test(event.key)) { event.preventDefault(); const nextTime = `${event.key.padStart(2, "0")}:00`; setTimeValue(nextTime); emit(dateValue, nextTime); timeInput.current?.focus(); } }} onChange={(event) => updateDatePart("year", event.target.value)} />
        <input ref={calendarInput} type="date" value={dateValue} min={minDate} max={maxDate && maxDate < "9999-12-31" ? maxDate : "9999-12-31"} tabIndex={-1} aria-hidden="true" className="pointer-events-none absolute h-px w-px opacity-0" onChange={(event) => { const match = event.target.value.match(/^(\d{4})-(\d{2})-(\d{2})$/); if (match) updateDate(match[1], match[2], match[3]); }} />
      </div>
      <input {...props} ref={timeInput} id={id ? `${id}-time` : undefined} type="time" value={timeValue} min={dateValue === minDate ? min?.slice(11, 16) : undefined} max={dateValue === maxDate ? max?.slice(11, 16) : undefined} required={required} disabled={disabled} aria-label={`${fieldLabel} time`} className="h-full min-w-0 flex-1 appearance-none border-0 bg-transparent px-1 text-sm font-normal text-[#06201c] outline-none focus:border-0 focus:ring-0 [&::-webkit-calendar-picker-indicator]:hidden" onChange={(event) => { setTimeValue(event.target.value); emit(dateValue, event.target.value); }} />
      <button type="button" disabled={disabled} aria-label={`Choose ${fieldLabel} date`} className="shrink-0 px-1 text-[#52736a] disabled:opacity-50" onClick={() => { const picker = calendarInput.current as (HTMLInputElement & { showPicker?: () => void }) | null; if (picker?.showPicker) picker.showPicker(); else picker?.click(); }}><svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4.5" width="14" height="12" rx="2" /><path d="M6.5 3v3M13.5 3v3M3 8h14" /></svg></button>
    </div>
  );
}
