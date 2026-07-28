import type { BuilderFieldType } from "../../types/builder.types";
import { fieldTypeLabel } from "../../lib/builder.helpers";

export default function FieldTypeIcon({ fieldType }: { fieldType: BuilderFieldType }) {
  const accentClass =
    fieldType === "email"
      ? "bg-[#f3e8ff] text-[#9333ea]"
      : fieldType === "phone"
        ? "bg-[#e7f8ee] text-[#16a34a]"
        : fieldType === "dropdown"
          ? "bg-[#fff4e5] text-[#d97706]"
          : fieldType === "file" || fieldType === "image"
            ? "bg-[#ffe7e5] text-[#ef4444]"
            : fieldType === "url"
              ? "bg-[#e0f2fe] text-[#0284c7]"
              : fieldType === "textarea"
                ? "bg-[#ede9fe] text-[#6366f1]"
                : fieldType === "date"
                  ? "bg-[#fff1f2] text-[#f97316]"
                  : fieldType === "checkbox"
                    ? "bg-[#ecfeff] text-[#0891b2]"
                    : "bg-[#e8f1ee] text-[#2f6a5c]";

  return (
    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${accentClass}`}>
      {fieldTypeLabel(fieldType).slice(0, 1)}
    </span>
  );
}
