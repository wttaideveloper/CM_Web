"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentEnterprise, useTenant } from "@ihp/enterprise-runtime";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { TrainingBasicsSection, TrainingCapacitySection, TrainingCourseBuilderSection, TrainingDeliverySection, TrainingMediaSection, TrainingPricingSection, TrainingScheduleSection } from "./CreateTrainingSections";
import { buildCreateTrainingPayload, buildUpdateTrainingPayload, createEmptyTrainingForm, trainingToFormValues, validateTrainingForm, type CreateTrainingFormValues } from "./create-training-form";
import { createTraining, resubmitTraining, TrainingsApiError, updateTraining, updateTrainingStatus, type Training } from "./trainings.service";
import { useActiveTrainingFormConfiguration, useTrainingHistoricalFormConfiguration } from "./training-form-configuration.queries";
import type { TrainingFormField, TrainingFormSection } from "./training-form-config.service";
import { canEditTraining } from "./training-status";
import ConfiguredCreateTrainingSection from "./ConfiguredCreateTrainingSection";

const steps = ["Basic Information", "Schedule", "Location & Host", "Pricing & Tickets", "Capacity & Registration", "Images & Media", "Additional Configuration"] as const;
const stepFields: ReadonlyArray<readonly string[]> = [
  ["title", "description", "category", "subcategory", "tags", "instructor_id", "requirements"],
  ["start_date", "end_date", "enrolment_start", "enrolment_end", "time_zone", "duration"],
  ["location_id", "delivery_mode", "course_type"],
  ["price", "currency", "promo_price", "coupon_code"],
  ["capacity", "requires_approval", "access_duration_days", "group_enrolment", "max_group_size", "access_expiry_type", "access_expiry_days"],
  ["primary_image", "gallery_images", "promotional_video"],
  ["prerequisites", "release_rule", "randomise", "scheduled_publication", "is_mandatory"],
];
// One static section component per entry in `steps`, in the same order — this is the
// static/default Training form used whenever no dynamic Super Admin form configuration
// is available (no active config, or the config request failed).
const staticSectionComponents = [
  TrainingBasicsSection,
  TrainingScheduleSection,
  TrainingDeliverySection,
  TrainingPricingSection,
  TrainingCapacitySection,
  TrainingMediaSection,
  TrainingCourseBuilderSection,
] as const;

type TrainingEditorProps = { mode?: "create" | "edit"; initialTraining?: Training };

function hasConfiguredValue(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined;
}

function validateConfiguredSection(
  section: TrainingFormSection,
  values: CreateTrainingFormValues,
  customValues: Record<string, unknown>,
): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  for (const field of section.fields) {
    if (!field.required) continue;
    const key = field.key as keyof CreateTrainingFormValues;
    const value = key in values ? values[key] : customValues[field.key];
    if (!hasConfiguredValue(value)) {
      errors[field.key] = [`${field.label} is required.`];
    }
  }

  return errors;
}

/** Renders the shared Enterprise Admin Training editor — uses active Super Admin form (global→enterprise-assigned) when present, else static fallback. */
export default function CreateTrainingScreen({ mode = "create", initialTraining }: TrainingEditorProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  const { enterpriseId } = useCurrentEnterprise();
  const activeFormQ = useActiveTrainingFormConfiguration(mode === "create");
  const historicalFormQ = useTrainingHistoricalFormConfiguration(initialTraining?.id, mode === "edit" && Boolean(initialTraining));
  const activeForm = (mode === "create" ? activeFormQ.data : historicalFormQ.data) ?? null;
  const formConfigLoading = mode === "create" ? activeFormQ.isLoading : historicalFormQ.isLoading;
  const formConfigError = mode === "create" ? activeFormQ.error : historicalFormQ.error;
  const [activeStep, setActiveStep] = useState(0);
  const [initialValues] = useState(() => (initialTraining ? trainingToFormValues(initialTraining) : createEmptyTrainingForm()));
  const [values, setValues] = useState<CreateTrainingFormValues>(() => (initialTraining ? trainingToFormValues(initialTraining) : createEmptyTrainingForm()));
  const [customValues, setCustomValues] = useState<Record<string, unknown>>({});
  // Hydrate text (custom_values) when editing with an active global form — handles both {custom_values: {...}} and Event-style [{field_id, value}]
  useEffect(() => {
    if (!initialTraining || !activeForm || Object.keys(customValues).length > 0) return;
    const raw = initialTraining as unknown as Record<string, unknown>;
    const cv = (raw.custom_values ?? raw.customValues) as Record<string, unknown> | Array<{ field_id: string; value: unknown }> | undefined;
    let hydrated: Record<string, unknown> = {};
    if (Array.isArray(cv)) {
      const byId = new Map(cv.map(e => [e.field_id, e.value]));
      for (const sec of activeForm.sections) for (const fld of sec.fields) {
        const v = byId.get(fld.id) ?? (cv as unknown as Record<string, unknown>)[fld.key];
        if (v !== undefined) hydrated[fld.key] = v;
      }
    } else if (cv && typeof cv === "object") {
      hydrated = cv as Record<string, unknown>;
    } else {
      const known = new Set(Object.keys(createEmptyTrainingForm()));
      for (const [k, v] of Object.entries(raw)) if (!known.has(k) && v != null && v !== "") hydrated[k] = v as unknown;
    }
    if (Object.keys(hydrated).length > 0) setCustomValues(hydrated);
  }, [activeForm, initialTraining]);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitForApprovalMode, setSubmitForApprovalMode] = useState(false);

  // Backend rejects custom_values keys that collide with top-level TrainingCreate fields
  // (e.g. stale `tags` stored as custom → `400 Unknown custom field: tags`). Only send
  // custom keys that exist in the active form and are not top-level payload keys.
  const sanitizeCustomValues = (basePayload: Record<string, unknown>, raw: Record<string, unknown>): Record<string, unknown> | undefined => {
    const topLevelKeys = new Set(Object.keys(basePayload));
    const formKeys = new Set((activeForm?.sections ?? []).flatMap((sec) => sec.fields.map((fld) => fld.key)));
    const entries = Object.entries(raw).filter(([k, v]) =>
      Boolean(k) && !topLevelKeys.has(k) && (formKeys.size === 0 || formKeys.has(k)) && v !== undefined && v !== null && v !== "",
    );
    return entries.length ? Object.fromEntries(entries) : undefined;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (mode === "edit") {
        if (!initialTraining) throw new Error("The training could not be loaded.");
        if (!canEditTraining(initialTraining.status)) throw new Error("This Training cannot be edited in its current lifecycle state.");
        const baseUpdate = buildUpdateTrainingPayload(values);
        const custom = sanitizeCustomValues(baseUpdate as unknown as Record<string, unknown>, customValues);
        // Keep sessions: edit form has no sessions editor, so carry the stored array through —
        // otherwise a replace-semantics PUT would wipe it. Never drop server data on edit.
        const initialRaw = initialTraining as unknown as Record<string, unknown>;
        const keptSessions = Array.isArray(initialRaw.sessions) ? (initialRaw.sessions as unknown[]) : undefined;
        const updated = await updateTraining(initialTraining.id, { ...baseUpdate, ...(keptSessions ? { sessions: keptSessions } : {}), ...(custom ? { custom_values: custom } : {}) });
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
      const custom = sanitizeCustomValues(basePayload as unknown as Record<string, unknown>, customValues);
      const payload = activeForm
        ? ({ ...basePayload, form_configuration_version_id: activeForm.version_id ?? activeForm.id, ...(custom ? { custom_values: custom } : {}) } as unknown as Parameters<typeof createTraining>[0])
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
    if (activeForm) {
      const currentSection = configuredSections[activeStep];
      if (currentSection) {
        const configuredErrors = validateConfiguredSection(currentSection, values, customValues);
        const currentErrors = Object.fromEntries(
          Object.entries({ ...allErrors, ...configuredErrors }).filter(([field]) =>
            currentSection.fields.some((configuredField: TrainingFormField) => configuredField.key === field),
          ),
        );
        if (Object.keys(currentErrors).length > 0) {
          setErrors(currentErrors);
          return;
        }
      }
      setErrors({});
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
  const canSubmitForApproval = mode === "create" || Boolean(initialTraining && ["draft", "rejected", "needs_revision"].includes(initialTraining.status));

  const configuredSections = activeForm ? [...activeForm.sections].filter(s => s.fields.length > 0).sort((a, b) => a.order - b.order) : [];
  const editorSteps = activeForm ? [...configuredSections.map(s => s.title || "Section"), "Review & Submit"] : [...steps];
  const sharedProps = { values, update, errors };
  const StaticSection = staticSectionComponents[activeStep] ?? staticSectionComponents[0];
  const backHref = initialTraining ? `/admin/trainings/${initialTraining.id}` : "/admin/trainings";
  const title = mode === "edit" ? "Edit Training" : "Create Training";
  const isCreateBlockedByEnterprise = mode === "create" && !enterpriseId;

  // Bounded, one-time loading gate (react-query already retries once) so the editor never
  // flashes the static form and then swaps to the dynamic one a moment later.
  if (formConfigLoading) {
    return <div role="status" className="rounded-2xl border border-[#d7e5df] bg-[#f9fcfa] px-5 py-12 text-center text-sm font-semibold text-[#52736a]">{mode === "edit" ? "Loading this Training's form configuration…" : "Loading the Training form configuration…"}</div>;
  }
  // No active/historical configuration, or the configuration request itself failed — either
  // way the dynamic form is unavailable, so fall through to the static/default Training form
  // below rather than blocking Training creation/editing. A genuine fetch failure is still
  // surfaced (non-blocking notice + retry) instead of being silently hidden.
  const refetchFormConfig = () => void (mode === "edit" ? historicalFormQ.refetch() : activeFormQ.refetch());

  return (
    <div className="w-full">
      {activeForm ? (
        <div className="mb-3 rounded-xl border border-[#bce8d1] bg-[#effaf4] px-4 py-2 text-xs font-semibold text-[#167550]">{mode === "edit" ? `Historical form: ${activeForm.title}` : `Using Super Admin form: ${activeForm.title}`} {activeForm.is_global ? "(Global)" : `(${activeForm.enterprise_ids.length} enterprises)`} — {configuredSections.length} sections, {configuredSections.reduce((sum, s) => sum + s.fields.length, 0)} fields.</div>
      ) : formConfigError ? (
        <div role="alert" className="mb-3 rounded-xl border border-[#eadbb8] bg-[#fffaf0] px-4 py-2 text-xs font-semibold text-[#735c1e]">Could not load the Super Admin form configuration — using the standard Training form instead. <button type="button" onClick={refetchFormConfig} className="underline">Retry</button></div>
      ) : mode === "create" ? (
        <div role="status" className="mb-3 rounded-xl border border-[#d8e4ef] bg-[#f5f9fd] px-4 py-2 text-xs font-semibold text-[#41627f]">No active Super Admin form configuration was found — using the standard Training form.</div>
      ) : null}
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
            editorSteps.map((step, index) => (
              <button key={`${step}-${index}`} type="button" onClick={() => setActiveStep(index)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold ${activeStep === index ? "bg-[#e8f6ee] text-[#1f6a58]" : "text-[#52736a] hover:bg-[#f9fcfa]"}`}>
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-current text-xs">{index + 1}</span>
                {step}
              </button>
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
            activeStep < configuredSections.length ? (
              <ConfiguredCreateTrainingSection section={configuredSections[activeStep]} values={values} update={update} errors={errors} customValues={customValues} setCustomValues={setCustomValues} />
            ) : (
              <section className="space-y-4">
                <h2 className="text-xl font-bold text-[#06201c]">Review & Submit</h2>
                <p className="text-sm text-[#52736a]">Review all sections from the Super Admin global form before creating.</p>
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
            <StaticSection {...sharedProps} />
          )}
          {isCreateBlockedByEnterprise ? <div role="status" className="mt-6 rounded-xl border border-[#eadbb8] bg-[#fffaf0] px-4 py-3 text-sm font-semibold text-[#735c1e]">Creating a Training is unavailable until an Enterprise is linked. The current backend TrainingCreate contract requires an enterprise_id.</div> : null}
          {submitError ? <div role="alert" className="mt-6 rounded-xl border border-[#f3d0cb] bg-[#fff6f5] px-4 py-3 text-sm font-semibold text-[#b42318]">{submitError}</div> : null}
          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[#edf3f0] pt-5 sm:flex-row sm:justify-between">
            <button type="button" onClick={() => setActiveStep((current) => Math.max(current - 1, 0))} disabled={activeStep === 0 || saveMutation.isPending} className="h-11 rounded-full border border-[#d7e5df] px-5 text-sm font-semibold text-[#52736a] disabled:opacity-50">Back</button>
            {(activeForm ? activeStep === editorSteps.length - 1 : activeStep === steps.length - 1) ? (
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