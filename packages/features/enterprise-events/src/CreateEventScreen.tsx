"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentEnterprise, useTenant } from "@ihp/enterprise-runtime";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AdditionalConfigurationSection, CapacityAndRegistrationSection, MediaSection, PricingAndTicketsSection, ReviewSection } from "./CreateEventConfigurationSections";
import { BasicInformationSection, LocationAndHostSection, ScheduleSection } from "./CreateEventDetailsSections";
import { buildCreateEventPayload, buildUpdateEventPayload, createEmptyEventForm, eventToFormValues, localDateTimeOrderValue, mapSessionForPayload, mergeLatestEventSessions, validateEventForm, validateParticipantCapacity, type CreateEventFormValues } from "./create-event-form";
import { validateServiceSchedule } from "./create-event-form";
import { useEventCategories, useEventType, useEventTypes } from "./event-categories.queries";
import { useActiveEventFormConfiguration, useEventHistoricalFormConfiguration } from "./event-form-configuration.queries";
import { createEvent, EventsApiError, getEventById, updateEvent, type ActiveEventFormConfiguration, type ActiveEventFormField, type Event, type EventCategory, type EventModules } from "./events.service";
import { canEditEvent } from "./event-status";
import ConfiguredCreateEventSection from "./ConfiguredCreateEventSection";
import ConfiguredCreateEventReview from "./ConfiguredCreateEventReview";
import { validateRequiredConfiguredEventFields } from "./configured-event-required-fields";
import EventModulesControls from "./EventModulesControls";
import { reconcileEventModules, reconcileSelectedEventModules } from "./event-modules";
import { type SessionGenerationRule, validateSessions } from "./SessionTableEditor";
import { createDefaultSessionGenerationRules } from "./session-generation-rules";
import { deleteEventMediaAsset, EventMediaApiError, getEventMediaPolicy, uploadEventMedia } from "./event-media.service";
import { documentUrl, type EventMediaField, type EventMediaUploadState } from "./event-media";
import { EVENT_CREATE_LEAVE_MESSAGE, shouldConfirmEventCreateLeave } from "./event-create-navigation-guard";
import { eventFieldMaxLength, EVENT_DESCRIPTION_MAX_LENGTH } from "./event-field-limits";
import EventCreateLeaveDialog from "./EventCreateLeaveDialog";

const steps = ["Basic Information", "Schedule", "Venue & Host", "Pricing & Tickets", "Capacity & Registration", "Images & Media", "Additional Configuration", "Review & Submit"] as const;
const stepFields: ReadonlyArray<readonly string[]> = [["title", "description", "category", "organiser_name", "organiser_contact"], ["start_date", "end_date", "registration_cutoff", "registration_open_at", "registration_close_at"], ["venue_name", "venue_address", "venue_city"], ["price", "currency", "ticket_types"], ["capacity", "min_participants", "max_participants"], ["media"], ["sessions", "custom_fields"], []];

function fieldDomId(key: string): string { return `event-field-${key.replace(/[^a-zA-Z0-9_-]/g, "-")}`; }
function firstErrorKey(order: readonly string[], errors: Record<string, string[]>): string | null { return order.find((key) => Boolean(errors[key]?.length)) ?? null; }
function errorCount(errors: Record<string, string[]>): number { return Object.values(errors).filter((messages) => messages.length > 0).length; }
function validationKeyCandidates(key: string): string[] {
  const normalized = key.replace(/\[(\d+)\]/g, ".$1");
  const root = normalized.split(".")[0];
  const aliases: Record<string, string> = {
    accommodation: "accommodation",
    custom_fields: "custom_fields",
    gallery_images: "gallery_images",
    meals: "meals",
    media: "media",
    modules: "delivery_mode",
    primary_image: "primary_image",
    registration_fields: "registration_fields",
    sessions: "sessions",
    ticket_types: "ticket_types",
    videos: "videos",
  };
  return [...new Set([normalized, key, aliases[root], root].filter((candidate): candidate is string => Boolean(candidate)))];
}
function resolveValidationKey(key: string, availableKeys: readonly string[]): string | null {
  return validationKeyCandidates(key).find((candidate) => availableKeys.includes(candidate)) ?? null;
}
function normalizeValidationErrors(rawErrors: Record<string, string[]>, availableKeys: readonly string[]): Record<string, string[]> {
  return Object.entries(rawErrors).reduce<Record<string, string[]>>((result, [key, messages]) => {
    const normalized = key.replace(/\[(\d+)\]/g, ".$1");
    const root = normalized.split(".")[0];
    if (normalized.includes(".") && availableKeys.includes(root)) {
      result[normalized] = [...(result[normalized] ?? []), ...messages];
      result[root] = [...(result[root] ?? []), ...messages];
    } else {
      const displayKey = resolveValidationKey(key, availableKeys) ?? key;
      result[displayKey] = [...(result[displayKey] ?? []), ...messages];
    }
    return result;
  }, {});
}
type EventEditorProps = { mode?: "create" | "edit"; initialEvent?: Event };
type CustomFieldValue = string | string[] | boolean | number | null;
type NavigationEventLike = { destination?: { url?: string; sameDocument?: boolean }; preventDefault: () => void };
type NavigationApiLike = { addEventListener: (type: "navigate", listener: (event: NavigationEventLike) => void) => void; removeEventListener: (type: "navigate", listener: (event: NavigationEventLike) => void) => void };
const eventCreateHistoryIndexKey = "__ihpEventCreateHistoryIndex";

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
  const [sessionGenerationRules, setSessionGenerationRules] = useState<SessionGenerationRule[]>(createDefaultSessionGenerationRules);
  const previousEventType = useRef(values.event_type);
  const initialLocationId = initialEvent?.location_id ?? "";
  const locationId = initialLocationId;
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [mediaUploads, setMediaUploads] = useState<EventMediaUploadState[]>([]);
  const cancelledMediaUploads = useRef(new Set<string>());
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingFocusField, setPendingFocusField] = useState<string | null>(null);
  const [leaveConfirmationOpen, setLeaveConfirmationOpen] = useState(false);
  const [customValues, setCustomValues] = useState<Record<string, string | string[] | boolean | number | null>>({});
  const [initialCustomValues, setInitialCustomValues] = useState<Record<string, string | string[] | boolean | number | null>>({});
  const eventCreateAllowNavigation = useRef(false);
  const eventCreateSubmitted = useRef(false);
  const eventCreateDirty = useRef(false);
  const pendingLeaveAction = useRef<(() => void) | null>(null);
  const historicalCustomValuesHydrated = useRef(false);
  const enterpriseName = currentEnterprise?.business_legal_name || currentEnterprise?.business_short_name || currentEnterprise?.name || "";
  const organiserContact = [currentEnterprise?.business_email, currentEnterprise?.business_phone].filter(Boolean).join(" | ");
  useEffect(() => { if (mode === "create") setValues((current) => ({ ...current, organiser_name: current.organiser_name || enterpriseName, organiser_contact: current.organiser_contact || organiserContact })); }, [enterpriseName, mode, organiserContact]);
  const activeFormConfiguration = useActiveEventFormConfiguration(mode === "create");
  const eventTypesQuery = useEventTypes(mode === "create" || mode === "edit");
  const persistedEventTypeQuery = useEventType(initialEvent?.event_type_id, mode === "edit");
  const availableEventTypes = useMemo(() => {
    const active = eventTypesQuery.data ?? [];
    const persisted = persistedEventTypeQuery.data;
    return persisted && !active.some((item) => item.id === persisted.id || item.key === persisted.key) ? [...active, persisted] : active;
  }, [eventTypesQuery.data, persistedEventTypeQuery.data]);
  useEffect(() => {
    if (mode !== "create") return;
    const selected = eventTypesQuery.data?.find((item) => item.key === values.event_type);
    if (!values.event_type || !selected) {
      previousEventType.current = values.event_type;
      setValues((current) => current.modules === null ? current : { ...current, modules: null });
      return;
    }
    const eventTypeChanged = previousEventType.current !== values.event_type;
    previousEventType.current = values.event_type;
    setValues((current) => {
      const reconciledModules = reconcileEventModules(selected, current.modules, !eventTypeChanged);
      const modules = current.delivery_mode === "in_person" ? { ...reconciledModules, online_meeting: false } : reconciledModules;
      const pricing_type = modules.tickets ? current.pricing_type : "free";
      return JSON.stringify(current.modules) === JSON.stringify(modules) && current.pricing_type === pricing_type ? current : { ...current, modules, pricing_type };
    });
    }, [eventTypesQuery.data, mode, values.delivery_mode, values.event_type]);
  const selectedEventType = availableEventTypes.find((item) => item.key === values.event_type || item.id === values.event_type);
  const hasHistoricalConfiguration = Boolean(initialEvent?.form_configuration_id && initialEvent?.form_configuration_version_id);
  const historicalFormConfiguration = useEventHistoricalFormConfiguration(initialEvent?.id, mode === "edit" && hasHistoricalConfiguration);
  const formConfiguration = mode === "create" ? activeFormConfiguration.data : historicalFormConfiguration.data;
  const configuredSections = useMemo(() => [...(formConfiguration?.sections ?? [])]
    .filter((section) => section.is_enabled)
    .sort((left, right) => left.position - right.position)
    .map((section) => ({
      ...section,
      fields: section.fields.filter((field) => {
        const key = field.source === "core" ? field.core_key ?? field.stable_key ?? field.id : "";
        return !["location", "location_id"].includes(key.replace(/^(core_|custom_)/, "").trim().toLowerCase());
      }),
    }))
    .filter((section) => section.fields.length > 0), [formConfiguration]);
  const currencyOptions = useMemo(() => {
    const configuredOptions = formConfiguration?.sections.flatMap((section) => section.fields).find((field) => field.source === "core" && (field.core_key === "currency" || field.stable_key === "currency"))?.options ?? [];
    return configuredOptions.some((option) => option.value === "USD") ? configuredOptions : [{ value: "USD", label: "USD — US Dollar", position: 0 }, ...configuredOptions];
  }, [formConfiguration]);
  const requiresEventCategories = configuredSections.some((section) => section.fields.some((field) => field.source === "core" && (field.core_key === "category" || field.core_key === "subcategory")));
  const eventCategoriesQuery = useEventCategories(Boolean(formConfiguration) && requiresEventCategories);
  const mediaPolicyQuery = useQuery({ queryKey: ["events", "media-policy"], queryFn: getEventMediaPolicy, staleTime: 5 * 60_000 });
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
  const isCreateBlockedByEnterprise = mode === "create" && !enterpriseId;
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (mode === "edit") { if (!initialEvent) throw new Error("The event could not be loaded."); if (!canEditEvent(initialEvent.status)) throw new Error("This Event cannot be edited in its current lifecycle state."); const sessionsDirty = JSON.stringify(values.sessions) !== JSON.stringify(initialValues.sessions); const configuredFieldKeys = formConfiguration ? configuredCoreKeys(formConfiguration) : undefined; const sessionsField = formConfiguration?.sections.flatMap((section) => section.fields).find((field) => field.source === "core" && (field.core_key === "sessions" || field.stable_key === "sessions")); const sessionsEnabledFields = sessionsField?.composite_config?.enabled_fields; const payload = buildUpdateEventPayload(values, initialValues, locationId, initialLocationId, configuredFieldKeys, sessionsEnabledFields); if (sessionsDirty && payload.sessions) { const latestEvent = await getEventById(initialEvent.id); payload.sessions = mergeLatestEventSessions(initialValues.sessions, values.sessions, latestEvent.sessions).map((session) => mapSessionForPayload(session, sessionsEnabledFields, values.delivery_mode)); } if (formConfiguration && JSON.stringify(customValues) !== JSON.stringify(initialCustomValues)) payload.custom_values = formConfiguration.sections.flatMap((section) => section.fields).filter((field) => field.source === "custom").map((field) => { const key = field.stable_key ?? field.id; return { field_id: field.id, value: serializeCustomFieldValue(field, customValues[key] ?? null) }; }); return updateEvent(initialEvent.id, payload); }
      if (!tenantId || !enterpriseId) throw new Error("A tenant and enterprise are required.");
      const activeConfiguration = activeFormConfiguration.data;
      const configuredCoreFieldKeys = activeConfiguration
        ? new Set(activeConfiguration.sections.flatMap((section) => section.fields.filter((field) => field.source === "core").map((field) => field.core_key ?? field.stable_key ?? field.id)).filter((key) => !["location", "location_id"].includes(key.replace(/^(core_|custom_)/, "").trim().toLowerCase())))
        : undefined;
      const configuredCustomValues = activeConfiguration
        ? activeConfiguration.sections.flatMap((section) => section.fields).filter((field) => field.source === "custom").map((field) => { const key = field.stable_key ?? field.id; return { field_id: field.id, value: serializeCustomFieldValue(field, customValues[key] ?? null) }; }).filter((entry) => entry.value !== null)
        : undefined;
      const sessionsField = activeConfiguration?.sections.flatMap((section) => section.fields).find((field) => field.source === "core" && (field.core_key === "sessions" || field.stable_key === "sessions"));
      return createEvent(buildCreateEventPayload(values, tenantId, enterpriseId, locationId, activeConfiguration?.version_id, configuredCustomValues, configuredCoreFieldKeys, sessionsField?.composite_config?.enabled_fields));
    },
    onSuccess: async () => { eventCreateSubmitted.current = true; eventCreateAllowNavigation.current = true; setMediaUploads([]); await queryClient.invalidateQueries({ queryKey: ["events", "list"] }); if (initialEvent) { await queryClient.invalidateQueries({ queryKey: ["events", "detail", initialEvent.id] }); router.push(`/admin/events/${initialEvent.id}`); } else router.push("/admin/events"); },
    onError: (error) => { if (error instanceof EventsApiError) { const displayErrors = normalizeValidationErrors(error.fieldErrors, allFieldOrder); setErrors((current) => ({ ...current, ...displayErrors })); const firstStructuredItem = error.structuredErrors.find((item) => allFieldOrder.some((field) => resolveValidationKey(item.fieldKey, [field]) === field)); const firstStructuredRoot = firstStructuredItem?.fieldKey; const firstStructuredNested = firstStructuredItem?.nestedPath.filter((part) => part !== "options"); const structuredFocus = firstStructuredRoot && firstStructuredNested?.length ? `${firstStructuredRoot}.${firstStructuredNested.join(".")}` : firstStructuredRoot; const first = structuredFocus ?? firstErrorKey(allFieldOrder, displayErrors) ?? Object.keys(displayErrors).find((key) => displayErrors[key]?.length); if (first) { const sectionIndex = editorSteps.findIndex((_, index) => sectionFields(index).includes(firstStructuredRoot ?? first)); if (sectionIndex >= 0) setActiveStep(sectionIndex); setPendingFocusField(first); } const mappedToField = Boolean(firstStructuredRoot || firstErrorKey(allFieldOrder, displayErrors)); setSubmitError(error.status === 401 || error.status === 403 ? "Your session cannot save this event. Please sign in again." : mappedToField ? null : error.message); } else setSubmitError(error instanceof Error ? error.message : "Unable to save event."); },
  });
  const update = <Key extends keyof CreateEventFormValues>(key: Key, value: CreateEventFormValues[Key]) => {
    setValues((current) => {
      if (key === "event_type") {
        const selected = availableEventTypes.find((item) => item.key === value);
        const reconciledModules = reconcileSelectedEventModules(selected, current.modules);
        const modules = reconciledModules && current.delivery_mode === "in_person" ? { ...reconciledModules, online_meeting: false } : reconciledModules;
        if (!modules) return { ...current, event_type: value as CreateEventFormValues["event_type"], modules: null, pricing_type: "free" };
        return { ...current, event_type: value as CreateEventFormValues["event_type"], modules, pricing_type: modules.tickets ? current.pricing_type : "free" };
      }
      if (key === "delivery_mode" && value === "in_person" && current.modules?.online_meeting) return { ...current, delivery_mode: value, modules: { ...current.modules, online_meeting: false } };
      return key === "modules" && value && !(value as CreateEventFormValues["modules"])?.tickets ? { ...current, modules: value as CreateEventFormValues["modules"], pricing_type: "free" } : { ...current, [key]: value };
    });
    setErrors((current) => ({ ...current, [key]: [] })); setSubmitError(null);
  };
  const updateCustomValues = (next: Record<string, string | string[] | boolean | number | null>) => { const changedKey = Object.keys(next).find((key) => JSON.stringify(next[key]) !== JSON.stringify(customValues[key])); setCustomValues(next); if (changedKey) setErrors((current) => ({ ...current, [changedKey]: [] })); setSubmitError(null); };
  const updateMediaUpload = (id: string, patch: Partial<EventMediaUploadState>) => setMediaUploads((current) => current.map((upload) => upload.id === id ? { ...upload, ...patch } : upload));
  const runMediaUpload = (upload: EventMediaUploadState) => {
    cancelledMediaUploads.current.delete(upload.id);
    updateMediaUpload(upload.id, { status: "uploading", progress: 0, error: undefined });
    void uploadEventMedia(upload.file, upload.field, upload.clientRef, undefined, (progress) => updateMediaUpload(upload.id, { progress }))
      .then((asset) => {
        if (cancelledMediaUploads.current.has(upload.id)) {
          cancelledMediaUploads.current.delete(upload.id);
          if (!asset.attached) void deleteEventMediaAsset(asset.id).catch(() => undefined);
          return;
        }
        setValues((current) => {
          if (upload.field === "primary_image") return { ...current, primary_image: asset.url };
          const list = current[upload.field] as Array<string | { url: string }>;
          const valueIndex = upload.valueIndex;
          const nextValue = upload.field === "documents" ? asset : asset.url;
          if (valueIndex !== undefined) return { ...current, [upload.field]: list.map((item, index) => index === valueIndex ? nextValue : item) };
          return { ...current, [upload.field]: upload.replaceIndex === undefined ? [...list, nextValue] : list.map((item, index) => index === upload.replaceIndex ? nextValue : item) };
        });
        updateMediaUpload(upload.id, { status: "ready", progress: 100, asset });
      })
      .catch((error: unknown) => updateMediaUpload(upload.id, { status: "error", error: error instanceof EventMediaApiError ? error.message : error instanceof Error ? error.message : "The upload failed." }));
  };
  const onMediaUpload = (field: EventMediaField, file: File, replaceIndex?: number) => {
    const clientRef = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const valueIndex = field === "primary_image" ? undefined : replaceIndex ?? (values[field] as readonly unknown[]).length;
    const upload: EventMediaUploadState = { id: `${field}-${clientRef}`, field, file, clientRef, progress: 0, status: "uploading", ...(replaceIndex === undefined ? {} : { replaceIndex }), ...(valueIndex === undefined ? {} : { valueIndex }) };
    if (field !== "primary_image" && replaceIndex === undefined) {
      setValues((current) => field === "documents" ? { ...current, documents: [...current.documents, { url: "" }] } : { ...current, [field]: [...(current[field] as string[]), ""] });
    }
    setMediaUploads((current) => [...current, upload]);
    runMediaUpload(upload);
  };
  const onMediaRetry = (id: string) => { const upload = mediaUploads.find((item) => item.id === id); if (upload) runMediaUpload(upload); };
  const onMediaUploadRemove = (id: string) => {
    const tracked = mediaUploads.find((item) => item.id === id);
    if (!tracked) return;
    if (tracked.status === "uploading") cancelledMediaUploads.current.add(id);
    const assetUrl = tracked.asset?.url;
    setValues((current) => {
      if (tracked.field === "primary_image") return !assetUrl || current.primary_image === assetUrl ? { ...current, primary_image: "" } : current;
      const list = current[tracked.field] as Array<string | { url: string }>;
      const matchingIndex = assetUrl
        ? list.findIndex((item) => documentUrl(item) === assetUrl)
        : tracked.valueIndex !== undefined && documentUrl(list[tracked.valueIndex] ?? "") === "" ? tracked.valueIndex : -1;
      return matchingIndex >= 0 ? { ...current, [tracked.field]: list.filter((_, index) => index !== matchingIndex) } : current;
    });
    const removeUploadState = () => setMediaUploads((current) => current.filter((item) => item.id !== id));
    if (tracked.asset && !tracked.asset.attached) {
      void deleteEventMediaAsset(tracked.asset.id).then(removeUploadState).catch((error: unknown) => updateMediaUpload(id, { status: "error", error: error instanceof EventMediaApiError && error.status === 409 ? "This upload is already attached to an Event." : "The upload could not be removed." }));
    } else removeUploadState();
  };
  const onMediaLinkChange = (field: EventMediaField, index: number, value: string) => {
    setValues((current) => {
      if (field === "primary_image") return { ...current, primary_image: value };
      if (field === "documents") return { ...current, documents: current.documents.map((item, itemIndex) => itemIndex === index ? { ...item, url: value } : item) };
      return { ...current, [field]: (current[field] as string[]).map((item, itemIndex) => itemIndex === index ? value : item) };
    });
    setErrors((current) => ({ ...current, [field]: [] }));
    setSubmitError(null);
  };
  const onMediaAddLink = (field: EventMediaField) => {
    setValues((current) => field === "primary_image" ? { ...current, primary_image: "" } : field === "documents" ? { ...current, documents: [...current.documents, { url: "" }] } : { ...current, [field]: [...(current[field] as string[]), ""] });
  };
  const onMediaRemove = (field: EventMediaField, index: number) => {
    const value = field === "primary_image" ? values.primary_image : (values[field] as Array<string | { url: string }>)[index];
    const url = documentUrl(value ?? "");
    setValues((current) => field === "primary_image" ? { ...current, primary_image: "" } : field === "documents" ? { ...current, documents: current.documents.filter((_, itemIndex) => itemIndex !== index) } : { ...current, [field]: (current[field] as string[]).filter((_, itemIndex) => itemIndex !== index) });
    const tracked = mediaUploads.find((upload) => upload.asset?.url === url || upload.field === field && upload.valueIndex === index);
    if (tracked?.asset && !tracked.asset.attached) {
      void deleteEventMediaAsset(tracked.asset.id).then(() => setMediaUploads((current) => current.filter((upload) => upload.id !== tracked.id))).catch((error: unknown) => updateMediaUpload(tracked.id, { status: "error", error: error instanceof EventMediaApiError && error.status === 409 ? "This upload is already attached to an Event." : "The upload could not be removed." }));
    } else if (tracked) {
      if (tracked.status === "uploading") cancelledMediaUploads.current.add(tracked.id);
      setMediaUploads((current) => current.filter((upload) => upload.id !== tracked.id));
    }
  };
  useEffect(() => {
    if (!pendingFocusField) return;
    const candidates = pendingFocusField === "media"
      ? ["primary_image", "gallery_images", "videos", "documents"]
      : [pendingFocusField];
    const fieldWrapper = [...document.querySelectorAll<HTMLElement>("[data-event-field]")]
      .find((element) => candidates.includes(element.dataset.eventField ?? ""));
    const element = candidates.map((key) => document.getElementById(fieldDomId(key))).find(Boolean)
      ?? fieldWrapper?.querySelector<HTMLElement>("input, select, textarea, button")
      ?? fieldWrapper
      ?? document.querySelector<HTMLElement>("main [aria-invalid='true']")
      ?? document.querySelector<HTMLElement>("main input, main select, main textarea, main button");
    if (!element) return;
    element.classList.add("event-validation-focus");
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    if (element instanceof HTMLElement) element.focus({ preventScroll: true });
    window.setTimeout(() => element.classList.remove("event-validation-focus"), 1600);
    setPendingFocusField(null);
  }, [activeStep, pendingFocusField]);
  const allErrors = useMemo(() => formConfiguration ? validateConfiguredEventForm(formConfiguration, values, customValues, eventCategoriesQuery.data ?? [], mode) : validateEventForm(values, mode), [customValues, eventCategoriesQuery.data, formConfiguration, mode, values]);
  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues)
    || JSON.stringify(customValues) !== JSON.stringify(initialCustomValues)
    || mediaUploads.length > 0
    || (mode === "create" && JSON.stringify(sessionGenerationRules) !== JSON.stringify(createDefaultSessionGenerationRules));
  useEffect(() => {
    eventCreateDirty.current = isDirty;
  }, [isDirty]);
  useEffect(() => {
    if (mode !== "create" || typeof window === "undefined") return;

    const shouldPrompt = () => shouldConfirmEventCreateLeave({ mode, isDirty: eventCreateDirty.current, hasSubmitted: eventCreateSubmitted.current });
    const requestLeaveConfirmation = (action: () => void) => {
      pendingLeaveAction.current = action;
      setLeaveConfirmationOpen(true);
    };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (eventCreateAllowNavigation.current || !shouldPrompt()) return;
      event.preventDefault();
      event.returnValue = EVENT_CREATE_LEAVE_MESSAGE;
    };
    window.addEventListener("beforeunload", beforeUnload);

    const navigationApi = (window as unknown as { navigation?: NavigationApiLike }).navigation;
    const onNavigate = (event: NavigationEventLike) => {
      const destinationUrl = event.destination?.url;
      if (eventCreateAllowNavigation.current || !destinationUrl || destinationUrl === window.location.href || !shouldPrompt()) return;
      event.preventDefault();
      requestLeaveConfirmation(() => {
        eventCreateAllowNavigation.current = true;
        const destination = new URL(destinationUrl, window.location.href);
        if (destination.origin === window.location.origin) router.push(`${destination.pathname}${destination.search}${destination.hash}`);
        else window.location.assign(destination.href);
      });
    };
    if (navigationApi) {
      navigationApi.addEventListener("navigate", onNavigate);
    }

    const history = window.history;
    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);
    const initialUrl = window.location.href;
    const readHistoryIndex = (state: unknown): number | undefined => {
      if (!state || typeof state !== "object") return undefined;
      const value = (state as Record<string, unknown>)[eventCreateHistoryIndexKey];
      return typeof value === "number" ? value : undefined;
    };
    const tagHistoryState = (state: unknown, index: number): Record<string, unknown> => ({
      ...(state && typeof state === "object" ? state as Record<string, unknown> : {}),
      [eventCreateHistoryIndexKey]: index,
    });
    let currentHistoryIndex = readHistoryIndex(history.state) ?? 0;
    originalReplaceState(tagHistoryState(history.state, currentHistoryIndex), "", initialUrl);
    let restoringDirection: -1 | 1 | null = null;

    const guardedPushState: History["pushState"] = (state, title, url) => {
      const nextUrl = url == null ? window.location.href : new URL(String(url), window.location.href).href;
      if (nextUrl !== window.location.href && !eventCreateAllowNavigation.current && shouldPrompt()) {
        requestLeaveConfirmation(() => {
          eventCreateAllowNavigation.current = true;
          currentHistoryIndex += 1;
          originalPushState(tagHistoryState(state, currentHistoryIndex), title, url);
        });
        return;
      }
      currentHistoryIndex += 1;
      originalPushState(tagHistoryState(state, currentHistoryIndex), title, url);
    };
    const guardedReplaceState: History["replaceState"] = (state, title, url) => {
      const nextUrl = url == null ? window.location.href : new URL(String(url), window.location.href).href;
      if (nextUrl !== window.location.href && !eventCreateAllowNavigation.current && shouldPrompt()) {
        requestLeaveConfirmation(() => {
          eventCreateAllowNavigation.current = true;
          originalReplaceState(tagHistoryState(state, currentHistoryIndex), title, url);
        });
        return;
      }
      originalReplaceState(tagHistoryState(state, currentHistoryIndex), title, url);
    };
    history.pushState = guardedPushState;
    history.replaceState = guardedReplaceState;

    const handlePopState = (event: PopStateEvent) => {
      const destinationIndex = readHistoryIndex(event.state);
      const direction: -1 | 1 = destinationIndex !== undefined && destinationIndex > currentHistoryIndex ? 1 : -1;
      if (restoringDirection !== null) {
        const requestedDirection = restoringDirection;
        restoringDirection = null;
        currentHistoryIndex = readHistoryIndex(history.state) ?? currentHistoryIndex;
        window.setTimeout(() => {
          if (!shouldPrompt()) {
            eventCreateAllowNavigation.current = true;
            history.go(requestedDirection);
          } else requestLeaveConfirmation(() => {
            eventCreateAllowNavigation.current = true;
            history.go(requestedDirection);
          });
        }, 0);
        return;
      }
      if (eventCreateAllowNavigation.current || !shouldPrompt()) {
        if (destinationIndex !== undefined) currentHistoryIndex = destinationIndex;
        return;
      }
      restoringDirection = direction;
      history.go(-direction);
    };
    if (!navigationApi) window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      if (navigationApi) navigationApi.removeEventListener("navigate", onNavigate);
      else window.removeEventListener("popstate", handlePopState);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      if (window.location.href === initialUrl && readHistoryIndex(history.state) !== undefined) {
        const state = history.state as Record<string, unknown>;
        const rest = { ...state };
        delete rest[eventCreateHistoryIndexKey];
        originalReplaceState(rest, "", initialUrl);
      }
    };
  }, [mode, router]);
  const handleCreateLeave = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (mode !== "create") return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!shouldConfirmEventCreateLeave({ mode, isDirty, hasSubmitted: eventCreateSubmitted.current })) return;
    event.preventDefault();
    pendingLeaveAction.current = () => {
      eventCreateAllowNavigation.current = true;
      router.push(backHref);
    };
    setLeaveConfirmationOpen(true);
  };
  const stayOnEventCreate = () => { pendingLeaveAction.current = null; setLeaveConfirmationOpen(false); };
  const leaveEventCreate = () => { const action = pendingLeaveAction.current; pendingLeaveAction.current = null; setLeaveConfirmationOpen(false); action?.(); };
  const sectionFields = (index: number): string[] => {
    if (!formConfiguration) return [...(stepFields[index] ?? [])];
    const fields = configuredSections[index]?.fields.map((field) => field.source === "core" ? field.core_key ?? field.stable_key ?? field.id : field.stable_key ?? field.id) ?? [];
    return fields.includes("event_type") ? [...fields, "meals", "accommodation"] : fields;
  };
  const allFieldOrder = editorSteps.flatMap((_, index) => sectionFields(index));
  const normalizedAllErrors = useMemo(() => normalizeValidationErrors(allErrors, allFieldOrder), [allErrors, allFieldOrder]);
  const displayErrors = useMemo(() => normalizeValidationErrors(errors, allFieldOrder), [allFieldOrder, errors]);
  const focusError = (key: string, errorsToShow: Record<string, string[]>) => { setErrors(errorsToShow); setPendingFocusField(key); };
  const selectSection = (index: number) => {
    const first = firstErrorKey(sectionFields(index), displayErrors);
    setActiveStep(index);
    if (first) focusError(first, displayErrors);
    else setPendingFocusField(null);
  };
  const sectionHasErrors = (index: number) => firstErrorKey(sectionFields(index), displayErrors) !== null;
  const continueToNext = () => { const currentErrors = Object.fromEntries(Object.entries(normalizedAllErrors).filter(([field]) => sectionFields(activeStep).includes(field))); const first = firstErrorKey(sectionFields(activeStep), currentErrors); if (first) { focusError(first, currentErrors); return; } setErrors({}); setActiveStep((current) => Math.min(current + 1, editorSteps.length - 1)); };
  const submit = () => { if (mode === "edit" && !isDirty) return; if (mediaUploads.some((upload) => upload.status === "uploading" || upload.status === "error")) { setSubmitError("Finish or remove the Event media uploads before saving."); return; } const first = firstErrorKey(allFieldOrder, normalizedAllErrors) ?? Object.keys(normalizedAllErrors).find((field) => normalizedAllErrors[field]?.length); if (first) { const sectionIndex = editorSteps.findIndex((_, index) => sectionFields(index).includes(first)); focusError(first, normalizedAllErrors); if (sectionIndex >= 0) setActiveStep(sectionIndex); const count = errorCount(normalizedAllErrors); setSubmitError(`${count} validation error${count === 1 ? "" : "s"} need attention.`); return; } setSubmitError(null); saveMutation.mutate(); };
  const mediaProps = { mediaPolicy: mediaPolicyQuery.data, policyError: mediaPolicyQuery.error instanceof Error ? mediaPolicyQuery.error.message : undefined, uploads: mediaUploads, onMediaLinkChange, onMediaAddLink, onMediaRemove, onMediaUpload, onMediaRetry, onMediaUploadRemove };
  const sharedProps = { values, update, errors: displayErrors, currencyOptions, eventTypes: availableEventTypes, eventTypesLoading: eventTypesQuery.isLoading, eventTypesError: eventTypesQuery.isError, ...mediaProps, ...(mode === "create" ? { sessionGenerationRules, onSessionGenerationRulesChange: setSessionGenerationRules } : {}) };
  const backHref = initialEvent ? `/admin/events/${initialEvent.id}` : "/admin/events";
  const title = mode === "edit" ? "Edit Event" : "Create Event";

  if (mode === "edit" && hasHistoricalConfiguration && historicalFormConfiguration.isLoading) {
    return <HistoricalFormStatus>Loading this Event&apos;s historical form configuration…</HistoricalFormStatus>;
  }

  if (mode === "edit" && hasHistoricalConfiguration && historicalFormConfiguration.isError) {
    return <HistoricalFormStatus error onRetry={() => void historicalFormConfiguration.refetch()}>Unable to load this Event&apos;s historical form configuration. The Event was not opened with the current active form.</HistoricalFormStatus>;
  }

  if (mode === "edit" && hasHistoricalConfiguration && !formConfiguration) {
    return <HistoricalFormStatus error onRetry={() => void historicalFormConfiguration.refetch()}>This Event references a historical form configuration that is unavailable.</HistoricalFormStatus>;
  }

  if (mode === "edit" && formConfiguration) {
    return <div className="w-full">
      <header className="flex flex-col gap-4 border-b border-[#edf3f0] pb-6 sm:flex-row sm:items-start sm:justify-between"><div><Link href={backHref} className="text-sm font-semibold text-[#1f6a58]">Back to Event</Link><p className="mt-4 text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">{initialEvent?.status ?? "EVENT"}</p><h1 className="mt-2 text-2xl font-bold text-[#06201c] sm:text-3xl">{title}</h1><p className="mt-2 text-sm text-[#52736a] sm:text-base">{initialEvent?.title}</p></div><Link href={backHref} className="inline-flex h-11 items-center justify-center rounded-full border border-[#d7e5df] px-5 text-sm font-semibold text-[#52736a]">Cancel</Link></header>
      <div className="mt-6 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]"><nav aria-label="Event editor sections" className="rounded-2xl border border-[#e1ebe6] bg-white p-3 shadow-sm">{editorSteps.map((step, index) => { const hasErrors = sectionHasErrors(index); return <button key={`${step}-${index}`} type="button" aria-current={activeStep === index ? "step" : undefined} aria-label={hasErrors ? `${step}, contains validation errors` : step} onClick={() => selectSection(index)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold ${hasErrors ? "text-[#b42318]" : activeStep === index ? "bg-[#e8f6ee] text-[#1f6a58]" : "text-[#52736a] hover:bg-[#f9fcfa]"}`}><span className={`flex h-6 w-6 items-center justify-center rounded-full border border-current text-xs ${hasErrors ? "bg-[#fff1f0] font-bold" : ""}`}>{hasErrors ? <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-[#b42318]" /> : index + 1}</span>{step}</button>; })}</nav>
        <main className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm sm:p-6">{activeStep < configuredSections.length ? <ConfiguredCreateEventSection section={configuredSections[activeStep]} {...sharedProps} customValues={customValues} setCustomValues={setCustomValues} categories={eventCategoriesQuery.data ?? []} categoriesLoading={eventCategoriesQuery.isLoading} categoriesError={eventCategoriesQuery.isError} allowPastTemporalValues /> : <ConfiguredCreateEventReview configuration={formConfiguration} values={values} customValues={customValues} />}{submitError ? <div role="alert" className="mt-6 rounded-xl border border-[#f3d0cb] bg-[#fff6f5] px-4 py-3 text-sm font-semibold text-[#b42318]">{submitError}</div> : null}
          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[#edf3f0] pt-5 sm:flex-row sm:justify-between">{activeStep > 0 ? <button type="button" onClick={() => setActiveStep((current) => current - 1)} disabled={saveMutation.isPending} className="h-11 rounded-full border border-[#d7e5df] px-5 text-sm font-semibold text-[#52736a] disabled:opacity-50">Back</button> : null}{activeStep === editorSteps.length - 1 ? <button type="button" onClick={submit} disabled={saveMutation.isPending || !isDirty} className="h-11 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm disabled:opacity-60">{saveMutation.isPending ? "Saving..." : "Save Changes"}</button> : <button type="button" onClick={continueToNext} className="h-11 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm">Continue</button>}</div>
        </main></div>
    </div>;
  }

  if (mode === "create" && activeFormConfiguration.isLoading) {
    return <HistoricalFormStatus>Checking the active Event Form Configuration…</HistoricalFormStatus>;
  }

  if (mode === "create" && activeFormConfiguration.isError) {
    return <HistoricalFormStatus error onRetry={() => void activeFormConfiguration.refetch()}>Unable to load the active Event Form Configuration.</HistoricalFormStatus>;
  }

  if (mode === "create" && !activeFormConfiguration.data) {
    return <HistoricalFormStatus error onRetry={() => void activeFormConfiguration.refetch()}><strong>No Event Form Available</strong><br />There is currently no active Event Form Configuration available. Please contact your Super Admin to publish and activate one before creating an Event.</HistoricalFormStatus>;
  }

  return <div className="w-full"><EventCreateLeaveDialog open={leaveConfirmationOpen} onStay={stayOnEventCreate} onLeave={leaveEventCreate} /><header className="flex flex-col gap-4 border-b border-[#edf3f0] pb-6 sm:flex-row sm:items-start sm:justify-between"><div>{mode === "edit" ? <Link href={backHref} className="text-sm font-semibold text-[#1f6a58]">Back to Event</Link> : null}<p className="mt-4 text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">{mode === "edit" ? initialEvent?.status ?? "EVENT" : "DRAFT EVENT"}</p><h1 className="mt-2 text-2xl font-bold text-[#06201c] sm:text-3xl">{title}</h1><p className="mt-2 text-sm text-[#52736a] sm:text-base">{mode === "edit" ? initialEvent?.title : "Build and review a new event for your enterprise."}</p></div><Link href={backHref} onClick={handleCreateLeave} className="inline-flex h-11 items-center justify-center rounded-full border border-[#d7e5df] px-5 text-sm font-semibold text-[#52736a]">Cancel</Link></header>
    {mode === "create" && !activeFormConfiguration.data && (activeFormConfiguration.isLoading || activeFormConfiguration.isError) ? <ActiveEventFormVerification query={activeFormConfiguration} /> : <div className="mt-6 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]"><nav aria-label="Event editor sections" className="rounded-2xl border border-[#e1ebe6] bg-white p-3 shadow-sm">{editorSteps.map((step, index) => { const hasErrors = sectionHasErrors(index); return <button key={`${step}-${index}`} type="button" aria-current={activeStep === index ? "step" : undefined} aria-label={hasErrors ? `${step}, contains validation errors` : step} onClick={() => selectSection(index)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold ${hasErrors ? "text-[#b42318]" : activeStep === index ? "bg-[#e8f6ee] text-[#1f6a58]" : "text-[#52736a] hover:bg-[#f9fcfa]"}`}><span className={`flex h-6 w-6 items-center justify-center rounded-full border border-current text-xs ${hasErrors ? "bg-[#fff1f0] font-bold" : ""}`}>{hasErrors ? <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-[#b42318]" /> : index + 1}</span>{step}</button>; })}</nav>
      <main className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm sm:p-6">{mode === "create" && (activeFormConfiguration.isError || !activeFormConfiguration.data) ? <ActiveEventFormVerification query={activeFormConfiguration} /> : null}{mode === "create" && activeFormConfiguration.data && activeStep < configuredSections.length ? <ConfiguredCreateEventSection section={configuredSections[activeStep]} {...sharedProps} customValues={customValues} setCustomValues={setCustomValues} categories={eventCategoriesQuery.data ?? []} categoriesLoading={eventCategoriesQuery.isLoading} categoriesError={eventCategoriesQuery.isError} /> : null}{mode === "create" && activeFormConfiguration.data && activeStep === configuredSections.length ? <ConfiguredCreateEventReview configuration={activeFormConfiguration.data} values={values} customValues={customValues} /> : null}{mode === "create" && !activeFormConfiguration.data && activeStep === 0 ? <BasicInformationSection {...sharedProps} /> : null}{mode === "create" && !activeFormConfiguration.data && activeStep === 1 ? <ScheduleSection {...sharedProps} /> : null}{mode === "create" && !activeFormConfiguration.data && activeStep === 2 ? <LocationAndHostSection {...sharedProps} /> : null}{mode === "create" && !activeFormConfiguration.data && activeStep === 3 ? <PricingAndTicketsSection {...sharedProps} /> : null}{mode === "create" && !activeFormConfiguration.data && activeStep === 4 ? <CapacityAndRegistrationSection {...sharedProps} /> : null}{mode === "create" && !activeFormConfiguration.data && activeStep === 5 ? <MediaSection {...sharedProps} /> : null}{mode === "create" && !activeFormConfiguration.data && activeStep === 6 ? <AdditionalConfigurationSection {...sharedProps} /> : null}{mode === "create" && !activeFormConfiguration.data && activeStep === 7 ? <ReviewSection values={values} /> : null}{mode === "edit" && activeStep === 0 ? <BasicInformationSection {...sharedProps} /> : null}{mode === "edit" && activeStep === 1 ? <ScheduleSection {...sharedProps} /> : null}{mode === "edit" && activeStep === 2 ? <LocationAndHostSection {...sharedProps} /> : null}{mode === "edit" && activeStep === 3 ? <PricingAndTicketsSection {...sharedProps} /> : null}{mode === "edit" && activeStep === 4 ? <CapacityAndRegistrationSection {...sharedProps} /> : null}{mode === "edit" && activeStep === 5 ? <MediaSection {...sharedProps} /> : null}{mode === "edit" && activeStep === 6 ? <AdditionalConfigurationSection {...sharedProps} /> : null}{mode === "edit" && activeStep === 7 ? <ReviewSection values={values} /> : null}{isCreateBlockedByEnterprise ? <div role="status" className="mt-6 rounded-xl border border-[#eadbb8] bg-[#fffaf0] px-4 py-3 text-sm font-semibold text-[#735c1e]">Creating an Event is unavailable until an Enterprise is linked. The current backend EventCreate contract requires an enterprise_id.</div> : null}{submitError ? <div role="alert" className="mt-6 rounded-xl border border-[#f3d0cb] bg-[#fff6f5] px-4 py-3 text-sm font-semibold text-[#b42318]">{submitError}</div> : null}
        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[#edf3f0] pt-5 sm:flex-row sm:justify-between">{activeStep > 0 ? <button type="button" onClick={() => setActiveStep((current) => current - 1)} disabled={saveMutation.isPending} className="h-11 rounded-full border border-[#d7e5df] px-5 text-sm font-semibold text-[#52736a] disabled:opacity-50">Back</button> : null}{activeStep === editorSteps.length - 1 ? <button type="button" onClick={submit} disabled={saveMutation.isPending || isCreateBlockedByEnterprise || (mode === "edit" && !isDirty)} className="h-11 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm disabled:opacity-60">{saveMutation.isPending ? mode === "edit" ? "Saving..." : "Creating..." : mode === "edit" ? "Save Changes" : "Create Event"}</button> : <button type="button" onClick={continueToNext} className="h-11 rounded-full bg-[#1f6a58] px-5 py-2.5 text-sm font-bold text-white shadow-sm">Continue</button>}</div>
      </main></div>}</div>;
}

function HistoricalFormStatus({ children, error = false, onRetry }: { children: React.ReactNode; error?: boolean; onRetry?: () => void }) {
  return <section role={error ? "alert" : "status"} className={`rounded-2xl border px-5 py-12 text-center text-sm font-semibold ${error ? "border-[#eadbb8] bg-[#fffaf0] text-[#735c1e]" : "border-[#d7e5df] bg-[#f9fcfa] text-[#52736a]"}`}><p>{children}</p>{onRetry ? <button type="button" onClick={onRetry} className="mt-4 rounded-full border border-current px-4 py-2 text-sm font-bold">Retry</button> : null}</section>;
}

/** Displays non-sensitive active-form resolution metadata during this read-only integration phase. */
function ActiveEventFormVerification({ query }: { query: ReturnType<typeof useActiveEventFormConfiguration> }) {
  if (query.isLoading) return <aside role="status" className="mb-6 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] p-4 text-sm text-[#52736a]">Checking the active Event form configuration…</aside>;
  if (query.isError) return <aside role="alert" className="mb-6 rounded-xl border border-[#eadbb8] bg-[#fffaf0] p-4 text-sm text-[#735c1e]"><p>{query.error instanceof EventsApiError && (query.error.status === 401 || query.error.status === 403) ? "The active Event form could not be verified for this session. Please sign in again." : query.error instanceof Error ? `Active Event form verification failed: ${query.error.message}` : "Active Event form verification failed."}</p><button type="button" onClick={() => void query.refetch()} className="mt-3 rounded-full border border-current px-4 py-2 text-sm font-bold">Retry</button></aside>;
  if (!query.data) return <aside role="status" className="mb-6 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] p-4 text-sm text-[#52736a]"><p className="font-semibold text-[#06201c]">No active Event form configuration</p><p className="mt-1">The standard Event form is available.</p></aside>;
  return <aside role="status" className="mb-6 rounded-xl border border-[#cde5db] bg-[#f4faf7] p-4 text-sm text-[#355a51]"><p className="font-bold text-[#06201c]">Active Event Form</p><p className="mt-1 font-semibold text-[#1f6a58]">{query.data.name}</p><dl className="mt-3 grid gap-1 text-xs sm:grid-cols-2"><div><dt className="inline font-semibold">Scope: </dt><dd className="inline">{query.data.scope}</dd></div><div><dt className="inline font-semibold">Version: </dt><dd className="inline">{query.data.version}</dd></div><div><dt className="inline font-semibold">Configuration ID: </dt><dd className="inline break-all">{query.data.configuration_id}</dd></div><div><dt className="inline font-semibold">Version ID: </dt><dd className="inline break-all">{query.data.version_id}</dd></div><div><dt className="inline font-semibold">Sections: </dt><dd className="inline">{query.data.sections.length}</dd></div></dl></aside>;
}

function validateConfiguredEventForm(configuration: ActiveEventFormConfiguration, values: CreateEventFormValues, customValues: Record<string, string | string[] | boolean | number | null>, categories: readonly EventCategory[], mode: "create" | "edit"): Record<string, string[]> {
  const errors = validateRequiredConfiguredEventFields(configuration, values, customValues);
  if (values.description.length > EVENT_DESCRIPTION_MAX_LENGTH) errors.description = [`Description must be ${EVENT_DESCRIPTION_MAX_LENGTH} characters or fewer.`];
  if (mode === "create" && !values.event_type.trim()) errors.event_type = ["Event Type is required."];
  for (const section of configuration.sections.filter((item) => item.is_enabled)) for (const field of section.fields) {
    if (field.is_enabled === false) continue;
    const key = field.source === "core" ? field.core_key ?? field.stable_key ?? field.id : field.stable_key ?? field.id;
    if (values.pricing_type === "free" && ["price", "currency", "ticket_types"].includes(key)) continue;
    if (!isDeliveryFieldApplicable(key, values.delivery_mode)) continue;
    if (field.source === "core" && ["location", "location_id"].includes(key.replace(/^(core_|custom_)/, "").trim().toLowerCase())) continue;
    const coreKey = field.source === "core"
      ? ({ title: "title", description: "description", category: "category", subcategory: "subcategory", tags: "tags", organiser_name: "organiser_name", organiser_contact: "organiser_contact", start_date: "start_date", start_datetime: "start_date", end_date: "end_date", end_datetime: "end_date", duration_type: "duration_type", registration_cutoff: "registration_cutoff", registration_open_at: "registration_open_at", registration_close_at: "registration_close_at", time_zone: "time_zone", timezone: "time_zone", event_type: "event_type", delivery_mode: "delivery_mode", pricing_type: "pricing_type", price: "price", currency: "currency", capacity: "capacity", min_participants: "min_participants", max_participants: "max_participants", primary_image: "primary_image", gallery_images: "gallery_images", videos: "videos", documents: "documents" } as Record<string, keyof CreateEventFormValues>)[key]
        ?? (key in values ? key as keyof CreateEventFormValues : undefined)
      : undefined;
    const value = coreKey ? values[coreKey] : customValues[key];
    const isEmpty = value === null || value === undefined || (typeof value === "string" && value.trim() === "") || (Array.isArray(value) && value.length === 0);
    if (isEmpty) continue;
    const textValues = typeof value === "string"
      ? [value]
      : Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string")
        : [];
    if (textValues.length > 0) {
      const { min_length: minLength, pattern } = field.validation;
      const maxLength = eventFieldMaxLength(key, field.validation.max_length);
      if (minLength != null && textValues.some((text) => text.length < minLength)) {
        errors[key] = [`${field.label} must be at least ${minLength} characters.`];
      }
      if (maxLength != null && textValues.some((text) => text.length > maxLength)) {
        errors[key] = [`${field.label} must be at most ${maxLength} characters.`];
      }
      if (pattern && !errors[key]) {
        try {
          if (textValues.some((text) => !new RegExp(pattern).test(text))) {
            errors[key] = [`${field.label} has an invalid format.`];
          }
        } catch {
          errors[key] = [`${field.label} has an invalid validation rule.`];
        }
      }
    }
    const isNumber = field.renderer === "number" || field.value_type === "number";
    const numericValue = isNumber
      ? typeof value === "number"
        ? value
        : typeof value === "string" && value.trim()
          ? Number(value)
          : null
      : null;
    if (numericValue !== null && Number.isFinite(numericValue)) {
      if (field.validation.min != null && numericValue < field.validation.min) errors[key] = [`${field.label} must be at least ${field.validation.min}.`];
      if (field.validation.max != null && numericValue > field.validation.max) errors[key] = [`${field.label} must be at most ${field.validation.max}.`];
    }
  }
  const configuredKeys = configuredCoreKeys(configuration);
  if (values.delivery_mode !== "online" && configuredKeys.has("venue")) {
    if (!values.venue_name.trim()) errors.venue = ["Venue name is required."];
    else if (!values.venue_address.trim()) errors.venue = ["Venue address is required."];
    else if (!values.venue_city.trim()) errors.venue = ["Venue city is required."];
  }
  if (values.pricing_type === "paid" && configuredKeys.has("pricing_type") && !values.price.trim() && values.ticket_types.length === 0) {
    const pricingRequirementKey = configuredKeys.has("price") ? "price" : configuredKeys.has("ticket_types") ? "ticket_types" : "pricing_type";
    errors[pricingRequirementKey] = [configuredKeys.has("price") ? "Paid Events need a price or at least one ticket type." : "Add at least one ticket type for this paid Event."];
  }
  validateConfiguredCategories(configuration, values, categories, errors, mode);
  validateConfiguredDateTimes(configuration, values, errors, mode);
  if (["capacity", "min_participants", "max_participants"].some((key) => configuredCoreKeys(configuration).has(key))) validateParticipantCapacity(values, errors);
  const sessionField = configuration.sections.filter((section) => section.is_enabled).flatMap((section) => section.fields).find((field) => field.is_enabled !== false && field.source === "core" && (field.core_key === "sessions" || field.stable_key === "sessions"));
  if (sessionField) {
    const sessionError = validateSessions(values.sessions, values.start_date, values.end_date, sessionField.composite_config?.enabled_fields ?? undefined, sessionField.composite_config?.required_fields ?? [], [], values.delivery_mode);
    if (sessionError) errors.sessions = [sessionError];
  }
  Object.assign(errors, validateServiceSchedule(values));
  return errors;
}

function validateConfiguredCategories(configuration: ActiveEventFormConfiguration, values: CreateEventFormValues, categories: readonly EventCategory[], errors: Record<string, string[]>, mode: "create" | "edit"): void {
  const keys = configuredCoreKeys(configuration);
  const categoryEnabled = isConfigured(keys, "category");
  const subcategoryEnabled = isConfigured(keys, "subcategory");
  const subcategoryField = configuration.sections.filter((section) => section.is_enabled).flatMap((section) => section.fields).find((field) => field.is_enabled !== false && field.source === "core" && (field.core_key === "subcategory" || field.stable_key === "subcategory"));
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
  return new Set(configuration.sections.filter((section) => section.is_enabled).flatMap((section) => section.fields).filter((field) => field.is_enabled !== false && field.source === "core").map((field) => field.core_key ?? field.stable_key ?? field.id));
}

function isConfigured(keys: Set<string>, ...candidates: string[]): boolean {
  return candidates.some((candidate) => keys.has(candidate));
}

function isDeliveryFieldApplicable(key: string, deliveryMode: string): boolean {
  if (!deliveryMode) return true;
  if (["venue", "location", "location_id"].includes(key)) return deliveryMode !== "online";
  if (["meeting_provider", "meeting_link"].includes(key)) return deliveryMode === "online" || deliveryMode === "hybrid";
  return true;
}

function validateConfiguredDateTimes(configuration: ActiveEventFormConfiguration, values: CreateEventFormValues, errors: Record<string, string[]>, mode: "create" | "edit"): void {
  const keys = configuredCoreKeys(configuration);
  const startKey = isConfigured(keys, "start_datetime") ? "start_datetime" : "start_date";
  const endKey = isConfigured(keys, "end_datetime") ? "end_datetime" : "end_date";
  const start = localDateTimeOrderValue(values.start_date);
  const end = localDateTimeOrderValue(values.end_date);
  const opens = localDateTimeOrderValue(values.registration_open_at);
  const closes = localDateTimeOrderValue(values.registration_close_at);
  const cutoff = localDateTimeOrderValue(values.registration_cutoff);
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

  const sessionField = configuration.sections.filter((section) => section.is_enabled).flatMap((section) => section.fields).find((field) => field.is_enabled !== false && field.source === "core" && (field.core_key === "sessions" || field.stable_key === "sessions"));
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
