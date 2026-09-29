"use client";

import { useQuery } from "@tanstack/react-query";

import { getEventCategories, getEventTypes } from "./events.service";

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

/** Reads backend-owned Event Types with one retry and no hardcoded fallback. */
export function useEventTypes(enabled: boolean) {
  return useQuery({ queryKey: ["events", "event-types"], queryFn: getEventTypes, enabled, staleTime: 60_000, retry: 1 });
}
