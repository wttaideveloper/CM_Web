"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { isVisibleField, sortFields } from "../../lib/builder.helpers";
import type { OnboardingFormDto, OnboardingFormField, OnboardingFormSection } from "../../types/onboarding-form.types";

type PreviewStep = { key: string; label: string; kind: "section" | "review"; section?: OnboardingFormSection };

function statusBadgeClass(status: string) {
  if (status === "draft") return "bg-[#f1f4f3] text-[#6b7f79]";
  if (status === "inactive") return "bg-[#fff3e6] text-[#a15c00]";
  return "bg-[#e8f6ee] text-[#16825b]";
}

function statusLabel(status: string) {
  if (status === "draft") return "Draft";
  if (status === "inactive") return "Inactive";
  if (status === "published") return "Published";
  return status;
}

function fieldTypeLabel(fieldType: string) {
  return fieldType.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function FieldPreview({ field }: { field: OnboardingFormField }) {
  const commonInputClass = "h-12 w-full rounded-xl border border-[#d7e5df] bg-white px-3.5 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e]";
  const options = field.options.length > 0 ? field.options : ["Option 1", "Option 2"];
  return <div className="rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] p-4"><div className="mb-3"><p className="text-sm font-bold text-[#06201c]">{field.label}{field.required ? <span className="ml-1 text-[#b42318]">*</span> : null}</p></div>{field.field_type === "textarea" ? <textarea disabled placeholder={field.placeholder || "Textarea preview"} className="min-h-[96px] w-full rounded-xl border border-[#d7e5df] bg-white px-3.5 py-3 text-sm text-[#06201c] outline-none placeholder:text-[#8ca69e]" /> : field.field_type === "dropdown" ? <select disabled className={commonInputClass}><option>{field.placeholder || "Select an option"}</option>{options.map((option) => <option key={option}>{option}</option>)}</select> : field.field_type === "radio" ? <div className="space-y-3">{options.map((option, index) => <label key={`${field.id ?? field.field_key}-${option}`} className="flex items-center gap-3 text-sm text-[#52736a]"><span className="flex h-4 w-4 items-center justify-center rounded-full border border-[#c6ddd3] bg-white"><span className={`h-2 w-2 rounded-full ${index === 0 ? "bg-[#1f6a58]" : "bg-transparent"}`} /></span><span>{option}</span></label>)}</div> : field.field_type === "checkbox" ? <div className="space-y-3">{options.map((option) => <label key={`${field.id ?? field.field_key}-${option}`} className="flex items-center gap-3 text-sm text-[#52736a]"><span className="flex h-4 w-4 items-center justify-center rounded border border-[#c6ddd3] bg-white"><span className="h-2 w-2 rounded-sm bg-[#1f6a58]" /></span><span>{option}</span></label>)}</div> : field.field_type === "file" || field.field_type === "image" ? <div className="rounded-xl border border-dashed border-[#c6ddd3] bg-white px-3.5 py-4 text-sm text-[#52736a]"><input disabled type="file" className="w-full text-sm text-[#52736a] file:mr-4 file:rounded-full file:border-0 file:bg-[#e8f6ee] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#16825b]" /><p className="mt-3 text-xs text-[#7f9d94]">File upload preview only.</p></div> : <input disabled type={field.field_type} placeholder={field.placeholder || `${field.label} preview`} className={commonInputClass} />}{field.help_text ? <p className="mt-3 text-xs text-[#7f9d94]">{field.help_text}</p> : null}</div>;
}

function ReviewSummary({ sections }: { sections: OnboardingFormSection[] }) {
  return <div className="space-y-4">{sections.map((section) => { const fields = sortFields(section.fields).filter(isVisibleField); return <div key={section.id ?? section.title} className="rounded-2xl border border-[#edf3f0] bg-white p-5"><div className="flex items-center justify-between gap-3"><div><h3 className="text-lg font-bold text-[#06201c]">{section.title}</h3><p className="mt-1 text-sm text-[#52736a]">Final preview of the review step for this section.</p></div><span className="rounded-full bg-[#f1f4f3] px-2.5 py-1 text-[11px] font-bold text-[#6b7f79]">{fields.length} visible</span></div><div className="mt-4 space-y-3">{fields.length === 0 ? <div className="rounded-2xl border border-dashed border-[#d7e5df] bg-[#f9fcfa] px-4 py-10 text-center"><p className="text-sm font-semibold text-[#06201c]">No visible fields in this section.</p></div> : fields.map((field) => <div key={field.id ?? field.field_key} className="rounded-2xl border border-[#edf3f0] bg-[#f9fcfa] p-4"><div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-bold text-[#06201c]">{field.label}</h4><span className="rounded-full bg-[#e8f6ee] px-2.5 py-1 text-[11px] font-bold text-[#16825b]">{fieldTypeLabel(field.field_type)}</span><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${field.required ? "bg-[#eef4ff] text-[#4c6ef5]" : "bg-[#f1f4f3] text-[#6b7f79]"}`}>{field.required ? "Required" : "Optional"}</span></div><p className="mt-2 text-xs text-[#7f9d94]"><span className="font-mono">{field.field_key}</span></p></div>)}</div></div>; })}</div>;
}

export default function OnboardingFormPreview({ form }: { form: OnboardingFormDto }) {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const sections = useMemo(() => form.sections, [form]);
  const steps = useMemo<PreviewStep[]>(() => [...sections.map((section) => ({ key: section.id ?? `${section.order}-${section.title}`, label: section.title, kind: "section" as const, section })), { key: "review", label: "Review", kind: "review" as const }], [sections]);
  const currentStep = steps[activeStep] ?? steps[0];
  const isReviewStep = currentStep?.kind === "review";
  const currentSection = currentStep?.kind === "section" ? currentStep.section : undefined;
  const isFirstStep = activeStep === 0;
  const isLastStep = activeStep === steps.length - 1;

  return <div className="space-y-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="space-y-3"><div className="flex items-center gap-3"><Link href="/onboarding-forms" className="inline-flex h-10 items-center justify-center rounded-full border border-[#d7e5df] px-4 text-sm font-semibold text-[#52736a] transition hover:bg-[#f4faf7]">Back</Link><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusBadgeClass(form.status)}`}>{statusLabel(form.status)}</span></div><div><h2 className="text-2xl font-bold text-[#06201c] sm:text-3xl">{form.name}</h2><p className="mt-1 text-sm text-[#52736a]">{form.description || "—"}</p></div></div><Link href={`/onboarding-forms/${form.id}/edit`} className="inline-flex h-11 items-center justify-center rounded-full bg-[#1f6a58] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#175245]">Edit Form</Link></div><section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start gap-x-8 gap-y-4 overflow-x-auto pb-1">{steps.map((step, index) => { const isCompleted = index < activeStep; const isCurrent = index === activeStep; return <div key={step.key} className="flex min-w-[132px] items-center"><button type="button" onClick={() => setActiveStep(index)} className="flex items-center gap-3 text-left"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${isCurrent ? "border-[#1f6a58] bg-[#1f6a58] text-white" : isCompleted ? "border-[#2f8a66] bg-[#e9f4ee] text-[#1f6a58]" : "border-[#d7e5df] bg-white text-[#8ca69e]"}`}>{isCompleted ? "✓" : index + 1}</div><p className={`text-sm font-semibold ${isCurrent || isCompleted ? "text-[#06201c]" : "text-[#8ca69e]"}`}>{step.label}</p></button></div>; })}</div></section><section className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm">{isReviewStep ? <><div className="mb-4"><h3 className="text-lg font-bold text-[#06201c]">Review Preview</h3><p className="mt-1 text-sm text-[#52736a]">Preview how the final review step will appear to the enterprise admin.</p></div>{sections.length === 0 ? <div className="rounded-2xl border border-dashed border-[#d7e5df] bg-[#f9fcfa] px-4 py-12 text-center"><p className="text-sm font-semibold text-[#06201c]">No sections available.</p></div> : <ReviewSummary sections={sections} />}</> : currentSection ? <><div className="mb-4"><h3 className="text-lg font-bold text-[#06201c]">{currentSection.title}</h3><p className="mt-1 text-sm text-[#52736a]">Preview how this step will appear to the enterprise admin.</p></div><div className="space-y-3">{sortFields(currentSection.fields).filter(isVisibleField).map((field) => <FieldPreview key={field.id ?? field.field_key} field={field} />)}{sortFields(currentSection.fields).filter(isVisibleField).length === 0 ? <div className="rounded-2xl border border-dashed border-[#d7e5df] bg-[#f9fcfa] px-4 py-12 text-center"><p className="text-sm font-semibold text-[#06201c]">No visible fields in this section.</p></div> : null}</div></> : null}<div className="mt-6 flex flex-col gap-3 border-t border-[#edf3f0] pt-5 sm:flex-row sm:justify-between"><button type="button" disabled={isFirstStep} onClick={() => setActiveStep((current) => Math.max(current - 1, 0))} className="h-12 rounded-full border border-[#d7e5df] px-5 text-sm font-semibold text-[#52736a] disabled:cursor-not-allowed disabled:opacity-40">Back</button><button type="button" onClick={() => { if (isLastStep) router.push("/onboarding-forms"); else setActiveStep((current) => Math.min(current + 1, steps.length - 1)); }} className="h-12 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#175245]">{isLastStep ? "End Preview" : "Continue →"}</button></div></section></div>;
}
