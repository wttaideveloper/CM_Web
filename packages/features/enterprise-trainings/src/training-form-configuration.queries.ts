"use client";

import { useQuery } from "@tanstack/react-query";
import { getTrainingFormConfigActive } from "./training-form-config.service";

/** Stable query keys for Training form-configuration resolution. */
export const trainingFormConfigurationQueryKeys = {
  active: () => ["trainings", "form-configuration", "active"] as const,
};

/** Resolves the active Training form configuration from the authenticated browser session. */
export function useActiveTrainingFormConfiguration(enabled = true) {
  return useQuery({ queryKey: trainingFormConfigurationQueryKeys.active(), queryFn: getTrainingFormConfigActive, enabled, staleTime: 30_000, retry: 1 });
}
