"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@ihp/auth";
import { getActiveEventFormConfiguration, getEventHistoricalFormConfiguration } from "./events.service";

/** Stable query keys for Event form-configuration resolution. */
export const eventFormConfigurationQueryKeys = {
  active: () => ["events", "form-configuration", "active"] as const,
  historical: (eventId: string) => ["events", "form-configuration", "historical", eventId] as const,
};

/** Resolves the active Event form configuration from the authenticated browser session. */
export function useActiveEventFormConfiguration(enabled = true) {
  const { authReady } = useAuth();
  return useQuery({ queryKey: eventFormConfigurationQueryKeys.active(), queryFn: getActiveEventFormConfiguration, enabled: enabled && authReady, staleTime: 30_000, retry: 1 });
}

/** Resolves only the immutable form version associated with the supplied Event. */
export function useEventHistoricalFormConfiguration(eventId: string | undefined, enabled = true) {
  const { authReady } = useAuth();
  return useQuery({ queryKey: eventFormConfigurationQueryKeys.historical(eventId ?? ""), queryFn: () => getEventHistoricalFormConfiguration(eventId ?? ""), enabled: enabled && authReady && Boolean(eventId), staleTime: 30_000, retry: 1 });
}
