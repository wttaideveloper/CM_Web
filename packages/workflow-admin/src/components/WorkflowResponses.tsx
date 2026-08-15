"use client";

import type { WorkflowResponse } from "@ihp/workflow-runtime";

/** Lists selectable workflow response sessions without interpreting answer data. */
export function WorkflowResponses({ responses, selectedSessionId, onSelect }: { responses: WorkflowResponse[]; selectedSessionId: string | null; onSelect: (sessionId: string) => void }) {
  return <div className="mt-4 space-y-2">{responses.map((response) => <button key={response.sessionId} type="button" onClick={() => onSelect(response.sessionId)} className={`w-full rounded-xl border p-3 text-left text-sm ${selectedSessionId === response.sessionId ? "border-[#1f6a58] bg-[#eef8f2]" : "border-[#e1ebe6]"}`}><strong>{response.userFullName ?? "Unknown user"}</strong><span className="block text-xs text-[#52736a]">{response.userEmail ?? "Email unavailable"} · {response.status} · {response.answerCount} answers</span></button>)}</div>;
}
