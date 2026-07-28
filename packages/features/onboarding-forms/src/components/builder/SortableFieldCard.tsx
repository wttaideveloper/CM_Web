"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { fieldTypeLabel } from "../../lib/builder.helpers";
import type { BuilderField } from "../../types/builder.types";
import FieldTypeIcon from "./FieldTypeIcon";

export default function SortableFieldCard({ field, onEdit, onDelete, onToggleRequired, isSelected = false }: {
  field: BuilderField;
  onEdit: () => void;
  onDelete: () => void;
  onToggleRequired: () => void;
  isSelected?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <article ref={setNodeRef} style={style} className={`rounded-2xl border px-4 py-3 transition hover:border-[#c6ddd3] ${isSelected ? "border-[#1f6a58] bg-[#f3f8f6] ring-1 ring-[#1f6a58]" : "border-[#e6eeea] bg-[#fbfdfc]"} ${isDragging ? "opacity-70" : ""}`}>
      <div className="flex items-center gap-3">
        <button type="button" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#6c877f]" aria-label={`Drag ${field.label}`} {...attributes} {...listeners}>
          <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none"><path d="M8 6h.01M16 6h.01M8 12h.01M16 12h.01M8 18h.01M16 18h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
        </button>
        <button type="button" onClick={onEdit} className="flex min-w-0 flex-1 items-center gap-3 text-left"><FieldTypeIcon fieldType={field.field_type} /><div className="min-w-0"><h4 className="truncate text-sm font-bold text-[#06201c]">{field.label}</h4><p className="mt-0.5 text-xs text-[#7f9d94]">{fieldTypeLabel(field.field_type)}</p></div></button>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={onToggleRequired} className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${field.required ? "bg-[#ffe4e7] text-[#d92d20]" : "bg-[#f1ecff] text-[#6d5bd0]"}`}>{field.required ? "Required" : "Optional"}</button>
          {!field.locked ? <button type="button" onClick={onDelete} className="rounded-full p-2 text-sm font-semibold text-[#b42318] hover:bg-[#fff5f5]">×</button> : null}
        </div>
      </div>
    </article>
  );
}
