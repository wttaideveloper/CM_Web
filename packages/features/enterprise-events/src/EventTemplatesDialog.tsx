"use client";

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { buildEventTemplateData } from "./event-template-data";
import {
  applyEventTemplate,
  createEventTemplate,
  deleteEventTemplate,
  EventsApiError,
  getEventTemplates,
  updateEventTemplate,
  type Event,
  type EventTemplate,
  type EventTemplatesResponse,
} from "./events.service";

/** Accessible modal for creating, reviewing, and applying Enterprise Event templates. */
export default function EventTemplatesDialog({
  events,
  tenantId,
  enterpriseId,
  onClose,
}: {
  events: readonly Event[];
  tenantId: string | null;
  enterpriseId: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [sourceEventId, setSourceEventId] = useState(events[0]?.id ?? "");
  const [editingTemplate, setEditingTemplate] = useState<EventTemplate | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deletingTemplate, setDeletingTemplate] = useState<EventTemplate | null>(null);
  const sourceEvent = useMemo(
    () => events.find((event) => event.id === sourceEventId) ?? null,
    [events, sourceEventId],
  );
  const templatesQuery = useQuery({
    queryKey: ["event-templates", tenantId],
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
        ...(enterpriseId ? { enterprise_id: enterpriseId } : {}),
        name: templateName.trim(),
        template_data: buildEventTemplateData(sourceEvent),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["event-templates", tenantId] });
      setTemplateName("");
      nameInputRef.current?.focus();
    },
  });
  const applyMutation = useMutation({
    mutationFn: (templateId: string) =>
      applyEventTemplate(
        templateId,
        enterpriseId ? { enterprise_id: enterpriseId } : {},
      ),
    onSuccess: async (event) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["event-templates", tenantId] }),
        queryClient.invalidateQueries({ queryKey: ["events", "list"] }),
      ]);
      router.push(`/admin/events/${event.id}/edit`);
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ templateId, name }: { templateId: string; name: string }) => updateEventTemplate(templateId, { name }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["event-templates", tenantId] });
      setEditingTemplate(null);
      setEditingName("");
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (templateId: string) => deleteEventTemplate(templateId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["event-templates", tenantId] });
      setDeletingTemplate(null);
    },
  });

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  const isMutating = createMutation.isPending || applyMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
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
          <TemplatesState query={templatesQuery} applyingTemplateId={applyMutation.variables ?? null} isApplying={applyMutation.isPending} editingTemplate={editingTemplate} editingName={editingName} isUpdating={updateMutation.isPending} updateError={updateMutation.error} isDeleting={deleteMutation.isPending} onApply={(templateId) => applyMutation.mutate(templateId)} onEdit={(template) => { updateMutation.reset(); setEditingTemplate(template); setEditingName(template.name); }} onCancelEdit={() => { if (!updateMutation.isPending) { updateMutation.reset(); setEditingTemplate(null); setEditingName(""); } }} onEditingNameChange={setEditingName} onUpdate={(templateId) => { const name = editingName.trim(); if (name && !updateMutation.isPending) updateMutation.mutate({ templateId, name }); }} onDelete={(template) => { deleteMutation.reset(); setDeletingTemplate(template); }} />
          {applyMutation.isError ? <p role="alert" className="mt-3 text-sm font-semibold text-[#b42318]">{getTemplateErrorMessage(applyMutation.error, "apply this template")}</p> : null}
        </section>
      </div>
      {deletingTemplate ? <DeleteTemplateDialog template={deletingTemplate} isPending={deleteMutation.isPending} error={deleteMutation.error} onCancel={() => { if (!deleteMutation.isPending) { deleteMutation.reset(); setDeletingTemplate(null); } }} onConfirm={() => { if (!deleteMutation.isPending) deleteMutation.mutate(deletingTemplate.id); }} /> : null}
    </div>
  );
}

function CreateTemplateForm({ nameInputRef, events, sourceEventId, templateName, error, isPending, onNameChange, onSourceEventChange, onSubmit }: { nameInputRef: React.RefObject<HTMLInputElement | null>; events: readonly Event[]; sourceEventId: string; templateName: string; error: Error | null; isPending: boolean; onNameChange: (value: string) => void; onSourceEventChange: (value: string) => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  const canCreate = Boolean(templateName.trim() && sourceEventId && !isPending);
  return <section className="mt-6 rounded-2xl border border-[#e1ebe6] bg-[#f9fcfa] p-4" aria-labelledby="create-template-title"><h3 id="create-template-title" className="text-lg font-bold text-[#06201c]">Create template from an Event</h3><p className="mt-1 text-sm text-[#52736a]">The selected Event&apos;s reusable configuration will be copied without lifecycle, audit, registration, order, attendance, or Session ID data.</p><form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={onSubmit}><label className="block text-sm font-semibold text-[#06201c]">Template name<input ref={nameInputRef} type="text" value={templateName} onChange={(event) => onNameChange(event.target.value)} disabled={isPending} className="mt-1.5 h-11 w-full rounded-xl border border-[#d7e5df] bg-white px-3 text-sm outline-none focus:border-[#1f6a58] disabled:opacity-60" required /></label><label className="block text-sm font-semibold text-[#06201c]">Source Event<select value={sourceEventId} onChange={(event) => onSourceEventChange(event.target.value)} disabled={isPending || events.length === 0} className="mt-1.5 h-11 w-full rounded-xl border border-[#d7e5df] bg-white px-3 text-sm outline-none focus:border-[#1f6a58] disabled:opacity-60"><option value="">Select an Event</option>{events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select></label><div className="md:col-span-2">{events.length === 0 ? <p className="text-sm text-[#52736a]">Load an Event in the list before creating a template.</p> : null}{error ? <p role="alert" className="text-sm font-semibold text-[#b42318]">{getTemplateErrorMessage(error, "create this template")}</p> : null}<button type="submit" disabled={!canCreate} className="mt-3 h-11 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60">{isPending ? "Creating..." : "Create Template"}</button></div></form></section>;
}

function TemplatesState({ query, applyingTemplateId, isApplying, editingTemplate, editingName, isUpdating, updateError, isDeleting, onApply, onEdit, onCancelEdit, onEditingNameChange, onUpdate, onDelete }: { query: UseQueryResult<EventTemplatesResponse, Error>; applyingTemplateId: string | null; isApplying: boolean; editingTemplate: EventTemplate | null; editingName: string; isUpdating: boolean; updateError: Error | null; isDeleting: boolean; onApply: (templateId: string) => void; onEdit: (template: EventTemplate) => void; onCancelEdit: () => void; onEditingNameChange: (name: string) => void; onUpdate: (templateId: string) => void; onDelete: (template: EventTemplate) => void }) {
  if (query.isLoading) return <div role="status" aria-label="Loading Event templates" className="mt-4 space-y-3"><div className="h-20 animate-pulse rounded-xl bg-[#edf3f0]" /><div className="h-20 animate-pulse rounded-xl bg-[#f1f4f3]" /></div>;
  if (query.isError) return <div className="mt-4 rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-4"><p role="alert" className="text-sm font-semibold text-[#b42318]">{getTemplateErrorMessage(query.error, "load Event templates")}</p><button type="button" onClick={() => void query.refetch()} className="mt-3 text-sm font-semibold text-[#1f6a58] underline">Try again</button></div>;
  if (!query.data || query.data.length === 0) return <div className="mt-4 rounded-xl border border-dashed border-[#d7e5df] px-4 py-8 text-center"><p className="font-semibold text-[#06201c]">No Event templates yet.</p><p className="mt-1 text-sm text-[#52736a]">Create one from an existing Event above.</p></div>;
  return <ul className="mt-4 space-y-3">{query.data.map((template: EventTemplate) => <TemplateCard key={template.id} template={template} disabled={isApplying || isUpdating || isDeleting} isApplying={applyingTemplateId === template.id} isEditing={editingTemplate?.id === template.id} editingName={editingName} isUpdating={isUpdating} updateError={updateError} onApply={onApply} onEdit={onEdit} onCancelEdit={onCancelEdit} onEditingNameChange={onEditingNameChange} onUpdate={onUpdate} onDelete={onDelete} />)}</ul>;
}

function TemplateCard({ template, disabled, isApplying, isEditing, editingName, isUpdating, updateError, onApply, onEdit, onCancelEdit, onEditingNameChange, onUpdate, onDelete }: { template: EventTemplate; disabled: boolean; isApplying: boolean; isEditing: boolean; editingName: string; isUpdating: boolean; updateError: Error | null; onApply: (templateId: string) => void; onEdit: (template: EventTemplate) => void; onCancelEdit: () => void; onEditingNameChange: (name: string) => void; onUpdate: (templateId: string) => void; onDelete: (template: EventTemplate) => void }) {
  const canSave = Boolean(editingName.trim()) && !isUpdating;
  return <li className="rounded-xl border border-[#e1ebe6] bg-white p-4"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0 flex-1">{isEditing ? <form onSubmit={(event) => { event.preventDefault(); if (canSave) onUpdate(template.id); }}><label className="block text-sm font-semibold text-[#06201c]">Template name<input autoFocus value={editingName} onChange={(event) => onEditingNameChange(event.target.value)} disabled={isUpdating} className="mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] px-3 text-sm outline-none focus:border-[#1f6a58]" /></label>{updateError ? <p role="alert" className="mt-2 text-sm font-semibold text-[#b42318]">{getTemplateUpdateErrorMessage(updateError)}</p> : null}<div className="mt-3 flex flex-wrap gap-3"><button type="submit" disabled={!canSave} className="h-10 rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white disabled:opacity-60">{isUpdating ? "Saving..." : "Save"}</button><button type="button" disabled={isUpdating} onClick={onCancelEdit} className="h-10 rounded-full border border-[#d7e5df] px-4 text-sm font-semibold text-[#52736a] disabled:opacity-60">Cancel</button></div></form> : <><h4 className="font-bold text-[#06201c]">{template.name}</h4><p className="mt-1 text-sm text-[#52736a]">Created {formatCreatedDate(template.created_at)}</p><TemplatePreview data={template.template_data} /></>}</div>{!isEditing ? <div className="flex shrink-0 flex-wrap gap-2"><button type="button" disabled={disabled} onClick={() => onApply(template.id)} className="h-10 rounded-full border border-[#1f6a58] px-4 text-sm font-bold text-[#1f6a58] disabled:cursor-not-allowed disabled:opacity-60">{isApplying ? "Applying..." : "Apply"}</button><button type="button" disabled={disabled} aria-label={`Edit template ${template.name}`} onClick={() => onEdit(template)} className="h-10 rounded-full border border-[#d7e5df] px-4 text-sm font-bold text-[#31594d] disabled:cursor-not-allowed disabled:opacity-60">Edit</button><button type="button" disabled={disabled} aria-label={`Delete template ${template.name}`} onClick={() => onDelete(template)} className="h-10 rounded-full border border-[#f0c6c0] px-4 text-sm font-bold text-[#b42318] disabled:cursor-not-allowed disabled:opacity-60">Delete</button></div> : null}</div></li>;
}

function TemplatePreview({ data }: { data: Record<string, unknown> }) {
  const fields = [["Event title", readTemplateString(data, "title")], ["Category", readTemplateString(data, "category")], ["Delivery mode", readTemplateString(data, "delivery_mode")]].filter(([, value]) => value) as Array<[string, string]>;
  if (fields.length === 0) return <p className="mt-3 text-sm text-[#52736a]">No preview details are available.</p>;
  return <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">{fields.map(([label, value]) => <div key={label}><dt className="inline text-xs font-bold uppercase tracking-[0.08em] text-[#7f9d94]">{label}: </dt><dd className="inline font-semibold text-[#31594d]">{value}</dd></div>)}</dl>;
}

function readTemplateString(data: Record<string, unknown>, field: string): string | null { const value = data[field]; return typeof value === "string" && value.trim() ? value.trim() : null; }
function formatCreatedDate(value: string | null | undefined): string { if (!value) return "date unavailable"; const parsed = new Date(value); return Number.isFinite(parsed.getTime()) ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(parsed) : "date unavailable"; }
function getTemplateErrorMessage(error: unknown, action: string): string { if (!(error instanceof EventsApiError)) return `Unable to ${action}. Please try again.`; if (error.status === 401 || error.status === 403) return "You do not have permission to manage Event templates."; if (error.status === 404) return "This Event template is no longer available."; if (error.status === 409) return "This template cannot be applied in its current state."; return `Unable to ${action}. Please try again.`; }
function getTemplateUpdateErrorMessage(error: unknown): string { if (!(error instanceof EventsApiError)) return "Unable to update this Event template. Please try again."; if (error.status === 401 || error.status === 403) return "You do not have permission to update this Event template."; if (error.status === 404) return "This Event template is no longer available."; if (error.status === 422) return error.fieldErrors.name?.[0] ?? "Enter a valid template name."; return "Unable to update this Event template. Please try again."; }
function getTemplateDeleteErrorMessage(error: unknown): string { if (!(error instanceof EventsApiError)) return "Unable to delete this Event template. Please try again."; if (error.status === 401 || error.status === 403) return "You do not have permission to delete this Event template."; if (error.status === 404) return "This Event template was already deleted or is no longer available."; return "Unable to delete this Event template. Please try again."; }
function DeleteTemplateDialog({ template, isPending, error, onCancel, onConfirm }: { template: EventTemplate; isPending: boolean; error: Error | null; onCancel: () => void; onConfirm: () => void }) { const cancelRef = useRef<HTMLButtonElement | null>(null); useEffect(() => { cancelRef.current?.focus(); }, []); return <div className="fixed inset-0 z-[60] flex items-end bg-[#06201c]/35 sm:items-center sm:justify-center sm:p-5" role="presentation"><div role="dialog" aria-modal="true" aria-labelledby="delete-template-title" aria-describedby="delete-template-description" onKeyDown={(event) => { if (event.key === "Escape" && !isPending) { onCancel(); return; } trapTemplateDialogFocus(event); }} className="w-full rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-2xl"><h2 id="delete-template-title" className="text-lg font-bold text-[#06201c]">Delete template &quot;{template.name}&quot;?</h2><p id="delete-template-description" className="mt-2 text-sm leading-6 text-[#52736a]">Deleting this template does not delete Events already created from it.</p>{error ? <p role="alert" className="mt-3 text-sm font-semibold text-[#b42318]">{getTemplateDeleteErrorMessage(error)}</p> : null}<div className="mt-6 flex justify-end gap-3"><button ref={cancelRef} type="button" disabled={isPending} onClick={onCancel} className="h-10 rounded-full border border-[#d7e5df] px-4 text-sm font-semibold text-[#52736a] disabled:opacity-60">Cancel</button><button type="button" disabled={isPending} onClick={onConfirm} className="h-10 rounded-full bg-[#b42318] px-4 text-sm font-bold text-white disabled:opacity-60">{isPending ? "Deleting..." : "Delete template"}</button></div></div></div>; }
function trapTemplateDialogFocus(event: React.KeyboardEvent<HTMLDivElement>) { if (event.key !== "Tab") return; const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])')); const currentIndex = focusable.findIndex((element) => element === document.activeElement); const nextIndex = event.shiftKey ? (currentIndex - 1 + focusable.length) % focusable.length : (currentIndex + 1) % focusable.length; focusable[nextIndex]?.focus(); event.preventDefault(); }
