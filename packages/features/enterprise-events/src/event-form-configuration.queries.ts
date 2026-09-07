"use client";

import { useQuery } from "@tanstack/react-query";
import { getActiveEventFormConfiguration } from "./events.service";

/** Stable query keys for Event form-configuration resolution. */
export const eventFormConfigurationQueryKeys = {
  active: () => ["events", "form-configuration", "active"] as const,
};

/** Resolves the active Event form configuration from the authenticated browser session. */
export function useActiveEventFormConfiguration(enabled = true) {
  return useQuery({ queryKey: eventFormConfigurationQueryKeys.active(), queryFn: getActiveEventFormConfiguration, enabled, staleTime: 30_000, retry: 1 });
}
