"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAuthTenants } from "@ihp/auth";
import type { CreateCourseFormConfigurationRequest, UpdateCourseFormConfigurationAssignmentsRequest, UpdateCourseFormConfigurationRequest } from "./model/course-form-configuration-api.types";
import type { CoreFieldRegistryItem, FormConfigurationListItem } from "./model/form-configuration.types";
import { activateCourseFormConfiguration, createCourseFormConfiguration, deactivateCourseFormConfiguration, deleteCourseFormConfiguration, getCourseFormConfiguration, getCourseFormConfigurationAssignments, getCourseFormConfigurationAudit, getCourseFormConfigurationVersion, getCourseFormFieldRegistry, listCourseFormConfigurationVersions, listCourseFormConfigurations, publishCourseFormConfiguration, retireCourseFormConfiguration, updateCourseFormConfiguration, updateCourseFormConfigurationAssignments } from "./services/course-form-configurations.service";

/** Stable query-key factory for the Course Form Configuration domain. */
export const courseFormConfigurationKeys = {
  all: ["platform", "course-form-configurations"] as const,
  list: () => [...courseFormConfigurationKeys.all, "list"] as const,
  fieldRegistry: () => [...courseFormConfigurationKeys.all, "field-registry"] as const,
  detail: (configurationId: string) => [...courseFormConfigurationKeys.all, "detail", configurationId] as const,
  versions: (configurationId: string) => [...courseFormConfigurationKeys.detail(configurationId), "versions"] as const,
  version: (configurationId: string, versionId: string) => [...courseFormConfigurationKeys.versions(configurationId), versionId] as const,
  assignments: (configurationId: string) => [...courseFormConfigurationKeys.detail(configurationId), "assignments"] as const,
  audit: (configurationId: string) => [...courseFormConfigurationKeys.detail(configurationId), "audit"] as const,
  assignableTenants: () => [...courseFormConfigurationKeys.all, "assignable-tenants"] as const,
};

/** Backward-compatible key for the existing list screen. */
export const courseFormConfigurationListQueryKey = courseFormConfigurationKeys.list();
/** Backward-compatible key for the existing field-registry screen. */
export const courseFormFieldRegistryQueryKey = courseFormConfigurationKeys.fieldRegistry();

function toBuilderRegistryItem(field: Awaited<ReturnType<typeof getCourseFormFieldRegistry>>[number]): CoreFieldRegistryItem {
  return { key: field.key, displayName: field.display_name, valueType: field.value_type, allowedRenderers: field.allowed_renderers, defaultRenderer: field.default_renderer, requiredByDomain: field.required_by_domain, removable: field.removable, hideable: field.hideable, configurable: { label: field.configurable.label, section: field.configurable.section, position: field.configurable.position, required: field.configurable.required, renderer: field.configurable.renderer, placeholder: field.configurable.placeholder, helpText: field.configurable.help_text, validation: field.configurable.validation } };
}

function toListItem(configuration: Awaited<ReturnType<typeof listCourseFormConfigurations>>[number]): FormConfigurationListItem {
  return { id: configuration.id, name: configuration.name, description: configuration.description, scope: configuration.scope, status: configuration.status, active: configuration.is_active, currentVersion: configuration.current_version, updatedAt: configuration.updated_at };
}

/** Reads configuration summaries for the existing Platform Admin list screen. */
export function useCourseFormConfigurations() { return useQuery({ queryKey: courseFormConfigurationKeys.list(), queryFn: async () => (await listCourseFormConfigurations()).map(toListItem), retry: 1 }); }
/** Reads and maps the backend registry for the existing builder model. */
export function useCourseFormFieldRegistry() { return useQuery({ queryKey: courseFormConfigurationKeys.fieldRegistry(), queryFn: async () => (await getCourseFormFieldRegistry()).map(toBuilderRegistryItem), retry: 1, staleTime: 60_000 }); }
/** Reads one persisted configuration. */
export function useCourseFormConfiguration(configurationId: string | undefined) { return useQuery({ queryKey: courseFormConfigurationKeys.detail(configurationId ?? ""), queryFn: () => getCourseFormConfiguration(configurationId ?? ""), enabled: Boolean(configurationId), retry: 1 }); }
/** Reads immutable versions for one configuration. */
export function useCourseFormConfigurationVersions(configurationId: string | undefined) { return useQuery({ queryKey: courseFormConfigurationKeys.versions(configurationId ?? ""), queryFn: () => listCourseFormConfigurationVersions(configurationId ?? ""), enabled: Boolean(configurationId), retry: 1 }); }
/** Reads one immutable configuration version. */
export function useCourseFormConfigurationVersion(configurationId: string | undefined, versionId: string | undefined) { return useQuery({ queryKey: courseFormConfigurationKeys.version(configurationId ?? "", versionId ?? ""), queryFn: () => getCourseFormConfigurationVersion(configurationId ?? "", versionId ?? ""), enabled: Boolean(configurationId && versionId), retry: 1 }); }
/** Reads tenant assignments for one configuration. */
export function useCourseFormConfigurationAssignments(configurationId: string | undefined) { return useQuery({ queryKey: courseFormConfigurationKeys.assignments(configurationId ?? ""), queryFn: () => getCourseFormConfigurationAssignments(configurationId ?? ""), enabled: Boolean(configurationId), retry: 1 }); }
/** Reads audit history for one configuration. */
export function useCourseFormConfigurationAudit(configurationId: string | undefined) { return useQuery({ queryKey: courseFormConfigurationKeys.audit(configurationId ?? ""), queryFn: () => getCourseFormConfigurationAudit(configurationId ?? ""), enabled: Boolean(configurationId), retry: 1 }); }
/** Reads real tenant options available to the authenticated Platform Admin. */
export function useCourseFormConfigurationTenantOptions() { return useQuery({ queryKey: courseFormConfigurationKeys.assignableTenants(), queryFn: getAuthTenants, retry: 1, staleTime: 60_000 }); }

/** Creates a configuration and refreshes the configuration collection. */
export function useCreateCourseFormConfiguration() { const queryClient = useQueryClient(); return useMutation({ mutationFn: createCourseFormConfiguration, onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: courseFormConfigurationKeys.list() }); } }); }
/** Updates a configuration and refreshes its list and detail projections. */
export function useUpdateCourseFormConfiguration() { const queryClient = useQueryClient(); return useMutation({ mutationFn: ({ configurationId, payload }: { configurationId: string; payload: UpdateCourseFormConfigurationRequest }) => updateCourseFormConfiguration(configurationId, payload), onSuccess: async (_data, variables) => { await Promise.all([queryClient.invalidateQueries({ queryKey: courseFormConfigurationKeys.list() }), queryClient.invalidateQueries({ queryKey: courseFormConfigurationKeys.detail(variables.configurationId) })]); } }); }
/** Deletes a configuration and removes stale detail data. */
export function useDeleteCourseFormConfiguration() { const queryClient = useQueryClient(); return useMutation({ mutationFn: deleteCourseFormConfiguration, onSuccess: async (_data, configurationId) => { queryClient.removeQueries({ queryKey: courseFormConfigurationKeys.detail(configurationId) }); await queryClient.invalidateQueries({ queryKey: courseFormConfigurationKeys.list() }); } }); }
/** Publishes a configuration and refreshes the changed lifecycle and version state. */
export function usePublishCourseFormConfiguration() { const queryClient = useQueryClient(); return useMutation({ mutationFn: publishCourseFormConfiguration, onSuccess: async (_data, configurationId) => { await Promise.all([queryClient.invalidateQueries({ queryKey: courseFormConfigurationKeys.list() }), queryClient.invalidateQueries({ queryKey: courseFormConfigurationKeys.detail(configurationId) }), queryClient.invalidateQueries({ queryKey: courseFormConfigurationKeys.versions(configurationId) })]); } }); }
/** Activates a configuration and refreshes its lifecycle state. */
export function useActivateCourseFormConfiguration() { const queryClient = useQueryClient(); return useMutation({ mutationFn: activateCourseFormConfiguration, onSuccess: async (_data, configurationId) => { await Promise.all([queryClient.invalidateQueries({ queryKey: courseFormConfigurationKeys.list() }), queryClient.invalidateQueries({ queryKey: courseFormConfigurationKeys.detail(configurationId) })]); } }); }
/** Deactivates a configuration and refreshes its lifecycle state. */
export function useDeactivateCourseFormConfiguration() { const queryClient = useQueryClient(); return useMutation({ mutationFn: deactivateCourseFormConfiguration, onSuccess: async (_data, configurationId) => { await Promise.all([queryClient.invalidateQueries({ queryKey: courseFormConfigurationKeys.list() }), queryClient.invalidateQueries({ queryKey: courseFormConfigurationKeys.detail(configurationId) })]); } }); }
/** Retires a configuration and refreshes its lifecycle projections. */
export function useRetireCourseFormConfiguration() { const queryClient = useQueryClient(); return useMutation({ mutationFn: retireCourseFormConfiguration, onSuccess: async (_data, configurationId) => { await Promise.all([queryClient.invalidateQueries({ queryKey: courseFormConfigurationKeys.list() }), queryClient.invalidateQueries({ queryKey: courseFormConfigurationKeys.detail(configurationId) }), queryClient.invalidateQueries({ queryKey: courseFormConfigurationKeys.versions(configurationId) })]); } }); }
/** Replaces assignments and refreshes their detail projection. */
export function useUpdateCourseFormConfigurationAssignments() { const queryClient = useQueryClient(); return useMutation({ mutationFn: ({ configurationId, payload }: { configurationId: string; payload: UpdateCourseFormConfigurationAssignmentsRequest }) => updateCourseFormConfigurationAssignments(configurationId, payload), onSuccess: async (_data, variables) => { await Promise.all([queryClient.invalidateQueries({ queryKey: courseFormConfigurationKeys.assignments(variables.configurationId) }), queryClient.invalidateQueries({ queryKey: courseFormConfigurationKeys.detail(variables.configurationId) })]); } }); }

