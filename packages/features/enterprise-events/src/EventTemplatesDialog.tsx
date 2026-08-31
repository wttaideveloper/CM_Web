"use client";

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { buildEventTemplateData } from "./event-template-data";
import {
  applyEventTemplate,
  createEventTemplate,
  EventsApiError,
  getEventTemplates,
  type Event,
  type EventTemplate,
  type EventTemplatesResponse,
} from "./events.service";

/** Accessible modal for creating, reviewing, and applying Enterprise Event templates. */
export default function EventTemplatesDialog({
  events,
  onClose,
}: {
  events: readonly Event[];
  onClose: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [sourceEventId, setSourceEventId] = useState(events[0]?.id ?? "");
  const sourceEvent = useMemo(
    () => events.find((event) => event.id === sourceEventId) ?? null,
    [events, sourceEventId],
  );
  const templatesQuery = useQuery({
    queryKey: ["event-templates"],
    queryFn: getEventTemplates,
    staleTime: 30_000,
    retry: 1,
  });
  const createMutation = useMutation({
    mutationFn: () => {
      if (!sourceEvent) {
        throw new Error("Choose an event to use as the template source.");
      }
      return createEventTemplate({
        name: templateName.trim(),
        template_data: buildEventTemplateData(sourceEvent),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["event-templates"] });
      setTemplateName("");
      nameInputRef.current?.focus();
    },
  });
  const applyMutation = useMutation({
    mutationFn: applyEventTemplate,
    onSuccess: async (event) => {
      await queryClient.invalidateQueries({ queryKey: ["events", "list"] });
      router.push(`/admin/events/${event.id}/edit`);
    },
  });

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  const isMutating = createMutation.isPending || applyMutation.isPending;
  const submitCreate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (templateName.trim() && sourceEvent && !createMutation.isPending) {
      createMutation.mutate();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-[#06201c]/35 sm:items-center sm:justify-center sm:p-5" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="event-templates-title" className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-4xl sm:rounded-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7f9d94]">Event templates</p><h2 id="event-templates-title" className="mt-1 text-xl font-bold text-[#06201c]">Create and reuse Event setups</h2><p className="mt-1 text-sm text-[#52736a]">Applying a template creates a separate draft Event for review before approval.</p></div>
          <button type="button" onClick={onClose} disabled={isMutating} aria-label="Close templates" className="rounded-full border border-[#d7e5df] px-3 py-2 text-sm font-semibold text-[#52736a] disabled:opacity-50">Close</button>
        </div>
        <CreateTemplateForm nameInputRef={nameInputRef} events={events} sourceEventId={sourceEventId} templateName={templateName} error={createMutation.error} isPending={createMutation.isPending} onNameChange={setTemplateName} onSourceEventChange={setSourceEventId} onSubmit={submitCreate} />
        <section className="mt-7 border-t border-[#edf3f0] pt-6" aria-labelledby="saved-templates-title">
          <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7f9d94]">Saved templates</p><h3 id="saved-templates-title" className="mt-1 text-lg font-bold text-[#06201c]">Available Event templates</h3></div>
          <TemplatesState query={templatesQuery} applyingTemplateId={applyMutation.variables ?? null} isApplying={applyMutation.isPending} onApply={(templateId) => applyMutation.mutate(templateId)} />
          {applyMutation.isError ? <p role="alert" className="mt-3 text-sm font-semibold text-[#b42318]">{getTemplateErrorMessage(applyMutation.error, "apply this template")}</p> : null}
        </section>
      </div>
    </div>
  );
}

function CreateTemplateForm({ nameInputRef, events, sourceEventId, templateName, error, isPending, onNameChange, onSourceEventChange, onSubmit }: { nameInputRef: React.RefObject<HTMLInputElement | null>; events: readonly Event[]; sourceEventId: string; templateName: string; error: Error | null; isPending: boolean; onNameChange: (value: string) => void; onSourceEventChange: (value: string) => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  const canCreate = Boolean(templateName.trim() && sourceEventId && !isPending);
  return <section className="mt-6 rounded-2xl border border-[#e1ebe6] bg-[#f9fcfa] p-4" aria-labelledby="create-template-title"><h3 id="create-template-title" className="text-lg font-bold text-[#06201c]">Create template from an Event</h3><p className="mt-1 text-sm text-[#52736a]">The selected Event&apos;s reusable configuration will be copied without lifecycle, audit, registration, order, attendance, or Session ID data.</p><form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={onSubmit}><label className="block text-sm font-semibold text-[#06201c]">Template name<input ref={nameInputRef} type="text" value={templateName} onChange={(event) => onNameChange(event.target.value)} disabled={isPending} className="mt-1.5 h-11 w-full rounded-xl border border-[#d7e5df] bg-white px-3 text-sm outline-none focus:border-[#1f6a58] disabled:opacity-60" required /></label><label className="block text-sm font-semibold text-[#06201c]">Source Event<select value={sourceEventId} onChange={(event) => onSourceEventChange(event.target.value)} disabled={isPending || events.length === 0} className="mt-1.5 h-11 w-full rounded-xl border border-[#d7e5df] bg-white px-3 text-sm outline-none focus:border-[#1f6a58] disabled:opacity-60"><option value="">Select an Event</option>{events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select></label><div className="md:col-span-2">{events.length === 0 ? <p className="text-sm text-[#52736a]">Load an Event in the list before creating a template.</p> : null}{error ? <p role="alert" className="text-sm font-semibold text-[#b42318]">{getTemplateErrorMessage(error, "create this template")}</p> : null}<button type="submit" disabled={!canCreate} className="mt-3 h-11 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60">{isPending ? "Creating..." : "Create Template"}</button></div></form></section>;
}

function TemplatesState({ query, applyingTemplateId, isApplying, onApply }: { query: UseQueryResult<EventTemplatesResponse, Error>; applyingTemplateId: string | null; isApplying: boolean; onApply: (templateId: string) => void }) {
  if (query.isLoading) return <div role="status" aria-label="Loading Event templates" className="mt-4 space-y-3"><div className="h-20 animate-pulse rounded-xl bg-[#edf3f0]" /><div className="h-20 animate-pulse rounded-xl bg-[#f1f4f3]" /></div>;
  if (query.isError) return <div className="mt-4 rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-4"><p role="alert" className="text-sm font-semibold text-[#b42318]">{getTemplateErrorMessage(query.error, "load Event templates")}</p><button type="button" onClick={() => void query.refetch()} className="mt-3 text-sm font-semibold text-[#1f6a58] underline">Try again</button></div>;
  if (!query.data || query.data.length === 0) return <div className="mt-4 rounded-xl border border-dashed border-[#d7e5df] px-4 py-8 text-center"><p className="font-semibold text-[#06201c]">No Event templates yet.</p><p className="mt-1 text-sm text-[#52736a]">Create one from an existing Event above.</p></div>;
  return <ul className="mt-4 space-y-3">{query.data.map((template: EventTemplate) => <TemplateCard key={template.id} template={template} disabled={isApplying} isApplying={applyingTemplateId === template.id} onApply={onApply} />)}</ul>;
}

function TemplateCard({ template, disabled, isApplying, onApply }: { template: EventTemplate; disabled: boolean; isApplying: boolean; onApply: (templateId: string) => void }) {
  return <li className="rounded-xl border border-[#e1ebe6] bg-white p-4"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><h4 className="font-bold text-[#06201c]">{template.name}</h4><p className="mt-1 text-sm text-[#52736a]">Created {formatCreatedDate(template.created_at)}</p><TemplatePreview data={template.template_data} /></div><button type="button" disabled={disabled} onClick={() => onApply(template.id)} className="h-10 shrink-0 rounded-full border border-[#1f6a58] px-4 text-sm font-bold text-[#1f6a58] disabled:cursor-not-allowed disabled:opacity-60">{isApplying ? "Applying..." : "Apply Template"}</button></div></li>;
}

function TemplatePreview({ data }: { data: Record<string, unknown> }) {
  const fields = [["Event title", readTemplateString(data, "title")], ["Category", readTemplateString(data, "category")], ["Delivery mode", readTemplateString(data, "delivery_mode")]].filter(([, value]) => value) as Array<[string, string]>;
  if (fields.length === 0) return <p className="mt-3 text-sm text-[#52736a]">No preview details are available.</p>;
  return <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">{fields.map(([label, value]) => <div key={label}><dt className="inline text-xs font-bold uppercase tracking-[0.08em] text-[#7f9d94]">{label}: </dt><dd className="inline font-semibold text-[#31594d]">{value}</dd></div>)}</dl>;
}

function readTemplateString(data: Record<string, unknown>, field: string): string | null { const value = data[field]; return typeof value === "string" && value.trim() ? value.trim() : null; }
function formatCreatedDate(value: string): string { const parsed = new Date(value); return Number.isFinite(parsed.getTime()) ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(parsed) : "date unavailable"; }
function getTemplateErrorMessage(error: unknown, action: string): string { if (!(error instanceof EventsApiError)) return `Unable to ${action}. Please try again.`; if (error.status === 401 || error.status === 403) return "You do not have permission to manage Event templates."; if (error.status === 404) return "This Event template is no longer available."; if (error.status === 409) return "This template cannot be applied in its current state."; return `Unable to ${action}. Please try again.`; }
