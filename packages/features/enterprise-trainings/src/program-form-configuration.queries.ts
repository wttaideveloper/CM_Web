"use client";

import { useQuery } from "@tanstack/react-query";
import { getProgramFormConfigActive, getProgramHistoricalFormConfiguration } from "./program-form-config.service";

/** Stable query keys for Program form-configuration resolution. */
export const programFormConfigurationQueryKeys = {
  active: () => ["programs", "form-configuration", "active"] as const,
  historical: (programId: string) => ["programs", "form-configuration", "historical", programId] as const,
};

/** Resolves the active Program form configuration — refetches on window focus so super admin global edits appear immediately. */
export function useActiveProgramFormConfiguration(enabled = true) {
  return useQuery({ queryKey: programFormConfigurationQueryKeys.active(), queryFn: getProgramFormConfigActive, enabled, staleTime: 0, retry: 1, refetchOnWindowFocus: true, refetchOnMount: true });
}

/** Resolves only the immutable form version associated with the supplied Program. */
export function useProgramHistoricalFormConfiguration(programId: string | undefined, enabled = true) {
  return useQuery({ queryKey: programFormConfigurationQueryKeys.historical(programId ?? ""), queryFn: () => getProgramHistoricalFormConfiguration(programId ?? ""), enabled: enabled && Boolean(programId), staleTime: 30_000, retry: 1 });
}
