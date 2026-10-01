"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getPlatformEnterpriseTenants, getPlatformEnterprises } from "@ihp/platform-enterprises";
import type { AssignmentTenantOption } from "./components/AssignmentEditor";
import type { CreateEventFormConfigurationRequest, UpdateEventFormConfigurationAssignmentsRequest, UpdateEventFormConfigurationRequest } from "./model/event-form-configuration-api.types";
import type { CoreFieldRegistryItem, FormConfigurationListItem } from "./model/form-configuration.types";
import { activateEventFormConfiguration, createEventFormConfiguration, createManagedEventType, deactivateEventFormConfiguration, deleteEventFormConfiguration, deleteManagedEventType, getEventFormConfiguration, getEventFormConfigurationAssignments, getEventFormConfigurationAudit, getEventFormConfigurationVersion, getEventFormFieldRegistry, getEventTypeRegistryDefinitions, listEventFormConfigurationVersions, listEventFormConfigurations, listManagedEventTypes, publishEventFormConfiguration, retireEventFormConfiguration, updateEventFormConfiguration, updateEventFormConfigurationAssignments, updateManagedEventType, type EventTypeMutation } from "./services/form-configurations.service";

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
  eventTypes: () => ["platform", "event-types"] as const,
};

/** Backward-compatible key for the existing list screen. */
export const eventFormConfigurationListQueryKey = eventFormConfigurationKeys.list();
/** Backward-compatible key for the existing field-registry screen. */
export const eventFormFieldRegistryQueryKey = eventFormConfigurationKeys.fieldRegistry();

function toBuilderRegistryItem(field: Awaited<ReturnType<typeof getEventFormFieldRegistry>>[number]): CoreFieldRegistryItem {
  return { key: field.key, displayName: field.display_name, valueType: field.value_type, allowedRenderers: field.allowed_renderers, defaultRenderer: field.default_renderer, requiredByDomain: field.required_by_domain, removable: field.removable, hideable: field.hideable, options: field.options ?? [], valueSource: field.value_source, sourceEndpoint: field.source_endpoint, dependsOn: field.depends_on, configurable: { label: field.configurable.label, section: field.configurable.section, position: field.configurable.position, required: field.configurable.required, renderer: field.configurable.renderer, placeholder: field.configurable.placeholder, helpText: field.configurable.help_text, validation: field.configurable.validation } };
}

function toEventTypeRegistryItem(eventTypes: Awaited<ReturnType<typeof getEventTypeRegistryDefinitions>>): CoreFieldRegistryItem {
  return { key: "event_type", displayName: "Event Type", valueType: "string", allowedRenderers: ["select"], defaultRenderer: "select", requiredByDomain: false, removable: false, hideable: true, options: eventTypes.filter((item) => item.active).map((item, index) => ({ value: item.key, label: item.name, position: index + 1 })), valueSource: "event_types", sourceEndpoint: "/api/v1/event-types/", dependsOn: null, configurable: { label: false, section: true, position: true, required: true, renderer: false, placeholder: false, helpText: false, validation: false } };
}

function toListItem(configuration: Awaited<ReturnType<typeof listEventFormConfigurations>>[number]): FormConfigurationListItem {
  return { id: configuration.id, name: configuration.name, description: configuration.description, scope: configuration.scope, status: configuration.status, active: configuration.is_active, currentVersion: configuration.current_version, createdAt: configuration.created_at, updatedAt: configuration.updated_at, publishedAt: configuration.published_at };
}

/** Reads configuration summaries for the existing Platform Admin list screen. */
export function useEventFormConfigurations() { return useQuery({ queryKey: eventFormConfigurationKeys.list(), queryFn: async () => (await listEventFormConfigurations()).map(toListItem), retry: 1 }); }
/** Lists all Event Types for Super Admin management. */
export function useManagedEventTypes() { return useQuery({ queryKey: eventFormConfigurationKeys.eventTypes(), queryFn: listManagedEventTypes, retry: 1 }); }
/** Reads and maps the backend registry for the existing builder model. */
export function useEventFormFieldRegistry() { return useQuery({ queryKey: eventFormConfigurationKeys.fieldRegistry(), queryFn: async () => { const [registry, eventTypes] = await Promise.all([getEventFormFieldRegistry(), getEventTypeRegistryDefinitions()]); const mapped = registry.map(toBuilderRegistryItem); return mapped.some((field) => field.key === "event_type") ? mapped : [...mapped, toEventTypeRegistryItem(eventTypes)]; }, retry: 1, staleTime: 60_000 }); }
/** Reads one persisted configuration. */
export function useEventFormConfiguration(configurationId: string | undefined) { return useQuery({ queryKey: eventFormConfigurationKeys.detail(configurationId ?? ""), queryFn: () => getEventFormConfiguration(configurationId ?? ""), enabled: Boolean(configurationId), retry: 1 }); }
/** Reads immutable versions for one configuration. */
export function useEventFormConfigurationVersions(configurationId: string | undefined) { return useQuery({ queryKey: eventFormConfigurationKeys.versions(configurationId ?? ""), queryFn: () => listEventFormConfigurationVersions(configurationId ?? ""), enabled: Boolean(configurationId), retry: 1 }); }
/** Reads one immutable configuration version. */
export function useEventFormConfigurationVersion(configurationId: string | undefined, versionId: string | undefined) { return useQuery({ queryKey: eventFormConfigurationKeys.version(configurationId ?? "", versionId ?? ""), queryFn: () => getEventFormConfigurationVersion(configurationId ?? "", versionId ?? ""), enabled: Boolean(configurationId && versionId), retry: 1 }); }
/** Reads tenant assignments for one configuration. */
export function useEventFormConfigurationAssignments(configurationId: string | undefined) { return useQuery({ queryKey: eventFormConfigurationKeys.assignments(configurationId ?? ""), queryFn: () => getEventFormConfigurationAssignments(configurationId ?? ""), enabled: Boolean(configurationId), retry: 1 }); }
/** Reads audit history for one configuration. */
export function useEventFormConfigurationAudit(configurationId: string | undefined, isEnabled = true) { return useQuery({ queryKey: eventFormConfigurationKeys.audit(configurationId ?? ""), queryFn: () => getEventFormConfigurationAudit(configurationId ?? ""), enabled: Boolean(configurationId) && isEnabled, retry: 1 }); }
/** Reads canonical Enterprise-module tenant UUIDs through the authenticated Platform BFF. */
export function useEventFormConfigurationTenantOptions(enabled = true) {
  return useQuery({
    queryKey: eventFormConfigurationKeys.assignableTenants(),
    queryFn: async (): Promise<AssignmentTenantOption[]> => {
      const [response, enterprises] = await Promise.all([
        getPlatformEnterpriseTenants(),
        getPlatformEnterprises(),
      ]);
      const linkedTenantIds = new Set(
        enterprises
          .map((enterprise) => enterprise.tenant_id)
          .filter((tenantId): tenantId is string => Boolean(tenantId)),
      );
      return response.items
        .filter((tenant) => linkedTenantIds.has(tenant.id))
        .map((tenant) => ({ id: tenant.id, name: tenant.name, slug: tenant.slug }));
    },
    retry: 1,
    staleTime: 60_000,
    enabled,
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
/** Creates an Event Type and refreshes Event Type caches. */
export function useCreateManagedEventType() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (payload: EventTypeMutation) => createManagedEventType(payload), onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: eventFormConfigurationKeys.eventTypes() }), queryClient.invalidateQueries({ queryKey: ["enterprise", "event-types"] })]); } }); }
/** Updates an Event Type and refreshes Event Type caches. */
export function useUpdateManagedEventType() { const queryClient = useQueryClient(); return useMutation({ mutationFn: ({ id, payload }: { id: string; payload: Partial<Omit<EventTypeMutation, "key">> }) => updateManagedEventType(id, payload), onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: eventFormConfigurationKeys.eventTypes() }), queryClient.invalidateQueries({ queryKey: ["enterprise", "event-types"] })]); } }); }
/** Deletes an Event Type and refreshes Event Type caches. */
export function useDeleteManagedEventType() { const queryClient = useQueryClient(); return useMutation({ mutationFn: deleteManagedEventType, onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: eventFormConfigurationKeys.eventTypes() }), queryClient.invalidateQueries({ queryKey: ["enterprise", "event-types"] })]); } }); }
