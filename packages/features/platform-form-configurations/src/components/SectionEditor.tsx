"use client";

import { formConfigurationCopy as copy } from "../constants/form-configuration-copy";
import type { FormSection } from "../model/form-configuration.types";

/** Renders settings only for the selected section, leaving the canvas compact. */
export function SectionEditor({ section, fieldCount, isTrainingConfiguration = false, onChange }: { section: FormSection; fieldCount: number; isTrainingConfiguration?: boolean; onChange: (patch: Partial<FormSection>) => void }) {
  return <article className="rounded-xl border border-[#dfe9e4] bg-white p-4">
    <h4 className="font-bold text-[#06201c]">Edit Section</h4>
    <p className="mt-2 text-xs leading-5 text-[#52736a]">{isTrainingConfiguration ? copy.trainingSectionContentHelp : copy.eventSectionContentHelp}</p>
    <label className="mt-4 block text-sm font-semibold text-[#355a51]">{copy.rename}
      <input className="mt-1.5 w-full rounded-lg border border-[#cfe0d8] px-3 py-2" value={section.name} placeholder="Enter section name" onFocus={() => onChange({ name: "" })} onChange={(event) => onChange({ name: event.target.value })} />
      <span className="mt-1 block text-xs font-normal text-[#7f9d94]">{copy.sectionNameTip(isTrainingConfiguration ? "Training" : "Event")}</span>
    </label>
    <label className="mt-4 block text-sm font-semibold text-[#355a51]">{copy.sectionDescription}
      <textarea className="mt-1.5 min-h-20 w-full rounded-lg border border-[#cfe0d8] px-3 py-2" value={section.description} onChange={(event) => onChange({ description: event.target.value })} />
      <span className="mt-1 block text-xs font-normal text-[#7f9d94]">{copy.sectionDescriptionTip}</span>
    </label>
    <label className="mt-4 flex items-start gap-2 text-sm text-[#355a51]"><input type="checkbox" className="mt-1" checked={section.enabled} onChange={(event) => onChange({ enabled: event.target.checked })} /><span>{copy.enabled}<span className="mt-1 block text-xs text-[#7f9d94]">{copy.sectionEnabledTip(isTrainingConfiguration ? "Training" : "Event")}</span></span></label>
    <fieldset className="mt-4 rounded-xl border border-[#dfe9e4] bg-[#f8fbf9] p-3">
      <legend className="px-1 text-sm font-semibold text-[#355a51]">Content visibility</legend>
      <p className="mb-3 text-xs leading-5 text-[#52736a]">Choose where values in this section can be used.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className={`cursor-pointer rounded-lg border px-3 py-2 ${section.contentVisibility !== "admin_only" ? "border-[#1f6a58] bg-[#e8f6ee]" : "border-[#dfe9e4] bg-white"}`}><span className="flex items-start gap-2 text-sm font-semibold text-[#284940]"><input type="radio" name={`section-visibility-${section.localId}`} checked={section.contentVisibility !== "admin_only"} onChange={() => onChange({ contentVisibility: "published" })} className="mt-1" /><span>Published content<span className="mt-1 block text-xs font-normal leading-5 text-[#718d84]">Included in published content.</span></span></span></label>
        <label className={`cursor-pointer rounded-lg border px-3 py-2 ${section.contentVisibility === "admin_only" ? "border-[#8c5bb8] bg-[#faf6ff]" : "border-[#dfe9e4] bg-white"}`}><span className="flex items-start gap-2 text-sm font-semibold text-[#284940]"><input type="radio" name={`section-visibility-${section.localId}`} checked={section.contentVisibility === "admin_only"} onChange={() => onChange({ contentVisibility: "admin_only" })} className="mt-1" /><span>Enterprise Admin Only<span className="mt-1 block text-xs font-normal leading-5 text-[#718d84]">Not included in published content.</span></span></span></label>
      </div>
    </fieldset>
    <p className="mt-4 rounded-lg bg-[#f4faf7] p-3 text-xs text-[#52736a]">{copy.fieldCount.replace("{count}", String(fieldCount))}</p>
  </article>;
}
