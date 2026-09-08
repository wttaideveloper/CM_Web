"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createEventTaxonomyCategory,
  deleteEventTaxonomyCategory,
  listEventTaxonomyCategories,
  updateEventTaxonomyCategory,
  type EventTaxonomyCategoryInput,
} from "./event-category-taxonomy.service";

export const eventTaxonomyQueryKeys = {
  all: ["platform", "event-taxonomy"] as const,
  list: () => [...eventTaxonomyQueryKeys.all, "list"] as const,
};

export function useEventTaxonomyCategories(enabled: boolean) {
  return useQuery({ queryKey: eventTaxonomyQueryKeys.list(), queryFn: listEventTaxonomyCategories, enabled, retry: 1, staleTime: 30_000 });
}

function useInvalidateTaxonomy() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: eventTaxonomyQueryKeys.list() });
}

export function useCreateEventTaxonomyCategory() {
  const invalidate = useInvalidateTaxonomy();
  return useMutation({ mutationFn: createEventTaxonomyCategory, onSuccess: invalidate });
}

export function useUpdateEventTaxonomyCategory() {
  const invalidate = useInvalidateTaxonomy();
  return useMutation({ mutationFn: ({ categoryId, input }: { categoryId: string; input: EventTaxonomyCategoryInput }) => updateEventTaxonomyCategory(categoryId, input), onSuccess: invalidate });
}

export function useDeleteEventTaxonomyCategory() {
  const invalidate = useInvalidateTaxonomy();
  return useMutation({ mutationFn: deleteEventTaxonomyCategory, onSuccess: invalidate });
}
