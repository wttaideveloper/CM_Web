"use client";

import { useQuery } from "@tanstack/react-query";
import { getProgramFormConfigActive } from "./program-form-config.service";

/** Stable query keys for Program form-configuration resolution. */
export const programFormConfigurationQueryKeys = {
  active: () => ["programs", "form-configuration", "active"] as const,
};

/** Resolves the active Program form configuration from the authenticated browser session. */
export function useActiveProgramFormConfiguration(enabled = true) {
  return useQuery({ queryKey: programFormConfigurationQueryKeys.active(), queryFn: getProgramFormConfigActive, enabled, staleTime: 30_000, retry: 1 });
}
