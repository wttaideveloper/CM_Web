"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  listEventGroupAttendees,
  listEventGroupEvents,
  listEventGroupGroups,
  listEventGroupProviders,
} from "./event-group.service.ts";
import type {
  EventGroupAttendeeListParams,
  EventGroupEventListParams,
  EventGroupProviderListParams,
} from "./event-group.types";

export const eventGroupQueryKeys = {
  all: ["event-group"] as const,
  events: (params: Omit<EventGroupEventListParams, "signal"> = {}) => ["event-group", "events", params.q ?? "", params.status ?? "", params.page ?? 1, params.pageSize ?? 20] as const,
  attendees: (eventId: string, params: Omit<EventGroupAttendeeListParams, "signal"> = {}) => ["event-group", "attendees", eventId, params.q ?? "", params.eligibleOnly ?? "", params.registrationStatus ?? "", params.paymentStatus ?? "", params.notInGroup ?? "", params.groupId ?? "", params.page ?? 1, params.pageSize ?? 50] as const,
  providers: (eventId: string, params: Omit<EventGroupProviderListParams, "signal"> = {}) => ["event-group", "providers", eventId, params.q ?? ""] as const,
  groups: (eventId: string) => ["event-group", "groups", eventId] as const,
} as const;

export function useEventGroupEvents(params: Omit<EventGroupEventListParams, "signal"> = {}, enabled = true) {
  return useQuery({
    queryKey: eventGroupQueryKeys.events(params),
    queryFn: ({ signal }) => listEventGroupEvents({ ...params, signal }),
    enabled,
    staleTime: 30_000,
    retry: false,
    placeholderData: keepPreviousData,
  });
}

export function useEventGroupAttendees(eventId: string, params: Omit<EventGroupAttendeeListParams, "signal"> = {}, enabled = true) {
  return useQuery({
    queryKey: eventGroupQueryKeys.attendees(eventId, params),
    queryFn: ({ signal }) => listEventGroupAttendees(eventId, { ...params, signal }),
    enabled: enabled && Boolean(eventId.trim()),
    staleTime: 15_000,
    retry: false,
    placeholderData: keepPreviousData,
  });
}

export function useEventGroupProviders(eventId: string, params: Omit<EventGroupProviderListParams, "signal"> = {}, enabled = true) {
  return useQuery({
    queryKey: eventGroupQueryKeys.providers(eventId, params),
    queryFn: ({ signal }) => listEventGroupProviders(eventId, { ...params, signal }),
    enabled: enabled && Boolean(eventId.trim()),
    staleTime: 15_000,
    retry: false,
    placeholderData: keepPreviousData,
  });
}

export function useEventGroupGroups(eventId: string, enabled = true) {
  return useQuery({
    queryKey: eventGroupQueryKeys.groups(eventId),
    queryFn: ({ signal }) => listEventGroupGroups(eventId, signal),
    enabled: enabled && Boolean(eventId.trim()),
    staleTime: 15_000,
    retry: false,
  });
}
