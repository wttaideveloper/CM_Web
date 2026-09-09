"use client";

import { useQuery } from "@tanstack/react-query";
import { getCourseFormConfigActive } from "./course-form-config.service";

/** Stable query keys for Course form-configuration resolution. */
export const courseFormConfigurationQueryKeys = {
  active: () => ["courses", "form-configuration", "active"] as const,
};

/** Resolves the active Course form configuration from the authenticated browser session. */
export function useActiveCourseFormConfiguration(enabled = true) {
  return useQuery({ queryKey: courseFormConfigurationQueryKeys.active(), queryFn: getCourseFormConfigActive, enabled, staleTime: 30_000, retry: 1 });
}

