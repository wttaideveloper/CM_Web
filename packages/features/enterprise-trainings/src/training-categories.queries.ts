"use client";

import { useQuery } from "@tanstack/react-query";

import { getTrainingCategories } from "./training-categories.service";

/** Stable cache key for the backend-owned Training taxonomy. */
export const trainingCategoryQueryKeys = {
  all: ["trainings", "categories"] as const,
};

/** Loads Training categories only when a Training form displays taxonomy fields. */
export function useTrainingCategories(enabled: boolean) {
  return useQuery({
    queryKey: trainingCategoryQueryKeys.all,
    queryFn: getTrainingCategories,
    enabled,
    staleTime: 60_000,
    retry: 1,
  });
}
