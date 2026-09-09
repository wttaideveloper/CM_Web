"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentEnterprise, useTenant } from "@ihp/enterprise-runtime";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { TrainingBasicsSection, TrainingDeliverySection, TrainingMediaSection, TrainingPricingSection, TrainingScheduleSection } from "./CreateTrainingSections";
import { buildCreateTrainingPayload, buildUpdateTrainingPayload, createEmptyTrainingForm, trainingToFormValues, validateTrainingForm, type CreateTrainingFormValues } from "./create-training-form";
import { createTraining, resubmitTraining, TrainingsApiError, updateTraining, updateTrainingStatus, type Training } from "./trainings.service";
import { useActiveTrainingFormConfiguration } from "./training-form-configuration.queries";
import { canEditTraining } from "./training-status";

const steps = ["Basic Information", "Delivery & Instructor", "Schedule", "Pricing & Capacity"] as const;
const stepFields: ReadonlyArray<readonly string[]> = [
  ["title", "description", "category"],
  ["delivery_mode", "course_type", "duration", "instructor_id", "requirements"],
  ["start_date", "end_date", "enrolment_start", "enrolment_end"],
  [],
];

type TrainingEditorProps = { mode?: "create" | "edit"; initialTraining?: Training };

/** Renders the shared Enterprise Admin Training editor — uses active Super Admin form (global→enterprise-assigned) when present, else static fallback. */
export default function CreateTrainingScreen({ mode = "create", initialTraining }: TrainingEditorProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  const { enterpriseId } = useCurrentEnterprise();
  const activeFormQ = useActiveTrainingFormConfiguration();
  const activeForm = activeFormQ.data ?? null;
  const [activeStep, setActiveStep] = useState(0);
  const [initialValues] = useState(() => (initialTraining ? trainingToFormValues(initialTraining) : createEmptyTrainingForm()));
  const [values, setValues] = useState<CreateTrainingFormValues>(() => (initialTraining ? trainingToFormValues(initialTraining) : createEmptyTrainingForm()));
  const [customValues, setCustomValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitForApprovalMode, setSubmitForApprovalMode] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (mode === "edit") {
        if (!initialTraining) throw new Error("The training could not be loaded.");
        if (!canEditTraining(initialTraining.status)) throw new Error("This Training cannot be edited in its current lifecycle state.");
        const updated = await updateTraining(initialTraining.id, buildUpdateTrainingPayload(values));
        if (submitForApprovalMode) {
          if (initialTraining.status === "needs_revision" || initialTraining.status === "rejected") {
            await resubmitTraining(initialTraining.id);
          } else {
            await updateTrainingStatus(initialTraining.id, { status: "pending_approval" });
          }
        }
        return updated;
      }
      if (!tenantId || !enterpriseId) throw new Error("A tenant and enterprise are required.");
      const basePayload = buildCreateTrainingPayload(values, tenantId, enterpriseId);
      const payload = activeForm
        ? ({ ...basePayload, form_configuration_version_id: activeForm.version_id ?? activeForm.id, custom_values: { ...customValues, ...values } } as unknown as Parameters<typeof createTraining>[0])
        : basePayload;
      const created = await createTraining(payload);
      if (submitForApprovalMode) {
        await updateTrainingStatus(created.id, { status: "pending_approval" });
      }
      return created;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["trainings", "list"] });
      if (initialTraining) {
        await queryClient.invalidateQueries({ queryKey: ["trainings", "detail", initialTraining.id] });
        router.push(`/admin/trainings/${initialTraining.id}`);
      } else {
        router.push(`/admin/trainings/${(data as { id: string }).id}`);
      }
    },
    onError: (error) => {
      if (error instanceof TrainingsApiError) {
        setErrors((current) => ({ ...current, ...error.fieldErrors }));
        setSubmitError(error.status === 401 || error.status === 403 ? "Your session cannot save this training. Please sign in again." : error.message);
      } else {
        setSubmitError(error instanceof Error ? error.message : "Unable to save training.");
      }
    },
  });

  const update = <Key extends keyof CreateTrainingFormValues>(key: Key, value: CreateTrainingFormValues[Key]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: [] }));
    setSubmitError(null);
  };

  const allErrors = useMemo(() => validateTrainingForm(values), [values]);
  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues);
  const continueToNext = () => {
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
  const canSubmitForApproval = mode === "create" || Boolean(initialTraining && ["draft", "rejected", "needs_revision"].includes(initialTraining.status));

  const sharedProps = { values, update, errors };
  const backHref = initialTraining ? `/admin/trainings/${initialTraining.id}` : "/admin/trainings";
  const title = mode === "edit" ? "Edit Training" : "Create Training";
  const isCreateBlockedByEnterprise = mode === "create" && !enterpriseId;

  return (
    <div className="w-full">
      {activeForm ? <div className="mb-3 rounded-xl border border-[#bce8d1] bg-[#effaf4] px-4 py-2 text-xs font-semibold text-[#167550]">Using Super Admin form: {activeForm.title} {activeForm.is_global ? "(Global)" : `(${activeForm.enterprise_ids.length} enterprises)`} — values map via custom_values.</div> : null}
      <header className="flex flex-col gap-4 border-b border-[#edf3f0] pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href={backHref} className="text-sm font-semibold text-[#1f6a58]">Back to {mode === "edit" ? "Training" : "Trainings"}</Link>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">{mode === "edit" ? initialTraining?.status ?? "TRAINING" : "DRAFT TRAINING"}</p>
          <h1 className="mt-2 text-2xl font-bold text-[#06201c] sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm text-[#52736a] sm:text-base">{mode === "edit" ? initialTraining?.title : "Build and review a new training for your enterprise."}</p>
        </div>
        <Link href={backHref} className="inline-flex h-11 items-center justify-center rounded-full border border-[#d7e5df] px-5 text-sm font-semibold text-[#52736a]">Cancel</Link>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav aria-label="Training editor sections" className="rounded-2xl border border-[#e1ebe6] bg-white p-3 shadow-sm">
          {activeForm ? (
            [...activeForm.sections].sort((a, b) => a.order - b.order).map((sec, i) => (
              <div key={sec.id} className="rounded-xl bg-[#e8f6ee] px-3 py-2 text-sm font-semibold text-[#1f6a58]">{i + 1}. {sec.title}</div>
            ))
          ) : (
            steps.map((step, index) => (
              <button key={step} type="button" onClick={() => setActiveStep(index)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold ${activeStep === index ? "bg-[#e8f6ee] text-[#1f6a58]" : "text-[#52736a] hover:bg-[#f9fcfa]"}`}>
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-current text-xs">{index + 1}</span>
                {step}
              </button>
            ))
          )}
        </nav>
        <main className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm sm:p-7">
          {activeForm ? (
            <div className="space-y-6">
              {[...activeForm.sections].sort((a, b) => a.order - b.order).map((sec) => (
                <section key={sec.id} className="space-y-4 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] p-4">
                  <h2 className="text-sm font-bold text-[#06201c]">{sec.title}</h2>
                  {sec.description ? <p className="text-xs text-[#52736a]">{sec.description}</p> : null}
                  <div className="grid gap-3 md:grid-cols-2">
                    {[...sec.fields].sort((a, b) => a.order - b.order).map((fld) => {
                      const val = (customValues[fld.key] ?? (values as unknown as Record<string, unknown>)[fld.key] ?? "") as string;
                      const setVal = (v: string) => {
                        if (fld.key in values) update(fld.key as keyof CreateTrainingFormValues, v as never);
                        else setCustomValues((c) => ({ ...c, [fld.key]: v }));
                      };
                      return (
                        <label key={fld.id} className="block text-xs font-semibold text-[#06201c]">
                          {fld.label} {fld.required ? "*" : null}
                          {fld.type === "textarea" ? <textarea value={val} onChange={(e) => setVal(e.target.value)} rows={3} className="mt-1.5 w-full rounded-xl border border-[#d7e5df] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6a58]" placeholder={fld.placeholder} /> :
                            fld.type === "select" ? <select value={val} onChange={(e) => setVal(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-[#d7e5df] bg-white px-3 text-sm outline-none focus:border-[#1f6a58]"><option value="">Select</option>{(fld.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}</select> :
                            fld.type === "checkbox" ? <input type="checkbox" checked={val === "true" || val === true as unknown as string} onChange={(e) => setVal(String(e.target.checked))} className="mt-1.5 h-4 w-4" /> :
                            <input type={fld.type === "number" ? "number" : fld.type === "date" ? "date" : fld.type === "url" ? "url" : "text"} value={val} onChange={(e) => setVal(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-[#d7e5df] bg-white px-3 text-sm outline-none focus:border-[#1f6a58]" placeholder={fld.placeholder} />}
                          {errors[fld.key]?.[0] ? <p className="mt-1 text-xs font-medium text-[#b42318]">{errors[fld.key][0]}</p> : null}
                        </label>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <>
              {activeStep === 0 ? <TrainingBasicsSection {...sharedProps} /> : null}
              {activeStep === 1 ? <TrainingDeliverySection {...sharedProps} /> : null}
              {activeStep === 2 ? <TrainingScheduleSection {...sharedProps} /> : null}
              {activeStep === 3 ? (
                <>
                  <TrainingPricingSection {...sharedProps} />
                  <TrainingMediaSection {...sharedProps} />
                </>
              ) : null}
            </>
          )}
          {isCreateBlockedByEnterprise ? <div role="status" className="mt-6 rounded-xl border border-[#eadbb8] bg-[#fffaf0] px-4 py-3 text-sm font-semibold text-[#735c1e]">Creating a Training is unavailable until an Enterprise is linked. The current backend TrainingCreate contract requires an enterprise_id.</div> : null}
          {submitError ? <div role="alert" className="mt-6 rounded-xl border border-[#f3d0cb] bg-[#fff6f5] px-4 py-3 text-sm font-semibold text-[#b42318]">{submitError}</div> : null}
          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[#edf3f0] pt-5 sm:flex-row sm:justify-between">
            <button type="button" onClick={() => setActiveStep((current) => Math.max(current - 1, 0))} disabled={activeStep === 0 || saveMutation.isPending} className="h-11 rounded-full border border-[#d7e5df] px-5 text-sm font-semibold text-[#52736a] disabled:opacity-50">Back</button>
            {activeStep === steps.length - 1 ? (
              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                {canSubmitForApproval ? <button type="button" onClick={submitForApproval} disabled={saveMutation.isPending || isCreateBlockedByEnterprise} className="h-11 rounded-full border-2 border-[#d9a24a] bg-[#fffaf0] px-5 text-sm font-bold text-[#8a5a00] shadow-sm transition-colors hover:bg-[#fff4d6] disabled:cursor-not-allowed disabled:opacity-60">{saveMutation.isPending && submitForApprovalMode ? "Submitting..." : "Submit for approval"}</button> : null}
                <button type="button" onClick={submit} disabled={saveMutation.isPending || isCreateBlockedByEnterprise || (mode === "edit" && !isDirty)} className="h-11 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm disabled:opacity-60">
                  {saveMutation.isPending && !submitForApprovalMode ? (mode === "edit" ? "Saving..." : "Creating...") : mode === "edit" ? "Save Changes" : "Create Training"}
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