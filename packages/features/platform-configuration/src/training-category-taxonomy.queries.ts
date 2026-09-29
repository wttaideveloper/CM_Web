"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createTrainingTaxonomyCategory,
  deleteTrainingTaxonomyCategory,
  listTrainingTaxonomyCategories,
  updateTrainingTaxonomyCategory,
  type TrainingTaxonomyCategoryCreateInput,
  type TrainingTaxonomyCategoryUpdateInput,
} from "./training-category-taxonomy.service";

export const trainingTaxonomyQueryKeys = {
  all: ["platform", "training-taxonomy"] as const,
  list: () => [...trainingTaxonomyQueryKeys.all, "list"] as const,
};

/** Loads the Training taxonomy only while the Training Categories tab is active. */
export function useTrainingTaxonomyCategories(enabled: boolean) {
  return useQuery({
    queryKey: trainingTaxonomyQueryKeys.list(),
    queryFn: listTrainingTaxonomyCategories,
    enabled,
    retry: 1,
    staleTime: 30_000,
  });
}

function useInvalidateTrainingTaxonomy() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: trainingTaxonomyQueryKeys.list() });
}

/** Creates a Training category and refreshes the taxonomy list. */
export function useCreateTrainingTaxonomyCategory() {
  const invalidate = useInvalidateTrainingTaxonomy();
  return useMutation({ mutationFn: createTrainingTaxonomyCategory, onSuccess: invalidate });
}

/** Updates a Training category without changing its parent, then refreshes the list. */
export function useUpdateTrainingTaxonomyCategory() {
  const invalidate = useInvalidateTrainingTaxonomy();
  return useMutation({
    mutationFn: ({ categoryId, input }: { categoryId: string; input: TrainingTaxonomyCategoryUpdateInput }) =>
      updateTrainingTaxonomyCategory(categoryId, input),
    onSuccess: invalidate,
  });
}

/** Deletes a Training category and refreshes the taxonomy list. */
export function useDeleteTrainingTaxonomyCategory() {
  const invalidate = useInvalidateTrainingTaxonomy();
  return useMutation({ mutationFn: deleteTrainingTaxonomyCategory, onSuccess: invalidate });
}

export type { TrainingTaxonomyCategoryCreateInput };
