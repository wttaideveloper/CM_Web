"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentEnterprise, useTenant } from "@ihp/enterprise-runtime";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { TrainingBasicsSection, TrainingDeliverySection, TrainingMediaSection, TrainingPricingSection, TrainingScheduleSection } from "./CreateTrainingSections";
import { buildCreateTrainingPayload, buildUpdateTrainingPayload, createEmptyTrainingForm, trainingToFormValues, validateTrainingForm, type CreateTrainingFormValues } from "./create-training-form";
import { createTraining, resubmitTraining, TrainingsApiError, updateTraining, updateTrainingStatus, type Training } from "./trainings.service";
import { canEditTraining } from "./training-status";

const steps = ["Basic Information", "Delivery & Instructor", "Schedule", "Pricing & Capacity"] as const;
const stepFields: ReadonlyArray<readonly string[]> = [
  ["title", "description", "category"],
  ["delivery_mode", "course_type", "duration", "instructor_id", "requirements"],
  ["start_date", "end_date", "enrolment_start", "enrolment_end"],
  [],
];

type TrainingEditorProps = { mode?: "create" | "edit"; initialTraining?: Training };

/** Renders the shared Enterprise Admin Training editor for create and edit workflows. */
export default function CreateTrainingScreen({ mode = "create", initialTraining }: TrainingEditorProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  const { enterpriseId } = useCurrentEnterprise();
  const [activeStep, setActiveStep] = useState(0);
  const [initialValues] = useState(() => (initialTraining ? trainingToFormValues(initialTraining) : createEmptyTrainingForm()));
  const [values, setValues] = useState<CreateTrainingFormValues>(() => (initialTraining ? trainingToFormValues(initialTraining) : createEmptyTrainingForm()));
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
      // Create as draft first, then submit via the status endpoint — mirrors the
      // events lifecycle (create-with-status is unreliable on the live backend).
      const created = await createTraining(buildCreateTrainingPayload(values, tenantId, enterpriseId));
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
          {steps.map((step, index) => (
            <button
              key={step}
              type="button"
              onClick={() => setActiveStep(index)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold ${activeStep === index ? "bg-[#e8f6ee] text-[#1f6a58]" : "text-[#52736a] hover:bg-[#f9fcfa]"}`}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-current text-xs">{index + 1}</span>
              {step}
            </button>
          ))}
        </nav>
        <main className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm sm:p-7">
          {activeStep === 0 ? <TrainingBasicsSection {...sharedProps} /> : null}
          {activeStep === 1 ? <TrainingDeliverySection {...sharedProps} /> : null}
          {activeStep === 2 ? <TrainingScheduleSection {...sharedProps} /> : null}
          {activeStep === 3 ? (
            <>
              <TrainingPricingSection {...sharedProps} />
              <TrainingMediaSection {...sharedProps} />
            </>
          ) : null}
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