"use client";

import { useWorkflowApiDebug } from "../hooks";
import { WorkspaceCard } from "./WorkspacePrimitives";

/** Shows the most recent redacted Forms or Workflow API request for integration testing. */
export function ApiDebugPanel() {
  const entry = useWorkflowApiDebug();
  return <WorkspaceCard title="API / Integration debug"><p className="text-xs text-[#52736a]">Cookies, authorization headers, tokens, and session codes are never displayed.</p>{entry ? <div className="mt-3 space-y-2 text-xs text-[#16332b]"><p><strong>{entry.method}</strong> {entry.endpoint} · {entry.status ?? "network error"}</p><p>{entry.timestamp}</p><pre className="max-h-64 overflow-auto rounded-xl bg-[#f4f8f6] p-3">{JSON.stringify({ query: entry.query, requestBody: entry.requestBody, response: entry.response, error: entry.error }, null, 2)}</pre></div> : <p className="mt-3 text-sm text-[#52736a]">No Workflow API request has run in this workspace yet.</p>}</WorkspaceCard>;
}
