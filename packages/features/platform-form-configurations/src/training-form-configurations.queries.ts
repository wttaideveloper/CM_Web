"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAuthTenants } from "@ihp/auth";
import type { CreateTrainingFormConfigurationRequest, UpdateTrainingFormConfigurationAssignmentsRequest, UpdateTrainingFormConfigurationRequest } from "./model/training-form-configuration-api.types";
import type { CoreFieldRegistryItem, FormConfigurationListItem } from "./model/form-configuration.types";
import { activateTrainingFormConfiguration, createTrainingFormConfiguration, deactivateTrainingFormConfiguration, deleteTrainingFormConfiguration, getTrainingFormConfiguration, getTrainingFormConfigurationAssignments, getTrainingFormConfigurationAudit, getTrainingFormConfigurationVersion, getTrainingFormFieldRegistry, listTrainingFormConfigurationVersions, listTrainingFormConfigurations, publishTrainingFormConfiguration, retireTrainingFormConfiguration, updateTrainingFormConfiguration, updateTrainingFormConfigurationAssignments } from "./services/training-form-configurations.service";

/** Stable query-key factory for the Training Form Configuration domain. */
export const trainingFormConfigurationKeys = {
  all: ["platform", "training-form-configurations"] as const,
  list: () => [...trainingFormConfigurationKeys.all, "list"] as const,
  fieldRegistry: () => [...trainingFormConfigurationKeys.all, "field-registry"] as const,
  detail: (configurationId: string) => [...trainingFormConfigurationKeys.all, "detail", configurationId] as const,
  versions: (configurationId: string) => [...trainingFormConfigurationKeys.detail(configurationId), "versions"] as const,
  version: (configurationId: string, versionId: string) => [...trainingFormConfigurationKeys.versions(configurationId), versionId] as const,
  assignments: (configurationId: string) => [...trainingFormConfigurationKeys.detail(configurationId), "assignments"] as const,
  audit: (configurationId: string) => [...trainingFormConfigurationKeys.detail(configurationId), "audit"] as const,
  assignableTenants: () => [...trainingFormConfigurationKeys.all, "assignable-tenants"] as const,
};

/** Backward-compatible key for the existing list screen. */
export const trainingFormConfigurationListQueryKey = trainingFormConfigurationKeys.list();
/** Backward-compatible key for the existing field-registry screen. */
export const trainingFormFieldRegistryQueryKey = trainingFormConfigurationKeys.fieldRegistry();

function toBuilderRegistryItem(field: Awaited<ReturnType<typeof getTrainingFormFieldRegistry>>[number]): CoreFieldRegistryItem {
  return { key: field.key, displayName: field.display_name, valueType: field.value_type, allowedRenderers: field.allowed_renderers, defaultRenderer: field.default_renderer, requiredByDomain: field.required_by_domain, removable: field.removable, hideable: field.hideable, configurable: { label: field.configurable.label, section: field.configurable.section, position: field.configurable.position, required: field.configurable.required, renderer: field.configurable.renderer, placeholder: field.configurable.placeholder, helpText: field.configurable.help_text, validation: field.configurable.validation } };
}

function toListItem(configuration: Awaited<ReturnType<typeof listTrainingFormConfigurations>>[number]): FormConfigurationListItem {
  return { id: configuration.id, name: configuration.name, description: configuration.description, scope: configuration.scope, status: configuration.status, active: configuration.is_active, currentVersion: configuration.current_version, updatedAt: configuration.updated_at };
}

/** Reads configuration summaries for the existing Platform Admin list screen. */
export function useTrainingFormConfigurations() { return useQuery({ queryKey: trainingFormConfigurationKeys.list(), queryFn: async () => (await listTrainingFormConfigurations()).map(toListItem), retry: 1 }); }
/** Reads and maps the backend registry for the existing builder model. */
export function useTrainingFormFieldRegistry() { return useQuery({ queryKey: trainingFormConfigurationKeys.fieldRegistry(), queryFn: async () => (await getTrainingFormFieldRegistry()).map(toBuilderRegistryItem), retry: 1, staleTime: 60_000 }); }
/** Reads one persisted configuration. */
export function useTrainingFormConfiguration(configurationId: string | undefined) { return useQuery({ queryKey: trainingFormConfigurationKeys.detail(configurationId ?? ""), queryFn: () => getTrainingFormConfiguration(configurationId ?? ""), enabled: Boolean(configurationId), retry: 1 }); }
/** Reads immutable versions for one configuration. */
export function useTrainingFormConfigurationVersions(configurationId: string | undefined) { return useQuery({ queryKey: trainingFormConfigurationKeys.versions(configurationId ?? ""), queryFn: () => listTrainingFormConfigurationVersions(configurationId ?? ""), enabled: Boolean(configurationId), retry: 1 }); }
/** Reads one immutable configuration version. */
export function useTrainingFormConfigurationVersion(configurationId: string | undefined, versionId: string | undefined) { return useQuery({ queryKey: trainingFormConfigurationKeys.version(configurationId ?? "", versionId ?? ""), queryFn: () => getTrainingFormConfigurationVersion(configurationId ?? "", versionId ?? ""), enabled: Boolean(configurationId && versionId), retry: 1 }); }
/** Reads tenant assignments for one configuration. */
export function useTrainingFormConfigurationAssignments(configurationId: string | undefined) { return useQuery({ queryKey: trainingFormConfigurationKeys.assignments(configurationId ?? ""), queryFn: () => getTrainingFormConfigurationAssignments(configurationId ?? ""), enabled: Boolean(configurationId), retry: 1 }); }
/** Reads audit history for one configuration. */
export function useTrainingFormConfigurationAudit(configurationId: string | undefined) { return useQuery({ queryKey: trainingFormConfigurationKeys.audit(configurationId ?? ""), queryFn: () => getTrainingFormConfigurationAudit(configurationId ?? ""), enabled: Boolean(configurationId), retry: 1 }); }
/** Reads real tenant options available to the authenticated Platform Admin. */
export function useTrainingFormConfigurationTenantOptions() { return useQuery({ queryKey: trainingFormConfigurationKeys.assignableTenants(), queryFn: getAuthTenants, retry: 1, staleTime: 60_000 }); }

/** Creates a configuration and refreshes the configuration collection. */
export function useCreateTrainingFormConfiguration() { const queryClient = useQueryClient(); return useMutation({ mutationFn: createTrainingFormConfiguration, onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: trainingFormConfigurationKeys.list() }); } }); }
/** Updates a configuration and refreshes its list and detail projections. */
export function useUpdateTrainingFormConfiguration() { const queryClient = useQueryClient(); return useMutation({ mutationFn: ({ configurationId, payload }: { configurationId: string; payload: UpdateTrainingFormConfigurationRequest }) => updateTrainingFormConfiguration(configurationId, payload), onSuccess: async (_data, variables) => { await Promise.all([queryClient.invalidateQueries({ queryKey: trainingFormConfigurationKeys.list() }), queryClient.invalidateQueries({ queryKey: trainingFormConfigurationKeys.detail(variables.configurationId) })]); } }); }
/** Deletes a configuration and removes stale detail data. */
export function useDeleteTrainingFormConfiguration() { const queryClient = useQueryClient(); return useMutation({ mutationFn: deleteTrainingFormConfiguration, onSuccess: async (_data, configurationId) => { queryClient.removeQueries({ queryKey: trainingFormConfigurationKeys.detail(configurationId) }); await queryClient.invalidateQueries({ queryKey: trainingFormConfigurationKeys.list() }); } }); }
/** Publishes a configuration and refreshes the changed lifecycle and version state. */
export function usePublishTrainingFormConfiguration() { const queryClient = useQueryClient(); return useMutation({ mutationFn: publishTrainingFormConfiguration, onSuccess: async (_data, configurationId) => { await Promise.all([queryClient.invalidateQueries({ queryKey: trainingFormConfigurationKeys.list() }), queryClient.invalidateQueries({ queryKey: trainingFormConfigurationKeys.detail(configurationId) }), queryClient.invalidateQueries({ queryKey: trainingFormConfigurationKeys.versions(configurationId) })]); } }); }
/** Activates a configuration and refreshes its lifecycle state. */
export function useActivateTrainingFormConfiguration() { const queryClient = useQueryClient(); return useMutation({ mutationFn: activateTrainingFormConfiguration, onSuccess: async (_data, configurationId) => { await Promise.all([queryClient.invalidateQueries({ queryKey: trainingFormConfigurationKeys.list() }), queryClient.invalidateQueries({ queryKey: trainingFormConfigurationKeys.detail(configurationId) })]); } }); }
/** Deactivates a configuration and refreshes its lifecycle state. */
export function useDeactivateTrainingFormConfiguration() { const queryClient = useQueryClient(); return useMutation({ mutationFn: deactivateTrainingFormConfiguration, onSuccess: async (_data, configurationId) => { await Promise.all([queryClient.invalidateQueries({ queryKey: trainingFormConfigurationKeys.list() }), queryClient.invalidateQueries({ queryKey: trainingFormConfigurationKeys.detail(configurationId) })]); } }); }
/** Retires a configuration and refreshes its lifecycle projections. */
export function useRetireTrainingFormConfiguration() { const queryClient = useQueryClient(); return useMutation({ mutationFn: retireTrainingFormConfiguration, onSuccess: async (_data, configurationId) => { await Promise.all([queryClient.invalidateQueries({ queryKey: trainingFormConfigurationKeys.list() }), queryClient.invalidateQueries({ queryKey: trainingFormConfigurationKeys.detail(configurationId) }), queryClient.invalidateQueries({ queryKey: trainingFormConfigurationKeys.versions(configurationId) })]); } }); }
/** Replaces assignments and refreshes their detail projection. */
export function useUpdateTrainingFormConfigurationAssignments() { const queryClient = useQueryClient(); return useMutation({ mutationFn: ({ configurationId, payload }: { configurationId: string; payload: UpdateTrainingFormConfigurationAssignmentsRequest }) => updateTrainingFormConfigurationAssignments(configurationId, payload), onSuccess: async (_data, variables) => { await Promise.all([queryClient.invalidateQueries({ queryKey: trainingFormConfigurationKeys.assignments(variables.configurationId) }), queryClient.invalidateQueries({ queryKey: trainingFormConfigurationKeys.detail(variables.configurationId) })]); } }); }
