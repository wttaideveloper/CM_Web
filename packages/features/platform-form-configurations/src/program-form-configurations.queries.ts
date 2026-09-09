"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAuthTenants } from "@ihp/auth";
import type { CreateProgramFormConfigurationRequest, UpdateProgramFormConfigurationAssignmentsRequest, UpdateProgramFormConfigurationRequest } from "./model/program-form-configuration-api.types";
import type { CoreFieldRegistryItem, FormConfigurationListItem } from "./model/form-configuration.types";
import { activateProgramFormConfiguration, createProgramFormConfiguration, deactivateProgramFormConfiguration, deleteProgramFormConfiguration, getProgramFormConfiguration, getProgramFormConfigurationAssignments, getProgramFormConfigurationAudit, getProgramFormConfigurationVersion, getProgramFormFieldRegistry, listProgramFormConfigurationVersions, listProgramFormConfigurations, publishProgramFormConfiguration, retireProgramFormConfiguration, updateProgramFormConfiguration, updateProgramFormConfigurationAssignments } from "./services/program-form-configurations.service";

/** Stable query-key factory for the Program Form Configuration domain. */
export const programFormConfigurationKeys = {
  all: ["platform", "program-form-configurations"] as const,
  list: () => [...programFormConfigurationKeys.all, "list"] as const,
  fieldRegistry: () => [...programFormConfigurationKeys.all, "field-registry"] as const,
  detail: (configurationId: string) => [...programFormConfigurationKeys.all, "detail", configurationId] as const,
  versions: (configurationId: string) => [...programFormConfigurationKeys.detail(configurationId), "versions"] as const,
  version: (configurationId: string, versionId: string) => [...programFormConfigurationKeys.versions(configurationId), versionId] as const,
  assignments: (configurationId: string) => [...programFormConfigurationKeys.detail(configurationId), "assignments"] as const,
  audit: (configurationId: string) => [...programFormConfigurationKeys.detail(configurationId), "audit"] as const,
  assignableTenants: () => [...programFormConfigurationKeys.all, "assignable-tenants"] as const,
};

/** Backward-compatible key for the existing list screen. */
export const programFormConfigurationListQueryKey = programFormConfigurationKeys.list();
/** Backward-compatible key for the existing field-registry screen. */
export const programFormFieldRegistryQueryKey = programFormConfigurationKeys.fieldRegistry();

function toBuilderRegistryItem(field: Awaited<ReturnType<typeof getProgramFormFieldRegistry>>[number]): CoreFieldRegistryItem {
  return { key: field.key, displayName: field.display_name, valueType: field.value_type, allowedRenderers: field.allowed_renderers, defaultRenderer: field.default_renderer, requiredByDomain: field.required_by_domain, removable: field.removable, hideable: field.hideable, configurable: { label: field.configurable.label, section: field.configurable.section, position: field.configurable.position, required: field.configurable.required, renderer: field.configurable.renderer, placeholder: field.configurable.placeholder, helpText: field.configurable.help_text, validation: field.configurable.validation } };
}

function toListItem(configuration: Awaited<ReturnType<typeof listProgramFormConfigurations>>[number]): FormConfigurationListItem {
  return { id: configuration.id, name: configuration.name, description: configuration.description, scope: configuration.scope, status: configuration.status, active: configuration.is_active, currentVersion: configuration.current_version, updatedAt: configuration.updated_at };
}

/** Reads configuration summaries for the existing Platform Admin list screen. */
export function useProgramFormConfigurations() { return useQuery({ queryKey: programFormConfigurationKeys.list(), queryFn: async () => (await listProgramFormConfigurations()).map(toListItem), retry: 1 }); }
/** Reads and maps the backend registry for the existing builder model. */
export function useProgramFormFieldRegistry() { return useQuery({ queryKey: programFormConfigurationKeys.fieldRegistry(), queryFn: async () => (await getProgramFormFieldRegistry()).map(toBuilderRegistryItem), retry: 1, staleTime: 60_000 }); }
/** Reads one persisted configuration. */
export function useProgramFormConfiguration(configurationId: string | undefined) { return useQuery({ queryKey: programFormConfigurationKeys.detail(configurationId ?? ""), queryFn: () => getProgramFormConfiguration(configurationId ?? ""), enabled: Boolean(configurationId), retry: 1 }); }
/** Reads immutable versions for one configuration. */
export function useProgramFormConfigurationVersions(configurationId: string | undefined) { return useQuery({ queryKey: programFormConfigurationKeys.versions(configurationId ?? ""), queryFn: () => listProgramFormConfigurationVersions(configurationId ?? ""), enabled: Boolean(configurationId), retry: 1 }); }
/** Reads one immutable configuration version. */
export function useProgramFormConfigurationVersion(configurationId: string | undefined, versionId: string | undefined) { return useQuery({ queryKey: programFormConfigurationKeys.version(configurationId ?? "", versionId ?? ""), queryFn: () => getProgramFormConfigurationVersion(configurationId ?? "", versionId ?? ""), enabled: Boolean(configurationId && versionId), retry: 1 }); }
/** Reads tenant assignments for one configuration. */
export function useProgramFormConfigurationAssignments(configurationId: string | undefined) { return useQuery({ queryKey: programFormConfigurationKeys.assignments(configurationId ?? ""), queryFn: () => getProgramFormConfigurationAssignments(configurationId ?? ""), enabled: Boolean(configurationId), retry: 1 }); }
/** Reads audit history for one configuration. */
export function useProgramFormConfigurationAudit(configurationId: string | undefined) { return useQuery({ queryKey: programFormConfigurationKeys.audit(configurationId ?? ""), queryFn: () => getProgramFormConfigurationAudit(configurationId ?? ""), enabled: Boolean(configurationId), retry: 1 }); }
/** Reads real tenant options available to the authenticated Platform Admin. */
export function useProgramFormConfigurationTenantOptions() { return useQuery({ queryKey: programFormConfigurationKeys.assignableTenants(), queryFn: getAuthTenants, retry: 1, staleTime: 60_000 }); }

/** Creates a configuration and refreshes the configuration collection. */
export function useCreateProgramFormConfiguration() { const queryClient = useQueryClient(); return useMutation({ mutationFn: createProgramFormConfiguration, onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: programFormConfigurationKeys.list() }); } }); }
/** Updates a configuration and refreshes its list and detail projections. */
export function useUpdateProgramFormConfiguration() { const queryClient = useQueryClient(); return useMutation({ mutationFn: ({ configurationId, payload }: { configurationId: string; payload: UpdateProgramFormConfigurationRequest }) => updateProgramFormConfiguration(configurationId, payload), onSuccess: async (_data, variables) => { await Promise.all([queryClient.invalidateQueries({ queryKey: programFormConfigurationKeys.list() }), queryClient.invalidateQueries({ queryKey: programFormConfigurationKeys.detail(variables.configurationId) })]); } }); }
/** Deletes a configuration and removes stale detail data. */
export function useDeleteProgramFormConfiguration() { const queryClient = useQueryClient(); return useMutation({ mutationFn: deleteProgramFormConfiguration, onSuccess: async (_data, configurationId) => { queryClient.removeQueries({ queryKey: programFormConfigurationKeys.detail(configurationId) }); await queryClient.invalidateQueries({ queryKey: programFormConfigurationKeys.list() }); } }); }
/** Publishes a configuration and refreshes the changed lifecycle and version state. */
export function usePublishProgramFormConfiguration() { const queryClient = useQueryClient(); return useMutation({ mutationFn: publishProgramFormConfiguration, onSuccess: async (_data, configurationId) => { await Promise.all([queryClient.invalidateQueries({ queryKey: programFormConfigurationKeys.list() }), queryClient.invalidateQueries({ queryKey: programFormConfigurationKeys.detail(configurationId) }), queryClient.invalidateQueries({ queryKey: programFormConfigurationKeys.versions(configurationId) })]); } }); }
/** Activates a configuration and refreshes its lifecycle state. */
export function useActivateProgramFormConfiguration() { const queryClient = useQueryClient(); return useMutation({ mutationFn: activateProgramFormConfiguration, onSuccess: async (_data, configurationId) => { await Promise.all([queryClient.invalidateQueries({ queryKey: programFormConfigurationKeys.list() }), queryClient.invalidateQueries({ queryKey: programFormConfigurationKeys.detail(configurationId) })]); } }); }
/** Deactivates a configuration and refreshes its lifecycle state. */
export function useDeactivateProgramFormConfiguration() { const queryClient = useQueryClient(); return useMutation({ mutationFn: deactivateProgramFormConfiguration, onSuccess: async (_data, configurationId) => { await Promise.all([queryClient.invalidateQueries({ queryKey: programFormConfigurationKeys.list() }), queryClient.invalidateQueries({ queryKey: programFormConfigurationKeys.detail(configurationId) })]); } }); }
/** Retires a configuration and refreshes its lifecycle projections. */
export function useRetireProgramFormConfiguration() { const queryClient = useQueryClient(); return useMutation({ mutationFn: retireProgramFormConfiguration, onSuccess: async (_data, configurationId) => { await Promise.all([queryClient.invalidateQueries({ queryKey: programFormConfigurationKeys.list() }), queryClient.invalidateQueries({ queryKey: programFormConfigurationKeys.detail(configurationId) }), queryClient.invalidateQueries({ queryKey: programFormConfigurationKeys.versions(configurationId) })]); } }); }
/** Replaces assignments and refreshes their detail projection. */
export function useUpdateProgramFormConfigurationAssignments() { const queryClient = useQueryClient(); return useMutation({ mutationFn: ({ configurationId, payload }: { configurationId: string; payload: UpdateProgramFormConfigurationAssignmentsRequest }) => updateProgramFormConfigurationAssignments(configurationId, payload), onSuccess: async (_data, variables) => { await Promise.all([queryClient.invalidateQueries({ queryKey: programFormConfigurationKeys.assignments(variables.configurationId) }), queryClient.invalidateQueries({ queryKey: programFormConfigurationKeys.detail(variables.configurationId) })]); } }); }

