"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listTrainings, getTrainingById } from "../services/training.service";
import type { TrainingListParams } from "../types/training.types";

export function useTrainings(params: TrainingListParams) {
  return useQuery({ queryKey: ["trainings", "list", params], queryFn: () => listTrainings(params), staleTime: 30_000, retry: 1 });
}

export function useTraining(id: string) {
  return useQuery({ queryKey: ["trainings", "detail", id], queryFn: () => getTrainingById(id), enabled: Boolean(id) });
}

export function useCreateTraining() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (p: Parameters<typeof import("../services/training.service").createTraining>[0]) => import("../services/training.service").then(m => m.createTraining(p)), onSuccess: () => qc.invalidateQueries({ queryKey: ["trainings", "list"] }) });
}
