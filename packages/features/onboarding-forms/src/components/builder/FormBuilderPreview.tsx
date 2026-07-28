import type { BuilderField, BuilderSection, PreviewScope } from "../../types/builder.types";

function FieldControlPreview({ field, showFieldKey }: { field: BuilderField; showFieldKey: boolean }) {
  const options = field.options.length > 0 ? field.options : ["Option 1", "Option 2"];
  const commonInputClass = "h-12 w-full rounded-xl border border-[#d7e5df] bg-white px-3.5 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e]";
  const accentBorderClass = field.visible ? "border-[#d7e5df]" : "border-dashed border-[#cdded6]";

  return (
    <div className={`rounded-2xl border bg-[#f9fcfa] p-4 ${accentBorderClass}`}>
      <div className="mb-3 flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-[#06201c]">{field.label}{field.required ? <span className="ml-1 text-[#b42318]">*</span> : null}</p>{showFieldKey ? <p className="mt-1 text-xs text-[#52736a]">Key: {field.field_key}</p> : null}</div>{!field.visible ? <span className="rounded-full bg-[#f1f4f3] px-2.5 py-1 text-[11px] font-bold text-[#6b7f79]">Hidden</span> : null}</div>
      {field.field_type === "textarea" ? <textarea disabled placeholder={field.placeholder || "Textarea preview"} className="min-h-[96px] w-full rounded-xl border border-[#d7e5df] bg-white px-3.5 py-3 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e]" /> : field.field_type === "dropdown" ? <select disabled className={commonInputClass}><option>{field.placeholder || "Select an option"}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select> : field.field_type === "radio" ? <div className="space-y-3">{options.map((option, index) => <label key={`${field.id}-${option}`} className="flex items-center gap-3 text-sm text-[#52736a]"><span className="flex h-4 w-4 items-center justify-center rounded-full border border-[#c6ddd3] bg-white"><span className={`h-2 w-2 rounded-full ${index === 0 ? "bg-[#1f6a58]" : "bg-transparent"}`} /></span><span>{option}</span></label>)}</div> : field.field_type === "checkbox" ? <div className="space-y-3">{options.map((option) => <label key={`${field.id}-${option}`} className="flex items-center gap-3 text-sm text-[#52736a]"><span className="flex h-4 w-4 items-center justify-center rounded border border-[#c6ddd3] bg-white"><span className="h-2 w-2 rounded-sm bg-[#1f6a58]" /></span><span>{option}</span></label>)}</div> : field.field_type === "file" || field.field_type === "image" ? <div className="rounded-xl border border-dashed border-[#c6ddd3] bg-white px-3.5 py-4 text-sm text-[#52736a]"><input disabled type="file" className="w-full text-sm text-[#52736a] file:mr-4 file:rounded-full file:border-0 file:bg-[#e8f6ee] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#16825b]" /><p className="mt-3 text-xs text-[#7f9d94]">File upload preview only.</p></div> : <input disabled type={field.field_type} placeholder={field.placeholder || `${field.label} preview`} className={commonInputClass} />}
      {field.help_text ? <p className="mt-3 text-xs text-[#7f9d94]">{field.help_text}</p> : null}
    </div>
  );
}

export default function FormBuilderPreview({
  formName,
  formDescription,
  sections,
  activeSectionId,
  previewScope,
  onPreviewScopeChange,
  showFieldKey = false,
}: {
  formName: string;
  formDescription: string;
  sections: BuilderSection[];
  activeSectionId: string;
  previewScope: PreviewScope;
  onPreviewScopeChange: (scope: PreviewScope) => void;
  showFieldKey?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7f9d94]">Preview</p><h3 className="mt-1 text-base font-bold text-[#06201c]">{previewScope === "full" ? "Full Form Preview" : "Selected Section Preview"}</h3></div><div className="inline-flex rounded-full border border-[#d7e5df] bg-[#f9fcfa] p-1"><button type="button" onClick={() => onPreviewScopeChange("section")} className={`rounded-full px-4 py-2 text-sm font-semibold ${previewScope === "section" ? "bg-[#e8f6ee] text-[#1f6a58]" : "text-[#52736a]"}`}>Section</button><button type="button" onClick={() => onPreviewScopeChange("full")} className={`rounded-full px-4 py-2 text-sm font-semibold ${previewScope === "full" ? "bg-[#e8f6ee] text-[#1f6a58]" : "text-[#52736a]"}`}>Full Form</button></div></div>
      <div className="mt-5 space-y-4"><div className="rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] p-4"><p className="text-sm font-bold text-[#06201c]">{formName}</p><p className="mt-1 text-sm text-[#52736a]">{formDescription}</p></div><div className="space-y-5">{sections.map((section) => <div key={section.id} className="rounded-2xl border border-[#edf3f0] bg-white p-4"><div className="flex items-center justify-between gap-3"><div><h4 className="text-sm font-bold text-[#06201c]">{section.title}</h4><p className="mt-1 text-xs text-[#7f9d94]">{section.fields.length} field(s)</p></div><span className="rounded-full bg-[#e8f6ee] px-2.5 py-1 text-[11px] font-bold text-[#16825b]">{section.id === activeSectionId && previewScope === "section" ? "Active" : "Preview"}</span></div><div className="mt-4 space-y-3">{section.fields.length === 0 ? <div className="rounded-2xl border border-dashed border-[#d7e5df] bg-[#f9fcfa] px-4 py-10 text-center"><p className="text-sm font-semibold text-[#06201c]">No fields to preview yet.</p></div> : section.fields.map((field) => <FieldControlPreview key={field.id} field={field} showFieldKey={showFieldKey} />)}</div></div>)}</div></div>
    </section>
  );
}
