"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@ihp/auth";
import { useCurrentEnterprise, useTenant } from "@ihp/enterprise-runtime";
import { getActiveEventFormConfiguration, getEventHistoricalFormConfiguration } from "./events.service";

/** Stable query keys for Event form-configuration resolution. */
export const eventFormConfigurationQueryKeys = {
  active: (tenantId: string | null = null, enterpriseId: string | null = null) => ["events", "form-configuration", "active", tenantId, enterpriseId] as const,
  historical: (eventId: string) => ["events", "form-configuration", "historical", eventId] as const,
};

/** Resolves the active Event form configuration from the authenticated browser session. */
export function useActiveEventFormConfiguration(enabled = true) {
  const { authReady } = useAuth();
  const { tenantId } = useTenant();
  const { enterpriseId } = useCurrentEnterprise();
  return useQuery({
    queryKey: eventFormConfigurationQueryKeys.active(tenantId, enterpriseId),
    queryFn: getActiveEventFormConfiguration,
    enabled: enabled && authReady,
    staleTime: 0,
    retry: 1,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}

/** Resolves only the immutable form version associated with the supplied Event. */
export function useEventHistoricalFormConfiguration(eventId: string | undefined, enabled = true) {
  const { authReady } = useAuth();
  return useQuery({ queryKey: eventFormConfigurationQueryKeys.historical(eventId ?? ""), queryFn: () => getEventHistoricalFormConfiguration(eventId ?? ""), enabled: enabled && authReady && Boolean(eventId), staleTime: 30_000, retry: 1 });
}
