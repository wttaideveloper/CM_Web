"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfigurationBuilder } from "../components/ConfigurationBuilder";
import { ConfigurationHistoryPanels } from "../components/ConfigurationHistoryPanels";
import { formConfigurationCopy as copy } from "../constants/form-configuration-copy";
import { useActivateEventFormConfiguration, useCreateEventFormConfiguration, useDeactivateEventFormConfiguration, useDeleteEventFormConfiguration, useEventFormConfiguration, useEventFormConfigurationAssignments, useEventFormConfigurationTenantOptions, useEventFormFieldRegistry, usePublishEventFormConfiguration, useUpdateEventFormConfiguration, useUpdateEventFormConfigurationAssignments } from "../form-configurations.queries";
import { toBuilderFormConfiguration, toEventFormConfigurationCreateCandidate, toEventFormConfigurationPatchCandidate } from "../model/form-configuration.mappers";
import { createMockConfiguration } from "../model/form-configuration.mock";
import type { FormConfiguration } from "../model/form-configuration.types";
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
    return toBuilderFormConfiguration(published.configuration, published.version ?? undefined);
  };
  const persistAssignments = async (tenantIds: string[]) => {
    if (!id) throw new Error("Save this configuration before assigning tenants.");
    await saveAssignments.mutateAsync({ configurationId: id, payload: { tenant_ids: tenantIds } });
  };
  const runLifecycle = async (action: "activate" | "deactivate" | "delete") => {
    if (!id) return;
    setLifecycleError("");
    try {
      if (action === "activate") await activate.mutateAsync(id);
      else if (action === "deactivate") await deactivate.mutateAsync(id);
      else { await remove.mutateAsync(id); router.push("/form-configurations"); }
    } catch (reason) { setLifecycleError(reason instanceof Error ? reason.message : "Unable to update configuration lifecycle."); }
  };

  if (registry.isLoading || (!isCreate && configuration.isLoading)) return <Page><p>{copy.loading}</p></Page>;
  if (error) return <Page><p role="alert">{errorCopy}</p><button type="button" onClick={() => { void registry.refetch(); void configuration.refetch(); }}>{copy.retry}</button></Page>;
  if (!builderConfiguration || registry.data?.length === 0) return <Page><p>{copy.emptyFieldRegistry}</p></Page>;
  return <Page>{assignmentRecovery ? <p role="alert">Configuration was created, but assignments were not saved: {assignmentRecovery.message} <Link href={`/form-configurations/${assignmentRecovery.id}/edit`}>Open the saved configuration to retry.</Link></p> : null}<div className="mb-4 flex gap-3">{apiConfiguration?.status === "published" && !apiConfiguration.is_active ? <button type="button" disabled={activate.isPending} onClick={() => void runLifecycle("activate")}>{copy.activate}</button> : null}{apiConfiguration?.is_active ? <button type="button" disabled={deactivate.isPending} onClick={() => void runLifecycle("deactivate")}>{copy.deactivate}</button> : null}{apiConfiguration?.status === "draft" ? <button type="button" disabled={remove.isPending} onClick={() => void runLifecycle("delete")}>{copy.delete}</button> : null}</div>{lifecycleError ? <p role="alert">{lifecycleError}</p> : null}<ConfigurationBuilder key={builderConfiguration.id} initialConfiguration={builderConfiguration} coreFieldRegistry={registry.data ?? []} readOnly={mode === "view"} tenantOptions={tenantOptions.data ?? []} assignmentTenantIds={assignments.data?.map((assignment) => assignment.tenant_id)} assignmentsLoaded={assignments.isSuccess} isPersisted={!isCreate && Boolean(id)} isLoadingTenants={tenantOptions.isLoading} tenantError={tenantOptions.isError} isLoadingAssignments={assignments.isLoading} assignmentError={assignments.isError} isSaving={create.isPending || update.isPending} isPublishing={publish.isPending} isSavingAssignments={saveAssignments.isPending} onSave={mode === "view" ? undefined : save} onPublish={mode === "edit" ? publishConfiguration : undefined} onSaveAssignments={mode === "view" || !id ? undefined : persistAssignments} />{apiConfiguration ? <ConfigurationHistoryPanels configuration={apiConfiguration} /> : null}</Page>;
}

function Page({ children }: { children: React.ReactNode }) { return <div className="mx-auto w-full max-w-[1180px]"><div className="mb-6 flex items-center justify-between"><h1 className="text-3xl font-bold">{copy.title}</h1><Link href="/form-configurations">{copy.title}</Link></div>{children}</div>; }
