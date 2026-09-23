"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfigurationBuilder } from "../components/ConfigurationBuilder";
import { TrainingConfigurationHistoryPanels } from "../components/TrainingConfigurationHistoryPanels";
import { trainingFormConfigurationCopy as copy } from "../constants/training-form-configuration-copy";
import { useActivateTrainingFormConfiguration, useCreateTrainingFormConfiguration, useDeactivateTrainingFormConfiguration, useDeleteTrainingFormConfiguration, useTrainingFormConfiguration, useTrainingFormConfigurationAssignments, useTrainingFormConfigurationEnterpriseOptions, useTrainingFormConfigurationTenantOptions, useTrainingFormFieldRegistry, usePublishTrainingFormConfiguration, useRetireTrainingFormConfiguration, useUpdateTrainingFormConfiguration, useUpdateTrainingFormConfigurationAssignments } from "../training-form-configurations.queries";
import { toBuilderTrainingFormConfiguration, toTrainingFormConfigurationCreateCandidate, toTrainingFormConfigurationPatchCandidate } from "../model/training-form-configuration.mappers";
import { getConfigurationActions } from "../model/configuration-actions";
import { createMockConfiguration } from "../model/form-configuration.mock";
import type { FormConfiguration } from "../model/form-configuration.types";
import { TrainingFormConfigurationsApiError } from "../services/training-form-configurations.service";

/** Hosts persisted Training configuration editing while keeping the route adapter thin. */
export function TrainingFormConfigurationEditorScreen({ id, mode }: { id?: string; mode: "create" | "view" | "edit" }) {
  const router = useRouter();
  const [lifecycleError, setLifecycleError] = useState("");
  const [assignmentRecovery, setAssignmentRecovery] = useState<{ id: string; message: string } | null>(null);
  const isCreate = mode === "create";
  const registry = useTrainingFormFieldRegistry();
  const configuration = useTrainingFormConfiguration(isCreate ? undefined : id);
  const assignments = useTrainingFormConfigurationAssignments(isCreate ? undefined : id);
  const tenantOptions = useTrainingFormConfigurationTenantOptions();
  const enterpriseOptions = useTrainingFormConfigurationEnterpriseOptions();
  const create = useCreateTrainingFormConfiguration();
  const update = useUpdateTrainingFormConfiguration();
  const publish = usePublishTrainingFormConfiguration();
  const activate = useActivateTrainingFormConfiguration();
  const deactivate = useDeactivateTrainingFormConfiguration();
  const remove = useDeleteTrainingFormConfiguration();
  const retire = useRetireTrainingFormConfiguration();
  const saveAssignments = useUpdateTrainingFormConfigurationAssignments();
  const apiConfiguration = configuration.data;
  const builderConfiguration = isCreate
    ? (() => {
        const base = createMockConfiguration("new-training-form", registry.data ?? []);
        // Override with training's 6 seeded sections (basic, delivery, schedule, pricing, media, additional) instead of event's 7
        const trainingSections = Object.entries(copy.seededSections).map(([key, name], index) => ({
          localId: `section-${key}`,
          serverId: null,
          stableKey: `section_${key}`,
          name,
          description: "",
          enabled: true,
          position: index + 1,
        }));
        const trainingFields = base.fields.filter(f => trainingSections.some(s => s.localId === f.sectionLocalId));
        return { ...base, type: "training" as const, name: "", description: "", status: "draft" as const, active: false, sections: trainingSections, fields: trainingFields };
      })()
    : apiConfiguration ? toBuilderTrainingFormConfiguration(apiConfiguration) : undefined;
  const error = registry.error ?? configuration.error;
  const errorCopy = error instanceof TrainingFormConfigurationsApiError && (error.status === 401 || error.status === 403) ? copy.forbidden : copy.loadError;

  const save = async (builder: FormConfiguration): Promise<FormConfiguration> => {
    if (assignmentRecovery) throw new Error("Tenant assignments could not be saved. Open the saved configuration to recover.");
    if (!isCreate) {
      if (!id) throw new Error("Configuration ID is unavailable.");
      const updated = toBuilderTrainingFormConfiguration(await update.mutateAsync({ configurationId: id, payload: toTrainingFormConfigurationPatchCandidate(builder) }));
      if (builder.scope === "global") {
        try {
          await saveAssignments.mutateAsync({ configurationId: id, payload: { tenant_ids: [], is_global: true } });
        } catch (reason) {
          throw new Error(`Configuration saved, but stale assignments could not be cleared: ${reason instanceof Error ? reason.message : "Unable to clear assignments."}`);
        }
      }
      return updated;
    }
    const saved = await create.mutateAsync(toTrainingFormConfigurationCreateCandidate(builder));
    if (builder.scope === "selective" && ((builder.enterpriseIds ?? []).length > 0 || builder.tenantIds.length > 0)) {
      try {
        const enterpriseIds = builder.enterpriseIds ?? [];
        await saveAssignments.mutateAsync({ configurationId: saved.id, payload: enterpriseIds.length > 0 ? { tenant_ids: [], enterprise_ids: enterpriseIds } : { tenant_ids: builder.tenantIds } });
      } catch (reason) {
        const message = reason instanceof Error ? reason.message : "Unable to save tenant assignments.";
        setAssignmentRecovery({ id: saved.id, message });
        throw new Error(`Configuration was created, but tenant assignments could not be saved. ${message}`);
      }
    }
    router.push("/training-form-configurations");
    return toBuilderTrainingFormConfiguration(saved, saved.draft_version);
  };
  const publishConfiguration = async (builder: FormConfiguration): Promise<FormConfiguration> => {
    if (!id) throw new Error("Save this configuration before publishing it.");
    await update.mutateAsync({ configurationId: id, payload: toTrainingFormConfigurationPatchCandidate(builder) });
    const published = await publish.mutateAsync(id);
    return toBuilderTrainingFormConfiguration(published.configuration, published.version ?? undefined);
  };
  const persistAssignments = async (tenantIds: string[]): Promise<readonly string[]> => {
    if (!id) throw new Error("Save this configuration before assigning tenants.");
    const saved = await saveAssignments.mutateAsync({ configurationId: id, payload: { tenant_ids: tenantIds } });
    return saved.map((assignment) => assignment.tenant_id);
  };
  const persistEnterpriseAssignments = async (args: { enterpriseIds: string[]; isGlobal: boolean }): Promise<readonly string[]> => {
    if (!id) throw new Error("Save this configuration before assigning enterprises.");
    const saved = await saveAssignments.mutateAsync({ configurationId: id, payload: args.isGlobal ? { tenant_ids: [], is_global: true } : { tenant_ids: [], enterprise_ids: args.enterpriseIds } });
    return saved.map((assignment) => assignment.enterprise_id).filter((eid): eid is string => !!eid);
  };
  const runLifecycle = async (action: "activate" | "deactivate" | "retire" | "delete") => {
    if (!id) return;
    setLifecycleError("");
    try {
      if (action === "activate") await activate.mutateAsync(id);
      else if (action === "deactivate") await deactivate.mutateAsync(id);
      else if (action === "retire") await retire.mutateAsync(id);
      else { await remove.mutateAsync(id); router.push("/training-form-configurations"); }
    } catch (reason) { setLifecycleError(reason instanceof Error ? reason.message : "Unable to update configuration lifecycle."); }
  };

  if (registry.isLoading || (!isCreate && configuration.isLoading)) return <Page><p>{copy.loading}</p></Page>;
  if (error) return <Page><p role="alert">{errorCopy}</p><button type="button" onClick={() => { void registry.refetch(); void configuration.refetch(); }}>{copy.retry}</button></Page>;
  if (!builderConfiguration || registry.data?.length === 0) return <Page><p>{copy.emptyFieldRegistry}</p></Page>;
  const lifecycleActions = apiConfiguration ? new Set(getConfigurationActions({ id: apiConfiguration.id, name: apiConfiguration.name, description: apiConfiguration.description, scope: apiConfiguration.scope, status: apiConfiguration.status, active: apiConfiguration.is_active, currentVersion: apiConfiguration.current_version, updatedAt: apiConfiguration.updated_at, publishedAt: apiConfiguration.published_at })) : new Set();
  return <Page>{assignmentRecovery ? <p role="alert">Configuration was created, but assignments were not saved: {assignmentRecovery.message} <Link href={`/training-form-configurations/${assignmentRecovery.id}/edit`}>Open the saved configuration to retry.</Link></p> : null}<div className="mb-4 flex gap-3">{lifecycleActions.has("activate") ? <button type="button" disabled={activate.isPending} onClick={() => void runLifecycle("activate")}>{copy.activate}</button> : null}{lifecycleActions.has("deactivate") ? <button type="button" disabled={deactivate.isPending} onClick={() => void runLifecycle("deactivate")}>{copy.deactivate}</button> : null}{lifecycleActions.has("retire") ? <button type="button" disabled={retire.isPending} onClick={() => void runLifecycle("retire")}>{copy.retire}</button> : null}{lifecycleActions.has("delete") ? <button type="button" disabled={remove.isPending} onClick={() => void runLifecycle("delete")}>{copy.delete}</button> : null}</div>{lifecycleError ? <p role="alert">{lifecycleError}</p> : null}<ConfigurationBuilder key={builderConfiguration.id} initialConfiguration={builderConfiguration} coreFieldRegistry={registry.data ?? []} readOnly={mode === "view"} tenantOptions={tenantOptions.data ?? []} enterpriseOptions={enterpriseOptions.data ?? []} assignmentTenantIds={assignments.data?.map((assignment) => assignment.tenant_id)} assignmentEnterpriseIds={(assignments.data ?? []).map((assignment) => assignment.enterprise_id).filter((eid): eid is string => !!eid)} assignmentsLoaded={assignments.isSuccess} isPersisted={!isCreate && Boolean(id)} isLoadingTenants={tenantOptions.isLoading} tenantError={tenantOptions.isError} isSavingEnterpriseAssignments={saveAssignments.isPending} isLoadingAssignments={assignments.isLoading} assignmentError={assignments.isError} isSaving={create.isPending || update.isPending} isPublishing={publish.isPending} isSavingAssignments={saveAssignments.isPending} onSave={mode === "view" ? undefined : save} onPublish={mode === "edit" ? publishConfiguration : undefined} onSaveAssignments={mode === "view" || !id ? undefined : persistAssignments} onSaveEnterpriseAssignments={mode === "view" || !id ? undefined : persistEnterpriseAssignments} />{apiConfiguration ? <TrainingConfigurationHistoryPanels configuration={apiConfiguration} /> : null}</Page>;
}

function Page({ children }: { children: React.ReactNode }) { return <div className="mx-auto w-full max-w-[1180px]"><div className="mb-6 flex items-center justify-between"><h1 className="text-3xl font-bold">{copy.title}</h1><Link href="/training-form-configurations">{copy.title}</Link></div>{children}</div>; }
