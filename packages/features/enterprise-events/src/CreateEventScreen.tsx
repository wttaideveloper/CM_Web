"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentEnterprise, useTenant } from "@ihp/enterprise-runtime";
import { getEnterpriseLocations } from "@ihp/enterprises";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AdditionalConfigurationSection, CapacityAndRegistrationSection, MediaSection, PricingAndTicketsSection, ReviewSection } from "./CreateEventConfigurationSections";
import { BasicInformationSection, LocationAndHostSection, ScheduleSection } from "./CreateEventDetailsSections";
import { buildCreateEventPayload, buildUpdateEventPayload, createEmptyEventForm, eventToFormValues, validateEventForm, type CreateEventFormValues } from "./create-event-form";
import { useEventCategories } from "./event-categories.queries";
import { useActiveEventFormConfiguration, useEventHistoricalFormConfiguration } from "./event-form-configuration.queries";
import { createEvent, EventsApiError, updateEvent, type ActiveEventFormConfiguration, type ActiveEventFormField, type Event, type EventCategory } from "./events.service";
import { canEditEvent } from "./event-status";
import ConfiguredCreateEventSection from "./ConfiguredCreateEventSection";
import ConfiguredCreateEventReview from "./ConfiguredCreateEventReview";

const steps = ["Basic Information", "Schedule", "Location & Host", "Pricing & Tickets", "Capacity & Registration", "Images & Media", "Additional Configuration", "Review & Submit"] as const;
const stepFields: ReadonlyArray<readonly string[]> = [["title", "description", "category", "organiser_name", "organiser_contact"], ["start_date", "end_date", "registration_cutoff", "registration_open_at", "registration_close_at"], ["location_id", "venue_name", "venue_address", "venue_city"], ["price", "currency", "ticket_types"], ["capacity", "min_participants", "max_participants"], ["media"], ["sessions", "custom_fields"], []];

type EventEditorProps = { mode?: "create" | "edit"; initialEvent?: Event };
type CustomFieldValue = string | string[] | boolean | number | null;

/** Applies the active field's backend-supported type before custom-value serialization. */
function serializeCustomFieldValue(field: ActiveEventFormField, value: CustomFieldValue): CustomFieldValue {
  if (value === null) return null;
  if (field.value_type === "boolean" || field.renderer === "checkbox") {
    return value === true || value === "true";
  }
  if (field.value_type === "number" || field.renderer === "number") {
    if (typeof value === "number") return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : value;
    }
  }
  return value;
}

/** Renders the shared Enterprise Admin Event editor for create and edit workflows. */
export default function CreateEventScreen({ mode = "create", initialEvent }: EventEditorProps) {
  const router = useRouter(); const queryClient = useQueryClient();
  const { tenantId } = useTenant(); const { currentEnterprise, enterpriseId } = useCurrentEnterprise();
  const [activeStep, setActiveStep] = useState(0);
  const [initialValues] = useState(() => initialEvent ? eventToFormValues(initialEvent) : createEmptyEventForm());
  const [values, setValues] = useState(() => initialEvent ? eventToFormValues(initialEvent) : createEmptyEventForm());
  const [initialLocationId] = useState(initialEvent?.location_id ?? "");
  const [locationId, setLocationId] = useState(initialEvent?.location_id ?? "");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [customValues, setCustomValues] = useState<Record<string, string | string[] | boolean | number | null>>({});
  const [initialCustomValues, setInitialCustomValues] = useState<Record<string, string | string[] | boolean | number | null>>({});
  const historicalCustomValuesHydrated = useRef(false);
  const enterpriseName = currentEnterprise?.business_legal_name || currentEnterprise?.business_short_name || currentEnterprise?.name || "";
  const organiserContact = [currentEnterprise?.business_email, currentEnterprise?.business_phone].filter(Boolean).join(" | ");
  useEffect(() => { if (mode === "create") setValues((current) => ({ ...current, organiser_name: current.organiser_name || enterpriseName, organiser_contact: current.organiser_contact || organiserContact })); }, [enterpriseName, mode, organiserContact]);
  const locationsQuery = useQuery({ queryKey: ["enterprise", enterpriseId, "locations"], queryFn: () => getEnterpriseLocations(enterpriseId ?? ""), enabled: Boolean(enterpriseId), staleTime: 30_000, retry: 1 });
  const activeFormConfiguration = useActiveEventFormConfiguration(mode === "create");
  const historicalFormConfiguration = useEventHistoricalFormConfiguration(initialEvent?.id, mode === "edit" && Boolean(initialEvent));
  const formConfiguration = mode === "create" ? activeFormConfiguration.data : historicalFormConfiguration.data;
  const configuredSections = useMemo(() => [...(formConfiguration?.sections ?? [])].filter((section) => section.is_enabled).sort((left, right) => left.position - right.position), [formConfiguration]);
  const requiresEventCategories = configuredSections.some((section) => section.fields.some((field) => field.source === "core" && (field.core_key === "category" || field.core_key === "subcategory")));
  const eventCategoriesQuery = useEventCategories(Boolean(formConfiguration) && requiresEventCategories);
  const editorSteps = formConfiguration ? [...configuredSections.map((section) => section.label), "Review & Submit"] : steps;
  useEffect(() => {
    if (mode !== "edit" || !initialEvent || !formConfiguration || historicalCustomValuesHydrated.current) return;
    const valuesByFieldId = new Map(initialEvent.custom_values?.map((entry) => [entry.field_id, entry.value]) ?? []);
    const hydrated = Object.fromEntries(formConfiguration.sections.flatMap((section) => section.fields).filter((field) => field.source === "custom").flatMap((field) => {
      const value = valuesByFieldId.get(field.id);
      return value === undefined ? [] : [[field.stable_key ?? field.id, value]];
    }));
    historicalCustomValuesHydrated.current = true;
    setCustomValues(hydrated);
    setInitialCustomValues(hydrated);
  }, [formConfiguration, initialEvent, mode]);
  const selectedLocation = locationsQuery.data?.find((location) => location.id === locationId);
  const isCreateBlockedByEnterprise = mode === "create" && !enterpriseId;
  const saveMutation = useMutation({
    mutationFn: () => {
      if (mode === "edit") { if (!initialEvent) throw new Error("The event could not be loaded."); if (!canEditEvent(initialEvent.status)) throw new Error("This Event cannot be edited in its current lifecycle state."); const payload = buildUpdateEventPayload(values, initialValues, locationId, initialLocationId); if (formConfiguration && JSON.stringify(customValues) !== JSON.stringify(initialCustomValues)) payload.custom_values = formConfiguration.sections.flatMap((section) => section.fields).filter((field) => field.source === "custom").map((field) => { const key = field.stable_key ?? field.id; return { field_id: field.id, value: serializeCustomFieldValue(field, customValues[key] ?? null) }; }); return updateEvent(initialEvent.id, payload); }
      if (!tenantId || !enterpriseId || !locationId) throw new Error("A tenant, enterprise, and location are required.");
      if (!activeFormConfiguration.data) throw new Error("An active Event form configuration is required.");
      const configuredCoreKeys = new Set(activeFormConfiguration.data.sections.flatMap((section) => section.fields.filter((field) => field.source === "core").map((field) => field.core_key ?? field.stable_key ?? field.id)));
      const configuredCustomValues = activeFormConfiguration.data.sections.flatMap((section) => section.fields).filter((field) => field.source === "custom").map((field) => { const key = field.stable_key ?? field.id; return { field_id: field.id, value: serializeCustomFieldValue(field, customValues[key] ?? null) }; }).filter((entry) => entry.value !== null);
      return createEvent(buildCreateEventPayload(values, tenantId, enterpriseId, locationId, activeFormConfiguration.data.version_id, configuredCustomValues, configuredCoreKeys));
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["events", "list"] }); if (initialEvent) { await queryClient.invalidateQueries({ queryKey: ["events", "detail", initialEvent.id] }); router.push(`/admin/events/${initialEvent.id}`); } else router.push("/admin/events"); },
    onError: (error) => { if (error instanceof EventsApiError) { setErrors((current) => ({ ...current, ...error.fieldErrors })); setSubmitError(error.status === 401 || error.status === 403 ? "Your session cannot save this event. Please sign in again." : error.message); } else setSubmitError(error instanceof Error ? error.message : "Unable to save event."); },
  });
  const update = <Key extends keyof CreateEventFormValues>(key: Key, value: CreateEventFormValues[Key]) => { setValues((current) => ({ ...current, [key]: value })); setErrors((current) => ({ ...current, [key]: [] })); setSubmitError(null); };
  const allErrors = useMemo(() => formConfiguration ? validateConfiguredEventForm(formConfiguration, values, customValues, Boolean(locationId), eventCategoriesQuery.data ?? [], mode) : validateEventForm(values, Boolean(locationId), mode), [customValues, eventCategoriesQuery.data, formConfiguration, locationId, mode, values]);
  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues) || locationId !== initialLocationId || JSON.stringify(customValues) !== JSON.stringify(initialCustomValues);
  const continueToNext = () => { const currentFields = formConfiguration ? configuredSections[activeStep]?.fields.map((field) => field.source === "core" ? field.core_key ?? field.stable_key ?? field.id : field.stable_key ?? field.id) ?? [] : stepFields[activeStep] ?? []; const currentErrors = Object.fromEntries(Object.entries(allErrors).filter(([field]) => currentFields.includes(field))); if (Object.keys(currentErrors).length > 0) { setErrors(currentErrors); return; } setErrors({}); setActiveStep((current) => Math.min(current + 1, editorSteps.length - 1)); };
  const submit = () => { if (mode === "edit" && !isDirty) return; if (Object.keys(allErrors).length > 0) { setErrors(allErrors); setSubmitError("Review the highlighted fields before saving."); return; } setSubmitError(null); saveMutation.mutate(); };
  const sharedProps = { values, update, errors };
  const locationProps = { ...sharedProps, locations: locationsQuery.data ?? [], selectedLocationId: locationId, setSelectedLocationId: setLocationId, isLoadingLocations: locationsQuery.isLoading, locationError: locationsQuery.isError ? "Unable to load enterprise locations." : null };
  const backHref = initialEvent ? `/admin/events/${initialEvent.id}` : "/admin/events";
  const title = mode === "edit" ? "Edit Event" : "Create Event";

  if (mode === "edit" && historicalFormConfiguration.isLoading) {
    return <HistoricalFormStatus>Loading this Event&apos;s historical form configuration…</HistoricalFormStatus>;
  }

  if (mode === "edit" && historicalFormConfiguration.isError) {
    return <HistoricalFormStatus error onRetry={() => void historicalFormConfiguration.refetch()}>Unable to load this Event&apos;s historical form configuration. The Event was not opened with the current active form.</HistoricalFormStatus>;
  }

  if (mode === "edit" && formConfiguration) {
    return <div className="w-full">
      <header className="flex flex-col gap-4 border-b border-[#edf3f0] pb-6 sm:flex-row sm:items-start sm:justify-between"><div><Link href={backHref} className="text-sm font-semibold text-[#1f6a58]">Back to Event</Link><p className="mt-4 text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">{initialEvent?.status ?? "EVENT"}</p><h1 className="mt-2 text-2xl font-bold text-[#06201c] sm:text-3xl">{title}</h1><p className="mt-2 text-sm text-[#52736a] sm:text-base">{initialEvent?.title}</p></div><Link href={backHref} className="inline-flex h-11 items-center justify-center rounded-full border border-[#d7e5df] px-5 text-sm font-semibold text-[#52736a]">Cancel</Link></header>
      <div className="mt-6 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]"><nav aria-label="Event editor sections" className="rounded-2xl border border-[#e1ebe6] bg-white p-3 shadow-sm">{editorSteps.map((step, index) => <button key={`${step}-${index}`} type="button" onClick={() => setActiveStep(index)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold ${activeStep === index ? "bg-[#e8f6ee] text-[#1f6a58]" : "text-[#52736a] hover:bg-[#f9fcfa]"}`}><span className="flex h-6 w-6 items-center justify-center rounded-full border border-current text-xs">{index + 1}</span>{step}</button>)}</nav>
        <main className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm sm:p-6">{activeStep < configuredSections.length ? <ConfiguredCreateEventSection section={configuredSections[activeStep]} {...sharedProps} customValues={customValues} setCustomValues={setCustomValues} locations={locationsQuery.data ?? []} locationId={locationId} setLocationId={setLocationId} categories={eventCategoriesQuery.data ?? []} categoriesLoading={eventCategoriesQuery.isLoading} categoriesError={eventCategoriesQuery.isError} allowPastTemporalValues /> : <ConfiguredCreateEventReview configuration={formConfiguration} values={values} customValues={customValues} locationName={selectedLocation ? `${selectedLocation.location_name} - ${selectedLocation.city}` : ""} />}{submitError ? <div role="alert" className="mt-6 rounded-xl border border-[#f3d0cb] bg-[#fff6f5] px-4 py-3 text-sm font-semibold text-[#b42318]">{submitError}</div> : null}
          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[#edf3f0] pt-5 sm:flex-row sm:justify-between"><button type="button" onClick={() => setActiveStep((current) => Math.max(current - 1, 0))} disabled={activeStep === 0 || saveMutation.isPending} className="h-11 rounded-full border border-[#d7e5df] px-5 text-sm font-semibold text-[#52736a] disabled:opacity-50">Back</button>{activeStep === editorSteps.length - 1 ? <button type="button" onClick={submit} disabled={saveMutation.isPending || !locationId || !isDirty} className="h-11 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm disabled:opacity-60">{saveMutation.isPending ? "Saving..." : "Save Changes"}</button> : <button type="button" onClick={continueToNext} className="h-11 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm">Continue</button>}</div>
        </main></div>
    </div>;
  }

  return <div className="w-full"><header className="flex flex-col gap-4 border-b border-[#edf3f0] pb-6 sm:flex-row sm:items-start sm:justify-between"><div><Link href={backHref} className="text-sm font-semibold text-[#1f6a58]">Back to {mode === "edit" ? "Event" : "Events"}</Link><p className="mt-4 text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">{mode === "edit" ? initialEvent?.status ?? "EVENT" : "DRAFT EVENT"}</p><h1 className="mt-2 text-2xl font-bold text-[#06201c] sm:text-3xl">{title}</h1><p className="mt-2 text-sm text-[#52736a] sm:text-base">{mode === "edit" ? initialEvent?.title : "Build and review a new event for your enterprise."}</p></div><Link href={backHref} className="inline-flex h-11 items-center justify-center rounded-full border border-[#d7e5df] px-5 text-sm font-semibold text-[#52736a]">Cancel</Link></header>
    {mode === "create" && (activeFormConfiguration.isLoading || activeFormConfiguration.isError || !activeFormConfiguration.data) ? <ActiveEventFormVerification query={activeFormConfiguration} /> : <div className="mt-6 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]"><nav aria-label="Event editor sections" className="rounded-2xl border border-[#e1ebe6] bg-white p-3 shadow-sm">{editorSteps.map((step, index) => <button key={`${step}-${index}`} type="button" onClick={() => setActiveStep(index)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold ${activeStep === index ? "bg-[#e8f6ee] text-[#1f6a58]" : "text-[#52736a] hover:bg-[#f9fcfa]"}`}><span className="flex h-6 w-6 items-center justify-center rounded-full border border-current text-xs">{index + 1}</span>{step}</button>)}</nav>
      <main className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm sm:p-6">{mode === "create" && activeFormConfiguration.data && activeStep < configuredSections.length ? <ConfiguredCreateEventSection section={configuredSections[activeStep]} {...sharedProps} customValues={customValues} setCustomValues={setCustomValues} locations={locationsQuery.data ?? []} locationId={locationId} setLocationId={setLocationId} categories={eventCategoriesQuery.data ?? []} categoriesLoading={eventCategoriesQuery.isLoading} categoriesError={eventCategoriesQuery.isError} /> : null}{mode === "create" && activeFormConfiguration.data && activeStep === configuredSections.length ? <ConfiguredCreateEventReview configuration={activeFormConfiguration.data} values={values} customValues={customValues} locationName={selectedLocation ? `${selectedLocation.location_name} - ${selectedLocation.city}` : ""} /> : null}{mode === "edit" && activeStep === 0 ? <BasicInformationSection {...sharedProps} /> : null}{mode === "edit" && activeStep === 1 ? <ScheduleSection {...sharedProps} /> : null}{mode === "edit" && activeStep === 2 ? <LocationAndHostSection {...locationProps} /> : null}{mode === "edit" && activeStep === 3 ? <PricingAndTicketsSection {...sharedProps} /> : null}{mode === "edit" && activeStep === 4 ? <CapacityAndRegistrationSection {...sharedProps} /> : null}{mode === "edit" && activeStep === 5 ? <MediaSection {...sharedProps} /> : null}{mode === "edit" && activeStep === 6 ? <AdditionalConfigurationSection {...sharedProps} /> : null}{mode === "edit" && activeStep === 7 ? <ReviewSection values={values} selectedLocationName={selectedLocation ? `${selectedLocation.location_name} - ${selectedLocation.city}` : ""} /> : null}{isCreateBlockedByEnterprise ? <div role="status" className="mt-6 rounded-xl border border-[#eadbb8] bg-[#fffaf0] px-4 py-3 text-sm font-semibold text-[#735c1e]">Creating an Event is unavailable until an Enterprise is linked. The current backend EventCreate contract requires an enterprise_id.</div> : null}{submitError ? <div role="alert" className="mt-6 rounded-xl border border-[#f3d0cb] bg-[#fff6f5] px-4 py-3 text-sm font-semibold text-[#b42318]">{submitError}</div> : null}
        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[#edf3f0] pt-5 sm:flex-row sm:justify-between"><button type="button" onClick={() => setActiveStep((current) => Math.max(current - 1, 0))} disabled={activeStep === 0 || saveMutation.isPending} className="h-11 rounded-full border border-[#d7e5df] px-5 text-sm font-semibold text-[#52736a] disabled:opacity-50">Back</button>{activeStep === editorSteps.length - 1 ? <button type="button" onClick={submit} disabled={saveMutation.isPending || !locationId || isCreateBlockedByEnterprise || (mode === "edit" && !isDirty)} className="h-11 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm disabled:opacity-60">{saveMutation.isPending ? mode === "edit" ? "Saving..." : "Creating..." : mode === "edit" ? "Save Changes" : "Create Event"}</button> : <button type="button" onClick={continueToNext} className="h-11 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm">Continue</button>}</div>
      </main></div>}</div>;
}

function HistoricalFormStatus({ children, error = false, onRetry }: { children: React.ReactNode; error?: boolean; onRetry?: () => void }) {
  return <section role={error ? "alert" : "status"} className={`rounded-2xl border px-5 py-12 text-center text-sm font-semibold ${error ? "border-[#eadbb8] bg-[#fffaf0] text-[#735c1e]" : "border-[#d7e5df] bg-[#f9fcfa] text-[#52736a]"}`}><p>{children}</p>{onRetry ? <button type="button" onClick={onRetry} className="mt-4 rounded-full border border-current px-4 py-2 text-sm font-bold">Retry</button> : null}</section>;
}

/** Displays non-sensitive active-form resolution metadata during this read-only integration phase. */
function ActiveEventFormVerification({ query }: { query: ReturnType<typeof useActiveEventFormConfiguration> }) {
  if (query.isLoading) return <aside role="status" className="mb-6 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] p-4 text-sm text-[#52736a]">Checking the active Event form configuration…</aside>;
  if (query.isError) return <aside role="status" className="mb-6 rounded-xl border border-[#eadbb8] bg-[#fffaf0] p-4 text-sm text-[#735c1e]">{query.error instanceof EventsApiError && (query.error.status === 401 || query.error.status === 403) ? "The active Event form could not be verified for this session. The existing Event form remains available." : query.error instanceof Error ? `Active Event form verification failed: ${query.error.message}` : "Active Event form verification failed. The existing Event form remains available."}</aside>;
  if (!query.data) return <aside role="status" className="mb-6 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] p-4 text-sm text-[#52736a]"><p className="font-semibold text-[#06201c]">No active Event form configuration</p><p className="mt-1">The existing Event form remains available.</p></aside>;
  return <aside role="status" className="mb-6 rounded-xl border border-[#cde5db] bg-[#f4faf7] p-4 text-sm text-[#355a51]"><p className="font-bold text-[#06201c]">Active Event Form</p><p className="mt-1 font-semibold text-[#1f6a58]">{query.data.name}</p><dl className="mt-3 grid gap-1 text-xs sm:grid-cols-2"><div><dt className="inline font-semibold">Scope: </dt><dd className="inline">{query.data.scope}</dd></div><div><dt className="inline font-semibold">Version: </dt><dd className="inline">{query.data.version}</dd></div><div><dt className="inline font-semibold">Configuration ID: </dt><dd className="inline break-all">{query.data.configuration_id}</dd></div><div><dt className="inline font-semibold">Version ID: </dt><dd className="inline break-all">{query.data.version_id}</dd></div><div><dt className="inline font-semibold">Sections: </dt><dd className="inline">{query.data.sections.length}</dd></div></dl></aside>;
}

function validateConfiguredEventForm(configuration: ActiveEventFormConfiguration, values: CreateEventFormValues, customValues: Record<string, string | string[] | boolean | number | null>, hasLocation: boolean, categories: readonly EventCategory[], mode: "create" | "edit"): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const section of configuration.sections.filter((item) => item.is_enabled)) for (const field of section.fields) {
    const key = field.source === "core" ? field.core_key ?? field.stable_key ?? field.id : field.stable_key ?? field.id;
    if (!field.required) continue;
    if (key === "duration_type") continue;
    if (key === "location" || key === "location_id") { if (!hasLocation) errors[key] = [`${field.label} is required.`]; continue; }
    const coreKey = ({ title: "title", description: "description", category: "category", subcategory: "subcategory", organiser_name: "organiser_name", organiser_contact: "organiser_contact", start_date: "start_date", start_datetime: "start_date", end_date: "end_date", end_datetime: "end_date", registration_cutoff: "registration_cutoff", registration_open_at: "registration_open_at", registration_close_at: "registration_close_at", time_zone: "time_zone", timezone: "time_zone", delivery_mode: "delivery_mode", event_type: "delivery_mode", price: "price", currency: "currency", capacity: "capacity", min_participants: "min_participants", max_participants: "max_participants", primary_image: "primary_image" } as Record<string, keyof CreateEventFormValues>)[key];
    const value = coreKey ? values[coreKey] : customValues[key];
    if ((Array.isArray(value) && value.length === 0) || value === null || value === undefined || String(value).trim() === "") errors[key] = [`${field.label} is required.`];
  }
  validateConfiguredCategories(configuration, values, categories, errors, mode);
  validateConfiguredDateTimes(configuration, values, errors, mode);
  return errors;
}

function validateConfiguredCategories(configuration: ActiveEventFormConfiguration, values: CreateEventFormValues, categories: readonly EventCategory[], errors: Record<string, string[]>, mode: "create" | "edit"): void {
  const keys = configuredCoreKeys(configuration);
  const categoryEnabled = isConfigured(keys, "category");
  const subcategoryEnabled = isConfigured(keys, "subcategory");
  const subcategoryField = configuration.sections.filter((section) => section.is_enabled).flatMap((section) => section.fields).find((field) => field.source === "core" && (field.core_key === "subcategory" || field.stable_key === "subcategory"));
  const parents = categories.filter((category) => category.parent_id === null);
  const selectedCategory = parents.find((category) => category.name === values.category);

  if (mode === "create" && categoryEnabled && values.category && !selectedCategory) errors.category = ["Select a valid category."];
  if (!subcategoryEnabled) return;
  if (!categoryEnabled) {
    if (subcategoryField?.required) errors.subcategory = ["A configured Category is required before selecting a subcategory."];
    return;
  }
  const subcategories = selectedCategory ? categories.filter((category) => category.parent_id === selectedCategory.id) : [];
  if (mode === "create" && values.subcategory && !subcategories.some((category) => category.name === values.subcategory)) errors.subcategory = ["Select a valid subcategory."];
}

function configuredCoreKeys(configuration: ActiveEventFormConfiguration): Set<string> {
  return new Set(configuration.sections.filter((section) => section.is_enabled).flatMap((section) => section.fields).filter((field) => field.source === "core").map((field) => field.core_key ?? field.stable_key ?? field.id));
}

function isConfigured(keys: Set<string>, ...candidates: string[]): boolean {
  return candidates.some((candidate) => keys.has(candidate));
}

function asLocalTimestamp(value: string): number | null {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function validateConfiguredDateTimes(configuration: ActiveEventFormConfiguration, values: CreateEventFormValues, errors: Record<string, string[]>, mode: "create" | "edit"): void {
  const keys = configuredCoreKeys(configuration);
  const startKey = isConfigured(keys, "start_datetime") ? "start_datetime" : "start_date";
  const endKey = isConfigured(keys, "end_datetime") ? "end_datetime" : "end_date";
  const start = asLocalTimestamp(values.start_date);
  const end = asLocalTimestamp(values.end_date);
  const opens = asLocalTimestamp(values.registration_open_at);
  const closes = asLocalTimestamp(values.registration_close_at);
  const cutoff = asLocalTimestamp(values.registration_cutoff);
  const nowDate = new Date();
  nowDate.setSeconds(0, 0);
  const now = nowDate.getTime();

  if (mode === "create" && isConfigured(keys, "start_date", "start_datetime") && start !== null && start < now) errors[startKey] = ["Start date cannot be in the past."];
  if (isConfigured(keys, "start_date", "start_datetime") && isConfigured(keys, "end_date", "end_datetime") && start !== null && end !== null && end <= start) errors[endKey] = ["End date and time must be after the start date and time."];
  if (mode === "create" && isConfigured(keys, "registration_open_at") && opens !== null && opens < now) errors.registration_open_at = ["Registration opening time cannot be in the past."];
  if (isConfigured(keys, "registration_open_at") && isConfigured(keys, "registration_close_at") && opens !== null && closes !== null && closes <= opens) errors.registration_close_at = ["Registration closing time must be after registration opening time."];
  if (isConfigured(keys, "registration_close_at") && isConfigured(keys, "start_date", "start_datetime") && closes !== null && start !== null && closes > start) errors.registration_close_at = ["Registration closing time must be on or before the Event start."];
  if (isConfigured(keys, "registration_cutoff") && isConfigured(keys, "registration_open_at") && cutoff !== null && opens !== null && cutoff <= opens) errors.registration_cutoff = ["Registration cutoff must be after registration opening time."];
  if (isConfigured(keys, "registration_cutoff") && isConfigured(keys, "start_date", "start_datetime") && cutoff !== null && start !== null && cutoff > start) errors.registration_cutoff = ["Registration cutoff must be before the Event starts."];
  if (isConfigured(keys, "registration_cutoff") && isConfigured(keys, "registration_close_at") && cutoff !== null && closes !== null && cutoff > closes) errors.registration_cutoff = ["Registration cutoff must not be after registration closing time."];

  const sessionField = configuration.sections.filter((section) => section.is_enabled).flatMap((section) => section.fields).find((field) => field.source === "core" && (field.core_key === "sessions" || field.stable_key === "sessions"));
  if (!sessionField) return;
  const enabled = sessionField.composite_config?.enabled_fields ?? [];
  const isSessionSubfieldEnabled = (name: string) => enabled.length === 0 || enabled.includes(name);
  const startDate = values.start_date.slice(0, 10);
  const endDate = values.end_date.slice(0, 10);
  const sessionDateOutOfRange = values.sessions.some((session) => (
    isSessionSubfieldEnabled("session_date")
    && Boolean(session.session_date)
    && Boolean(startDate)
    && Boolean(endDate)
    && (session.session_date < startDate || session.session_date > endDate)
  ));
  const sessionTimeInvalid = values.sessions.some((session) => (
    isSessionSubfieldEnabled("start_time")
    && isSessionSubfieldEnabled("end_time")
    && Boolean(session.start_time)
    && Boolean(session.end_time)
    && session.end_time <= session.start_time
  ));
  if (sessionDateOutOfRange) errors.sessions = ["Session date must fall within the Event date range."];
  else if (sessionTimeInvalid) errors.sessions = ["Session end time must be after session start time."];
}
