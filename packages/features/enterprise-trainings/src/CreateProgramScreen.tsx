"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentEnterprise, useTenant } from "@ihp/enterprise-runtime";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ProgramBasicsSection, ProgramDeliverySection, ProgramPricingSection, ProgramScheduleSection } from "./CreateProgramSections";
import { buildCreateProgramPayload, buildUpdateProgramPayload, createEmptyProgramForm, programToFormValues, validateProgramForm, type CreateProgramFormValues } from "./create-program-form";
import { createProgram, ProgramsApiError, updateProgram, updateProgramStatus, type Program } from "./programs.service";
import { canEditProgram } from "./program-status";
import { useActiveProgramFormConfiguration, useProgramHistoricalFormConfiguration } from "./program-form-configuration.queries";
import ConfiguredCreateProgramSection from "./ConfiguredCreateProgramSection";

const steps = ["Basic Information", "Schedule", "Location & Host", "Pricing & Tickets", "Capacity & Registration", "Images & Media", "Additional Configuration"] as const;
const stepFields: ReadonlyArray<readonly string[]> = [
  ["title", "description", "category", "provider_id", "eligibility"],
  ["start_date", "end_date", "enrolment_start", "enrolment_end", "duration_weeks"],
  ["delivery_mode", "enrol_type"],
  ["price", "currency"],
  ["capacity"],
  [],
  [],
];

type ProgramEditorProps = { mode?: "create" | "edit"; initialProgram?: Program };

/** Renders the shared Enterprise Admin Program editor for create and edit workflows. */
export default function CreateProgramScreen({ mode = "create", initialProgram }: ProgramEditorProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  const { enterpriseId } = useCurrentEnterprise();
  const activeFormQ = useActiveProgramFormConfiguration(mode === "create");
  const historicalFormQ = useProgramHistoricalFormConfiguration(initialProgram?.id, mode === "edit" && Boolean(initialProgram));
  const activeForm = (mode === "create" ? activeFormQ.data : historicalFormQ.data) ?? null;
  const formConfigLoading = mode === "create" ? activeFormQ.isLoading : historicalFormQ.isLoading;
  const formConfigError = mode === "create" ? activeFormQ.error : historicalFormQ.error;
  const [customValues, setCustomValues] = useState<Record<string, unknown>>({});
  const [activeStep, setActiveStep] = useState(0);
  const [initialValues] = useState(() => (initialProgram ? programToFormValues(initialProgram) : createEmptyProgramForm()));
  const [values, setValues] = useState<CreateProgramFormValues>(() => (initialProgram ? programToFormValues(initialProgram) : createEmptyProgramForm()));
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitForApprovalMode, setSubmitForApprovalMode] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (mode === "edit") {
        if (!initialProgram) throw new Error("The program could not be loaded.");
        if (!canEditProgram(initialProgram.status)) throw new Error("This Program cannot be edited in its current lifecycle state.");
        const updated = await updateProgram(initialProgram.id, buildUpdateProgramPayload(values));
        if (submitForApprovalMode) {
          await updateProgramStatus(initialProgram.id, { status: "pending_approval" });
        }
        return updated;
      }
      if (!tenantId || !enterpriseId) throw new Error("A tenant and enterprise are required.");
      // Create as draft first, then submit via the status endpoint — mirrors the
      // events lifecycle (create-with-status is unreliable on the live backend).
      const basePayload = buildCreateProgramPayload(values, tenantId, enterpriseId);
      const payload = activeForm
        ? ({ ...basePayload, form_configuration_version_id: activeForm.version_id ?? activeForm.id, custom_values: { ...customValues, ...values } } as unknown as Parameters<typeof createProgram>[0])
        : basePayload;
      const created = await createProgram(payload);
      if (submitForApprovalMode) {
        await updateProgramStatus(created.id, { status: "pending_approval" });
      }
      return created;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["programs", "list"] });
      if (initialProgram) {
        await queryClient.invalidateQueries({ queryKey: ["programs", "detail", initialProgram.id] });
        router.push(`/admin/programs/${initialProgram.id}`);
      } else {
        router.push(`/admin/programs/${(data as { id: string }).id}`);
      }
    },
    onError: (error) => {
      if (error instanceof ProgramsApiError) {
        setErrors((current) => ({ ...current, ...error.fieldErrors }));
        setSubmitError(error.status === 401 || error.status === 403 ? "Your session cannot save this program. Please sign in again." : error.message);
      } else {
        setSubmitError(error instanceof Error ? error.message : "Unable to save program.");
      }
    },
  });

  const update = <Key extends keyof CreateProgramFormValues>(key: Key, value: CreateProgramFormValues[Key]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: [] }));
    setSubmitError(null);
  };

  const configuredSections = activeForm ? [...activeForm.sections].filter(s => s.fields.length > 0).sort((a, b) => a.order - b.order) : [];
  const editorSteps = activeForm ? [...configuredSections.map(s => s.title || "Section"), "Review & Submit"] : [...steps];
  const allErrors = useMemo(() => validateProgramForm(values), [values]);
  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues);
  const continueToNext = () => {
    if (activeForm) {
      setActiveStep((current) => Math.min(current + 1, editorSteps.length - 1));
      return;
    }
    const currentFields = stepFields[activeStep] ?? [];
    const currentErrors = Object.fromEntries(Object.entries(allErrors).filter(([field]) => currentFields.includes(field)));
    if (Object.keys(currentErrors).length > 0) {
      setErrors(currentErrors);
      return;
    }
    setErrors({});
    setActiveStep((current) => Math.min(current + 1, steps.length - 1));
  };
  const submit = () => {
    if (mode === "edit" && !isDirty) return;
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      setSubmitError("Review the highlighted fields before saving.");
      return;
    }
    setSubmitError(null);
    setSubmitForApprovalMode(false);
    saveMutation.mutate();
  };
  const submitForApproval = () => {
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      setSubmitError("Review the highlighted fields before submitting for approval.");
      return;
    }
    setSubmitError(null);
    setSubmitForApprovalMode(true);
    saveMutation.mutate();
  };
  const canSubmitForApproval = mode === "create" || Boolean(initialProgram && ["draft", "rejected", "needs_revision"].includes(initialProgram.status));

  const sharedProps = { values, update, errors };
  const backHref = initialProgram ? `/admin/programs/${initialProgram.id}` : "/admin/programs";
  const title = mode === "edit" ? "Edit Program" : "Create Program";
  const isCreateBlockedByEnterprise = mode === "create" && !enterpriseId;

  if (mode === "edit" && formConfigLoading) {
    return <div role="status" className="rounded-2xl border border-[#d7e5df] bg-[#f9fcfa] px-5 py-12 text-center text-sm font-semibold text-[#52736a]">Loading this Program&apos;s form configuration…</div>;
  }
  if (mode === "edit" && formConfigError) {
    return <div role="alert" className="rounded-2xl border border-[#eadbb8] bg-[#fffaf0] px-5 py-12 text-center text-sm font-semibold text-[#735c1e]">Unable to load this Program&apos;s form configuration.<button type="button" onClick={() => void historicalFormQ.refetch()} className="mt-4 rounded-full border border-current px-4 py-2 text-sm font-bold">Retry</button></div>;
  }

  return (
    <div className="w-full">
      {activeForm ? <div className="mb-3 rounded-xl border border-[#bce8d1] bg-[#effaf4] px-4 py-2 text-xs font-semibold text-[#167550]">{mode === "edit" ? `Historical form: ${activeForm.title}` : `Using Super Admin form: ${activeForm.title}`} {activeForm.is_global ? "(Global)" : `(${activeForm.enterprise_ids.length} enterprises)`} — {activeForm.sections.length} sections, {activeForm.sections.reduce((sum, s) => sum + s.fields.length, 0)} fields.</div> : null}
      <header className="flex flex-col gap-4 border-b border-[#edf3f0] pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href={backHref} className="text-sm font-semibold text-[#1f6a58]">Back to {mode === "edit" ? "Program" : "Programs"}</Link>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">{mode === "edit" ? initialProgram?.status ?? "PROGRAM" : "DRAFT PROGRAM"}</p>
          <h1 className="mt-2 text-2xl font-bold text-[#06201c] sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm text-[#52736a] sm:text-base">{mode === "edit" ? initialProgram?.title : "Build and review a new program for your enterprise."}</p>
        </div>
        <Link href={backHref} className="inline-flex h-11 items-center justify-center rounded-full border border-[#d7e5df] px-5 text-sm font-semibold text-[#52736a]">Cancel</Link>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav aria-label="Program editor sections" className="rounded-2xl border border-[#e1ebe6] bg-white p-3 shadow-sm">
          {activeForm ? (
            editorSteps.map((step, index) => (
              <button key={`${step}-${index}`} type="button" onClick={() => setActiveStep(index)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold ${activeStep === index ? "bg-[#e8f6ee] text-[#1f6a58]" : "text-[#52736a] hover:bg-[#f9fcfa]"}`}>
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-current text-xs">{index + 1}</span>
                {step}
              </button>
            ))
          ) : (
            steps.map((step, index) => (
              <button
                key={step}
                type="button"
                onClick={() => setActiveStep(index)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold ${activeStep === index ? "bg-[#e8f6ee] text-[#1f6a58]" : "text-[#52736a] hover:bg-[#f9fcfa]"}`}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-current text-xs">{index + 1}</span>
                {step}
              </button>
            ))
          )}
        </nav>
        <main className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm sm:p-7">
          {activeForm ? (
            activeStep < configuredSections.length ? (
              <ConfiguredCreateProgramSection section={configuredSections[activeStep]} values={values} update={update} errors={errors} customValues={customValues} setCustomValues={setCustomValues} />
            ) : (
              <section className="space-y-4">
                <h2 className="text-xl font-bold text-[#06201c]">Review & Submit</h2>
                <p className="text-sm text-[#52736a]">Review all sections from the Super Admin global program form before creating.</p>
                <div className="grid gap-3">
                  {configuredSections.map(sec => (
                    <div key={sec.id} className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] px-4 py-3">
                      <p className="text-sm font-bold text-[#06201c]">{sec.title}</p>
                      <p className="text-xs text-[#52736a]">{sec.fields.length} fields</p>
                    </div>
                  ))}
                </div>
              </section>
            )
          ) : (
            <>
              {activeStep === 0 ? <ProgramBasicsSection {...sharedProps} /> : null}
              {activeStep === 1 ? <ProgramScheduleSection {...sharedProps} /> : null}
              {activeStep === 2 ? <ProgramDeliverySection {...sharedProps} /> : null}
              {activeStep === 3 ? <ProgramPricingSection {...sharedProps} /> : null}
              {activeStep === 4 ? <div className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-6 text-center text-sm text-[#52736a]">Capacity & Registration — managed via Capacity field.</div> : null}
              {activeStep === 5 ? <div className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-6 text-center text-sm text-[#52736a]">Images & Media — add media URLs in Additional Configuration if needed.</div> : null}
              {activeStep === 6 ? <div className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-6 text-center text-sm text-[#52736a]">Additional Configuration — eligibility and custom fields.</div> : null}
            </>
          )}
          {isCreateBlockedByEnterprise ? <div role="status" className="mt-6 rounded-xl border border-[#eadbb8] bg-[#fffaf0] px-4 py-3 text-sm font-semibold text-[#735c1e]">Creating a Program is unavailable until an Enterprise is linked. The current backend ProgramCreate contract requires an enterprise_id.</div> : null}
          {submitError ? <div role="alert" className="mt-6 rounded-xl border border-[#f3d0cb] bg-[#fff6f5] px-4 py-3 text-sm font-semibold text-[#b42318]">{submitError}</div> : null}
          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[#edf3f0] pt-5 sm:flex-row sm:justify-between">
            <button type="button" onClick={() => setActiveStep((current) => Math.max(current - 1, 0))} disabled={activeStep === 0 || saveMutation.isPending} className="h-11 rounded-full border border-[#d7e5df] px-5 text-sm font-semibold text-[#52736a] disabled:opacity-50">Back</button>
            {(activeForm ? activeStep === editorSteps.length - 1 : activeStep === steps.length - 1) ? (
              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                {canSubmitForApproval ? <button type="button" onClick={submitForApproval} disabled={saveMutation.isPending || isCreateBlockedByEnterprise} className="h-11 rounded-full border-2 border-[#d9a24a] bg-[#fffaf0] px-5 text-sm font-bold text-[#8a5a00] shadow-sm transition-colors hover:bg-[#fff4d6] disabled:cursor-not-allowed disabled:opacity-60">{saveMutation.isPending && submitForApprovalMode ? "Submitting..." : "Submit for approval"}</button> : null}
                <button type="button" onClick={submit} disabled={saveMutation.isPending || isCreateBlockedByEnterprise || (mode === "edit" && !isDirty)} className="h-11 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm disabled:opacity-60">
                  {saveMutation.isPending && !submitForApprovalMode ? (mode === "edit" ? "Saving..." : "Creating...") : mode === "edit" ? "Save Changes" : "Create Program"}
                </button>
              </div>
            ) : (
              <button type="button" onClick={continueToNext} className="h-11 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm">Continue</button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}