"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfigurationBuilder } from "../components/ConfigurationBuilder";
import { ConfigurationHistoryPanels } from "../components/ConfigurationHistoryPanels";
import { formConfigurationCopy as copy } from "../constants/form-configuration-copy";
import { useActivateEventFormConfiguration, useCreateEventFormConfiguration, useDeactivateEventFormConfiguration, useDeleteEventFormConfiguration, useEventFormConfiguration, useEventFormConfigurationAssignments, useEventFormConfigurationTenantOptions, useEventFormFieldRegistry, usePublishEventFormConfiguration, useRetireEventFormConfiguration, useUpdateEventFormConfiguration, useUpdateEventFormConfigurationAssignments } from "../form-configurations.queries";
import { toBuilderFormConfiguration, toEventFormConfigurationCreateCandidate, toEventFormConfigurationPatchCandidate } from "../model/form-configuration.mappers";
import { createMockConfiguration } from "../model/form-configuration.mock";
import type { FormConfiguration } from "../model/form-configuration.types";
import { getConfigurationActions } from "../model/configuration-actions";
import { FormConfigurationsApiError } from "../services/form-configurations.service";

/** Hosts persisted configuration editing while keeping the route adapter thin. */
export function FormConfigurationEditorScreen({ id, mode }: { id?: string; mode: "create" | "view" | "edit" }) {
  const router = useRouter();
  const [lifecycleError, setLifecycleError] = useState("");
  const [assignmentRecovery, setAssignmentRecovery] = useState<{ id: string; message: string } | null>(null);
  const isCreate = mode === "create";
  const registry = useEventFormFieldRegistry();
  const configuration = useEventFormConfiguration(isCreate ? undefined : id);
  const assignments = useEventFormConfigurationAssignments(isCreate ? undefined : id);
  const tenantOptions = useEventFormConfigurationTenantOptions();
  const create = useCreateEventFormConfiguration();
  const update = useUpdateEventFormConfiguration();
  const publish = usePublishEventFormConfiguration();
  const activate = useActivateEventFormConfiguration();
  const deactivate = useDeactivateEventFormConfiguration();
  const remove = useDeleteEventFormConfiguration();
  const retire = useRetireEventFormConfiguration();
  const saveAssignments = useUpdateEventFormConfigurationAssignments();
  const apiConfiguration = configuration.data;
  const builderConfiguration = isCreate ? { ...createMockConfiguration("new-event-form", registry.data ?? []), name: "", description: "", status: "draft" as const, active: false } : apiConfiguration ? toBuilderFormConfiguration(apiConfiguration) : undefined;
  const error = registry.error ?? configuration.error;
  const errorCopy = error instanceof FormConfigurationsApiError && (error.status === 401 || error.status === 403) ? copy.forbidden : copy.loadError;

  const save = async (builder: FormConfiguration): Promise<FormConfiguration> => {
    if (assignmentRecovery) throw new Error("Tenant assignments could not be saved. Open the saved configuration to recover.");
    if (!isCreate) {
      if (!id) throw new Error("Configuration ID is unavailable.");
      return toBuilderFormConfiguration(await update.mutateAsync({ configurationId: id, payload: toEventFormConfigurationPatchCandidate(builder) }));
    }
    const saved = await create.mutateAsync(toEventFormConfigurationCreateCandidate(builder));
    if (builder.scope === "selective" && builder.tenantIds.length > 0) {
      try {
        await saveAssignments.mutateAsync({ configurationId: saved.id, payload: { tenant_ids: builder.tenantIds } });
      } catch (reason) {
        const message = reason instanceof Error ? reason.message : "Unable to save tenant assignments.";
        setAssignmentRecovery({ id: saved.id, message });
        throw new Error(`Configuration was created, but tenant assignments could not be saved. ${message}`);
      }
    }
    router.push("/form-configurations");
    return toBuilderFormConfiguration(saved, saved.draft_version);
  };
  const publishConfiguration = async (builder: FormConfiguration): Promise<FormConfiguration> => {
    if (!id) throw new Error("Save this configuration before publishing it.");
    await update.mutateAsync({ configurationId: id, payload: toEventFormConfigurationPatchCandidate(builder) });
    const published = await publish.mutateAsync(id);
    router.push("/form-configurations");
    return { ...builder, status: published.status, active: false, version: published.version };
  };
  const persistAssignments = async (tenantIds: string[]): Promise<string[]> => {
    if (!id) throw new Error("Save this configuration before assigning tenants.");
    const saved = await saveAssignments.mutateAsync({ configurationId: id, payload: { tenant_ids: tenantIds } });
    return saved.assignments.map((assignment) => assignment.tenant_id);
  };
  const runLifecycle = async (action: "activate" | "deactivate" | "retire" | "delete") => {
    if (!id) return;
    if (action === "delete" && !window.confirm("Delete configuration?\n\nThis permanently deletes this draft configuration. This action cannot be undone.")) return;
    setLifecycleError("");
    try {
      if (action === "activate") await activate.mutateAsync(id);
      else if (action === "deactivate") await deactivate.mutateAsync(id);
      else if (action === "retire") await retire.mutateAsync(id);
      else { await remove.mutateAsync(id); router.push("/form-configurations"); }
    } catch (reason) { setLifecycleError(reason instanceof Error ? reason.message : "Unable to update configuration lifecycle."); }
  };

  if (registry.isLoading || (!isCreate && configuration.isLoading)) return <Page><p>{copy.loading}</p></Page>;
  if (error) return <Page><p role="alert">{errorCopy}</p><button type="button" onClick={() => { void registry.refetch(); void configuration.refetch(); }}>{copy.retry}</button></Page>;
  if (!builderConfiguration || registry.data?.length === 0) return <Page><p>{copy.emptyFieldRegistry}</p></Page>;
  const lifecycleActions = apiConfiguration ? new Set(getConfigurationActions({ id: apiConfiguration.id, name: apiConfiguration.name, description: apiConfiguration.description, scope: apiConfiguration.scope, status: apiConfiguration.status, active: apiConfiguration.is_active, currentVersion: apiConfiguration.current_version, updatedAt: apiConfiguration.updated_at, publishedAt: apiConfiguration.published_at })) : new Set();
  return <Page>{assignmentRecovery ? <p role="alert">Configuration was created, but assignments were not saved: {assignmentRecovery.message} <Link href={`/form-configurations/${assignmentRecovery.id}/edit`}>Open the saved configuration to retry.</Link></p> : null}<div className="mb-4 flex flex-wrap gap-2">{lifecycleActions.has("activate") ? <button className="rounded-full border border-[#cfe0d8] px-4 py-2 text-sm font-semibold text-[#1f6a58] transition hover:bg-[#eef6f2] focus:outline-none focus:ring-2 focus:ring-[#1f6a58]" type="button" disabled={activate.isPending} onClick={() => void runLifecycle("activate")}>{copy.activate}</button> : null}{lifecycleActions.has("deactivate") ? <button className="rounded-full border border-[#cfe0d8] px-4 py-2 text-sm font-semibold text-[#1f6a58] transition hover:bg-[#eef6f2] focus:outline-none focus:ring-2 focus:ring-[#1f6a58]" type="button" disabled={deactivate.isPending} onClick={() => void runLifecycle("deactivate")}>{copy.deactivate}</button> : null}{lifecycleActions.has("retire") ? <button className="rounded-full border border-[#cfe0d8] px-4 py-2 text-sm font-semibold text-[#1f6a58] transition hover:bg-[#eef6f2] focus:outline-none focus:ring-2 focus:ring-[#1f6a58]" type="button" disabled={retire.isPending} onClick={() => void runLifecycle("retire")}>{copy.retire}</button> : null}{lifecycleActions.has("delete") ? <button className="rounded-full border border-[#efc7c2] px-4 py-2 text-sm font-semibold text-[#b42318] transition hover:bg-[#fff1ef] focus:outline-none focus:ring-2 focus:ring-[#b42318]" type="button" disabled={remove.isPending} onClick={() => void runLifecycle("delete")}>{copy.delete}</button> : null}</div>{lifecycleError ? <p role="alert">{lifecycleError}</p> : null}<ConfigurationBuilder key={builderConfiguration.id} initialConfiguration={builderConfiguration} coreFieldRegistry={registry.data ?? []} readOnly={mode === "view"} tenantOptions={tenantOptions.data ?? []} assignmentTenantIds={assignments.data?.assignments.map((assignment) => assignment.tenant_id)} assignmentsLoaded={assignments.isSuccess} isPersisted={!isCreate && Boolean(id)} isLoadingTenants={tenantOptions.isLoading} tenantError={tenantOptions.isError} isLoadingAssignments={assignments.isLoading} assignmentError={assignments.isError} isSaving={create.isPending || update.isPending} isPublishing={publish.isPending} isSavingAssignments={saveAssignments.isPending} onSave={mode === "view" ? undefined : save} onPublish={mode === "edit" ? publishConfiguration : undefined} onSaveAssignments={mode === "view" || !id ? undefined : persistAssignments} />{apiConfiguration ? <ConfigurationHistoryPanels configuration={apiConfiguration} /> : null}</Page>;
}

function Page({ children }: { children: React.ReactNode }) { return <div className="mx-auto w-full max-w-[1180px]"><div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h1 className="text-3xl font-bold text-[#06201c]">{copy.title}</h1><Link href="/form-configurations" className="inline-flex w-fit items-center rounded-full border border-[#cfe0d8] px-4 py-2 text-sm font-semibold text-[#1f6a58] transition hover:bg-[#eef6f2] focus:outline-none focus:ring-2 focus:ring-[#1f6a58] focus:ring-offset-2">← Back to Form Configurations</Link></div>{children}</div>; }
