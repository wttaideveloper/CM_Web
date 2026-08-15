"use client";

import type { WorkflowJourney as WorkflowJourneyData } from "@ihp/workflow-runtime";

/** Renders grouped workflow journey pages returned by the backend. */
export function WorkflowJourney({ journey }: { journey: WorkflowJourneyData }) {
  return <div className="mt-4 space-y-3">{journey.pages.map((page) => <article key={page.nodeId} className="rounded-xl border border-[#e1ebe6] p-3"><h3 className="font-semibold text-[#16332b]">{page.pageNumber}. {page.title}</h3>{page.fields.map((field, index) => <div key={`${field.nodeId ?? index}`} className="mt-2 border-t border-[#edf3f0] pt-2 text-sm"><p className="font-medium">{field.label}</p><p className="text-[#52736a]">{field.answerText ?? JSON.stringify(field.answerValues ?? null)}</p></div>)}</article>)}</div>;
}
