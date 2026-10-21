"use client";

import { formConfigurationCopy as copy } from "../constants/form-configuration-copy";
import type { FormSection } from "../model/form-configuration.types";

/** Renders settings only for the selected section, leaving the canvas compact. */
export function SectionEditor({ section, fieldCount, isTrainingConfiguration = false, onChange }: { section: FormSection; fieldCount: number; isTrainingConfiguration?: boolean; onChange: (patch: Partial<FormSection>) => void }) {
  return <article className="rounded-xl border border-[#dfe9e4] bg-white p-4">
    <h4 className="font-bold text-[#06201c]">Edit Section</h4>
    <p className="mt-2 text-xs leading-5 text-[#52736a]">{isTrainingConfiguration ? copy.trainingSectionContentHelp : copy.eventSectionContentHelp}</p>
    <label className="mt-4 block text-sm font-semibold text-[#355a51]">{copy.rename}
      <input className="mt-1.5 w-full rounded-lg border border-[#cfe0d8] px-3 py-2" value={section.name} onChange={(event) => onChange({ name: event.target.value })} />
      <span className="mt-1 block text-xs font-normal text-[#7f9d94]">{copy.sectionNameTip(isTrainingConfiguration ? "Training" : "Event")}</span>
    </label>
    <label className="mt-4 block text-sm font-semibold text-[#355a51]">{copy.sectionDescription}
      <textarea className="mt-1.5 min-h-20 w-full rounded-lg border border-[#cfe0d8] px-3 py-2" value={section.description} onChange={(event) => onChange({ description: event.target.value })} />
      <span className="mt-1 block text-xs font-normal text-[#7f9d94]">{copy.sectionDescriptionTip}</span>
    </label>
    <label className="mt-4 flex items-start gap-2 text-sm text-[#355a51]"><input type="checkbox" className="mt-1" checked={section.enabled} onChange={(event) => onChange({ enabled: event.target.checked })} /><span>{copy.enabled}<span className="mt-1 block text-xs text-[#7f9d94]">{copy.sectionEnabledTip(isTrainingConfiguration ? "Training" : "Event")}</span></span></label>
    <p className="mt-4 rounded-lg bg-[#f4faf7] p-3 text-xs text-[#52736a]">{copy.fieldCount.replace("{count}", String(fieldCount))}</p>
  </article>;
}
