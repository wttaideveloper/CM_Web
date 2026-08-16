"use client";

import type { ReactNode } from "react";

import type { WorkflowFormDefinition } from "@ihp/workflow-runtime";

import { WorkspaceCard } from "./WorkspacePrimitives";

type FormPreviewProps = {
  definition: WorkflowFormDefinition;
  title?: string;
  withCard?: boolean;
};

function getPreviewControl(type: string, fieldId: string, options: string[]): ReactNode {
  if (type === "textarea") {
    return <textarea disabled className="mt-1 min-h-20 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] p-3" />;
  }
  if (type === "radio") {
    return <span className="mt-2 block space-y-1">{options.map((option) => <span key={option} className="flex items-center gap-2 font-normal"><input type="radio" disabled name={fieldId} />{option}</span>)}</span>;
  }
  if (type === "dropdown") {
    return <select disabled className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3"><option>Select an option</option>{options.map((option) => <option key={option}>{option}</option>)}</select>;
  }
  if (type === "multiselect") {
    return <span className="mt-2 block space-y-1">{options.map((option) => <span key={option} className="flex items-center gap-2 font-normal"><input type="checkbox" disabled />{option}</span>)}</span>;
  }
  if (["photo", "signature", "audio", "video", "file"].includes(type)) {
    return <span className="mt-1 flex h-10 items-center rounded-xl border border-dashed border-[#bcd8cd] bg-[#f9fcfa] px-3 text-xs font-normal text-[#52736a]">{type} upload placeholder</span>;
  }

  return <input disabled type={type} className="mt-1 h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3" />;
}

/** Renders a non-submitting preview for documented Form field types. */
export function FormPreview({ definition, title = "Form preview", withCard = true }: FormPreviewProps) {
  const content = <><p className="text-sm text-[#52736a]">Preview only — this does not submit or create a workflow session.</p><div className="mt-4 space-y-4"><h3 className="text-lg font-bold text-[#06201c]">{definition.title}</h3>{definition.fields.map((field) => <label key={field.id} className="block text-sm font-semibold text-[#16332b]">{field.label}{field.required ? <span className="ml-1 text-[#b42318]">*</span> : null}{getPreviewControl(field.type, field.id, field.options)}</label>)}</div></>;

  return withCard ? <WorkspaceCard title={title}>{content}</WorkspaceCard> : <section aria-label={title}>{content}</section>;
}
