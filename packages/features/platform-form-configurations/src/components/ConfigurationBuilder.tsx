"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { formConfigurationCopy as copy } from "../constants/form-configuration-copy";
import { trainingFormConfigurationCopy } from "../constants/training-form-configuration-copy";
import { moveConfiguredField, normalizeConfigurationOrder } from "../model/form-configuration-ordering";
import { EVENT_DELIVERY_BUNDLE, isEventDeliveryBundleKey, isEventDeliveryDependentKey } from "../model/event-delivery-bundle";
import { getEventCompositeFieldDefinition } from "../model/event-composite-field-definitions";
import { isEventCoreFieldAvailable } from "../model/event-core-field-semantics";
import { getTrainingCompositeFieldDefinition } from "../model/training-composite-field-definitions";
import { getTrainingDefaultPlaceholder } from "../model/form-configuration.mock";
import { validateFormConfiguration } from "../model/form-configuration-validation";
import { isRemovedCreateEventField } from "../model/removed-form-fields";
import type { ConfiguredField, CoreFieldRegistryItem, FormConfiguration, FormRenderer, FormSection } from "../model/form-configuration.types";
import { AssignmentEditor, type AssignmentTenantOption } from "./AssignmentEditor";
import { ConfigurationPreview } from "./ConfigurationPreview";
import { FieldEditor } from "./FieldEditor";
import { FormStructureCanvas, type BuilderSelection } from "./FormStructureCanvas";
import { SectionEditor } from "./SectionEditor";

const control = "mt-1.5 w-full rounded-lg border border-[#cfe0d8] bg-white px-3 py-2";
const CONFIGURATION_DESCRIPTION_MAX_LENGTH = 1000;
const HIDDEN_TRAINING_FIELD_KEYS = new Set([
  "group_enrolment", "group_enrollment", "max_group_size", "release_rule", "scheduled_publication",
  "randomise", "randomize", "is_mandatory", "access_information", "access_days", "access_duration",
  "access_duration_days", "access_expiry", "access_expiry_type", "access_expiry_days", "expiry_days",
  "course_type", "course_types", "badge", "badges", "milestone_badges",
  "instructor", "instructor_id", "instructor_photo", "prerequisite", "prerequisites", "course_prerequisites",
  "gallery_image", "gallery_images", "document", "documents",
  "promotional_video",
]);
const HIDDEN_TRAINING_FIELD_LABELS = new Set([
  "group enrolment", "group enrollment", "max group size", "release rule", "scheduled publication",
  "randomise", "randomize", "is mandatory", "mandatory lessons", "access information", "access days",
  "access duration", "access duration days", "access duration (days)", "access expiry", "access expiry type",
  "access expiry days", "expiry days", "course type", "course types",
  "badge", "badges", "milestone badge", "milestone badges", "instructor", "instructor photo",
  "prerequisite", "prerequisites", "course prerequisites",
  "gallery image", "gallery images", "document", "documents",
  "promotional video",
]);
function isHiddenTrainingField(key: string | null | undefined, label?: string | null): boolean {
  const normalizedKey = (key ?? "").replace(/^(core_|custom_)/, "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (normalizedKey === "instructor_name") return false;
  const normalizedLabel = (label ?? "").trim().toLowerCase().replace(/[\s-]+/g, " ").replace(/\s*\(\s*/g, " (").replace(/\s*\)\s*/g, ")");
  return HIDDEN_TRAINING_FIELD_KEYS.has(normalizedKey) || HIDDEN_TRAINING_FIELD_LABELS.has(normalizedLabel);
}
type InspectorMode = "none" | "edit-section" | "edit-field" | "add-field";

/** Converts an editable label into a stable identifier fragment for new entities only. */
function slug(value: string): string { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "field"; }
function valueTypeForRenderer(renderer: FormRenderer): string { return renderer === "number" ? "number" : renderer === "checkbox" ? "boolean" : renderer === "multi_select" ? "string[]" : "string"; }
function isLocationCoreKey(key: string | null | undefined): boolean {
  return ["location", "location_id"].includes((key ?? "").replace(/^(core_|custom_)/, "").trim().toLowerCase());
}
function withoutUnavailableTrainingFields(configuration: FormConfiguration): FormConfiguration {
  return {
    ...configuration,
    fields: configuration.fields.filter((field) =>
      !isRemovedCreateEventField(field.coreKey ?? field.stableKey, field.label)
      &&
      (field.source !== "core" || !isLocationCoreKey(field.coreKey))
      && (configuration.type !== "training"
        || !isHiddenTrainingField(field.coreKey ?? field.stableKey, field.label)),
    ),
  };
}
function isPrimaryImageField(field: CoreFieldRegistryItem): boolean {
  const normalize = (value: string) => value.replace(/^(core_|custom_)/, "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return normalize(field.key) === "primary_image" || normalize(field.displayName) === "primary_image";
}
function sameTenantIds(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const sortedRight = [...right].sort();
  return [...left].sort().every((tenantId, index) => tenantId === sortedRight[index]);
}
function InspectorDrawer({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <aside key={title} role="dialog" aria-modal="false" aria-label={title} className="form-configuration-builder-inspector fixed bottom-0 right-0 top-[72px] z-40 w-full max-w-[420px] overflow-y-auto border-l border-[#dfe9e4] bg-[#f7fbf8] p-5 shadow-[-12px_0_30px_rgba(7,53,45,0.12)] lg:w-[400px]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold uppercase tracking-[.14em] text-[#52736a]">{title}</h3>
        <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sm font-bold text-[#52736a] hover:bg-[#eaf4ef]" aria-label="Close inspector">×</button>
      </div>
      <div className="mt-4">{children}</div>
    </aside>,
    document.body,
  );
}

function ConfigurationBuilderGuide({ formType }: { formType: "Training" | "Event" }) {
  const [open, setOpen] = useState(false);
  const guideCopy = copy.builderGuideSteps(formType);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return <>
    <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className="inline-flex items-center gap-2 rounded-full border border-[#cfe0d8] bg-white px-4 py-2 text-sm font-bold text-[#1f6a58] shadow-sm transition hover:bg-[#f4faf7] focus:outline-none focus:ring-2 focus:ring-[#1f6a58]">
      <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none"><circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" /><path d="M10 9v4m0-6h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      Form builder guide
    </button>
    {open ? createPortal(<div className="fixed inset-0 z-[160] flex items-center justify-center bg-[#06201c]/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="training-builder-guide-title" aria-describedby="training-builder-guide-description" className="max-h-[min(90vh,56rem)] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[#dfe9e4] bg-white shadow-2xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#edf3f0] bg-white px-5 py-5 sm:px-7">
          <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#718d84]">{copy.builderGuideEyebrow}</p><h2 id="training-builder-guide-title" className="mt-1 text-xl font-bold text-[#12352e] sm:text-2xl">Create your {formType} form</h2><p id="training-builder-guide-description" className="mt-2 max-w-2xl text-sm leading-6 text-[#52736a]">{copy.builderGuideDescription}</p></div>
          <button type="button" aria-label="Close guide" onClick={() => setOpen(false)} className="rounded-full p-2 text-[#52736a] hover:bg-[#f4f8f6] focus:outline-none focus:ring-2 focus:ring-[#1f6a58]"><svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5" fill="none"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg></button>
        </header>
        <ol className="grid gap-3 px-5 py-5 sm:grid-cols-2 sm:px-7">
          {guideCopy.map((step, index) => <li key={step.title} className="flex gap-3 rounded-xl border border-[#e1ebe6] bg-[#fbfdfc] p-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e8f5ee] text-sm font-bold text-[#1f6a58]">{index + 1}</span>
            <div><h3 className="text-sm font-bold text-[#12352e]">{step.title}</h3><p className="mt-1 text-sm leading-5 text-[#52736a]">{step.description}</p></div>
          </li>)}
        </ol>
        <footer className="flex justify-end border-t border-[#edf3f0] px-5 py-4 sm:px-7"><button type="button" onClick={() => setOpen(false)} className="rounded-full bg-[#1f6a58] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#195646] focus:outline-none focus:ring-2 focus:ring-[#1f6a58] focus:ring-offset-2">Got it</button></footer>
      </section>
    </div>, document.body) : null}
  </>;
}

/** Owns local edit state and delegates persistence to the feature screen. */
export function ConfigurationBuilder({ initialConfiguration, coreFieldRegistry, readOnly = false, assignmentMode = "tenant", tenantOptions = [], enterpriseOptions = [], assignmentTenantIds, assignmentEnterpriseIds, assignmentsLoaded = false, isPersisted = false, isLoadingTenants = false, tenantError = false, isLoadingEnterprises = false, enterpriseError = false, isLoadingAssignments = false, assignmentError = false, isSaving = false, isPublishing = false, isSavingAssignments = false, isSavingEnterpriseAssignments = false, onSave, onPublish, onSaveAssignments, onSaveEnterpriseAssignments }: { initialConfiguration: FormConfiguration; coreFieldRegistry: readonly CoreFieldRegistryItem[]; readOnly?: boolean; assignmentMode?: "tenant" | "enterprise"; tenantOptions?: readonly AssignmentTenantOption[]; enterpriseOptions?: readonly AssignmentTenantOption[]; assignmentTenantIds?: readonly string[]; assignmentEnterpriseIds?: readonly string[]; assignmentsLoaded?: boolean; isPersisted?: boolean; isLoadingTenants?: boolean; tenantError?: boolean; isLoadingEnterprises?: boolean; enterpriseError?: boolean; isLoadingAssignments?: boolean; assignmentError?: boolean; isSaving?: boolean; isPublishing?: boolean; isSavingAssignments?: boolean; isSavingEnterpriseAssignments?: boolean; onSave?: (configuration: FormConfiguration) => Promise<FormConfiguration>; onPublish?: (configuration: FormConfiguration) => Promise<FormConfiguration>; onSaveAssignments?: (tenantIds: string[]) => Promise<readonly string[]>; onSaveEnterpriseAssignments?: (args: { enterpriseIds: string[]; isGlobal: boolean }) => Promise<readonly string[]>; }) {
  const [configuration, setConfiguration] = useState(() => withoutUnavailableTrainingFields(initialConfiguration));
  // Training configurations use their own basics copy so placeholders and help text stay domain-correct.
  const detailsCopy = configuration.type === "training" ? trainingFormConfigurationCopy : copy;
  const [inspectorMode, setInspectorMode] = useState<InspectorMode>("none");
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [addFieldSectionId, setAddFieldSectionId] = useState<string | null>(null);
  const [fieldSource, setFieldSource] = useState<"core" | "custom">("core");
  const [selectedCoreFieldKeys, setSelectedCoreFieldKeys] = useState<Set<string>>(() => new Set());
  const [search, setSearch] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [customRenderer, setCustomRenderer] = useState<FormRenderer>("text");
  const [customRequired, setCustomRequired] = useState(false);
  const [workspace, setWorkspace] = useState<"builder" | "preview">("builder");
  const [error, setError] = useState("");
  const configurationNameInputRef = useRef<HTMLInputElement>(null);
  const hasUnsavedChangesRef = useRef(false);
  const ignoreNextPopStateRef = useRef(false);
  const persistInFlightRef = useRef(false);
  useEffect(() => {
    const confirmBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChangesRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const confirmBackNavigation = (event: PopStateEvent) => {
      if (ignoreNextPopStateRef.current) {
        ignoreNextPopStateRef.current = false;
        return;
      }
      if (!hasUnsavedChangesRef.current) return;
      if (!window.confirm(detailsCopy.unsavedChangesWarning)) {
        event.stopImmediatePropagation();
        ignoreNextPopStateRef.current = true;
        window.history.forward();
      }
    };
    const confirmLinkNavigation = (event: MouseEvent) => {
      if (!hasUnsavedChangesRef.current || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!target || target.target === "_blank" || target.hasAttribute("download")) return;
      const destination = new URL(target.href, window.location.href);
      if (destination.origin === window.location.origin && destination.pathname === window.location.pathname && destination.search === window.location.search) return;
      if (!window.confirm(detailsCopy.unsavedChangesWarning)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      hasUnsavedChangesRef.current = false;
    };
    window.addEventListener("beforeunload", confirmBeforeLeaving);
    window.addEventListener("popstate", confirmBackNavigation, true);
    document.addEventListener("click", confirmLinkNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", confirmBeforeLeaving);
      window.removeEventListener("popstate", confirmBackNavigation, true);
      document.removeEventListener("click", confirmLinkNavigation, true);
    };
  }, [detailsCopy.unsavedChangesWarning]);
  useEffect(() => {
    if (error) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [error]);
  const [feedback, setFeedback] = useState("");
  const [hasAttemptedSaveOrPublish, setHasAttemptedSaveOrPublish] = useState(false);
  const assignmentsHydrated = useRef(false);
  const [persistedTenantIds, setPersistedTenantIds] = useState<string[]>([]);
  const [persistedEnterpriseIds, setPersistedEnterpriseIds] = useState<string[]>([]);

  useEffect(() => { setConfiguration(withoutUnavailableTrainingFields(initialConfiguration)); setPersistedTenantIds([]); setPersistedEnterpriseIds([]); assignmentsHydrated.current = false; setInspectorMode("none"); setSelectedSectionId(null); setSelectedFieldId(null); setAddFieldSectionId(null); setSelectedCoreFieldKeys(new Set()); }, [initialConfiguration.id]);
  useEffect(() => { if (!assignmentsHydrated.current && assignmentsLoaded) { const tenantIds = [...(assignmentTenantIds ?? [])]; const enterpriseIds = [...(assignmentEnterpriseIds ?? [])]; assignmentsHydrated.current = true; setPersistedTenantIds(tenantIds); setPersistedEnterpriseIds(enterpriseIds); setConfiguration((current) => ({ ...current, tenantIds, enterpriseIds })); } }, [assignmentTenantIds, assignmentEnterpriseIds, assignmentsLoaded]);

  useEffect(() => { setConfiguration((current) => ({ ...current, fields: current.fields.map((field) => { if (field.source !== "core" || field.serverId !== null || field.options.length > 0) return field; const definition = coreFieldRegistry.find((item) => item.key === field.coreKey); return definition?.options?.length ? { ...field, options: [...definition.options] } : field; }) })); }, [coreFieldRegistry]);
  const update = (patch: Partial<FormConfiguration>) => {
    hasUnsavedChangesRef.current = true;
    setError((current) => current === detailsCopy.validationName && !patch.name?.trim() ? current : "");
    setFeedback("");
    setConfiguration((current) => ({ ...current, ...patch }));
  };
  const applyOrder = (sections: readonly FormSection[], fields: readonly ConfiguredField[]) => update(normalizeConfigurationOrder(sections, fields));
  const selectedSection = selectedSectionId ? configuration.sections.find((section) => section.localId === selectedSectionId) : undefined;
  const selectedField = selectedFieldId ? configuration.fields.find((field) => field.localId === selectedFieldId) : undefined;
  const selection: BuilderSelection = selectedField ? { kind: "field", id: selectedField.localId } : selectedSection ? { kind: "section", id: selectedSection.localId } : null;
  const selectInspectorItem = (next: BuilderSelection) => { setSelectedCoreFieldKeys(new Set()); if (!next) { setInspectorMode("none"); setSelectedSectionId(null); setSelectedFieldId(null); setAddFieldSectionId(null); return; } if (next.kind === "section") { setInspectorMode("edit-section"); setSelectedSectionId(next.id); setSelectedFieldId(null); setAddFieldSectionId(null); return; } const field = configuration.fields.find((item) => item.localId === next.id); if (!field) return; setInspectorMode("edit-field"); setSelectedSectionId(null); setSelectedFieldId(field.localId); setAddFieldSectionId(null); };
  const availableCoreFields = useMemo(() => coreFieldRegistry.filter((field) => {
    if (isRemovedCreateEventField(field.key, field.displayName)) return false;
    if (isLocationCoreKey(field.key)) return false;
    if (isPrimaryImageField(field)) return false;
    if (configuration.type === "event" && !isEventCoreFieldAvailable(field.key)) return false;
    if (configuration.type === "training" && isHiddenTrainingField(field.key, field.displayName)) return false;
    if (configuration.type === "event" && isEventDeliveryDependentKey(field.key)) return false;
    return field.displayName.toLowerCase().includes(search.toLowerCase());
  }).map((field) => {
    const configured = configuration.fields.find((item) => item.source === "core" && item.coreKey === field.key);
    return {
      key: field.key,
      displayName: field.displayName,
      configuredSectionId: configured?.sectionLocalId,
      configuredSectionName: configured ? configuration.sections.find((section) => section.localId === configured.sectionLocalId)?.name : undefined,
      alreadyInCurrentSection: configured?.sectionLocalId === addFieldSectionId,
      selected: selectedCoreFieldKeys.has(field.key),
    };
  }), [addFieldSectionId, configuration.fields, configuration.sections, configuration.type, coreFieldRegistry, search, selectedCoreFieldKeys]);
  const assignmentChangesDirty = isPersisted && assignmentsLoaded && (!sameTenantIds(configuration.tenantIds, persistedTenantIds) || !sameTenantIds(configuration.enterpriseIds ?? [], persistedEnterpriseIds));
  const allValidationIssues = useMemo(() => validateFormConfiguration(configuration, coreFieldRegistry, { isPersisted, isLoaded: assignmentsLoaded, tenantIds: persistedTenantIds, enterpriseIds: persistedEnterpriseIds, isDirty: assignmentChangesDirty, willPersistAssignments: Boolean(onSave || onPublish) }), [assignmentChangesDirty, assignmentsLoaded, configuration, coreFieldRegistry, isPersisted, onPublish, onSave, persistedTenantIds, persistedEnterpriseIds]);
  const validationIssues = hasAttemptedSaveOrPublish ? allValidationIssues : [];
  const [isPersistingTenantAssignments, setIsPersistingTenantAssignments] = useState(false);
  const [isPersistingEnterpriseAssignments, setIsPersistingEnterpriseAssignments] = useState(false);
  const validationErrorsByField = useMemo(() => allValidationIssues.reduce<Record<string, string[]>>((errors, issue) => issue.fieldLocalId ? { ...errors, [issue.fieldLocalId]: [...(errors[issue.fieldLocalId] ?? []), issue.message] } : errors, {}), [allValidationIssues]);

  const persist = async (action: "save" | "publish") => {
    if (persistInFlightRef.current || isSaving || isPublishing) return;
    if (action === "publish" && hasUnsavedChangesRef.current) {
      setError("");
      setFeedback(detailsCopy.saveBeforePublish);
      return;
    }
    setHasAttemptedSaveOrPublish(true);
    if (!configuration.name.trim()) {
      setError("");
      setFeedback("");
      window.requestAnimationFrame(() => {
        configurationNameInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        configurationNameInputRef.current?.focus({ preventScroll: true });
      });
      return;
    }
    if (configuration.name.length > 300) { setError(detailsCopy.configurationNameTooLong); return; }
    if (configuration.description.length > CONFIGURATION_DESCRIPTION_MAX_LENGTH) { setError(detailsCopy.configurationDescriptionTooLong); return; }
    if (action === "save" && configuration.scope === "selective" && configuration.tenantIds.length === 0 && (configuration.enterpriseIds ?? []).length === 0) { setError(detailsCopy.selectiveTenantRequiredBeforeSave); return; }
    const blockingIssues = allValidationIssues.filter((issue) => (issue.severity ?? "error") === "error");
    if (blockingIssues.length) {
      setError(`Configuration has ${blockingIssues.length} issue${blockingIssues.length === 1 ? "" : "s"}. Correct the highlighted fields before ${action === "save" ? "saving" : "publishing"}.`);
      window.requestAnimationFrame(() => document.getElementById("configuration-validation-summary")?.scrollIntoView({ behavior: "smooth", block: "center" }));
      return;
    }
    const operation = action === "save" ? onSave : onPublish;
    if (!operation) return;
    persistInFlightRef.current = true;
    setError("");
    setFeedback("");
    try {
      const savedConfiguration = await operation(configuration);
      setConfiguration(savedConfiguration);
      hasUnsavedChangesRef.current = false;
      setPersistedTenantIds([...savedConfiguration.tenantIds]);
      setPersistedEnterpriseIds([...(savedConfiguration.enterpriseIds ?? [])]);
      const warningCount = allValidationIssues.length;
      setFeedback(action === "save" && warningCount ? `Draft saved with ${warningCount} configuration warning${warningCount === 1 ? "" : "s"}.` : action === "save" ? "Configuration saved." : detailsCopy.publishedSuccessfully);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save this configuration."); }
    finally { persistInFlightRef.current = false; }
  };
  const persistAssignments = async () => {
    if (!onSaveAssignments) return;
    if (configuration.tenantIds.length === 0) { setError(copy.noTenantsSelectedForAssignmentSave); return; }
    setError(""); setFeedback("");
    setIsPersistingTenantAssignments(true);
    try {
      const savedTenantIds = await onSaveAssignments(configuration.tenantIds);
      setPersistedTenantIds([...savedTenantIds]);
      setConfiguration((current) => ({ ...current, tenantIds: [...savedTenantIds] }));
      setFeedback("Assignments saved.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save assignments."); }
    finally { setIsPersistingTenantAssignments(false); }
  };
  const persistEnterpriseAssignments = async () => {
    if (!onSaveEnterpriseAssignments) return;
    if ((configuration.enterpriseIds ?? []).length === 0) { setError(copy.noEnterprisesSelectedForAssignmentSave); return; }
    setError(""); setFeedback("");
    setIsPersistingEnterpriseAssignments(true);
    try {
      const savedEnterpriseIds = await onSaveEnterpriseAssignments({ enterpriseIds: [...(configuration.enterpriseIds ?? [])], isGlobal: configuration.scope === "global" });
      setPersistedEnterpriseIds([...savedEnterpriseIds]);
      setConfiguration((current) => ({ ...current, enterpriseIds: [...savedEnterpriseIds] }));
      setFeedback("Enterprise assignments saved.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save enterprise assignments."); }
    finally { setIsPersistingEnterpriseAssignments(false); }
  };
  const updateField = (localId: string, patch: Partial<ConfiguredField>) => update({ fields: configuration.fields.map((field) => field.localId === localId ? { ...field, ...patch } : field) });
  const addCore = (key: string) => { const definition = coreFieldRegistry.find((field) => field.key === key); if (!addFieldSectionId || !definition || isLocationCoreKey(key) || isPrimaryImageField(definition) || (configuration.type === "training" && isHiddenTrainingField(key, definition.displayName))) return; const existing = configuration.fields.find((field) => field.source === "core" && field.coreKey === key); if (existing) { if (existing.sectionLocalId !== addFieldSectionId) { const targetIndex = configuration.fields.filter((field) => field.sectionLocalId === addFieldSectionId).length; applyOrder(configuration.sections, moveConfiguredField(configuration.fields, existing.localId, addFieldSectionId, targetIndex, configuration.type)); } setInspectorMode("edit-field"); setSelectedSectionId(addFieldSectionId); setSelectedFieldId(existing.localId); setAddFieldSectionId(null); return; } const keys = configuration.type === "event" && key === "delivery_mode" ? EVENT_DELIVERY_BUNDLE : [key]; const fields = keys.flatMap((fieldKey) => { if (configuration.fields.some((field) => field.coreKey === fieldKey)) return []; const fieldDefinition = coreFieldRegistry.find((field) => field.key === fieldKey); if (!fieldDefinition || isPrimaryImageField(fieldDefinition)) return []; const composite = configuration.type === "training" ? getTrainingCompositeFieldDefinition(fieldKey, fieldDefinition.displayName) : getEventCompositeFieldDefinition(fieldKey); return [{ localId: `field-core-${fieldKey}-${crypto.randomUUID()}`, serverId: null, stableKey: null, source: "core" as const, coreKey: fieldKey, label: fieldDefinition.displayName, sectionLocalId: addFieldSectionId, position: configuration.fields.filter((item) => item.sectionLocalId === addFieldSectionId).length + 1, valueType: fieldDefinition.valueType, required: fieldDefinition.requiredByDomain, renderer: fieldDefinition.defaultRenderer, placeholder: configuration.type === "training" ? getTrainingDefaultPlaceholder(fieldKey, fieldDefinition.displayName, fieldDefinition.defaultRenderer) : "", helpText: configuration.type === "event" ? copy.eventCoreFieldHelp[fieldKey as keyof typeof copy.eventCoreFieldHelp] ?? "" : "", options: [...(fieldDefinition.options ?? [])], validation: {}, ...(composite ? { compositeConfig: { enabled_fields: composite.subfields.map((subfield) => subfield.key), required_fields: composite.subfields.filter((subfield) => subfield.requiredByDomain).map((subfield) => subfield.key) } } : {}), enabled: true } as ConfiguredField]; }); if (!fields.length) return; applyOrder(configuration.sections, [...configuration.fields, ...fields]); setInspectorMode("edit-field"); setSelectedSectionId(fields[0].sectionLocalId); setSelectedFieldId(fields[0].localId); setAddFieldSectionId(null); };
  const toggleCoreField = (key: string) => setSelectedCoreFieldKeys((current) => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  const addSelectedCore = () => {
    if (configuration.type !== "event" || !addFieldSectionId || selectedCoreFieldKeys.size === 0) return;
    const selectedKeys = coreFieldRegistry.filter((field) => selectedCoreFieldKeys.has(field.key)).map((field) => field.key);
    let nextFields = [...configuration.fields];
    const addedFieldIds: string[] = [];
    for (const key of selectedKeys) {
      const definition = coreFieldRegistry.find((field) => field.key === key);
      if (!definition || isLocationCoreKey(key) || isPrimaryImageField(definition) || isEventDeliveryDependentKey(key)) continue;
      const existing = nextFields.find((field) => field.source === "core" && field.coreKey === key);
      if (existing) {
        if (existing.sectionLocalId !== addFieldSectionId) {
          const targetIndex = nextFields.filter((field) => field.sectionLocalId === addFieldSectionId).length;
          nextFields = moveConfiguredField(nextFields, existing.localId, addFieldSectionId, targetIndex, configuration.type);
        }
        continue;
      }
      const keys = key === "delivery_mode" ? EVENT_DELIVERY_BUNDLE : [key];
      const fields = keys.flatMap((fieldKey) => {
        if (nextFields.some((field) => field.source === "core" && field.coreKey === fieldKey)) return [];
        const fieldDefinition = coreFieldRegistry.find((field) => field.key === fieldKey);
        if (!fieldDefinition || isPrimaryImageField(fieldDefinition)) return [];
        const composite = getEventCompositeFieldDefinition(fieldKey);
        const localId = `field-core-${fieldKey}-${crypto.randomUUID()}`;
        addedFieldIds.push(localId);
        return [{ localId, serverId: null, stableKey: null, source: "core" as const, coreKey: fieldKey, label: fieldDefinition.displayName, sectionLocalId: addFieldSectionId, position: 0, valueType: fieldDefinition.valueType, required: fieldDefinition.requiredByDomain, renderer: fieldDefinition.defaultRenderer, placeholder: "", helpText: copy.eventCoreFieldHelp[fieldKey as keyof typeof copy.eventCoreFieldHelp] ?? "", options: [...(fieldDefinition.options ?? [])], validation: {}, ...(composite ? { compositeConfig: { enabled_fields: composite.subfields.map((subfield) => subfield.key), required_fields: composite.subfields.filter((subfield) => subfield.requiredByDomain).map((subfield) => subfield.key) } } : {}), enabled: true } as ConfiguredField];
      });
      nextFields.push(...fields);
    }
    if (nextFields === configuration.fields || !addedFieldIds.length && JSON.stringify(nextFields) === JSON.stringify(configuration.fields)) return;
    applyOrder(configuration.sections, nextFields);
    setSelectedCoreFieldKeys(new Set());
    setInspectorMode("edit-section");
    setSelectedSectionId(addFieldSectionId);
    setSelectedFieldId(null);
    setAddFieldSectionId(null);
  };
  const addCustom = () => { if (!addFieldSectionId || !customLabel.trim()) return; const suffix = crypto.randomUUID(); const field: ConfiguredField = { localId: `field-custom-${suffix}`, serverId: null, stableKey: `custom_${slug(customLabel)}_${suffix.slice(0, 8)}`, source: "custom", coreKey: null, label: customLabel.trim(), sectionLocalId: addFieldSectionId, position: configuration.fields.filter((item) => item.sectionLocalId === addFieldSectionId).length + 1, valueType: valueTypeForRenderer(customRenderer), required: customRequired, renderer: customRenderer, placeholder: configuration.type === "training" ? getTrainingDefaultPlaceholder("", customLabel.trim(), customRenderer) : "", helpText: "", options: [], validation: {}, enabled: true }; applyOrder(configuration.sections, [...configuration.fields, field]); setInspectorMode("edit-field"); setSelectedSectionId(field.sectionLocalId); setSelectedFieldId(field.localId); setCustomLabel(""); setCustomRequired(false); setAddFieldSectionId(null); };
  const onDragEnd = ({ active, over }: DragEndEvent) => { if (!over || active.id === over.id) return; const activeId = String(active.id); const overId = String(over.id); if (activeId.startsWith("section-") && overId.startsWith("section-")) { const from = configuration.sections.findIndex((section) => `section-${section.localId}` === activeId); const to = configuration.sections.findIndex((section) => `section-${section.localId}` === overId); if (from >= 0 && to >= 0) applyOrder(arrayMove(configuration.sections, from, to), configuration.fields); return; } if (!activeId.startsWith("field-")) return; const fieldLocalId = activeId.slice("field-".length); const movingField = configuration.fields.find((field) => field.localId === fieldLocalId); if (configuration.type === "event" && isEventDeliveryDependentKey(movingField?.coreKey)) return; const target = configuration.fields.find((field) => `field-${field.localId}` === overId); const sectionId = overId.startsWith("drop-") ? overId.slice("drop-".length) : target?.sectionLocalId; if (!sectionId) return; const index = target ? configuration.fields.filter((field) => field.sectionLocalId === sectionId && field.localId !== fieldLocalId).sort((left, right) => left.position - right.position).findIndex((field) => field.localId === target.localId) : configuration.fields.filter((field) => field.sectionLocalId === sectionId && field.localId !== fieldLocalId).length; applyOrder(configuration.sections, moveConfiguredField(configuration.fields, fieldLocalId, sectionId, index, configuration.type)); };
  const sectionAction = (localId: string, action: "duplicate" | "toggle" | "delete") => {
    const section = configuration.sections.find((item) => item.localId === localId);
    if (!section) return;
    const fields = configuration.fields.filter((field) => field.sectionLocalId === localId);
    const protectedFields = fields.filter((field) => field.source === "core" && coreFieldRegistry.some((item) => item.key === field.coreKey && (!item.removable || item.requiredByDomain)));
    if ((action === "delete" || action === "toggle") && protectedFields.length) {
      setError(`This section contains required Event fields: ${protectedFields.map((field) => field.label).join(", ")}. It cannot be deleted or disabled.`);
      return;
    }
    if (action === "toggle") {
      update({ sections: configuration.sections.map((item) => item.localId === localId ? { ...item, enabled: !item.enabled } : item) });
      return;
    }
    if (action === "delete") {
      if (fields.length > 0 && !window.confirm(copy.confirmDeleteSection)) return;
      applyOrder(configuration.sections.filter((item) => item.localId !== localId), configuration.fields.filter((field) => field.sectionLocalId !== localId));
      setInspectorMode("none");
      setSelectedSectionId(null);
      setSelectedFieldId(null);
      setAddFieldSectionId(null);
      return;
    }
    const coreFields = fields.filter((field) => field.source === "core");
    if (coreFields.length) {
      setError("This section contains core fields and cannot be duplicated without creating duplicate core fields. Duplicate only a custom-field section.");
      return;
    }
    const suffix = crypto.randomUUID();
    const duplicateId = `section-${suffix}`;
    const duplicate = { ...section, localId: duplicateId, serverId: null, stableKey: `section_${slug(section.name)}_${suffix.slice(0, 8)}`, name: `${section.name} ${copy.duplicate}` };
    const customFields = fields.filter((field) => field.source === "custom");
    applyOrder([...configuration.sections, duplicate], [...configuration.fields, ...customFields.map((field) => ({ ...field, localId: `field-custom-${crypto.randomUUID()}`, serverId: null, stableKey: `custom_${slug(field.label)}_${crypto.randomUUID().slice(0, 8)}`, sectionLocalId: duplicateId }))]);
  };
  const targetSection = addFieldSectionId ? configuration.sections.find((section) => section.localId === addFieldSectionId) : undefined;
  const fieldPicker = inspectorMode === "add-field" && targetSection ? <FieldPicker sectionId={targetSection.localId} sectionName={targetSection.name} source={fieldSource} onSourceChange={setFieldSource} search={search} onSearchChange={setSearch} coreFields={availableCoreFields} onAddCore={addCore} onToggleCore={toggleCoreField} onAddSelectedCore={addSelectedCore} selectedCoreCount={selectedCoreFieldKeys.size} isEventConfiguration={configuration.type === "event"} onClearCoreSelection={() => setSelectedCoreFieldKeys(new Set())} customLabel={customLabel} onCustomLabelChange={setCustomLabel} customRenderer={customRenderer} onCustomRendererChange={setCustomRenderer} customRequired={customRequired} onCustomRequiredChange={setCustomRequired} onAddCustom={addCustom} onCancel={() => { setSelectedCoreFieldKeys(new Set()); setAddFieldSectionId(null); setInspectorMode(selectedSection ? "edit-section" : "none"); }} /> : null;
  const inspector = inspectorMode === "edit-section" && selectedSection ? <SectionEditor section={selectedSection} fieldCount={configuration.fields.filter((field) => field.sectionLocalId === selectedSection.localId).length} isTrainingConfiguration={configuration.type === "training"} onChange={(patch) => update({ sections: configuration.sections.map((section) => section.localId === selectedSection.localId ? { ...section, ...patch } : section) })} /> : inspectorMode === "edit-field" && selectedField ? <FieldEditor field={selectedField} registry={coreFieldRegistry} trainingFields={configuration.type === "training" ? configuration.fields : undefined} isTrainingConfiguration={configuration.type === "training"} validationErrors={validationErrorsByField[selectedField.localId]} onChange={(patch) => updateField(selectedField.localId, patch)} onRemoveFromForm={() => { const removeIds = configuration.type === "event" && isEventDeliveryBundleKey(selectedField.coreKey) ? new Set(configuration.fields.filter((field) => isEventDeliveryBundleKey(field.coreKey)).map((field) => field.localId)) : new Set([selectedField.localId]); applyOrder(configuration.sections, configuration.fields.filter((field) => !removeIds.has(field.localId))); setSelectedFieldId(null); setInspectorMode(selectedSection ? "edit-section" : "none"); }} /> : <p className="rounded-xl border border-dashed border-[#cfe0d8] bg-white p-4 text-sm text-[#52736a]">{copy.selectItem}</p>;
  const drawerOpen = inspectorMode !== "none";
  const inspectorTitle = inspectorMode === "edit-section" ? "Edit Section" : inspectorMode === "edit-field" ? "Edit Field" : "Add Field";

  const typeLabel = configuration.type === "training" ? trainingFormConfigurationCopy.training : copy.event;
  const assignmentEditorProps = { assignmentMode, scope: configuration.scope, tenantIds: configuration.tenantIds, tenants: tenantOptions, enterpriseIds: configuration.enterpriseIds ?? [], enterprises: enterpriseOptions, isLoadingTenants, tenantError, isLoadingEnterprises, enterpriseError, isLoadingAssignments, assignmentError, isPersisted, scopeLocked: isPersisted, scopeHint: isPersisted ? "This form scope cannot be changed after creation. Create a new form if you need a different scope." : "Choose carefully: the scope cannot be changed after this form is saved. Create a new form if you need a different scope.", canSaveAssignments: Boolean(onSaveAssignments), isSaving: isSavingAssignments, savingTarget: isPersistingTenantAssignments ? "tenant" as const : isPersistingEnterpriseAssignments ? "enterprise" as const : null, canSaveEnterpriseAssignments: Boolean(onSaveEnterpriseAssignments), isSavingEnterpriseAssignments, onScopeChange: (scope: FormConfiguration["scope"]) => update({ scope }), onTenantIdsChange: (tenantIds: string[]) => update({ tenantIds }), onEnterpriseIdsChange: (enterpriseIds: string[]) => update({ enterpriseIds }), onSave: () => void persistAssignments(), onSaveEnterprises: () => void persistEnterpriseAssignments() };
  const workspaceControls = <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Configuration workspaces"><button type="button" aria-pressed={workspace === "builder"} onClick={() => setWorkspace("builder")} className={`rounded-full px-4 py-2 text-sm font-bold ${workspace === "builder" ? "bg-[#1f6a58] text-white" : "bg-[#eef6f2] text-[#1f6a58]"}`}>{copy.builderTab}</button><button type="button" aria-pressed={workspace === "preview"} onClick={() => setWorkspace("preview")} className={`rounded-full px-4 py-2 text-sm font-bold ${workspace === "preview" ? "bg-[#1f6a58] text-white" : "bg-[#eef6f2] text-[#1f6a58]"}`}>{copy.previewTab}</button></div>;
  const isConfigurationNameMissing = hasAttemptedSaveOrPublish && !configuration.name.trim();
  return <div className={`form-configuration-builder space-y-5 ${drawerOpen ? "lg:pr-[420px]" : ""}`}><style>{`.form-configuration-builder button:not(:disabled):hover, .form-configuration-builder-inspector button:not(:disabled):hover { filter: brightness(.94); } .form-configuration-builder button:focus-visible, .form-configuration-builder-inspector button:focus-visible { outline: 2px solid #1f6a58; outline-offset: 2px; }`}</style><section className="rounded-2xl border border-[#dfe9e4] bg-white p-4"><h3 className="text-lg font-bold text-[#06201c]">{detailsCopy.basics}</h3><div className="mt-3 grid gap-3 md:grid-cols-2"><label className="text-sm font-semibold text-[#355a51]">{detailsCopy.configurationName}<input ref={configurationNameInputRef} disabled={readOnly} value={configuration.name} onChange={(event) => update({ name: event.target.value })} placeholder={detailsCopy.configurationNamePlaceholder} aria-invalid={isConfigurationNameMissing || configuration.name.length > 300} aria-describedby={isConfigurationNameMissing ? "configuration-name-required-feedback" : configuration.name.length > 300 ? "configuration-name-feedback" : undefined} className={`${control} ${isConfigurationNameMissing ? "border-[#b42318] focus:border-[#b42318] focus:ring-2 focus:ring-[#b42318]/20" : ""}`} />{isConfigurationNameMissing ? <span id="configuration-name-required-feedback" role="alert" className="mt-1 block text-xs font-semibold text-[#b42318]">{detailsCopy.validationName}</span> : configuration.name.length > 300 ? <span id="configuration-name-feedback" role="alert" className="mt-1 block text-xs font-semibold text-[#b42318]">{detailsCopy.configurationNameTooLong}</span> : null}</label><label className="text-sm font-semibold text-[#355a51]">{detailsCopy.configurationType}<select disabled className={control} aria-label={detailsCopy.configurationType}><option>{typeLabel}</option></select><span className="mt-1 block text-xs font-normal text-[#52736a]">{detailsCopy.configurationTypeHelp}</span></label><label className={`text-sm font-semibold text-[#355a51] md:col-span-1`}>{detailsCopy.descriptionLabel} <span className="font-normal text-[#7f9d94]">(optional)</span><textarea disabled={readOnly} value={configuration.description} onChange={(event) => update({ description: event.target.value })} placeholder={detailsCopy.configurationDescriptionPlaceholder} aria-invalid={configuration.description.length > CONFIGURATION_DESCRIPTION_MAX_LENGTH} aria-describedby={configuration.description.length > CONFIGURATION_DESCRIPTION_MAX_LENGTH ? "configuration-description-count" : undefined} className={`${control} min-h-16`} />{configuration.description.length > CONFIGURATION_DESCRIPTION_MAX_LENGTH ? <span id="configuration-description-count" role="alert" className="mt-1 block text-xs font-semibold text-[#b42318]">{detailsCopy.configurationDescriptionTooLong}</span> : null}</label><AssignmentEditor {...assignmentEditorProps} simplifyForEnterpriseUsers={configuration.type === "training" || assignmentMode === "enterprise"} layout="scope-dropdown" /></div>{validationIssues.length ? <div id="configuration-validation-summary" role="alert" className="mt-3 rounded-xl border border-[#f0c8c4] bg-[#fff8f7] p-3 text-sm text-[#b42318]"><p className="font-bold">Configuration has {validationIssues.length} issue{validationIssues.length === 1 ? "" : "s"}:</p><ul className="mt-1 list-inside list-disc">{validationIssues.map((issue) => <li key={`${issue.code}-${issue.fieldLocalId ?? issue.sectionLocalId ?? "configuration"}`}>{issue.message}</li>)}</ul><p className="mt-2">Save Draft remains available; correct these issues before publishing.</p></div> : null}{error ? <p role="alert" className="mt-3 whitespace-pre-line text-sm font-semibold text-[#b42318]">{error}</p> : null}{feedback ? <p role="status" className="mt-3 text-sm font-semibold text-[#1f6a58]">{feedback}</p> : null}</section>{workspace === "preview" ? <div className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-bold uppercase tracking-[.14em] text-[#52736a]">Preview</h3>{workspaceControls}</div><ConfigurationPreview configuration={configuration} registry={coreFieldRegistry} /></div> : readOnly ? <ConfigurationPreview configuration={configuration} registry={coreFieldRegistry} /> :   <FormStructureCanvas workspaceControls={workspaceControls} guide={<ConfigurationBuilderGuide formType={configuration.type === "training" ? "Training" : "Event"} />} isTraining={configuration.type === "training"} sections={configuration.sections} fields={configuration.fields} selected={selection} onSelect={selectInspectorItem} onDragEnd={onDragEnd} onAddSection={() => { const suffix = crypto.randomUUID(); const section = { localId: `section-${suffix}`, serverId: null, stableKey: `section_new_section_${suffix.slice(0, 8)}`, name: copy.addSection, description: "", enabled: true, position: configuration.sections.length + 1 }; applyOrder([...configuration.sections, section], configuration.fields); setInspectorMode("edit-section"); setSelectedSectionId(section.localId); setSelectedFieldId(null); setAddFieldSectionId(null); }} onAddField={(sectionId) => { setInspectorMode("add-field"); setSelectedSectionId(sectionId); setSelectedFieldId(null); setAddFieldSectionId(sectionId); setFieldSource("core"); setSearch(""); }} onSectionAction={sectionAction} />}<InspectorDrawer open={drawerOpen} title={inspectorTitle} onClose={() => setInspectorMode("none")}>{fieldPicker ?? inspector}</InspectorDrawer>{!readOnly ? <div className="flex flex-wrap gap-3" aria-busy={isSaving || isPublishing}>{isSaving || isPublishing ? <p role="status" className="w-full rounded-lg bg-[#eef6f2] px-3 py-2 text-sm font-semibold text-[#1f6a58]">{isSaving ? "Saving configuration. Please wait." : "Publishing configuration. Please wait."}</p> : null}<button type="button" disabled={isSaving || isPublishing} onClick={() => void persist("save")} className="rounded-full border border-[#cfe0d8] bg-white px-5 py-2.5 text-sm font-bold text-[#1f6a58] transition hover:border-[#1f6a58] hover:bg-[#eef6f2] hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1f6a58] disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? "Saving..." : copy.saveDraft}</button><button type="button" disabled={isSaving || isPublishing || !onPublish || validationIssues.length > 0} onClick={() => void persist("publish")} className="rounded-full bg-[#1f6a58] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#195646] focus:outline-none focus:ring-2 focus:ring-[#1f6a58] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60" title={validationIssues.length ? "Correct configuration validation issues before publishing." : undefined}>{isPublishing ? "Publishing..." : copy.publish}</button></div> : null}</div>;
}

function FieldPicker({ sectionId, sectionName, source, onSourceChange, search, onSearchChange, coreFields, onAddCore, onToggleCore, onAddSelectedCore, selectedCoreCount, isEventConfiguration, onClearCoreSelection, customLabel, onCustomLabelChange, customRenderer, onCustomRendererChange, customRequired, onCustomRequiredChange, onAddCustom, onCancel }: { sectionId: string; sectionName: string; source: "core" | "custom"; onSourceChange: (source: "core" | "custom") => void; search: string; onSearchChange: (value: string) => void; coreFields: readonly { key: string; displayName: string; configuredSectionId?: string; configuredSectionName?: string; alreadyInCurrentSection: boolean; selected: boolean }[]; onAddCore: (key: string) => void; onToggleCore: (key: string) => void; onAddSelectedCore: () => void; selectedCoreCount: number; isEventConfiguration: boolean; onClearCoreSelection: () => void; customLabel: string; onCustomLabelChange: (value: string) => void; customRenderer: FormRenderer; onCustomRendererChange: (renderer: FormRenderer) => void; customRequired: boolean; onCustomRequiredChange: (required: boolean) => void; onAddCustom: () => void; onCancel: () => void }) {
  const clearSelectionRef = useRef(onClearCoreSelection);
  clearSelectionRef.current = onClearCoreSelection;
  useEffect(() => () => clearSelectionRef.current(), []);
  const hasRegistrationFields = coreFields.some((field) => ["registration_open_at", "registration_close_at", "registration_cutoff"].includes(field.key));
  return (
    <div className="rounded-xl border border-[#dfe9e4] bg-white p-4">
      <p className="text-sm font-semibold text-[#355a51]">Section: <span className="text-[#06201c]">{sectionName}</span></p>
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={() => onSourceChange("core")} className={`rounded-full px-3 py-1.5 text-sm font-bold ${source === "core" ? "bg-[#1f6a58] text-white" : "bg-[#eef6f2] text-[#1f6a58]"}`}>{copy.core}</button>
        <button type="button" onClick={() => onSourceChange("custom")} className={`rounded-full px-3 py-1.5 text-sm font-bold ${source === "custom" ? "bg-[#1f6a58] text-white" : "bg-[#eef6f2] text-[#1f6a58]"}`}>{copy.custom}</button>
      </div>
      {source === "core" ? (
        <>
          <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder={copy.searchCoreFields} aria-label={copy.searchCoreFields} className={`${control} mt-4`} />
          {hasRegistrationFields ? <p className="mt-3 rounded-lg bg-[#f4faf7] p-3 text-xs leading-5 text-[#52736a]">{copy.registrationTimingGuidance}</p> : null}
          <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
            {coreFields.length ? coreFields.map((field) => isEventConfiguration ? (
              <label key={field.key} className={`flex w-full items-start gap-3 rounded-lg border border-[#edf3f0] px-3 py-2 text-left text-sm font-semibold ${field.alreadyInCurrentSection ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-[#f4faf7]"}`}>
                <input type="checkbox" checked={field.selected} disabled={field.alreadyInCurrentSection} onChange={() => onToggleCore(field.key)} className="mt-0.5" />
                <span className="min-w-0"><span className="block">{field.displayName}</span>{field.alreadyInCurrentSection ? <span className="mt-1 block text-xs font-normal text-[#52736a]">Already in this section</span> : field.configuredSectionName ? <span className="mt-1 block text-xs font-normal text-[#52736a]">{copy.moveFieldFromSection(field.configuredSectionName)}</span> : null}</span>
              </label>
            ) : (
              <button key={field.key} type="button" onClick={() => onAddCore(field.key)} className="block w-full rounded-lg border border-[#edf3f0] px-3 py-2 text-left text-sm font-semibold text-[#06201c] hover:bg-[#f4faf7]">
                <span className="block">{field.displayName}</span>
                {field.configuredSectionName ? <span className="mt-1 block text-xs font-normal text-[#52736a]">{field.configuredSectionId === sectionId ? copy.fieldAlreadyInSection : copy.moveFieldFromSection(field.configuredSectionName)}</span> : null}
              </button>
            )) : <p className="text-sm text-[#52736a]">{copy.noCoreFields}</p>}
          </div>
          {isEventConfiguration ? <div className="mt-4 flex items-center justify-between gap-3"><button type="button" onClick={onCancel} className="text-sm font-bold text-[#52736a]">{copy.cancel}</button><button type="button" disabled={!selectedCoreCount} onClick={onAddSelectedCore} className="rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">Add selected fields ({selectedCoreCount})</button></div> : null}
        </>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-semibold text-[#355a51]">{copy.label}<input value={customLabel} onChange={(event) => onCustomLabelChange(event.target.value)} className={control} /></label>
          <label className="block text-sm font-semibold text-[#355a51]">{copy.type}<select value={customRenderer} onChange={(event) => onCustomRendererChange(event.target.value)} className={control}>{Object.entries(isEventConfiguration ? copy.fieldTypes : trainingFormConfigurationCopy.fieldTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="flex gap-2 text-sm text-[#355a51]"><input type="checkbox" checked={customRequired} onChange={(event) => onCustomRequiredChange(event.target.checked)} />{copy.required}</label>
          <button type="button" disabled={!customLabel.trim()} onClick={onAddCustom} className="rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{copy.add}</button>
        </div>
      )}
      {!(source === "core" && isEventConfiguration) ? <button type="button" onClick={onCancel} className="mt-4 text-sm font-bold text-[#52736a]">{copy.cancel}</button> : null}
    </div>
  );
}
