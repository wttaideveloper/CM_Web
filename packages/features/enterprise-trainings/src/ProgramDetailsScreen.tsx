"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";

import ProgressSummaryCard from "./ProgressSummaryCard";
import ProgramActionsMenu from "./ProgramActionsMenu";
import { ProgramCheckInsTab, ProgramContentTab, ProgramDashboardsTab, ProgramEnrolmentsTab, ProgramDetailsSidebar, ProgramPhasesTab, ProgramReportsTab, ProgramReviewsAndWaitlistTab, ProgramSurveysTab } from "./ProgramDetailsSections";
import { displayValue, formatProgramDate, formatProgramPrice } from "./detail-formatters";
import { getProgramStatusBadgeClass, getProgramStatusLabel } from "./program-status";
import { getProgramById, getProgramProgress, listProgramEnrolments, listProgramPhases } from "./programs.service";

type ProgramDetailsTab = "details" | "content" | "phases" | "enrolments" | "checkins" | "reviews" | "surveys" | "dashboards" | "reports";

const programDetailsTabs: ReadonlyArray<{ id: ProgramDetailsTab; label: string }> = [
  { id: "details", label: "Details" },
  { id: "content", label: "Content" },
  { id: "phases", label: "Phases" },
  { id: "enrolments", label: "Enrolments" },
  { id: "checkins", label: "Check-ins" },
  { id: "reviews", label: "Reviews & Waitlist" },
  { id: "surveys", label: "Surveys" },
  { id: "dashboards", label: "Dashboards" },
  { id: "reports", label: "Reports" },
];

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#06201c]">{value}</p>
    </div>
  );
}

/** Renders every supported field from a single authenticated Program response. */
export default function ProgramDetailsScreen() {
  const { programId } = useParams<{ programId: string }>();
  const [activeTab, setActiveTab] = useState<ProgramDetailsTab>("details");

  const programQuery = useQuery({
    queryKey: ["programs", "detail", programId],
    queryFn: () => getProgramById(programId),
    enabled: Boolean(programId),
    staleTime: 30_000,
    retry: 1,
  });

  const phasesQuery = useQuery({
    queryKey: ["programs", programId, "phases"],
    queryFn: () => listProgramPhases(programId),
    enabled: activeTab === "details" && Boolean(programId),
  });

  const enrolmentsQuery = useQuery({
    queryKey: ["programs", programId, "enrolments"],
    queryFn: () => listProgramEnrolments(programId),
    enabled: activeTab === "details" && Boolean(programId),
  });

  const progressQuery = useQuery({
    queryKey: ["programs", programId, "progress"],
    queryFn: () => getProgramProgress(programId),
    enabled: activeTab === "details" && Boolean(programId),
  });

  if (programQuery.isLoading) {
    return <div className="rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm"><p className="text-base font-bold text-[#06201c]">Loading program...</p></div>;
  }

  if (programQuery.isError) {
    return <div className="rounded-2xl border border-[#e1ebe6] bg-white px-5 py-16 text-center shadow-sm"><p className="text-base font-bold text-[#b42318]">Unable to load this program.</p><p className="mt-2 text-sm text-[#52736a]">{(programQuery.error as Error).message}</p></div>;
  }

  if (!programQuery.data) return null;

  const program = programQuery.data;
  const phases = Array.isArray(phasesQuery.data) ? (phasesQuery.data as Array<Record<string, unknown>>) : [];
  const enrolments = Array.isArray(enrolmentsQuery.data) ? enrolmentsQuery.data : [];

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">{program.category || "PROGRAM"}</p>
          <h2 className="mt-1 text-2xl font-bold text-[#06201c] sm:text-3xl">{program.title}</h2>
          <span className={`mt-2 inline-block rounded-full px-3 py-1 text-[11px] font-bold ${getProgramStatusBadgeClass(program.status)}`}>{getProgramStatusLabel(program.status)}</span>
        </div>
        <ProgramActionsMenu program={program} />
      </div>

      <div className="mt-6 flex flex-wrap gap-2 border-b border-[#e1ebe6]">
        {programDetailsTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-t-xl px-4 py-2.5 text-sm font-bold transition ${activeTab === tab.id ? "border-b-2 border-[#1f6a58] text-[#1f6a58]" : "text-[#52736a] hover:text-[#1f6a58]"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "details" ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <section className="rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-[#06201c]">Details</h3>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <DetailItem label="Category" value={displayValue(program.category)} />
              <DetailItem label="Delivery mode" value={displayValue(program.delivery_mode)} />
              <DetailItem label="Price" value={formatProgramPrice(program.price, undefined)} />
              <DetailItem label="Enterprise" value={displayValue(program.enterprise_name)} />
              <DetailItem label="Created" value={formatProgramDate(program.created_at)} />
              <DetailItem label="Updated" value={formatProgramDate(program.updated_at)} />
            </div>
            <div className="mt-6">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Description</p>
              <p className="mt-2 text-sm leading-6 text-[#52736a]">{program.description || "—"}</p>
            </div>
          </section>
          <aside className="space-y-5">
            <section className="rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-[#06201c]">Structure</h3>
              <div className="mt-4 grid gap-3">
                <DetailItem label="Phases" value={String(phases.length)} />
                <DetailItem label="Enrolments" value={String(enrolments.length)} />
              </div>
            </section>
            <section className="rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Progress</p>
              {progressQuery.isLoading ? <p className="mt-2 text-sm text-[#52736a]">Loading...</p> : <ProgressSummaryCard data={progressQuery.data} />}
            </section>
            <ProgramDetailsSidebar programId={programId} />
          </aside>
        </div>
      ) : null}

      {activeTab === "content" ? <div className="mt-6"><ProgramContentTab programId={programId} /></div> : null}
      {activeTab === "phases" ? <div className="mt-6"><ProgramPhasesTab programId={programId} /></div> : null}
      {activeTab === "enrolments" ? <div className="mt-6"><ProgramEnrolmentsTab programId={programId} /></div> : null}
      {activeTab === "checkins" ? <div className="mt-6"><ProgramCheckInsTab programId={programId} /></div> : null}
      {activeTab === "reviews" ? <div className="mt-6"><ProgramReviewsAndWaitlistTab programId={programId} /></div> : null}
      {activeTab === "surveys" ? <div className="mt-6"><ProgramSurveysTab programId={programId} /></div> : null}
      {activeTab === "dashboards" ? <div className="mt-6"><ProgramDashboardsTab programId={programId} /></div> : null}
      {activeTab === "reports" ? <div className="mt-6"><ProgramReportsTab programId={programId} /></div> : null}
    </div>
  );
}