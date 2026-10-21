"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { getTrainingById, type TrainingDetail } from "@ihp/enterprise-trainings";
import { getPlatformEnterpriseById } from "@ihp/platform-enterprises";
import { PlatformModuleReviewsTab } from "./PlatformModuleReviewsTab";
import PlatformTrainingLessonContent from "./PlatformTrainingLessonContent";

type Props = {
  trainingId: string;
  reviewId?: string | null;
  reviewStatus?: "pending" | "approved" | "rejected" | "deleted" | "all";
  openReviewAudit?: boolean;
  onClose: () => void;
};

function shown(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "Not provided";
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Not provided";
  let date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    const match = value.match(/^(\d{1,2})\s*[-/]\s*(\d{1,2})\s*[-/]\s*(\d{4})(?:\s+(\d{1,2}):(\d{2})(?:\s*([AP]M))?)?$/i);
    if (!match) return "Not provided";
    let hours = Number(match[4] ?? 0);
    const meridiem = match[6]?.toUpperCase();
    if (meridiem === "PM" && hours < 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;
    date = new Date(Number(match[3]), Number(match[1]) - 1, Number(match[2]), hours, Number(match[5] ?? 0));
  }
  if (!Number.isFinite(date.getTime())) return "Not provided";
  const includesTime = value.includes("T") || /\d{1,2}:\d{2}/.test(value);
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: includesTime ? "short" : undefined }).format(date);
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-[#6a8a80]">{label}</dt><dd className="mt-1 break-words text-sm text-[#183d32]">{value}</dd></div>;
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-[#e1ebe6] bg-[#fbfdfc] p-4"><h3 className="font-bold text-[#06201c]">{title}</h3><div className="mt-3">{children}</div></section>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(record: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function trainingCreator(record: Record<string, unknown>, enterprise?: Record<string, unknown> | null): string {
  const directName = stringValue(
    record,
    "created_by_name",
    "created_by_display_name",
    "creator_name",
    "creator_display_name",
    "enterprise_admin_name",
    "admin_name",
    "author_name",
    "submitted_by_name",
    "contact_name",
    "contact_person",
    "user_name",
    "created_by_email",
  );
  if (directName) return directName;

  for (const key of ["created_by", "created_by_user", "created_by_details", "creator", "creator_user", "enterprise_admin", "admin", "author", "owner"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim())) {
        return value.trim();
      }
    }
    if (!isRecord(value)) continue;

    const nestedName = stringValue(value, "display_name", "full_name", "name", "contact_name", "primary_contact_name", "username", "email");
    if (nestedName) return nestedName;
  }

  if (Array.isArray(record.moderation_history)) {
    for (const entry of record.moderation_history) {
      if (isRecord(entry)) {
        const actor = stringValue(entry, "actor_name", "performed_by_name", "performed_by", "admin_name", "user_name");
        if (actor && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actor)) {
          return actor;
        }
      }
    }
  }

  if (isRecord(record.enterprise)) {
    const enterpriseContact = stringValue(record.enterprise, "primary_contact_name", "contact_name", "admin_name", "owner_name", "contact_person");
    if (enterpriseContact) return enterpriseContact;
  }

  if (enterprise && isRecord(enterprise)) {
    const contact = stringValue(enterprise, "primary_contact_name", "contact_name", "admin_name", "owner_name", "contact_person");
    if (contact) return contact;
  }

  const enterpriseName = stringValue(record, "enterprise_name") || (enterprise && isRecord(enterprise) ? stringValue(enterprise, "name", "business_short_name", "business_legal_name", "enterprise_name") : "");
  if (enterpriseName) return `${enterpriseName} Admin`;

  const creatorId = stringValue(record, "created_by_user_id", "created_by_id", "creator_id");
  return creatorId ? `Account ID: ${creatorId}` : "Not provided";
}

function normalizedKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function trainingScheduleDate(record: Record<string, unknown>, keys: string[]): string | null {
  const accepted = new Set(keys.map(normalizedKey));
  const matchesFieldKey = (fieldKey: string, parentPath: string): boolean => {
    const path = [...parentPath.split(".").filter(Boolean), fieldKey];
    return path.some((_, index) => accepted.has(normalizedKey(path.slice(index).join(""))));
  };
  const readDateValue = (value: unknown, depth: number): string | null => {
    if (depth > 7 || value === null || value === undefined) return null;
    if (typeof value === "string" && value.trim()) return value.trim();
    if (!isRecord(value) && !Array.isArray(value)) return null;
    const preferredKeys = ["value", "date", "datetime", "date_time", "timestamp", "start_at", "end_at"];
    if (isRecord(value)) {
      for (const key of preferredKeys) {
        const nested = value[key];
        if (nested !== undefined) {
          const found = readDateValue(nested, depth + 1);
          if (found) return found;
        }
      }
      for (const [key, nested] of Object.entries(value)) {
        if (preferredKeys.includes(key)) continue;
        const found = readDateValue(nested, depth + 1);
        if (found) return found;
      }
    } else {
      for (const nested of value) {
        const found = readDateValue(nested, depth + 1);
        if (found) return found;
      }
    }
    return null;
  };
  const findDate = (value: unknown, depth: number, parentKey = ""): string | null => {
    if (depth > 7 || !value || typeof value !== "object") return null;
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (isRecord(entry)) {
          const fieldKey = [entry.key, entry.api_key, entry.stable_key, entry.field_key, entry.label]
            .find((candidate): candidate is string => typeof candidate === "string");
          if (fieldKey && matchesFieldKey(fieldKey, parentKey)) {
            const fieldValue = readDateValue(entry.value, depth + 1);
            if (fieldValue) return fieldValue;
          }
        }
        const nested = findDate(entry, depth + 1, parentKey);
        if (nested) return nested;
      }
      return null;
    }
    for (const [key, nestedValue] of Object.entries(value)) {
      const combinedKey = parentKey ? `${parentKey}.${key}` : key;
      if (matchesFieldKey(key, parentKey)) {
        const fieldValue = readDateValue(nestedValue, depth + 1);
        if (fieldValue) return fieldValue;
      }
      const nested = findDate(nestedValue, depth + 1, combinedKey);
      if (nested) return nested;
    }
    return null;
  };
  return findDate(record, 0);
}

function deliveryVisibility(mode: string | null | undefined) {
  const normalized = mode?.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const selfPaced = normalized === "self_paced" || normalized === "selfpaced";
  return {
    showVenue: !selfPaced && ["physical", "venue", "in_person", "hybrid", "blended"].includes(normalized ?? ""),
    showOnline: !selfPaced && ["online", "live", "virtual", "instructor_led", "hybrid", "blended"].includes(normalized ?? ""),
  };
}

function TrainingDetailContent({ training }: { training: TrainingDetail }) {
  const extra = training as unknown as Record<string, unknown>;
  const { showVenue, showOnline } = deliveryVisibility(training.delivery_mode);
  const objectives = Array.isArray(training.learning_objectives) ? training.learning_objectives.filter((value): value is string => typeof value === "string" && value.trim().length > 0) : [];
  const tags = Array.isArray(training.tags) ? training.tags.filter((value): value is string => typeof value === "string" && value.trim().length > 0) : [];
  const instructor = training.instructor?.name || training.instructor_name;
  const detailPairs: [string, React.ReactNode][] = [
    ["Category", shown(training.category)], ["Subcategory", shown(training.subcategory)], ["Status", shown(training.status)],
    ["Delivery mode", shown(training.delivery_mode)], ["Starts", formatDate(training.start_date ?? trainingScheduleDate(extra, ["startDate", "training_start_date", "trainingStartDate", "starts_at", "start_datetime", "startDateTime"]))],
    ["Ends", formatDate(training.end_date ?? trainingScheduleDate(extra, ["endDate", "training_end_date", "trainingEndDate", "ends_at", "end_datetime", "endDateTime"]))], ["Time zone", shown(training.time_zone ?? extra.timezone as string | null | undefined)], ["Instructor", shown(instructor)],
    ...(showVenue ? [["Venue", shown(training.venue)], ["Address", shown(training.address)]] as [string, React.ReactNode][] : []),
    ...(showOnline ? [["Meeting provider", shown(training.meeting_provider)], ["Meeting link", training.meeting_link ? <a className="text-[#1f6a58] underline" href={training.meeting_link} target="_blank" rel="noreferrer">Open meeting</a> : "Not provided"], ["Delivery instructions", shown(training.delivery_instructions)]] as [string, React.ReactNode][] : []),
    ["Price", training.price ? `${training.price} ${training.currency ?? ""}`.trim() : "Not provided"], ["Capacity", shown(training.capacity)],
    ["Difficulty", shown(training.difficulty_level)],
    ["Enrolment opens", formatDate(training.enrolment_start ?? trainingScheduleDate(extra, ["enrollment_start", "enrolmentStart", "enrollmentStart", "enrolment_start_at", "enrollment_start_at", "enrolment_start_date", "enrollment_start_date", "enrolment_start_datetime", "enrollment_start_datetime", "registration_start", "registration_start_at", "registration_start_date", "registration_starts_at", "registration_open", "registration_open_at", "registration_opening_date", "registration_opens", "registration_opens_at", "enrolment_opens", "enrollment_opens"]))],
    ["Enrolment closes", formatDate(training.enrolment_end ?? trainingScheduleDate(extra, ["enrollment_end", "enrolmentEnd", "enrollmentEnd", "enrolment_end_at", "enrollment_end_at", "enrolment_end_date", "enrollment_end_date", "enrolment_end_datetime", "enrollment_end_datetime", "registration_end", "registration_end_at", "registration_end_date", "registration_ends_at", "registration_close", "registration_close_at", "registration_closing_date", "registration_closes", "registration_closes_at", "enrolment_closes", "enrollment_closes"]))],
  ];
  const faqs = Array.isArray(training.faqs) ? training.faqs.map((faq) => {
    const question = faq.question || faq.q || "";
    const answer = faq.answer || faq.a || "";
    return question && answer ? `${question}: ${answer}` : question || answer;
  }).filter(Boolean) : [];
  const assessments = Array.isArray(training.assessments) ? training.assessments : [];
  const sections = (Array.isArray(training.sections) ? training.sections : []).filter(isRecord).map((section, index) => ({
    id: typeof section.id === "string" ? section.id : `${section.title ?? "section"}-${index}`,
    title: typeof section.title === "string" ? section.title : `Section ${index + 1}`,
    lessons: (Array.isArray(section.lessons) ? section.lessons : []).filter(isRecord),
  }));

  return <div className="space-y-4">
    <DetailSection title="Overview"><dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">{detailPairs.map(([label, value]) => <DetailField key={label} label={label} value={value} />)}</dl>{training.description ? <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#31594d]">{training.description}</p> : null}{training.subtitle ? <p className="mt-3 text-sm text-[#52736a]">{training.subtitle}</p> : null}{tags.length ? <p className="mt-3 text-sm text-[#52736a]"><b className="text-[#31594d]">Tags: </b>{tags.join(", ")}</p> : null}</DetailSection>
    {objectives.length ? <DetailSection title="Learning objectives"><ul className="list-disc space-y-1 pl-5 text-sm text-[#52736a]">{objectives.map((objective, index) => <li key={`${objective}-${index}`}>{objective}</li>)}</ul></DetailSection> : null}
    {training.requirements || training.prerequisites ? <DetailSection title="Requirements"><p className="whitespace-pre-wrap text-sm text-[#52736a]">{training.requirements || training.prerequisites}</p></DetailSection> : null}
    {faqs.length ? <DetailSection title="Frequently asked questions"><ul className="space-y-2 text-sm text-[#52736a]">{faqs.map((faq, index) => <li key={`${faq}-${index}`} className="rounded-xl bg-white p-3">{faq}</li>)}</ul></DetailSection> : null}
    {sections.length ? <DetailSection title="Training sections"><div className="space-y-3">{sections.map((section) => <div key={section.id} className="rounded-xl border border-[#e1ebe6] bg-white p-3"><p className="font-semibold text-[#183d32]">{section.title}</p>{section.lessons.length ? <ul className="mt-2 space-y-3">{section.lessons.map((lesson, lessonIndex) => <li key={stringValue(lesson, "id") || `${section.id}-lesson-${lessonIndex}`} className="rounded-lg bg-white p-3"><div className="flex flex-wrap items-center gap-2"><span className="text-xs text-[#7f9d94]">{lessonIndex + 1}.</span><span className="font-semibold text-[#183d32]">{stringValue(lesson, "title") || "Lesson"}</span><span className="rounded-full bg-[#eef4ff] px-2 py-0.5 text-[10px] font-bold uppercase text-[#2563eb]">{stringValue(lesson, "type", "lesson_type") || "Lesson"}</span></div><PlatformTrainingLessonContent lesson={lesson} assessments={assessments} timeZone={typeof extra.time_zone === "string" ? extra.time_zone : ""} /></li>)}</ul> : <p className="mt-1 text-sm text-[#52736a]">No lessons.</p>}</div>)}</div></DetailSection> : null}
  </div>;
}

/** Read-only Training dossier in the Super Admin catalogue, matching Event details. */
export default function PlatformTrainingDetailsModal({ trainingId, reviewId, reviewStatus = "all", openReviewAudit = false, onClose }: Props) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const query = useQuery({ queryKey: ["trainings", "platform-detail", trainingId], queryFn: () => getTrainingById(trainingId, "/api/platform-super-admin/training-approvals/"), enabled: Boolean(trainingId), staleTime: 30_000, retry: 1 });
  const enterpriseId = query.data?.enterprise_id;
  const enterpriseQuery = useQuery({
    queryKey: ["platform", "training-modal-enterprise", enterpriseId],
    queryFn: () => getPlatformEnterpriseById(enterpriseId!),
    enabled: Boolean(enterpriseId),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  useEffect(() => {
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const trapTab = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const nodes = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])"));
    if (!nodes.length) return;
    if (event.shiftKey && document.activeElement === nodes[0]) { event.preventDefault(); nodes[nodes.length - 1].focus(); }
    else if (!event.shiftKey && document.activeElement === nodes[nodes.length - 1]) { event.preventDefault(); nodes[0].focus(); }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#06201c]/55 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="platform-training-details-title" onKeyDown={trapTab}>
    <div className="flex items-start justify-between gap-4 border-b border-[#e1ebe6] p-5"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6a8a80]">Training details</p><h2 id="platform-training-details-title" className="mt-1 text-2xl font-bold text-[#06201c]">{query.data?.title ?? "Training"}</h2>{query.data ? <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-[#52736a]"><span><span className="font-semibold text-[#31594d]">Created by</span> {trainingCreator(query.data as unknown as Record<string, unknown>, enterpriseQuery.data as unknown as Record<string, unknown>)}</span>{query.data.enterprise_name?.trim() ? <><span aria-hidden="true">·</span><span><span className="font-semibold text-[#31594d]">Enterprise</span> {query.data.enterprise_name.trim()}</span></> : null}</p> : null}</div><button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Close Training details" className="rounded-full border border-[#d7e5df] px-3 py-2 text-sm font-semibold text-[#31594d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6a58]">Close</button></div>
    <div className="overflow-y-auto p-5">{query.isPending ? <div role="status" className="space-y-3"><div className="h-8 animate-pulse rounded bg-[#edf3f0]" /><div className="h-40 animate-pulse rounded-2xl bg-[#edf3f0]" /><p className="text-sm text-[#52736a]">Loading complete Training details…</p></div> : query.isError ? <div className="rounded-2xl border border-[#f2c7c2] bg-[#fff7f5] p-5"><p role="alert" className="font-semibold text-[#b42318]">{query.error instanceof Error ? query.error.message : "Unable to load Training details."}</p><button type="button" onClick={() => void query.refetch()} className="mt-3 font-semibold text-[#1f6a58] underline">Retry</button></div> : query.data ? <div className="space-y-4"><TrainingDetailContent training={query.data} /><PlatformModuleReviewsTab module="training" itemId={trainingId} reviewId={reviewId} initialStatus={reviewStatus} openAuditOnLoad={openReviewAudit} /></div> : <p className="text-sm text-[#52736a]">No Training details were returned.</p>}</div>
  </div></div>;
}
