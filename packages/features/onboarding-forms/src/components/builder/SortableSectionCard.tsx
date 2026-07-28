"use client";

import type { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { BuilderSection } from "../../types/builder.types";

export default function SortableSectionCard({ section, isActive, onSelect, onDelete, children }: {
  section: BuilderSection;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const containsLockedFields = section.fields.some((field) => field.locked);

  return (
    <div ref={setNodeRef} style={style} className={`w-full rounded-[24px] border bg-white text-left shadow-sm transition ${isActive ? "border-[#c6ddd3] ring-2 ring-[#e2efe8]" : "border-[#e1ebe6]"} ${isDragging ? "opacity-70" : ""}`}>
      <div role="button" tabIndex={0} onClick={onSelect} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(); } }} className="flex items-center justify-between gap-3 border-b border-[#edf3f0] px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#6c877f]" aria-label={`Drag ${section.title}`} onClick={(event) => event.stopPropagation()} {...attributes} {...listeners}>
            <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none"><path d="M8 6h.01M16 6h.01M8 12h.01M16 12h.01M8 18h.01M16 18h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
          </button>
          <div className="min-w-0"><p className="truncate text-base font-bold text-[#06201c]">{section.title}</p><p className="mt-0.5 text-xs text-[#7f9d94]">{section.fields.length} field(s)</p></div>
        </div>
        {!containsLockedFields ? <button type="button" aria-label={`Delete ${section.title}`} onClick={(event) => { event.stopPropagation(); onDelete(); }} className="rounded-full p-2 text-sm font-semibold text-[#b42318] hover:bg-[#fff5f5]">×</button> : null}
      </div>
      <div className="px-4 py-4">{children}</div>
    </div>
  );
}
