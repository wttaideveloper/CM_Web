"use client";

import { useQuery } from "@tanstack/react-query";

import { getEventCategories } from "./events.service";

/** Stable taxonomy keys, reusable by future historical Event edit support. */
export const eventCategoryQueryKeys = {
  all: ["events", "categories"] as const,
};

/** Reads backend-owned Event categories only when the active form requires taxonomy fields. */
export function useEventCategories(enabled: boolean) {
  return useQuery({
    queryKey: eventCategoryQueryKeys.all,
    queryFn: getEventCategories,
    enabled,
    staleTime: 60_000,
    retry: 1,
  });
}
