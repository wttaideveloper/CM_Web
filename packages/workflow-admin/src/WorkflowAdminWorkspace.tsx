"use client";

import Link from "next/link";
import type { WorkflowAdminCapabilities, WorkflowAdminLinks } from "./types";
import { useWorkflowForms, useWorkflows } from "./hooks";
import { ApiDebugPanel } from "./components/ApiDebugPanel";
import { WorkspaceCard, WorkspaceSkeleton } from "./components/WorkspacePrimitives";

/** Internal workspace landing page that reports live Forms and Workflow library status without creating records. */
export function WorkflowAdminWorkspace({ capabilities: _capabilities, links }: { capabilities: WorkflowAdminCapabilities; links: WorkflowAdminLinks }) {
  const formsQuery = useWorkflowForms(); const workflowsQuery = useWorkflows();
  const forms = formsQuery.data?.data ?? []; const workflows = workflowsQuery.data?.data ?? [];
  const cards = [
    { title: "Forms", detail: formsQuery.isPending ? "Loading…" : `${formsQuery.data?.total ?? 0} total · ${forms.filter((form) => form.isPublished).length} published · ${forms.filter((form) => !form.isPublished).length} drafts`, href: links.forms, label: "Open Forms Lab" },
    { title: "Workflows", detail: workflowsQuery.isPending ? "Loading…" : `${workflowsQuery.data?.total ?? 0} total · ${workflows.filter((workflow) => workflow.isPublished).length} published`, href: links.workflows, label: "Open Workflow Lab" },
    { title: "Responses", detail: "Inspect submitted sessions and answers.", href: links.responses, label: "Open response inspector" },
  ];
  return <div className="mx-auto w-full max-w-6xl space-y-5"><header><p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">Temporary Enterprise host</p><h1 className="mt-1 text-2xl font-bold text-[#06201c]">Forms + Workflow Demo Workspace</h1><p className="mt-1 text-sm text-[#52736a]">Shared admin tooling designed to mount under Platform Admin later.</p></header><div className="grid gap-5 md:grid-cols-3">{cards.map((card) => <WorkspaceCard key={card.title} title={card.title}><p className="min-h-10 text-sm text-[#52736a]">{card.detail}</p><Link href={card.href} className="mt-4 inline-flex rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-semibold text-white hover:bg-[#195646]">{card.label}</Link></WorkspaceCard>)}</div><div className="grid gap-5 lg:grid-cols-3"><WorkspaceCard title="Forms API"><p className="text-sm text-[#52736a]">{formsQuery.isError ? "Unavailable — inspect API debug after retrying." : formsQuery.isPending ? "Checking…" : "Connected through the Workflow API proxy."}</p>{formsQuery.isPending ? <div className="mt-3"><WorkspaceSkeleton rows={1} /></div> : null}</WorkspaceCard><WorkspaceCard title="Workflows API"><p className="text-sm text-[#52736a]">{workflowsQuery.isError ? "Unavailable — inspect API debug after retrying." : workflowsQuery.isPending ? "Checking…" : "Connected through the Workflow API proxy."}</p>{workflowsQuery.isPending ? <div className="mt-3"><WorkspaceSkeleton rows={1} /></div> : null}</WorkspaceCard><WorkspaceCard title="Media API"><p className="text-sm text-[#52736a]">Available for explicit testing in Forms Lab. No upload runs automatically.</p></WorkspaceCard></div><ApiDebugPanel /></div>;
}
