"use client";

import { useState } from "react";
import { FormRenderer } from "./FormRenderer";
import type { NewBuilderAudience, NewBuilderSection } from "../screens/new-training-form-builder.types";

/** Toggles the local Training form preview between Enterprise Admin and mobile layouts. */
export function NewBuilderPreview({ sections, formName, tipsOn = false }: { sections: NewBuilderSection[]; formName: string; tipsOn?: boolean }) {
  const [viewMode, setViewMode] = useState<NewBuilderAudience>("enterprise");
  return <section className="rounded-2xl border border-[#dfe9e4] bg-white p-5 shadow-sm sm:p-7"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#718d84]">Training form preview</p><h2 className="mt-1 text-xl font-bold text-[#12352e]">{viewMode === "enterprise" ? "Enterprise Admin creation form" : "Mobile App Training form"}</h2><p className="mt-1 text-sm text-[#52736a]">{formName || "New Training Form"} - Review the configured sections and fields before saving.</p></div><div role="group" aria-label="Preview audience" className="flex rounded-full bg-[#eef6f2] p-1"><button type="button" aria-pressed={viewMode === "enterprise"} onClick={() => setViewMode("enterprise")} className={`rounded-full px-3 py-2 text-sm font-bold ${viewMode === "enterprise" ? "bg-[#1f6a58] text-white" : "text-[#1f6a58]"}`}>Enterprise Admin View</button><button type="button" aria-pressed={viewMode === "mobile"} onClick={() => setViewMode("mobile")} className={`rounded-full px-3 py-2 text-sm font-bold ${viewMode === "mobile" ? "bg-[#1f6a58] text-white" : "text-[#1f6a58]"}`}>Mobile User App View</button></div></div><FormRenderer sections={sections} viewMode={viewMode} tipsOn={tipsOn} /></section>;
}
