"use client";

import type { WorkflowAnswer } from "@ihp/workflow-runtime";

/** Renders raw answer rows without discarding backend answer-value objects. */
export function WorkflowAnswers({ answers }: { answers: WorkflowAnswer[] }) {
  return <pre className="mt-4 max-h-96 overflow-auto rounded-xl bg-[#f4f8f6] p-3 text-xs">{JSON.stringify(answers, null, 2)}</pre>;
}
