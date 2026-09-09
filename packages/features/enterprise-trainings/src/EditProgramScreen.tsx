"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";

import CreateProgramScreen from "./CreateProgramScreen";
import { canEditProgram } from "./program-status";
import { getProgramById, ProgramsApiError } from "./programs.service";

/** Loads a Program and renders the shared editor in edit mode. */
export default function EditProgramScreen() {
  const { programId } = useParams<{ programId: string }>();
  const programQuery = useQuery({
    queryKey: ["programs", "detail", programId],
    queryFn: () => getProgramById(programId),
    enabled: Boolean(programId),
    staleTime: 30_000,
    retry: 1,
  });

  if (programQuery.isLoading || (!programQuery.data && !programQuery.isError)) {
    return <EditProgramSkeleton />;
  }

  if (programQuery.isError) {
    return <EditProgramError error={programQuery.error} retry={() => void programQuery.refetch()} />;
  }

  if (!canEditProgram(programQuery.data.status)) {
    return <EditProgramUnavailable programId={programQuery.data.id} />;
  }

  return <CreateProgramScreen mode="edit" initialProgram={programQuery.data} />;
}

function EditProgramSkeleton() {
  return <div className="animate-pulse"><div className="h-32 rounded-2xl bg-[#edf3f0]" /><div className="mt-6 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]"><div className="h-72 rounded-2xl bg-[#f1f4f3]" /><div className="h-[34rem] rounded-2xl bg-[#f1f4f3]" /></div></div>;
}

function EditProgramError({ error, retry }: { error: Error; retry: () => void }) {
  const status = error instanceof ProgramsApiError ? error.status : null;
  const message = status === 404 ? "This program no longer exists." : status === 401 || status === 403 ? "You do not have access to edit this program." : "Unable to load the program for editing.";

  return <section className="rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm"><p className="text-base font-bold text-[#06201c]">{message}</p><div className="mt-4 flex justify-center gap-4"><Link href="/admin/programs" className="text-sm font-semibold text-[#1f6a58] underline">Back to Programs</Link><button type="button" onClick={retry} className="text-sm font-semibold text-[#1f6a58] underline">Try again</button></div></section>;
}

/** Explains why direct navigation cannot bypass the Program edit lifecycle policy. */
function EditProgramUnavailable({ programId }: { programId: string }) {
  return <section className="rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm"><p className="text-base font-bold text-[#06201c]">This Program cannot be edited in its current lifecycle state.</p><Link href={`/admin/programs/${programId}`} className="mt-4 inline-block text-sm font-semibold text-[#1f6a58] underline">Back to Program</Link></section>;
}