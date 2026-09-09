"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getPlatformEnterpriseTenants } from "@ihp/platform-enterprises";
import type { AssignmentTenantOption } from "./components/AssignmentEditor";
import type { CreateEventFormConfigurationRequest, UpdateEventFormConfigurationAssignmentsRequest, UpdateEventFormConfigurationRequest } from "./model/event-form-configuration-api.types";
import type { CoreFieldRegistryItem, FormConfigurationListItem } from "./model/form-configuration.types";
import { activateEventFormConfiguration, createEventFormConfiguration, deactivateEventFormConfiguration, deleteEventFormConfiguration, getEventFormConfiguration, getEventFormConfigurationAssignments, getEventFormConfigurationAudit, getEventFormConfigurationVersion, getEventFormFieldRegistry, listEventFormConfigurationVersions, listEventFormConfigurations, publishEventFormConfiguration, retireEventFormConfiguration, updateEventFormConfiguration, updateEventFormConfigurationAssignments } from "./services/form-configurations.service";

/** Stable query-key factory for the Event Form Configuration domain. */
export const eventFormConfigurationKeys = {
  all: ["platform", "event-form-configurations"] as const,
  list: () => [...eventFormConfigurationKeys.all, "list"] as const,
  fieldRegistry: () => [...eventFormConfigurationKeys.all, "field-registry"] as const,
  detail: (configurationId: string) => [...eventFormConfigurationKeys.all, "detail", configurationId] as const,
  versions: (configurationId: string) => [...eventFormConfigurationKeys.detail(configurationId), "versions"] as const,
  version: (configurationId: string, versionId: string) => [...eventFormConfigurationKeys.versions(configurationId), versionId] as const,
  assignments: (configurationId: string) => [...eventFormConfigurationKeys.detail(configurationId), "assignments"] as const,
  audit: (configurationId: string) => [...eventFormConfigurationKeys.detail(configurationId), "audit"] as const,
  assignableTenants: () => [...eventFormConfigurationKeys.all, "assignable-tenants"] as const,
};

/** Backward-compatible key for the existing list screen. */
export const eventFormConfigurationListQueryKey = eventFormConfigurationKeys.list();
/** Backward-compatible key for the existing field-registry screen. */
export const eventFormFieldRegistryQueryKey = eventFormConfigurationKeys.fieldRegistry();

function toBuilderRegistryItem(field: Awaited<ReturnType<typeof getEventFormFieldRegistry>>[number]): CoreFieldRegistryItem {
  return { key: field.key, displayName: field.display_name, valueType: field.value_type, allowedRenderers: field.allowed_renderers, defaultRenderer: field.default_renderer, requiredByDomain: field.required_by_domain, removable: field.removable, hideable: field.hideable, configurable: { label: field.configurable.label, section: field.configurable.section, position: field.configurable.position, required: field.configurable.required, renderer: field.configurable.renderer, placeholder: field.configurable.placeholder, helpText: field.configurable.help_text, validation: field.configurable.validation } };
}

function toListItem(configuration: Awaited<ReturnType<typeof listEventFormConfigurations>>[number]): FormConfigurationListItem {
  return { id: configuration.id, name: configuration.name, description: configuration.description, scope: configuration.scope, status: configuration.status, active: configuration.is_active, currentVersion: configuration.current_version, updatedAt: configuration.updated_at };
}

/** Reads configuration summaries for the existing Platform Admin list screen. */
export function useEventFormConfigurations() { return useQuery({ queryKey: eventFormConfigurationKeys.list(), queryFn: async () => (await listEventFormConfigurations()).map(toListItem), retry: 1 }); }
/** Reads and maps the backend registry for the existing builder model. */
export function useEventFormFieldRegistry() { return useQuery({ queryKey: eventFormConfigurationKeys.fieldRegistry(), queryFn: async () => (await getEventFormFieldRegistry()).map(toBuilderRegistryItem), retry: 1, staleTime: 60_000 }); }
/** Reads one persisted configuration. */
export function useEventFormConfiguration(configurationId: string | undefined) { return useQuery({ queryKey: eventFormConfigurationKeys.detail(configurationId ?? ""), queryFn: () => getEventFormConfiguration(configurationId ?? ""), enabled: Boolean(configurationId), retry: 1 }); }
/** Reads immutable versions for one configuration. */
export function useEventFormConfigurationVersions(configurationId: string | undefined) { return useQuery({ queryKey: eventFormConfigurationKeys.versions(configurationId ?? ""), queryFn: () => listEventFormConfigurationVersions(configurationId ?? ""), enabled: Boolean(configurationId), retry: 1 }); }
/** Reads one immutable configuration version. */
export function useEventFormConfigurationVersion(configurationId: string | undefined, versionId: string | undefined) { return useQuery({ queryKey: eventFormConfigurationKeys.version(configurationId ?? "", versionId ?? ""), queryFn: () => getEventFormConfigurationVersion(configurationId ?? "", versionId ?? ""), enabled: Boolean(configurationId && versionId), retry: 1 }); }
/** Reads tenant assignments for one configuration. */
export function useEventFormConfigurationAssignments(configurationId: string | undefined) { return useQuery({ queryKey: eventFormConfigurationKeys.assignments(configurationId ?? ""), queryFn: () => getEventFormConfigurationAssignments(configurationId ?? ""), enabled: Boolean(configurationId), retry: 1 }); }
/** Reads audit history for one configuration. */
export function useEventFormConfigurationAudit(configurationId: string | undefined) { return useQuery({ queryKey: eventFormConfigurationKeys.audit(configurationId ?? ""), queryFn: () => getEventFormConfigurationAudit(configurationId ?? ""), enabled: Boolean(configurationId), retry: 1 }); }
/** Reads canonical Enterprise-module tenant UUIDs through the authenticated Platform BFF. */
export function useEventFormConfigurationTenantOptions() {
  return useQuery({
    queryKey: eventFormConfigurationKeys.assignableTenants(),
    queryFn: async (): Promise<AssignmentTenantOption[]> => {
      const response = await getPlatformEnterpriseTenants();
      return response.items.map((tenant) => ({ id: tenant.id, name: tenant.name, slug: tenant.slug }));
    },
    retry: 1,
    staleTime: 60_000,
  });
}

/** Creates a configuration and refreshes the configuration collection. */
export function useCreateEventFormConfiguration() { const queryClient = useQueryClient(); return useMutation({ mutationFn: createEventFormConfiguration, onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: eventFormConfigurationKeys.list() }); } }); }
/** Updates a configuration and refreshes its list and detail projections. */
export function useUpdateEventFormConfiguration() { const queryClient = useQueryClient(); return useMutation({ mutationFn: ({ configurationId, payload }: { configurationId: string; payload: UpdateEventFormConfigurationRequest }) => updateEventFormConfiguration(configurationId, payload), onSuccess: async (_data, variables) => { await Promise.all([queryClient.invalidateQueries({ queryKey: eventFormConfigurationKeys.list() }), queryClient.invalidateQueries({ queryKey: eventFormConfigurationKeys.detail(variables.configurationId) })]); } }); }
/** Deletes a configuration and removes stale detail data. */
export function useDeleteEventFormConfiguration() { const queryClient = useQueryClient(); return useMutation({ mutationFn: deleteEventFormConfiguration, onSuccess: async (_data, configurationId) => { queryClient.removeQueries({ queryKey: eventFormConfigurationKeys.detail(configurationId) }); await queryClient.invalidateQueries({ queryKey: eventFormConfigurationKeys.list() }); } }); }
/** Publishes a configuration and refreshes the changed lifecycle and version state. */
export function usePublishEventFormConfiguration() { const queryClient = useQueryClient(); return useMutation({ mutationFn: publishEventFormConfiguration, onSuccess: async (_data, configurationId) => { await Promise.all([queryClient.invalidateQueries({ queryKey: eventFormConfigurationKeys.list() }), queryClient.invalidateQueries({ queryKey: eventFormConfigurationKeys.detail(configurationId) }), queryClient.invalidateQueries({ queryKey: eventFormConfigurationKeys.versions(configurationId) })]); } }); }
/** Activates a configuration and refreshes its lifecycle state. */
export function useActivateEventFormConfiguration() { const queryClient = useQueryClient(); return useMutation({ mutationFn: activateEventFormConfiguration, onSuccess: async (_data, configurationId) => { await Promise.all([queryClient.invalidateQueries({ queryKey: eventFormConfigurationKeys.list() }), queryClient.invalidateQueries({ queryKey: eventFormConfigurationKeys.detail(configurationId) })]); } }); }
/** Deactivates a configuration and refreshes its lifecycle state. */
export function useDeactivateEventFormConfiguration() { const queryClient = useQueryClient(); return useMutation({ mutationFn: deactivateEventFormConfiguration, onSuccess: async (_data, configurationId) => { await Promise.all([queryClient.invalidateQueries({ queryKey: eventFormConfigurationKeys.list() }), queryClient.invalidateQueries({ queryKey: eventFormConfigurationKeys.detail(configurationId) })]); } }); }
/** Retires a configuration and refreshes its lifecycle projections. */
export function useRetireEventFormConfiguration() { const queryClient = useQueryClient(); return useMutation({ mutationFn: retireEventFormConfiguration, onSuccess: async (_data, configurationId) => { await Promise.all([queryClient.invalidateQueries({ queryKey: eventFormConfigurationKeys.list() }), queryClient.invalidateQueries({ queryKey: eventFormConfigurationKeys.detail(configurationId) }), queryClient.invalidateQueries({ queryKey: eventFormConfigurationKeys.versions(configurationId) })]); } }); }
/** Replaces assignments and refreshes their detail projection. */
export function useUpdateEventFormConfigurationAssignments() { const queryClient = useQueryClient(); return useMutation({ mutationFn: ({ configurationId, payload }: { configurationId: string; payload: UpdateEventFormConfigurationAssignmentsRequest }) => updateEventFormConfigurationAssignments(configurationId, payload), onSuccess: async (_data, variables) => { await Promise.all([queryClient.invalidateQueries({ queryKey: eventFormConfigurationKeys.assignments(variables.configurationId) }), queryClient.invalidateQueries({ queryKey: eventFormConfigurationKeys.detail(variables.configurationId) })]); } }); }
