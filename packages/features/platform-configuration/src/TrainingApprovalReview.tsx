"use client";

import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import TrainingApprovalDialog from "./TrainingApprovalDialog";
import {
  getTrainingModerationHistory,
  useHistoricalTrainingFormConfigurationVersion,
  type TrainingApprovalDecision,
} from "./training-approval.service";
import type { TrainingApprovalReview } from "./training-approval-review.types";
import { EnterpriseDisplayName, TenantDisplayName } from "./EventOwnershipNames";
import { approvalActorDisplayName } from "./approval-actor-display";

type DisplayRow = { label: string; value: React.ReactNode };

function hasText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function enumLabel(value: string | null | undefined): string {
  return hasText(value) ? value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase()) : "Not provided";
}

function wallClockDateTime(value: string | null | undefined): string {
  if (!hasText(value)) return "Not provided";
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?/.exec(value);
  if (!match) return value;
  const [, year, month, day, hour, minute, second] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const dateLabel = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: "UTC" }).format(date);
  if (!hour || !minute) return dateLabel;
  const time = new Date(Date.UTC(2000, 0, 1, Number(hour), Number(minute), Number(second ?? "0")));
  const timeLabel = new Intl.DateTimeFormat(undefined, { timeStyle: "short", timeZone: "UTC" }).format(time);
  return `${dateLabel}, ${timeLabel}`;
}

function priceLabel(price: string | null | undefined, currency: string | null | undefined): string | null {
  if (!hasText(price)) return null;
  const number = Number(price);
  if (Number.isFinite(number) && number === 0) return "Free";
  if (Number.isFinite(number) && hasText(currency)) {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(number);
    } catch {
      return `${price} ${currency}`;
    }
  }
  return hasText(currency) ? `${price} ${currency}` : price;
}

function stringTags(tags: unknown[] | null | undefined): string[] {
  if (!Array.isArray(tags)) return [];
  return tags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0);
}

function humanizeKey(key: string): string {
  return key
    .replace(/^custom_/, "")
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function inferType(key: string, value: unknown): string {
  const normKey = key.toLowerCase();
  if (normKey.includes("rich") || (typeof value === "string" && /<\/?[a-z][\s\S]*>/i.test(value))) return "rich_text";
  if (normKey.includes("image") || normKey.includes("imah") || normKey.includes("photo") || (typeof value === "string" && /\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(value))) return "image";
  if (normKey.includes("video") || (typeof value === "string" && /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(value))) return "video";
  if (normKey.includes("doc") || normKey.includes("pdf") || normKey.includes("file") || (typeof value === "string" && /\.(pdf|doc|docx|zip)(\?.*)?$/i.test(value))) return "document";
  if (normKey.includes("url") || normKey.includes("link") || (typeof value === "string" && /^https?:\/\//i.test(value))) return "url";
  if (normKey.includes("tag") || Array.isArray(value)) return "tags";
  if (normKey.includes("date") || (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value))) return "date";
  if (normKey.includes("time") || (typeof value === "string" && /^\d{2}:\d{2}(:\d{2})?$/.test(value))) return "time";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  return "text";
}

type NormalizedCustomField = {
  id: string;
  key: string;
  label: string;
  value: unknown;
  type?: string;
};

function normalizeCustomValues(
  rawCustomValues: unknown,
  formMetadata?: Record<string, unknown> | null,
): NormalizedCustomField[] {
  const metaFields: Array<{ id?: string; key?: string; stable_key?: string; apiKey?: string; label?: string; type?: string; value_type?: string }> = [];
  if (formMetadata && typeof formMetadata === "object") {
    const rawSections = (formMetadata as { sections?: unknown[] }).sections
      ?? (formMetadata as { draft_version?: { sections?: unknown[] } }).draft_version?.sections
      ?? (formMetadata as { published_version?: { sections?: unknown[] } }).published_version?.sections;
    if (Array.isArray(rawSections)) {
      for (const sec of rawSections) {
        if (sec && typeof sec === "object" && Array.isArray((sec as { fields?: unknown[] }).fields)) {
          for (const f of (sec as { fields: unknown[] }).fields) {
            if (f && typeof f === "object") {
              metaFields.push(f as typeof metaFields[0]);
            }
          }
        }
      }
    }
  }

  const findMeta = (identifier: string) => {
    const norm = identifier.toLowerCase().replace(/[^a-z0-9]/g, "");
    return metaFields.find((f) => {
      const candidates = [f.id, f.key, f.stable_key, f.apiKey, f.label]
        .filter(Boolean)
        .map((s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, ""));
      return candidates.includes(norm);
    });
  };

  const results: NormalizedCustomField[] = [];

  if (Array.isArray(rawCustomValues)) {
    for (let i = 0; i < rawCustomValues.length; i++) {
      const item = rawCustomValues[i];
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const rec = item as Record<string, unknown>;
        if ("value" in rec) {
          const id = String(rec.field_id ?? rec.id ?? `field-${i}`);
          const key = String(rec.key ?? rec.field_key ?? rec.stable_key ?? id);
          const meta = findMeta(id) ?? findMeta(key);
          const label = String(rec.label ?? meta?.label ?? humanizeKey(key));
          const type = String(meta?.type ?? meta?.value_type ?? inferType(key, rec.value));
          results.push({ id, key, label, value: rec.value, type });
        } else {
          for (const [k, v] of Object.entries(rec)) {
            if (v === undefined || v === null || v === "") continue;
            const meta = findMeta(k);
            results.push({
              id: k,
              key: k,
              label: meta?.label ? String(meta.label) : humanizeKey(k),
              value: v,
              type: meta?.type ? String(meta.type) : inferType(k, v),
            });
          }
        }
      }
    }
  } else if (rawCustomValues && typeof rawCustomValues === "object") {
    for (const [k, v] of Object.entries(rawCustomValues as Record<string, unknown>)) {
      if (v === undefined || v === null || v === "") continue;
      const meta = findMeta(k);
      results.push({
        id: k,
        key: k,
        label: meta?.label ? String(meta.label) : humanizeKey(k),
        value: v,
        type: meta?.type ? String(meta.type) : inferType(k, v),
      });
    }
  }

  return results;
}

function CustomFieldValueRenderer({ value, type }: { value: unknown; type?: string }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-[#7f9d94]">Not provided</span>;
  }

  // 1. Rich text
  if (type === "rich_text" || (typeof value === "string" && /<\/?[a-z][\s\S]*>/i.test(value))) {
    const rawHtml = String(value).replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
    return (
      <div
        className="prose prose-sm max-w-none rounded-xl border border-[#e1ebe6] bg-white p-3 text-[#284940]"
        dangerouslySetInnerHTML={{ __html: rawHtml }}
      />
    );
  }

  // 2. Image URL(s)
  if (
    type === "image" ||
    (typeof value === "string" && (/\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(value) || value.startsWith("data:image/")))
  ) {
    const urls = Array.isArray(value) ? value.map(String) : [String(value)];
    return (
      <div className="flex flex-wrap gap-3">
        {urls.map((url, i) => (
          <div key={i} className="group relative overflow-hidden rounded-xl border border-[#e1ebe6] bg-[#f9fcfa]">
            <img
              src={url}
              alt={`Custom upload ${i + 1}`}
              className="h-28 w-28 object-cover sm:h-36 sm:w-36"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="block px-2 py-1 text-center text-xs font-semibold text-[#1f6a58] hover:underline"
            >
              View full
            </a>
          </div>
        ))}
      </div>
    );
  }

  // 3. Video URL(s)
  if (type === "video" || (typeof value === "string" && /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(value))) {
    const urls = Array.isArray(value) ? value.map(String) : [String(value)];
    return (
      <div className="space-y-2">
        {urls.map((url, i) => (
          <div key={i} className="max-w-md rounded-xl border border-[#e1ebe6] bg-black/5 p-2">
            <video controls preload="metadata" src={url} className="max-h-60 w-full rounded-lg" />
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block text-xs font-semibold text-[#1f6a58] hover:underline"
            >
              Open video link
            </a>
          </div>
        ))}
      </div>
    );
  }

  // 4. Document / PDF
  if (type === "document" || (typeof value === "string" && /\.(pdf|doc|docx|zip)(\?.*)?$/i.test(value))) {
    const urls = Array.isArray(value) ? value.map(String) : [String(value)];
    return (
      <div className="space-y-2">
        {urls.map((url, i) => {
          const filename = url.split("/").pop()?.split("?")[0] || `Document ${i + 1}`;
          return (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noreferrer"
              download
              className="inline-flex items-center gap-2 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-4 py-2.5 text-xs font-bold text-[#1f6a58] hover:bg-white hover:shadow-sm"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>{filename}</span>
            </a>
          );
        })}
      </div>
    );
  }

  // 5. URL
  if (type === "url" || (typeof value === "string" && /^https?:\/\//i.test(value))) {
    const urlStr = String(value);
    return (
      <a
        href={urlStr}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 break-all font-semibold text-[#1f6a58] underline hover:text-[#195646]"
      >
        {urlStr}
        <svg className="h-3.5 w-3.5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    );
  }

  // 6. Tags / Array
  if (Array.isArray(value) || type === "tags") {
    const items = Array.isArray(value) ? value : String(value).split(",").map((s) => s.trim()).filter(Boolean);
    return (
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span key={i} className="rounded-full bg-[#edf3f0] px-3 py-1 text-xs font-semibold text-[#284940]">
            {String(item)}
          </span>
        ))}
      </div>
    );
  }

  // 7. Boolean
  if (typeof value === "boolean") {
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${value ? "bg-[#e8f6ee] text-[#1f6a58]" : "bg-[#f3f4f6] text-[#6b7280]"}`}>
        {value ? "Yes" : "No"}
      </span>
    );
  }

  // 8. Default string / number
  return <span className="whitespace-pre-wrap break-words font-medium text-[#284940]">{String(value)}</span>;
}

function DetailGrid({ rows }: { rows: DisplayRow[] }) {
  if (rows.length === 0) return null;
  return (
    <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label}>
          <dt className="text-xs font-bold uppercase tracking-[.08em] text-[#7f9d94]">{row.label}</dt>
          <dd className="mt-1 whitespace-pre-wrap break-words font-medium text-[#284940]">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-[#e1ebe6] pt-6 first:border-t-0 first:pt-0">
      <h3 className="text-lg font-bold text-[#06201c]">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Renders the complete backend-backed Training dossier for Super Admin review without mutation controls. */
export default function TrainingApprovalReview({
  training,
  approvalPending,
  approvalError,
  onDecision,
}: {
  training: TrainingApprovalReview;
  approvalPending: boolean;
  approvalError: string | null;
  onDecision: (action: TrainingApprovalDecision, reason?: string) => void;
}) {
  const [decision, setDecision] = useState<TrainingApprovalDecision | null>(null);
  const approveButtonRef = useRef<HTMLButtonElement>(null);
  const closeConfirmation = () => {
    setDecision(null);
    window.setTimeout(() => approveButtonRef.current?.focus(), 0);
  };

  const historicalForm = useHistoricalTrainingFormConfigurationVersion(
    training.form_configuration_id,
    training.form_configuration_version_id,
    training.id,
  );

  const basePrice = priceLabel(training.price, training.currency);
  const tags = stringTags(training.tags);
  const sectionCount = Array.isArray(training.sections) ? training.sections.length : null;
  const assessmentCount = Array.isArray(training.assessments) ? training.assessments.length : null;

  const historyQuery = useQuery({
    queryKey: ["trainings", "moderation-history", training.id],
    queryFn: () => getTrainingModerationHistory(training.id),
    staleTime: 30_000,
    retry: 1,
  });
  const history = historyQuery.data ?? [];

  const customFields = useMemo(() => {
    return normalizeCustomValues(training.custom_values, historicalForm.data);
  }, [training.custom_values, historicalForm.data]);

  // Media resolution
  const primaryImage = training.primary_image;
  const galleryImages = Array.isArray(training.gallery_images)
    ? training.gallery_images.filter((img): img is string => typeof img === "string" && img.trim().length > 0)
    : [];
  const promoVideo = training.promotional_video ?? training.promotional_video_url;
  const documents = Array.isArray(training.documents)
    ? training.documents
    : Array.isArray(training.notes_documents)
      ? training.notes_documents
      : [];
  const hasMedia = Boolean(primaryImage || galleryImages.length > 0 || promoVideo || documents.length > 0 || training.notes_pdf_url);

  // Schedule resolution
  const hasSchedule = Boolean(
    hasText(training.start_date) ||
    hasText(training.end_date) ||
    hasText(training.start_time) ||
    hasText(training.end_time) ||
    hasText(training.time_zone) ||
    hasText(training.duration) ||
    hasText(training.venue) ||
    hasText(training.address) ||
    hasText(training.meeting_link) ||
    hasText(training.meeting_provider),
  );

  // Instructor resolution
  const instructorName = training.instructor?.name ?? training.instructor_name;
  const instructorBio = training.instructor?.bio ?? training.instructor_bio;
  const instructorRole = training.instructor?.role;
  const hasInstructor = Boolean(instructorName || instructorBio || training.instructor_credentials || training.instructor_photo);

  // Objectives & Requirements
  const learningObjectives = Array.isArray(training.learning_objectives)
    ? training.learning_objectives.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : typeof training.learning_objectives === "string"
      ? training.learning_objectives.split(/\r?\n/).filter(Boolean)
      : [];
  const prerequisites = Array.isArray(training.prerequisites)
    ? training.prerequisites.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : typeof training.prerequisites === "string"
      ? [training.prerequisites]
      : [];
  const hasCurriculum = Boolean(
    learningObjectives.length > 0 ||
    hasText(training.requirements) ||
    prerequisites.length > 0 ||
    hasText(training.target_audience) ||
    hasText(training.level) ||
    hasText(training.difficulty_level),
  );

  // FAQs
  const faqs = Array.isArray(training.faqs) ? training.faqs : [];

  return (
    <div className="mt-5 space-y-6 text-sm text-[#52736a]">
      {/* 1. Training Overview */}
      <ReviewSection title="Training Overview">
        <DetailGrid
          rows={[
            { label: "Training title", value: training.title },
            ...(hasText(training.description) ? [{ label: "Description", value: training.description }] : []),
            { label: "Category", value: training.category },
            ...(hasText(training.subcategory) ? [{ label: "Subcategory", value: training.subcategory }] : []),
            { label: "Status", value: enumLabel(training.status) },
            ...(hasText(training.delivery_mode) ? [{ label: "Delivery mode", value: enumLabel(training.delivery_mode) }] : []),
            ...(hasText(training.course_type) ? [{ label: "Course type", value: enumLabel(training.course_type) }] : []),
          ]}
        />
        {tags.length ? (
          <div className="mt-4">
            <p className="text-xs font-bold uppercase tracking-[.08em] text-[#7f9d94]">Tags</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span key={tag} className="rounded-full bg-[#edf3f0] px-3 py-1 font-semibold text-[#284940]">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </ReviewSection>

      {/* 2. Enterprise & Ownership */}
      <ReviewSection title="Enterprise / Ownership">
        <DetailGrid
          rows={[
            {
              label: "Enterprise",
              value: <EnterpriseDisplayName enterpriseId={training.enterprise_id} eventEnterpriseName={training.enterprise_name} />,
            },
            { label: "Tenant", value: <TenantDisplayName tenantId={training.tenant_id} /> },
            ...(hasText(training.location_id) ? [{ label: "Location", value: training.location_id }] : []),
          ]}
        />
      </ReviewSection>

      {/* 3. Schedule & Delivery */}
      {hasSchedule ? (
        <ReviewSection title="Schedule & Delivery">
          <DetailGrid
            rows={[
              ...(hasText(training.start_date) ? [{ label: "Start Date", value: wallClockDateTime(training.start_date) }] : []),
              ...(hasText(training.start_time) ? [{ label: "Start Time", value: training.start_time }] : []),
              ...(hasText(training.end_date) ? [{ label: "End Date", value: wallClockDateTime(training.end_date) }] : []),
              ...(hasText(training.end_time) ? [{ label: "End Time", value: training.end_time }] : []),
              ...(hasText(training.time_zone) ? [{ label: "Time Zone", value: training.time_zone }] : []),
              ...(hasText(training.duration) ? [{ label: "Duration", value: training.duration }] : []),
              ...(hasText(training.venue) ? [{ label: "Venue", value: training.venue }] : []),
              ...(hasText(training.address) ? [{ label: "Address", value: training.address }] : []),
              ...(hasText(training.meeting_provider) || hasText(training.meeting_platform)
                ? [{ label: "Meeting Provider", value: enumLabel(training.meeting_provider ?? training.meeting_platform) }]
                : []),
              ...(hasText(training.meeting_link)
                ? [
                    {
                      label: "Meeting Link",
                      value: (
                        <a
                          href={training.meeting_link}
                          target="_blank"
                          rel="noreferrer"
                          className="break-all font-semibold text-[#1f6a58] underline"
                        >
                          {training.meeting_link}
                        </a>
                      ),
                    },
                  ]
                : []),
              ...(hasText(training.enrolment_start) ? [{ label: "Enrolment Opens", value: wallClockDateTime(training.enrolment_start) }] : []),
              ...(hasText(training.enrolment_end) ? [{ label: "Enrolment Closes", value: wallClockDateTime(training.enrolment_end) }] : []),
            ]}
          />
        </ReviewSection>
      ) : null}

      {/* 4. Instructor & Host */}
      {hasInstructor ? (
        <ReviewSection title="Instructor / Host Details">
          <DetailGrid
            rows={[
              ...(hasText(instructorName) ? [{ label: "Instructor Name", value: instructorName }] : []),
              ...(hasText(instructorRole) ? [{ label: "Role", value: instructorRole }] : []),
              ...(hasText(instructorBio) ? [{ label: "Bio", value: instructorBio }] : []),
              ...(hasText(training.instructor_credentials) ? [{ label: "Credentials", value: training.instructor_credentials }] : []),
            ]}
          />
          {hasText(training.instructor_photo) ? (
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-[.08em] text-[#7f9d94]">Instructor Photo</p>
              <img
                src={training.instructor_photo}
                alt="Instructor"
                className="mt-2 h-24 w-24 rounded-full border border-[#e1ebe6] object-cover"
              />
            </div>
          ) : null}
        </ReviewSection>
      ) : null}

      {/* 5. Pricing & Capacity */}
      {(basePrice || hasText(training.capacity) || hasText(training.promo_price) || hasText(training.coupon_code)) ? (
        <ReviewSection title="Pricing & Capacity">
          <DetailGrid
            rows={[
              ...(basePrice ? [{ label: "Base Price", value: basePrice }] : []),
              ...(basePrice ? [{ label: "Admission", value: Number(training.price) === 0 ? "Free" : "Paid" }] : []),
              ...(hasText(training.promo_price) ? [{ label: "Promo Price", value: priceLabel(training.promo_price, training.currency) }] : []),
              ...(hasText(training.coupon_code) ? [{ label: "Coupon Code", value: training.coupon_code }] : []),
              ...(hasText(training.capacity) ? [{ label: "Capacity", value: `${training.capacity} participants` }] : []),
            ]}
          />
        </ReviewSection>
      ) : null}

      {/* 6. Media & Uploads */}
      {hasMedia ? (
        <ReviewSection title="Images, Videos & Documents">
          <div className="space-y-4">
            {hasText(primaryImage) ? (
              <div>
                <p className="text-xs font-bold uppercase tracking-[.08em] text-[#7f9d94]">Primary Image</p>
                <div className="mt-2 overflow-hidden rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-2">
                  <img
                    src={primaryImage}
                    alt={`${training.title} primary`}
                    className="max-h-72 w-full rounded-lg object-contain"
                  />
                  <a
                    href={primaryImage}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-xs font-semibold text-[#1f6a58] underline hover:text-[#195646]"
                  >
                    Open original image
                  </a>
                </div>
              </div>
            ) : null}

            {galleryImages.length ? (
              <div>
                <p className="text-xs font-bold uppercase tracking-[.08em] text-[#7f9d94]">Gallery Images</p>
                <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {galleryImages.map((image, index) => (
                    <div key={`${image}-${index}`} className="group relative overflow-hidden rounded-xl border border-[#e1ebe6] bg-[#f9fcfa]">
                      <img src={image} alt={`Gallery ${index + 1}`} className="h-32 w-full object-cover" />
                      <a
                        href={image}
                        target="_blank"
                        rel="noreferrer"
                        className="block px-2 py-1 text-center text-xs font-semibold text-[#1f6a58] hover:underline"
                      >
                        View full
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {hasText(promoVideo) ? (
              <div>
                <p className="text-xs font-bold uppercase tracking-[.08em] text-[#7f9d94]">Promotional Video</p>
                <div className="mt-2 max-w-lg rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-2">
                  {/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(promoVideo) ? (
                    <video controls preload="metadata" src={promoVideo} className="max-h-64 w-full rounded-lg" />
                  ) : null}
                  <a
                    href={promoVideo}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-xs font-semibold text-[#1f6a58] underline"
                  >
                    Open video link ({promoVideo})
                  </a>
                </div>
              </div>
            ) : null}

            {documents.length || hasText(training.notes_pdf_url) ? (
              <div>
                <p className="text-xs font-bold uppercase tracking-[.08em] text-[#7f9d94]">Documents & Course Notes</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {documents.map((doc, idx) => {
                    const docUrl = typeof doc === "string" ? doc : (doc as { url?: string })?.url;
                    const docName = typeof doc === "string" ? doc.split("/").pop()?.split("?")[0] : (doc as { name?: string })?.name ?? `Document ${idx + 1}`;
                    if (!docUrl) return null;
                    return (
                      <a
                        key={idx}
                        href={docUrl}
                        target="_blank"
                        rel="noreferrer"
                        download
                        className="inline-flex items-center gap-2 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-4 py-2 text-xs font-bold text-[#1f6a58] hover:bg-white hover:shadow-sm"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>{docName}</span>
                      </a>
                    );
                  })}
                  {hasText(training.notes_pdf_url) ? (
                    <a
                      href={training.notes_pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      download
                      className="inline-flex items-center gap-2 rounded-xl border border-[#8a5a00] bg-[#fffaf0] px-4 py-2 text-xs font-bold text-[#8a5a00] hover:bg-white"
                    >
                      <span>Notes PDF</span>
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </ReviewSection>
      ) : null}

      {/* 7. Configured & Custom Fields */}
      {customFields.length > 0 ? (
        <ReviewSection title="Configured & Custom Fields">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {customFields.map((field) => (
              <article key={field.id} className="min-w-0 rounded-2xl border border-[#e1ebe6] bg-[#f9fcfa] p-4 shadow-xs">
                <p className="text-xs font-bold uppercase tracking-[.08em] text-[#7f9d94]">{field.label}</p>
                <div className="mt-2">
                  <CustomFieldValueRenderer value={field.value} type={field.type} />
                </div>
              </article>
            ))}
          </div>
        </ReviewSection>
      ) : null}

      {/* 8. Learning Objectives & Prerequisites */}
      {hasCurriculum ? (
        <ReviewSection title="Curriculum & Requirements">
          <DetailGrid
            rows={[
              ...(hasText(training.requirements) ? [{ label: "Requirements", value: training.requirements }] : []),
              ...(prerequisites.length ? [{ label: "Prerequisites", value: prerequisites.join(", ") }] : []),
              ...(hasText(training.target_audience) ? [{ label: "Target Audience", value: training.target_audience }] : []),
              ...(hasText(training.difficulty_level) || hasText(training.level)
                ? [{ label: "Difficulty Level", value: enumLabel(training.difficulty_level ?? training.level) }]
                : []),
            ]}
          />
          {learningObjectives.length ? (
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-[.08em] text-[#7f9d94]">Learning Objectives</p>
              <ul className="mt-2 list-inside list-disc space-y-1 font-medium text-[#284940]">
                {learningObjectives.map((obj, i) => (
                  <li key={i}>{obj}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </ReviewSection>
      ) : null}

      {/* 9. FAQs */}
      {faqs.length > 0 ? (
        <ReviewSection title="Frequently Asked Questions">
          <div className="space-y-3">
            {faqs.map((faq, i) => {
              const q = faq.question ?? faq.q ?? `Question ${i + 1}`;
              const a = faq.answer ?? faq.a ?? "";
              return (
                <article key={i} className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-4">
                  <p className="font-bold text-[#06201c]">{q}</p>
                  {a ? <p className="mt-1 text-sm text-[#52736a]">{a}</p> : null}
                </article>
              );
            })}
          </div>
        </ReviewSection>
      ) : null}

      {/* 10. Content Structure */}
      {(sectionCount !== null || assessmentCount !== null) ? (
        <ReviewSection title="Content Structure">
          <DetailGrid
            rows={[
              ...(sectionCount !== null ? [{ label: "Sections", value: String(sectionCount) }] : []),
              ...(assessmentCount !== null ? [{ label: "Assessments", value: String(assessmentCount) }] : []),
            ]}
          />
        </ReviewSection>
      ) : null}

      {/* 11. Record Information */}
      <ReviewSection title="Record Information">
        <DetailGrid
          rows={[
            { label: "Current status", value: enumLabel(training.status) },
            ...(hasText(training.created_at) ? [{ label: "Created", value: wallClockDateTime(training.created_at) }] : []),
            ...(hasText(training.updated_at) ? [{ label: "Last updated", value: wallClockDateTime(training.updated_at) }] : []),
          ]}
        />
      </ReviewSection>

      {/* 12. Moderation History */}
      <ReviewSection title="Moderation History">
        {historyQuery.isLoading ? (
          <p className="text-xs text-[#7f9d94]">Loading history…</p>
        ) : history.length === 0 ? (
          <p className="text-xs text-[#7f9d94]">No moderation history recorded for this training.</p>
        ) : (
          <ol className="relative ml-3 space-y-5 border-l-2 border-[#e1ebe6]">
            {history.map((entry, index) => {
              const label = entry.action ?? entry.status ?? "—";
              const from = entry.from_status;
              const to = entry.to_status ?? entry.status;
              const reason = entry.reason;
              const isCancellation = [label, to].some((val) => typeof val === "string" && val.toLowerCase().includes("cancel"));
              const who = approvalActorDisplayName(entry.performed_by);
              const when = entry.created_at ?? entry.timestamp;
              return (
                <li
                  key={entry.id ?? `history-${index}`}
                  className="relative pl-6 before:absolute before:left-[-5px] before:top-1 before:h-2 before:w-2 before:rounded-full before:bg-[#1f6a58]"
                >
                  <p className="font-bold text-[#284940]">
                    {enumLabel(String(label))}
                    {from && to ? (
                      <span className="font-normal text-[#52736a]">
                        {" "}
                        — {enumLabel(String(from))} → {enumLabel(String(to))}
                      </span>
                    ) : null}
                  </p>
                  {who ? <p className="text-xs text-[#7f9d94]">by {who}</p> : null}
                  {hasText(reason) ? (
                    <p className="mt-1 rounded-lg bg-[#f9fcfa] px-3 py-2 text-xs text-[#52736a]">
                      {isCancellation ? "Cancellation reason: " : ""}
                      {reason}
                    </p>
                  ) : null}
                  {hasText(when) ? <p className="mt-1 text-xs text-[#7f9d94]">{wallClockDateTime(when)}</p> : null}
                </li>
              );
            })}
          </ol>
        )}
      </ReviewSection>

      {/* 13. Super Admin Review Actions */}
      {training.status === "pending_approval" ? (
        <section className="rounded-2xl border border-[#cde5db] bg-[#f4faf7] p-5">
          <h3 className="text-lg font-bold text-[#06201c]">Review this Training</h3>
          <p className="mt-2">Approve it, request a revision, or reject it using the backend approval workflow.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              ref={approveButtonRef}
              type="button"
              onClick={() => setDecision("approve")}
              disabled={approvalPending}
              className="h-11 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#185447] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Approve Training
            </button>
            <button
              type="button"
              onClick={() => setDecision("request_changes")}
              disabled={approvalPending}
              className="h-11 rounded-full border border-[#b7791f] px-5 text-sm font-bold text-[#8a5a00] transition hover:bg-[#fff4dc] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Request Changes
            </button>
            <button
              type="button"
              onClick={() => setDecision("reject")}
              disabled={approvalPending}
              className="h-11 rounded-full border border-[#b42318] px-5 text-sm font-bold text-[#b42318] transition hover:bg-[#fff0ee] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Reject Training
            </button>
          </div>
        </section>
      ) : null}

      <TrainingApprovalDialog
        action={decision}
        trainingTitle={training.title}
        pending={approvalPending}
        error={approvalError}
        onCancel={closeConfirmation}
        onConfirm={(reason) => {
          if (decision) onDecision(decision, reason);
        }}
      />
    </div>
  );
}
