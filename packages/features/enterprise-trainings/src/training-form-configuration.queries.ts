"use client";

import { useQuery } from "@tanstack/react-query";
import { getTrainingFormConfigActive, getTrainingHistoricalFormConfiguration } from "./training-form-config.service";

/** Stable query keys for Training form-configuration resolution. */
export const trainingFormConfigurationQueryKeys = {
  active: () => ["trainings", "form-configuration", "active"] as const,
  historical: (trainingId: string) => ["trainings", "form-configuration", "historical", trainingId] as const,
};

/** Resolves the active Training form configuration — refetches on window focus so super admin global edits appear immediately. */
export function useActiveTrainingFormConfiguration(enabled = true) {
  return useQuery({ queryKey: trainingFormConfigurationQueryKeys.active(), queryFn: getTrainingFormConfigActive, enabled, staleTime: 0, retry: 1, refetchOnWindowFocus: true, refetchOnMount: true });
}

/** Resolves only the immutable form version associated with the supplied Training. */
export function useTrainingHistoricalFormConfiguration(trainingId: string | undefined, enabled = true) {
  return useQuery({ queryKey: trainingFormConfigurationQueryKeys.historical(trainingId ?? ""), queryFn: () => getTrainingHistoricalFormConfiguration(trainingId ?? ""), enabled: enabled && Boolean(trainingId), staleTime: 30_000, retry: 1 });
}
