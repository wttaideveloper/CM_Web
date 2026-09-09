"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";

import CreateTrainingScreen from "./CreateTrainingScreen";
import { canEditTraining } from "./training-status";
import { getTrainingById, TrainingsApiError } from "./trainings.service";

/** Loads a Training and renders the shared editor in edit mode. */
export default function EditTrainingScreen() {
  const { trainingId } = useParams<{ trainingId: string }>();
  const trainingQuery = useQuery({
    queryKey: ["trainings", "detail", trainingId],
    queryFn: () => getTrainingById(trainingId),
    enabled: Boolean(trainingId),
    staleTime: 30_000,
    retry: 1,
  });

  if (trainingQuery.isLoading || (!trainingQuery.data && !trainingQuery.isError)) {
    return <EditTrainingSkeleton />;
  }

  if (trainingQuery.isError) {
    return <EditTrainingError error={trainingQuery.error} retry={() => void trainingQuery.refetch()} />;
  }

  if (!canEditTraining(trainingQuery.data.status)) {
    return <EditTrainingUnavailable trainingId={trainingQuery.data.id} />;
  }

  return <CreateTrainingScreen mode="edit" initialTraining={trainingQuery.data} />;
}

function EditTrainingSkeleton() {
  return <div className="animate-pulse"><div className="h-32 rounded-2xl bg-[#edf3f0]" /><div className="mt-6 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]"><div className="h-72 rounded-2xl bg-[#f1f4f3]" /><div className="h-[34rem] rounded-2xl bg-[#f1f4f3]" /></div></div>;
}

function EditTrainingError({ error, retry }: { error: Error; retry: () => void }) {
  const status = error instanceof TrainingsApiError ? error.status : null;
  const message = status === 404 ? "This training no longer exists." : status === 401 || status === 403 ? "You do not have access to edit this training." : "Unable to load the training for editing.";

  return <section className="rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm"><p className="text-base font-bold text-[#06201c]">{message}</p><div className="mt-4 flex justify-center gap-4"><Link href="/admin/trainings" className="text-sm font-semibold text-[#1f6a58] underline">Back to Trainings</Link><button type="button" onClick={retry} className="text-sm font-semibold text-[#1f6a58] underline">Try again</button></div></section>;
}

/** Explains why direct navigation cannot bypass the Training edit lifecycle policy. */
function EditTrainingUnavailable({ trainingId }: { trainingId: string }) {
  return <section className="rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm"><p className="text-base font-bold text-[#06201c]">This Training cannot be edited in its current lifecycle state.</p><Link href={`/admin/trainings/${trainingId}`} className="mt-4 inline-block text-sm font-semibold text-[#1f6a58] underline">Back to Training</Link></section>;
}