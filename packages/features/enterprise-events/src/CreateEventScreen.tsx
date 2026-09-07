"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentEnterprise, useTenant } from "@ihp/enterprise-runtime";
import { getEnterpriseLocations } from "@ihp/enterprises";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AdditionalConfigurationSection, CapacityAndRegistrationSection, MediaSection, PricingAndTicketsSection, ReviewSection } from "./CreateEventConfigurationSections";
import { BasicInformationSection, LocationAndHostSection, ScheduleSection } from "./CreateEventDetailsSections";
import { buildCreateEventPayload, buildUpdateEventPayload, createEmptyEventForm, eventToFormValues, validateEventForm, type CreateEventFormValues } from "./create-event-form";
import { useActiveEventFormConfiguration } from "./event-form-configuration.queries";
import { createEvent, EventsApiError, updateEvent, type Event } from "./events.service";
import { canEditEvent } from "./event-status";

const steps = ["Basic Information", "Schedule", "Location & Host", "Pricing & Tickets", "Capacity & Registration", "Images & Media", "Additional Configuration", "Review & Submit"] as const;
const stepFields: ReadonlyArray<readonly string[]> = [["title", "description", "category", "organiser_name", "organiser_contact"], ["start_date", "end_date", "registration_cutoff", "registration_open_at", "registration_close_at"], ["location_id", "venue_name", "venue_address", "venue_city"], ["price", "currency", "ticket_types"], ["capacity", "min_participants", "max_participants"], ["media"], ["sessions", "custom_fields"], []];

type EventEditorProps = { mode?: "create" | "edit"; initialEvent?: Event };

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
  const enterpriseName = currentEnterprise?.business_legal_name || currentEnterprise?.business_short_name || currentEnterprise?.name || "";
  const organiserContact = [currentEnterprise?.business_email, currentEnterprise?.business_phone].filter(Boolean).join(" | ");
  useEffect(() => { if (mode === "create") setValues((current) => ({ ...current, organiser_name: current.organiser_name || enterpriseName, organiser_contact: current.organiser_contact || organiserContact })); }, [enterpriseName, mode, organiserContact]);
  const locationsQuery = useQuery({ queryKey: ["enterprise", enterpriseId, "locations"], queryFn: () => getEnterpriseLocations(enterpriseId ?? ""), enabled: Boolean(enterpriseId), staleTime: 30_000, retry: 1 });
  const activeFormConfiguration = useActiveEventFormConfiguration(mode === "create");
  const selectedLocation = locationsQuery.data?.find((location) => location.id === locationId);
  const isCreateBlockedByEnterprise = mode === "create" && !enterpriseId;
  const saveMutation = useMutation({
    mutationFn: () => {
      if (mode === "edit") { if (!initialEvent) throw new Error("The event could not be loaded."); if (!canEditEvent(initialEvent.status)) throw new Error("This Event cannot be edited in its current lifecycle state."); return updateEvent(initialEvent.id, buildUpdateEventPayload(values, initialValues, locationId, initialLocationId)); }
      if (!tenantId || !enterpriseId || !locationId) throw new Error("A tenant, enterprise, and location are required.");
      return createEvent(buildCreateEventPayload(values, tenantId, enterpriseId, locationId));
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["events", "list"] }); if (initialEvent) { await queryClient.invalidateQueries({ queryKey: ["events", "detail", initialEvent.id] }); router.push(`/admin/events/${initialEvent.id}`); } else router.push("/admin/events"); },
    onError: (error) => { if (error instanceof EventsApiError) { setErrors((current) => ({ ...current, ...error.fieldErrors })); setSubmitError(error.status === 401 || error.status === 403 ? "Your session cannot save this event. Please sign in again." : error.message); } else setSubmitError(error instanceof Error ? error.message : "Unable to save event."); },
  });
  const update = <Key extends keyof CreateEventFormValues>(key: Key, value: CreateEventFormValues[Key]) => { setValues((current) => ({ ...current, [key]: value })); setErrors((current) => ({ ...current, [key]: [] })); setSubmitError(null); };
  const allErrors = useMemo(() => validateEventForm(values, Boolean(locationId), mode), [locationId, mode, values]);
  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues) || locationId !== initialLocationId;
  const continueToNext = () => { const currentFields = stepFields[activeStep] ?? []; const currentErrors = Object.fromEntries(Object.entries(allErrors).filter(([field]) => currentFields.includes(field))); if (Object.keys(currentErrors).length > 0) { setErrors(currentErrors); return; } setErrors({}); setActiveStep((current) => Math.min(current + 1, steps.length - 1)); };
  const submit = () => { if (mode === "edit" && !isDirty) return; if (Object.keys(allErrors).length > 0) { setErrors(allErrors); setSubmitError("Review the highlighted fields before saving."); return; } setSubmitError(null); saveMutation.mutate(); };
  const sharedProps = { values, update, errors };
  const locationProps = { ...sharedProps, locations: locationsQuery.data ?? [], selectedLocationId: locationId, setSelectedLocationId: setLocationId, isLoadingLocations: locationsQuery.isLoading, locationError: locationsQuery.isError ? "Unable to load enterprise locations." : null };
  const backHref = initialEvent ? `/admin/events/${initialEvent.id}` : "/admin/events";
  const title = mode === "edit" ? "Edit Event" : "Create Event";

  return <div className="w-full"><header className="flex flex-col gap-4 border-b border-[#edf3f0] pb-6 sm:flex-row sm:items-start sm:justify-between"><div><Link href={backHref} className="text-sm font-semibold text-[#1f6a58]">Back to {mode === "edit" ? "Event" : "Events"}</Link><p className="mt-4 text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">{mode === "edit" ? initialEvent?.status ?? "EVENT" : "DRAFT EVENT"}</p><h1 className="mt-2 text-2xl font-bold text-[#06201c] sm:text-3xl">{title}</h1><p className="mt-2 text-sm text-[#52736a] sm:text-base">{mode === "edit" ? initialEvent?.title : "Build and review a new event for your enterprise."}</p></div><Link href={backHref} className="inline-flex h-11 items-center justify-center rounded-full border border-[#d7e5df] px-5 text-sm font-semibold text-[#52736a]">Cancel</Link></header>
    <div className="mt-6 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]"><nav aria-label="Event editor sections" className="rounded-2xl border border-[#e1ebe6] bg-white p-3 shadow-sm">{steps.map((step, index) => <button key={step} type="button" onClick={() => setActiveStep(index)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold ${activeStep === index ? "bg-[#e8f6ee] text-[#1f6a58]" : "text-[#52736a] hover:bg-[#f9fcfa]"}`}><span className="flex h-6 w-6 items-center justify-center rounded-full border border-current text-xs">{index + 1}</span>{step}</button>)}</nav>
      <main className="rounded-2xl border border-[#e1ebe6] bg-white p-5 shadow-sm sm:p-7">{mode === "create" ? <ActiveEventFormVerification query={activeFormConfiguration} /> : null}{activeStep === 0 ? <BasicInformationSection {...sharedProps} /> : null}{activeStep === 1 ? <ScheduleSection {...sharedProps} /> : null}{activeStep === 2 ? <LocationAndHostSection {...locationProps} /> : null}{activeStep === 3 ? <PricingAndTicketsSection {...sharedProps} /> : null}{activeStep === 4 ? <CapacityAndRegistrationSection {...sharedProps} /> : null}{activeStep === 5 ? <MediaSection {...sharedProps} /> : null}{activeStep === 6 ? <AdditionalConfigurationSection {...sharedProps} /> : null}{activeStep === 7 ? <ReviewSection values={values} selectedLocationName={selectedLocation ? `${selectedLocation.location_name} - ${selectedLocation.city}` : ""} /> : null}{isCreateBlockedByEnterprise ? <div role="status" className="mt-6 rounded-xl border border-[#eadbb8] bg-[#fffaf0] px-4 py-3 text-sm font-semibold text-[#735c1e]">Creating an Event is unavailable until an Enterprise is linked. The current backend EventCreate contract requires an enterprise_id.</div> : null}{submitError ? <div role="alert" className="mt-6 rounded-xl border border-[#f3d0cb] bg-[#fff6f5] px-4 py-3 text-sm font-semibold text-[#b42318]">{submitError}</div> : null}
        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[#edf3f0] pt-5 sm:flex-row sm:justify-between"><button type="button" onClick={() => setActiveStep((current) => Math.max(current - 1, 0))} disabled={activeStep === 0 || saveMutation.isPending} className="h-11 rounded-full border border-[#d7e5df] px-5 text-sm font-semibold text-[#52736a] disabled:opacity-50">Back</button>{activeStep === steps.length - 1 ? <button type="button" onClick={submit} disabled={saveMutation.isPending || !locationId || isCreateBlockedByEnterprise || (mode === "edit" && !isDirty)} className="h-11 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm disabled:opacity-60">{saveMutation.isPending ? mode === "edit" ? "Saving..." : "Creating..." : mode === "edit" ? "Save Changes" : "Create Event"}</button> : <button type="button" onClick={continueToNext} className="h-11 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm">Continue</button>}</div>
      </main></div></div>;
}

/** Displays non-sensitive active-form resolution metadata during this read-only integration phase. */
function ActiveEventFormVerification({ query }: { query: ReturnType<typeof useActiveEventFormConfiguration> }) {
  if (query.isLoading) return <aside role="status" className="mb-6 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] p-4 text-sm text-[#52736a]">Checking the active Event form configuration…</aside>;
  if (query.isError) return <aside role="status" className="mb-6 rounded-xl border border-[#eadbb8] bg-[#fffaf0] p-4 text-sm text-[#735c1e]">{query.error instanceof EventsApiError && (query.error.status === 401 || query.error.status === 403) ? "The active Event form could not be verified for this session. The existing Event form remains available." : query.error instanceof Error ? `Active Event form verification failed: ${query.error.message}` : "Active Event form verification failed. The existing Event form remains available."}</aside>;
  if (!query.data) return <aside role="status" className="mb-6 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] p-4 text-sm text-[#52736a]"><p className="font-semibold text-[#06201c]">No active Event form configuration</p><p className="mt-1">The existing Event form remains available.</p></aside>;
  return <aside role="status" className="mb-6 rounded-xl border border-[#cde5db] bg-[#f4faf7] p-4 text-sm text-[#355a51]"><p className="font-bold text-[#06201c]">Active Event Form</p><p className="mt-1 font-semibold text-[#1f6a58]">{query.data.name}</p><dl className="mt-3 grid gap-1 text-xs sm:grid-cols-2"><div><dt className="inline font-semibold">Scope: </dt><dd className="inline">{query.data.scope}</dd></div><div><dt className="inline font-semibold">Version: </dt><dd className="inline">{query.data.version}</dd></div><div><dt className="inline font-semibold">Configuration ID: </dt><dd className="inline break-all">{query.data.configuration_id}</dd></div><div><dt className="inline font-semibold">Version ID: </dt><dd className="inline break-all">{query.data.version_id}</dd></div><div><dt className="inline font-semibold">Sections: </dt><dd className="inline">{query.data.sections.length}</dd></div></dl></aside>;
}
