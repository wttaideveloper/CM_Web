"use client";

import type { ReactNode } from "react";

/** Shared card wrapper used by the reusable Workflow administration workspaces. */
export function WorkspaceCard({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return <section className="rounded-2xl border border-[#e1ebe6] bg-white p-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-sm font-bold text-[#06201c]">{title}</h2>{actions}</div><div className="mt-4">{children}</div></section>;
}

/** Compact skeleton used while a workspace query is loading. */
export function WorkspaceSkeleton({ rows = 3 }: { rows?: number }) {
  return <div className="space-y-2" role="status" aria-live="polite" aria-label="Loading workspace data">{Array.from({ length: rows }, (_, index) => <div key={index} className="animate-pulse rounded-xl border border-[#edf3f0] bg-[#f9fcfa] p-3"><div className="h-3 w-2/5 rounded bg-[#dfece6]" /><div className="mt-2 h-3 w-3/5 rounded bg-[#edf3f0]" /></div>)}</div>;
}

/** Renders a consistent retryable error state. */
export function WorkspaceError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const message = error instanceof Error ? error.message : "The request could not be completed.";
  return <div role="alert" className="rounded-xl border border-[#f3c8c2] bg-[#fff5f4] p-3 text-sm text-[#9b2c22]"><p>{message}</p><button type="button" onClick={onRetry} className="mt-2 font-semibold underline underline-offset-2">Retry</button></div>;
}

/** Displays the published state without inferring any backend authorization. */
export function PublicationBadge({ published }: { published: boolean }) {
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${published ? "bg-[#e8f6ee] text-[#167550]" : "bg-[#edf3f0] text-[#52736a]"}`}>{published ? "Published" : "Draft"}</span>;
}

/** Parses editable JSON object text without creating an undocumented definition schema. */
export function parseJsonObject(value: string): { value: Record<string, unknown> | null; error: string | null } {
  try {
    const parsed: unknown = JSON.parse(value || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { value: null, error: "Definition must be a JSON object." };
    return { value: parsed as Record<string, unknown>, error: null };
  } catch {
    return { value: null, error: "Enter valid JSON before saving." };
  }
}

/** JSON editor for API-defined generic object fields. */
export function JsonEditor({ label, value, onChange, readOnly = false }: { label: string; value: string; onChange: (value: string) => void; readOnly?: boolean }) {
  const result = parseJsonObject(value);
  return <label className="block"><span className="text-xs font-bold uppercase tracking-[0.12em] text-[#52736a]">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} readOnly={readOnly} spellCheck={false} className="mt-1 min-h-56 w-full rounded-xl border border-[#d7e5df] bg-[#fbfdfc] p-3 font-mono text-xs text-[#16332b] outline-none focus:border-[#1f6a58] read-only:bg-[#f4f8f6]" aria-invalid={Boolean(result.error)} />{result.error ? <p role="alert" className="mt-1 text-xs text-[#b42318]">{result.error}</p> : null}</label>;
}

/** Formats an API timestamp in a locale-aware way when possible. */
export function formatWorkspaceDate(value: string | null | undefined): string {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}
