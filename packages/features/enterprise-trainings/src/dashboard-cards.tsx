"use client";

import type { TrainingParticipantDashboard, TrainingProviderDashboard } from "./trainings.service";

function humanize(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusChipClass(status: string, expired: boolean): string {
  if (expired) return "rounded-full bg-[#fff1f0] px-2 py-0.5 text-[10px] font-bold text-[#b42318]";
  const normalized = status.trim().toLowerCase();
  if (["approved", "enrolled", "attended", "active", "completed"].includes(normalized)) return "rounded-full bg-[#e8f6ee] px-2 py-0.5 text-[10px] font-bold text-[#1f6a58]";
  if (["pending", "waitlisted", "waitlist"].includes(normalized)) return "rounded-full bg-[#fff8e1] px-2 py-0.5 text-[10px] font-bold text-[#8a5a00]";
  if (["cancelled", "rejected", "no_show"].includes(normalized)) return "rounded-full bg-[#fff1f0] px-2 py-0.5 text-[10px] font-bold text-[#b42318]";
  return "rounded-full bg-[#f0f3f2] px-2 py-0.5 text-[10px] font-bold text-[#52736a]";
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-3">
      <p className="text-[10px] font-bold uppercase tracking-[.08em] text-[#7f9d94]">{label}</p>
      <p className="mt-1 text-lg font-bold text-[#06201c]">{value}</p>
    </div>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div>
      <div className="flex items-end justify-between">
        <p className="text-sm text-[#52736a]">Overall progress</p>
        <p className="text-lg font-bold text-[#06201c]">{clamped}%</p>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#e8f0ed]">
        <div className="h-full rounded-full bg-[#1f6a58]" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}

function rowLabel(item: unknown, fallback: string): { label: string; sub: string } {
  const record = item as Record<string, unknown>;
  if (!item || typeof item !== "object") return { label: fallback, sub: "" };
  const name = typeof record.participant_name === "string" ? record.participant_name : typeof record.name === "string" ? record.name : "";
  const title = typeof record.title === "string" ? record.title : "";
  const type = typeof record.type === "string" ? record.type : "";
  const email = typeof record.participant_email === "string" ? record.participant_email : typeof record.email === "string" ? record.email : "";
  const status = typeof record.status === "string" && record.status ? humanize(record.status) : "";
  const label = name || title || type || (typeof record.id === "string" ? record.id : "") || fallback;
  const sub = [email, status].filter(Boolean).join(" • ");
  return { label, sub };
}

/** Renders the participant dashboard for a training or program. */
export function ParticipantDashboardCard({ dashboard }: { dashboard: TrainingParticipantDashboard }) {
  const sessions = Array.isArray(dashboard.recent_live_sessions) ? dashboard.recent_live_sessions : [];
  return (
    <section className="space-y-5 rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Participant Dashboard</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className={statusChipClass(dashboard.enrolment_status, false)}>{humanize(dashboard.enrolment_status)}</span>
          {dashboard.expired ? <span className="rounded-full bg-[#fff1f0] px-2 py-0.5 text-[10px] font-bold text-[#b42318]">Expired</span> : null}
        </div>
      </div>
      <ProgressBar percent={dashboard.overall_percent} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Sections" value={`${dashboard.sections_done} / ${dashboard.total_sections}`} />
        <Stat label="Lessons" value={`${dashboard.lessons_done} / ${dashboard.total_lessons}`} />
        <Stat label="Live sessions" value={String(sessions.length)} />
        <Stat label="Certificate" value={dashboard.certificate_url ? "Ready" : "Pending"} />
      </div>
      {dashboard.certificate_url ? (
        <a href={dashboard.certificate_url} target="_blank" rel="noreferrer" className="inline-block text-sm font-semibold text-[#1f6a58] underline">View certificate →</a>
      ) : null}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.08em] text-[#7f9d94]">Recent live sessions</p>
        {sessions.length === 0 ? (
          <p className="mt-2 text-sm text-[#52736a]">No live sessions yet.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {sessions.map((item, index) => {
              const { label, sub } = rowLabel(item, `Session ${index + 1}`);
              return <li key={index} className="rounded-lg bg-[#f9fcfa] px-3 py-2"><p className="text-sm text-[#06201c]">{label}</p>{sub ? <p className="text-xs text-[#7f9d94]">{sub}</p> : null}</li>;
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

/** Renders the provider dashboard for a training or program. */
export function ProviderDashboardCard({ dashboard }: { dashboard: TrainingProviderDashboard }) {
  const entries = Object.entries(dashboard.by_status ?? {}).sort((a, b) => b[1] - a[1]);
  const enrolments = Array.isArray(dashboard.recent_enrolments) ? dashboard.recent_enrolments : [];
  return (
    <section className="space-y-5 rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Provider Dashboard</p>
        <span className="rounded-full bg-[#f0f3f2] px-2 py-0.5 text-[10px] font-bold text-[#52736a]">{dashboard.total_enrolments} enrolments</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total enrolments" value={String(dashboard.total_enrolments)} />
        <Stat label="Capacity used" value={`${dashboard.capacity_utilization}%`} />
        <Stat label="Statuses" value={String(entries.length)} />
        <Stat label="Recent entries" value={String(enrolments.length)} />
      </div>
      <ProgressBar percent={dashboard.capacity_utilization} />
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.08em] text-[#7f9d94]">Enrolments by status</p>
        {entries.length === 0 ? (
          <p className="mt-2 text-sm text-[#52736a]">No enrolments yet.</p>
        ) : (
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {entries.map(([status, count]) => (
              <li key={status} className="flex items-center justify-between rounded-lg border border-[#e1ebe6] bg-[#f9fcfa] px-3 py-2">
                <span className="text-sm text-[#52736a]">{humanize(status)}</span>
                <span className="text-sm font-bold text-[#06201c]">{count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.08em] text-[#7f9d94]">Recent enrolments</p>
        {enrolments.length === 0 ? (
          <p className="mt-2 text-sm text-[#52736a]">No recent enrolments yet.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {enrolments.map((item, index) => {
              const { label, sub } = rowLabel(item, `Enrolment ${index + 1}`);
              return <li key={index} className="rounded-lg bg-[#f9fcfa] px-3 py-2"><p className="text-sm text-[#06201c]">{label}</p>{sub ? <p className="text-xs text-[#7f9d94]">{sub}</p> : null}</li>;
            })}
          </ul>
        )}
      </div>
    </section>
  );
}