"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProgramActivity,
  createProgramPhase,
  deleteProgramActivity,
  deleteProgramPhase,
  listProgramPhases,
  reorderProgramPhases,
  updateProgramGoals,
  type CreateProgramPhasePayload,
} from "./programs.service";

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-[#06201c]">{title}</h3>
        {action ?? null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** ProgramBuilder — phases/stages hierarchy with goals/check-ins/activities/appointments. */
export default function ProgramBuilder({ programId }: { programId: string }) {
  const queryClient = useQueryClient();
  const [phaseTitle, setPhaseTitle] = useState("");
  const [phaseType, setPhaseType] = useState("phase");
  const [prerequisites, setPrerequisites] = useState("");
  const [completionRule, setCompletionRule] = useState("");
  const [releaseSchedule, setReleaseSchedule] = useState("immediate");
  const [goals, setGoals] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const phasesQuery = useQuery({
    queryKey: ["programs", programId, "phases"],
    queryFn: () => listProgramPhases(programId),
    enabled: Boolean(programId),
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["programs", programId, "phases"] });

  const createPhase = useMutation({
    mutationFn: () => {
      const payload: CreateProgramPhasePayload = {
        title: phaseTitle.trim(),
        phase_type: phaseType,
        prerequisites: prerequisites ? prerequisites.split(",").map(s => s.trim()).filter(Boolean) : null,
        completion_rule: completionRule || null,
        release_schedule: releaseSchedule || null,
        goals: goals ? goals.split(",").map(s => s.trim()).filter(Boolean) : null,
      };
      return createProgramPhase(programId, payload);
    },
    onSuccess: () => { setPhaseTitle(""); setFeedback("Phase added."); invalidate(); },
    onError: (e) => setFeedback((e as Error).message),
  });

  const deletePhase = useMutation({
    mutationFn: (phaseId: string) => deleteProgramPhase(programId, phaseId),
    onSuccess: () => { setFeedback("Phase deleted."); invalidate(); },
    onError: (e) => setFeedback((e as Error).message),
  });

  const reorderPhases = useMutation({
    mutationFn: (order: string[]) => reorderProgramPhases(programId, { order }),
    onSuccess: () => { setFeedback("Phases reordered."); invalidate(); },
    onError: (e) => setFeedback((e as Error).message),
  });

  const updateGoals = useMutation({
    mutationFn: () => updateProgramGoals(programId, { goals: goals ? goals.split(",").map(s => s.trim()).filter(Boolean) : null }),
    onSuccess: () => setFeedback("Goals updated."),
    onError: (e) => setFeedback((e as Error).message),
  });

  const phases = Array.isArray(phasesQuery.data) ? (phasesQuery.data as Array<Record<string, unknown>>) : [];

  return (
    <div className="space-y-5">
      <SectionCard title="Program Builder — Phases / Stages / Milestones">
        {feedback ? <p role="status" className="mb-3 rounded-xl border border-[#bce8d1] bg-[#effaf4] px-4 py-2 text-sm font-semibold text-[#167550]">{feedback}</p> : null}
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-sm font-semibold text-[#06201c]">Phase title<input value={phaseTitle} onChange={e => setPhaseTitle(e.target.value)} placeholder="e.g. Week 1 — Onboarding" className="mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm outline-none focus:border-[#1f6a58]" /></label>
          <label className="block text-sm font-semibold text-[#06201c]">Type<select value={phaseType} onChange={e => setPhaseType(e.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 text-sm"><option value="phase">Phase</option><option value="stage">Stage</option><option value="week">Week</option><option value="day">Day</option><option value="milestone">Milestone</option></select></label>
          <label className="block text-sm font-semibold text-[#06201c]">Prerequisites<input value={prerequisites} onChange={e => setPrerequisites(e.target.value)} placeholder="comma separated phase IDs" className="mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 text-sm" /></label>
          <label className="block text-sm font-semibold text-[#06201c]">Completion rule<input value={completionRule} onChange={e => setCompletionRule(e.target.value)} placeholder="e.g. all_activities" className="mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 text-sm" /></label>
          <label className="block text-sm font-semibold text-[#06201c]">Release schedule<select value={releaseSchedule} onChange={e => setReleaseSchedule(e.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 text-sm"><option value="immediate">Immediate</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="milestone">Milestone</option></select></label>
          <label className="block text-sm font-semibold text-[#06201c]">Goals<input value={goals} onChange={e => setGoals(e.target.value)} placeholder="comma separated goals" className="mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 text-sm" /></label>
        </div>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={() => void createPhase.mutate()} disabled={!phaseTitle.trim() || createPhase.isPending} className="h-10 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white disabled:opacity-60">Add phase/stage</button>
          <button type="button" onClick={() => void updateGoals.mutate()} className="h-10 rounded-full border border-[#d7e5df] px-5 text-sm font-semibold text-[#52736a]">Save goals</button>
        </div>
        {phasesQuery.isLoading ? <p className="mt-4 text-sm text-[#52736a]">Loading phases...</p> : null}
        <ul className="mt-4 grid gap-2">
          {phases.map((p, idx) => {
            const id = typeof p.id === "string" ? p.id : String(idx);
            const title = typeof p.title === "string" ? p.title : "Untitled";
            return (
              <li key={id} className="flex items-center justify-between gap-3 rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] px-4 py-3">
                <span className="text-sm font-bold text-[#06201c]">{idx + 1}. {title}</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { const order = [...phases.map(ph => typeof (ph as Record<string, unknown>).id === "string" ? (ph as Record<string, unknown>).id as string : "")]; const curIdx = order.indexOf(id); if (curIdx > 0) { const newOrder = [...order]; [newOrder[curIdx - 1], newOrder[curIdx]] = [newOrder[curIdx], newOrder[curIdx - 1]]; void reorderPhases.mutate(newOrder); } }} className="rounded-full border border-[#d7e5df] px-3 py-1 text-xs font-semibold">↑</button>
                  <button type="button" onClick={() => { const order = [...phases.map(ph => typeof (ph as Record<string, unknown>).id === "string" ? (ph as Record<string, unknown>).id as string : "")]; const curIdx = order.indexOf(id); if (curIdx < order.length - 1) { const newOrder = [...order]; [newOrder[curIdx], newOrder[curIdx + 1]] = [newOrder[curIdx + 1], newOrder[curIdx]]; void reorderPhases.mutate(newOrder); } }} className="rounded-full border border-[#d7e5df] px-3 py-1 text-xs font-semibold">↓</button>
                  <button type="button" onClick={() => void deletePhase.mutate(id)} className="rounded-full border border-[#f3d5d1] px-3 py-1 text-xs font-semibold text-[#b42318]">Delete</button>
                </div>
              </li>
            );
          })}
        </ul>
      </SectionCard>

      <SectionCard title="Activities / Appointments / Tasks">
        <p className="text-sm text-[#52736a]">Add activities to a phase via the Phases tab — each activity supports lessons, appointments, tasks, assessments and live sessions. Use the phase’s Activities list to attach resources.</p>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => setFeedback("Use phase Activities to add lessons, appointments, tasks, assessments and live sessions.")} className="h-9 rounded-full border border-[#d7e5df] px-4 text-xs font-semibold text-[#52736a]">How to add</button>
        </div>
      </SectionCard>

      <SectionCard title="Check-ins & Goals">
        <p className="text-sm text-[#52736a]">Record participant check-ins and baseline/goals via the Check-ins tab. Goals are stored per program and per participant.</p>
      </SectionCard>
    </div>
  );
}
