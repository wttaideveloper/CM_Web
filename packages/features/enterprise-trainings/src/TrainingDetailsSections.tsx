"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { authenticatedFetch } from "@ihp/auth";
import { DateTimeLocalInput } from "@ihp/ui";
import {
  addAssessmentQuestions,
  approveTrainingEnrolment,
  cancelTrainingEnrolment,
  createDiscussionReply,
  createTrainingAnnouncement,
  createTrainingAssignment,
  createTrainingAssessment,
  createTrainingDiscussion,
  createTrainingLesson,
  createTrainingSection,
  deleteAssessmentQuestion,
  deleteTrainingAssessment,
  deleteTrainingAssignment,
  deleteTrainingLesson,
  deleteTrainingSection,
  exportTrainingEnrolments,
  getAssessmentSubmissionReview,
  getTrainingCertificate,
  getTrainingContent,
  getTrainingEbook,
  getTrainingLesson,
  getTrainingMeetingLink,
  getTrainingModerationHistory,
  getTrainingQuestionBank,
  getTrainingSections,
  gradeAssessmentSubmission,
  publishTrainingEbook,
  gradeAssignmentSubmission,
  joinTrainingWaitlist,
  leaveTrainingWaitlist,
  listTrainingAnnouncements,
  listTrainingAssignments,
  listTrainingAssessments,
  listTrainingDiscussions,
  listTrainingEnrolments,
  listTrainingOrders,
  listTrainingAssessmentSubmissions,
  refundTrainingOrder,
  decideTrainingOrderRefund,
  patchTrainingOrderStatus,
  reorderTrainingLessons,
  reorderTrainingModules,
  reorderTrainingSections,
  saveTrainingEbook,
  submitTrainingEbookForApproval,
  validateTrainingEbook,
  withdrawTrainingEbookSubmission,
  submitTrainingAssessment,
  submitTrainingAssignment,
  updateTrainingAssessment,
  updateTrainingLesson,
  updateTrainingSection,
  uploadTrainingMedia,
  downloadTrainingCalendar,
  TrainingsApiError,
  type CreateTrainingLessonPayload,
  type CreateTrainingSectionPayload,
  type AssessmentSubmissionListItem,
  type AssessmentSubmissionReview as AssessmentSubmissionReviewData,
} from "./trainings.service";
import { enrolInTraining, type TrainingCheckoutRequest } from "./trainings.service";
import { formatDetailDateTime, formatTrainingDate, humanizeLabel } from "./detail-formatters";
import TrainingLessonAttendance from "./TrainingLessonAttendance";
import { LessonMediaPreview } from "./LessonMediaPreview";
import { getYouTubeEmbedUrl } from "./youtube-video-url";
import { useActiveTrainingFormConfiguration, useTrainingHistoricalFormConfiguration } from "./training-form-configuration.queries";
import type { TrainingFormConfig, TrainingFormField } from "./training-form-config.service";

const CORE_TRAINING_IMAGE_UPLOAD_KEYS = ["gallery_images", "primary_image"] as const;

/** Finds enabled image upload fields in the Training form the API resolves for this record. */
function getTrainingImageUploadFieldKeys(configurations: readonly (TrainingFormConfig | null | undefined)[]): string[] {
  const keys = new Set<string>();
  const addCandidate = (field: TrainingFormField) => {
    if (field.enabled === false) return;
    const normalizedKey = field.key.trim().toLowerCase().replace(/^(core_|custom_)/, "");
    const valueType = (field.valueType ?? "").trim().toLowerCase();
    const label = field.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const isCoreImageField = CORE_TRAINING_IMAGE_UPLOAD_KEYS.some((key) => normalizedKey === key);
    const configuredMimeTypes = field.frontendSettings?.upload?.allowed_mime_types ?? [];
    const hasImageUploadPolicy = configuredMimeTypes.some((mimeType) => mimeType.toLowerCase().startsWith("image/"));
    const isConfiguredImageField = valueType.includes("image") || valueType.includes("photo")
      || label.includes("image") || label.includes("photo") || hasImageUploadPolicy;
    if (!isCoreImageField && !isConfiguredImageField) return;
    const candidates = isCoreImageField
      ? [field.apiKey, field.stable_key, normalizedKey]
      : [(field.stable_key && !field.stable_key.startsWith("field-custom-") ? field.stable_key : undefined), field.apiKey, field.key];
    candidates.forEach((candidate) => {
      if (candidate?.trim()) keys.add(candidate.trim());
    });
  };

  configurations.forEach((configuration) => {
    configuration?.sections
      .filter((section) => section.enabled !== false)
      .forEach((section) => section.fields.forEach(addCandidate));
  });
  return [...keys];
}

const LESSON_TYPE_OPTIONS = [
  { value: "text", label: "Topic" },
  { value: "video", label: "Video" },
  { value: "youtube", label: "YouTube" },
  { value: "pdf", label: "PDF" },
  { value: "notes", label: "Notes" },
  { value: "ebook", label: "eBook" },
  { value: "quiz", label: "Quiz" },
] as const;

const QUIZ_QUESTION_TYPE_OPTIONS = [
  { value: "mcq", label: "Radio / Single choice" },
  { value: "multiple_select", label: "Checkbox / Multiple choice" },
  { value: "true_false", label: "True / False" },
  { value: "short_answer", label: "Blank answer" },
  { value: "essay", label: "Essay" },
] as const;

const MEETING_TYPE_OPTIONS = [
  { value: "google_meet", label: "Google Meet" },
  { value: "zoom", label: "Zoom" },
  { value: "teams", label: "Teams" },
  { value: "webex", label: "Webex" },
  { value: "other", label: "Other" },
] as const;

function toApiLessonType(type: string): string {
  if (type === "notes" || type === "assignment") return "text";
  return type;
}

function toUiLessonType(type: string): string {
  if (type === "exam") return "quiz";
  return LESSON_TYPE_OPTIONS.some((option) => option.value === type) || type === "live" || type === "venue" || type === "document" ? type : "text";
}

function isLessonType(type: string, ...types: string[]): boolean {
  return types.includes(type);
}

function getCorrectOptionIndexes(options: string[], correctAnswer: string, questionType: string): Set<number> {
  if (questionType !== "multiple_select") {
    return new Set(options.flatMap((option, index) => option === correctAnswer ? [index] : []));
  }

  const normalize = (value: string) => value.normalize("NFKC").toLocaleLowerCase().replace(/[\s\p{P}\p{S}]/gu, "");
  const normalizedAnswer = normalize(correctAnswer);
  const candidates = options
    .map((option, index) => ({ index, value: normalize(option) }))
    .filter((option) => option.value.length > 0)
    .map((option) => ({ ...option, start: normalizedAnswer.indexOf(option.value), end: normalizedAnswer.indexOf(option.value) + option.value.length }))
    .filter((option) => option.start >= 0)
    .sort((left, right) => right.value.length - left.value.length);
  const matchedRanges: Array<{ start: number; end: number; value: string }> = [];
  const correctIndexes = new Set<number>();

  for (const candidate of candidates) {
    const overlapsAnotherOption = matchedRanges.some((range) =>
      candidate.start < range.end && candidate.end > range.start && candidate.value !== range.value,
    );
    if (!overlapsAnotherOption) {
      matchedRanges.push(candidate);
      correctIndexes.add(candidate.index);
    }
  }

  return correctIndexes;
}

function isOptionalIntegerInRange(value: string, minimum: number, maximum: number): boolean {
  if (!value.trim()) return true;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum;
}

function isOptionalPositiveInteger(value: string): boolean {
  return isOptionalIntegerInRange(value, 1, Number.MAX_SAFE_INTEGER);
}

type TrainingAssessmentLevel = "pre_course" | "module" | "final" | "feedback";
type TrainingAssessmentType = "quiz" | "exam";

interface LessonTypeOption {
  value: string;
  label: string;
}

function getLessonTypeOptions(deliveryMode: string): LessonTypeOption[] {
  const normalizedMode = deliveryMode.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const options: LessonTypeOption[] = [...LESSON_TYPE_OPTIONS];
  const supportsLive = ["online", "live", "virtual", "hybrid", "blended"].includes(normalizedMode);
  const supportsVenue = ["physical", "venue", "in_person", "inperson", "offline", "hybrid", "blended"].includes(normalizedMode);
  if (supportsLive) options.push({ value: "live", label: "Live" });
  if (supportsVenue) options.push({ value: "venue", label: "Venue" });
  return options;
}

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-[#06201c]">{title}</h3>
        {action ?? null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** List of URL inputs with add/remove and inline media previews where the browser supports them. */
function LessonUrlList({ label, values, update, placeholder, previewKind }: { label: string; values: string[]; update: (next: string[]) => void; placeholder?: string; previewKind?: "video" | "document" }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[.08em] text-[#7f9d94]">{label}</p>
        <button type="button" onClick={() => update([...values, ""])} className="text-[10px] font-bold text-[#1f6a58]">+ Add</button>
      </div>
      <div className="mt-1 space-y-1">
        {values.map((val, idx) => (
          <div key={idx}>
            <div className="flex gap-1">
              <input value={val} onChange={(e) => update(values.map((c, i) => (i === idx ? e.target.value : c)))} placeholder={placeholder ?? "https://..."} className="h-8 min-w-0 flex-1 rounded-lg border border-[#d7e5df] bg-white px-3 text-xs outline-none focus:border-[#1f6a58]" />
              <button type="button" onClick={() => update(values.filter((_, i) => i !== idx))} className="shrink-0 rounded-lg px-2 text-[10px] font-semibold text-[#b42318] hover:bg-[#fff6f5]">Remove</button>
            </div>
            {val.trim() && previewKind ? <LessonMediaPreview url={val} name={val.split("/").pop() || label} kind={previewKind} /> : null}
          </div>
        ))}
        {values.length === 0 ? <p className="text-xs text-[#7f9d94]">No {label.toLowerCase()} yet - click + Add.</p> : null}
      </div>
    </div>
  );
}

function formatLessonFileSize(value: string): string {
  const sizeInBytes = Number(value);
  if (!value.trim() || !Number.isFinite(sizeInBytes) || sizeInBytes < 0) return "";

  const units = ["bytes", "KB", "MB", "GB", "TB"];
  let scaledSize = sizeInBytes;
  let unitIndex = 0;
  while (scaledSize >= 1024 && unitIndex < units.length - 1) {
    scaledSize /= 1024;
    unitIndex += 1;
  }
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: unitIndex === 0 ? 0 : 1 }).format(scaledSize)} ${units[unitIndex]}`;
}

function LessonFileSize({ value }: { value: string }) {
  const displayValue = formatLessonFileSize(value) || "Upload a file to calculate its size";
  return (
    <div className="rounded-lg border border-[#d7e5df] bg-[#f9fcfa] px-3 py-2 text-xs">
      <p className="font-semibold text-[#06201c]">File size</p>
      <p className="mt-0.5 text-[#52736a]">{displayValue}</p>
    </div>
  );
}

interface TrainingLessonDefaults {
  meetingProvider: string;
  meetingLink: string;
  deliveryInstructions: string;
  venue: string;
  address: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

type LessonDetailsSource = "existing" | "new";

function hasExistingLessonDetails(type: "live" | "venue", defaults: TrainingLessonDefaults): boolean {
  return type === "live"
    ? Boolean(defaults.meetingLink.trim())
    : Boolean(defaults.venue.trim() || defaults.address.trim());
}

function getInitialLessonDetailsSource(type: string, defaults: TrainingLessonDefaults): LessonDetailsSource {
  return (type === "live" || type === "venue") && hasExistingLessonDetails(type, defaults) ? "existing" : "new";
}

function getTrainingScheduledAt(defaults: TrainingLessonDefaults): string {
  const date = defaults.startDate.trim();
  const time = defaults.startTime.trim();
  const datePart = date.slice(0, 10);
  const timePart = time ? time.slice(0, 5) : date.includes("T") ? date.slice(11, 16) : "";
  return datePart && timePart ? `${datePart}T${timePart}` : "";
}

function getTrainingScheduleBound(dateValue: string, timeValue: string, edge: "start" | "end"): string | undefined {
  const date = dateValue.trim().match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (!date) return undefined;
  const time = timeValue.trim().match(/^(\d{2}:\d{2})/)?.[1]
    ?? dateValue.match(/T(\d{2}:\d{2})/)?.[1]
    ?? (edge === "start" ? "00:00" : "23:59");
  return `${date}T${time}`;
}

function toDateTimeLocalValue(value: string): string {
  const normalized = value.trim().replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})/, "$1T$2");
  const match = normalized.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  return match ? `${match[1]}T${match[2]}` : "";
}

function isLessonScheduleWithinTraining(value: string, defaults: TrainingLessonDefaults): boolean {
  const scheduled = toDateTimeLocalValue(value);
  if (!scheduled) return false;
  const minimum = getTrainingScheduleBound(defaults.startDate, defaults.startTime, "start");
  const maximum = getTrainingScheduleBound(defaults.endDate, defaults.endTime, "end");
  return Boolean(minimum && maximum && scheduled >= minimum && scheduled <= maximum);
}

function getMeetingTypeFromProvider(provider: string): string {
  const normalizedProvider = provider.trim().toLowerCase();
  if (normalizedProvider === "meet" || normalizedProvider === "google meet") return "google_meet";
  if (["zoom", "teams", "webex", "other"].includes(normalizedProvider)) return normalizedProvider;
  return "google_meet";
}

function formatLessonScheduledAt(value: string): string {
  if (!value.trim()) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function LessonScheduleFields({
  type,
  defaults,
  source,
  setSource,
  scheduledAt,
  setScheduledAt,
  scheduleError,
  meetingType,
  setMeetingType,
  meetingLink,
  setMeetingLink,
  joinUrl,
  setJoinUrl,
  venueName,
  setVenueName,
  venueAddress,
  setVenueAddress,
}: {
  type: "live" | "venue";
  defaults: TrainingLessonDefaults;
  source: LessonDetailsSource;
  setSource: (source: LessonDetailsSource) => void;
  scheduledAt: string;
  setScheduledAt: (value: string) => void;
  scheduleError?: string | null;
  meetingType: string;
  setMeetingType: (value: string) => void;
  meetingLink: string;
  setMeetingLink: (value: string) => void;
  joinUrl: string;
  setJoinUrl: (value: string) => void;
  venueName: string;
  setVenueName: (value: string) => void;
  venueAddress: string;
  setVenueAddress: (value: string) => void;
}) {
  const { t } = useTranslation("enterpriseTrainings");
  const copy = (key: string, defaultValue: string) => t(`lessonScheduling.${key}`, { defaultValue });
  const hasExisting = hasExistingLessonDetails(type, defaults);
  const scheduledAtDefault = getTrainingScheduledAt(defaults);
  const scheduleDisplay = scheduledAtDefault
    ? formatLessonScheduledAt(scheduledAtDefault)
    : [defaults.startDate, defaults.startTime].filter(Boolean).join("  |  ");
  const isLive = type === "live";
  const lessonDateMinimum = getTrainingScheduleBound(defaults.startDate, defaults.startTime, "start");
  const lessonDateMaximum = getTrainingScheduleBound(defaults.endDate, defaults.endTime, "end");
  const title = isLive ? copy("meetingSetup", "Meeting setup") : copy("venueSetup", "Venue setup");

  return (
    <div className="space-y-2 rounded-lg border border-[#d7e5df] bg-[#f9fcfa] p-3">
      <label className="block text-[10px] font-semibold text-[#52736a]">
        {title}
        <select
          value={source}
          onChange={(event) => {
            const nextSource = event.target.value as LessonDetailsSource;
            setSource(nextSource);
            if (nextSource === "new") {
              if (isLive) {
                setMeetingLink("");
                setJoinUrl("");
              } else {
                setVenueName("");
                setVenueAddress("");
              }
            }
          }}
          aria-label={copy("detailsSource", `${title} source`)}
          className="mt-1 h-8 w-full rounded-lg border border-[#d7e5df] bg-white px-2 text-xs outline-none focus:border-[#1f6a58]"
        >
          <option value="existing" disabled={!hasExisting}>{isLive ? copy("useTrainingMeeting", "Use training's existing meeting") : copy("useTrainingVenue", "Use training's existing venue")}</option>
          <option value="new">{isLive ? copy("newMeeting", "Set up a new meeting") : copy("newVenue", "Set up a new venue")}</option>
        </select>
      </label>
      <label className="block text-[10px] font-semibold text-[#52736a]">
        {copy("lessonDateTime", "Lesson date and time (required)")}
        <DateTimeLocalInput
          required
          value={scheduledAt}
          min={lessonDateMinimum}
          max={lessonDateMaximum}
          onChange={setScheduledAt}
          aria-label={copy("lessonDateTime", "Lesson date and time (required)")}
          className="mt-1 h-8 w-full rounded-lg border border-[#d7e5df] bg-white px-2 text-xs outline-none focus:border-[#1f6a58]"
        />
      </label>
      {scheduleError ? <p role="alert" className="text-xs font-semibold text-[#b42318]">{scheduleError}</p> : null}
      {source === "existing" ? (
        <div className="grid gap-1 text-xs text-[#52736a]">
          <p><span className="font-semibold">{copy("trainingSchedule", "Training schedule (reference)")}:</span> {scheduleDisplay
            ? scheduleDisplay
            : copy("notSetOnTraining", "Not set on the training")}</p>
          {isLive ? (
            <>
              <p><span className="font-semibold">{copy("provider", "Meeting provider")}:</span> {humanizeLabel(defaults.meetingProvider) || copy("notSet", "Not set")}</p>
              <p><span className="font-semibold">{copy("meetingLink", "Meeting link")}:</span> {defaults.meetingLink || copy("notSet", "Not set")}</p>
              {defaults.deliveryInstructions ? <p><span className="font-semibold">{copy("joinInstructions", "Join instructions")}:</span> {defaults.deliveryInstructions}</p> : null}
            </>
          ) : (
            <>
              <p><span className="font-semibold">{copy("venue", "Venue")}:</span> {defaults.venue || copy("notSet", "Not set")}</p>
              <p><span className="font-semibold">{copy("address", "Address")}:</span> {defaults.address || copy("notSet", "Not set")}</p>
            </>
          )}
        </div>
      ) : (
        <>
          {isLive ? (
            <>
              <label className="block text-[10px] font-semibold text-[#52736a]">
                {copy("provider", "Meeting provider")}
                <select value={meetingType} onChange={(event) => setMeetingType(event.target.value)} aria-label={copy("provider", "Meeting provider")} className="mt-1 h-8 w-full rounded-lg border border-[#d7e5df] bg-white px-2 text-xs outline-none focus:border-[#1f6a58]">
                  {MEETING_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <input type="url" required value={meetingLink} onChange={(event) => setMeetingLink(event.target.value)} placeholder={copy("meetingLink", "Meeting link")} aria-label={copy("newMeetingLink", "New meeting link")} className="h-8 w-full rounded-lg border border-[#d7e5df] bg-white px-3 text-xs outline-none focus:border-[#1f6a58]" />
              <input value={joinUrl} onChange={(event) => setJoinUrl(event.target.value)} placeholder={copy("joinInstructionsOptional", "Join instructions (optional)")} aria-label={copy("joinInstructions", "Join instructions")} className="h-8 w-full rounded-lg border border-[#d7e5df] bg-white px-3 text-xs outline-none focus:border-[#1f6a58]" />
            </>
          ) : (
            <>
              <input required value={venueName} onChange={(event) => setVenueName(event.target.value)} placeholder={copy("venueName", "Venue name")} aria-label={copy("newVenueName", "New venue name")} className="h-8 w-full rounded-lg border border-[#d7e5df] bg-white px-3 text-xs outline-none focus:border-[#1f6a58]" />
              <input required value={venueAddress} onChange={(event) => setVenueAddress(event.target.value)} placeholder={copy("address", "Address")} aria-label={copy("newVenueAddress", "New venue address")} className="h-8 w-full rounded-lg border border-[#d7e5df] bg-white px-3 text-xs outline-none focus:border-[#1f6a58]" />
            </>
          )}
        </>
      )}
    </div>
  );
}

function readVideoDurationInSeconds(source: File | string): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const isObjectUrl = typeof source !== "string";
    const videoSource = isObjectUrl ? URL.createObjectURL(source) : source;
    let isSettled = false;
    const timeoutId = window.setTimeout(() => {
      settle({ error: new Error("Could not read this video's duration. Try another video file.") });
    }, 15_000);

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      video.onloadedmetadata = null;
      video.onerror = null;
      video.removeAttribute("src");
      video.load();
      if (isObjectUrl) URL.revokeObjectURL(videoSource);
    };

    const settle = (result: { durationSeconds: number } | { error: Error }) => {
      if (isSettled) return;
      isSettled = true;
      cleanup();
      if ("error" in result) {
        reject(result.error);
      } else {
        resolve(result.durationSeconds);
      }
    };

    video.preload = "metadata";
    video.onloadedmetadata = () => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) {
        settle({ error: new Error("Could not read this video's duration. Try another video file.") });
        return;
      }
      settle({ durationSeconds: Math.max(1, Math.round(video.duration)) });
    };
    video.onerror = () => settle({ error: new Error("Could not read this video's duration. Try another video file.") });
    video.src = videoSource;
  });
}

const lessonVideoDurationCache = new Map<string, string>();

function toDurationMinutesFromSeconds(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const durationSeconds = Number(value);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return undefined;
  return Math.max(1, Math.round(durationSeconds / 60));
}

function formatVideoDurationSeconds(value: string): string {
  const totalSeconds = Number(value);
  if (!value.trim() || !Number.isFinite(totalSeconds) || totalSeconds < 0) return "";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [
    hours > 0 ? `${hours} hr` : "",
    `${minutes} min`,
    `${seconds} sec`,
  ].filter(Boolean).join(" ");
}

function formatLessonDuration(value: string): string {
  const durationMinutes = Number(value);
  if (!value.trim() || !Number.isFinite(durationMinutes) || durationMinutes < 0) return "";

  const totalSeconds = Math.round(durationMinutes * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [
    hours > 0 ? `${hours} hr` : "",
    `${minutes} min`,
    `${seconds} sec`,
  ].filter(Boolean).join(" ");
}

function LessonDuration({ value }: { value: string }) {
  const displayValue = formatVideoDurationSeconds(value) || "Upload a video to calculate its duration";

  return (
    <div className="rounded-lg border border-[#d7e5df] bg-[#f9fcfa] px-3 py-2 text-xs">
      <p className="font-semibold text-[#06201c]">Video duration</p>
      <p className="mt-0.5 text-[#52736a]">{displayValue}</p>
    </div>
  );
}

/** Lesson document (URL + name + visibility + downloadable) editor. */
function LessonDocsList({ values, update, showPreview = true }: { values: Array<{ url: string; name: string; visibility: string; downloadable: boolean }>; update: (next: Array<{ url: string; name: string; visibility: string; downloadable: boolean }>) => void; showPreview?: boolean }) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6efea] bg-[#f4faf6] px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-[.08em] text-[#7f9d94]">Documents</p>
        <button type="button" onClick={() => update([...values, { url: "", name: "", visibility: "public", downloadable: true }])} className="text-[10px] font-bold text-[#1f6a58]">+ Add</button>
      </div>
      <div className="mt-1 space-y-2">
        {values.map((doc, idx) => (
          <div key={idx} className="space-y-1 rounded-lg border border-[#e1ebe6] bg-[#f9fcfa] p-2">
            <input value={doc.url} onChange={(e) => update(values.map((d, i) => (i === idx ? { ...d, url: e.target.value } : d)))} placeholder="PDF URL https://..." className="h-8 w-full rounded-lg border border-[#d7e5df] bg-white px-3 text-xs outline-none focus:border-[#1f6a58]" />
            {doc.url.trim() ? <LessonMediaPreview url={doc.url} name={doc.name || doc.url.split("/").pop() || "Lesson document"} kind="document" showPreview={showPreview} /> : null}
            <div className="flex flex-wrap items-center gap-2">
              <input value={doc.name} onChange={(e) => update(values.map((d, i) => (i === idx ? { ...d, name: e.target.value } : d)))} placeholder="Name (optional)" className="h-7 min-w-0 flex-1 rounded-lg border border-[#d7e5df] bg-white px-2 text-xs outline-none focus:border-[#1f6a58]" />
              <select value={doc.visibility} onChange={(e) => update(values.map((d, i) => (i === idx ? { ...d, visibility: e.target.value } : d)))} className="h-7 rounded-lg border border-[#d7e5df] bg-white px-2 text-xs">
                <option value="public">public</option>
                <option value="private">private</option>
              </select>
              <label className="flex items-center gap-1 text-[10px] font-semibold text-[#52736a]"><input type="checkbox" checked={doc.downloadable} onChange={(e) => update(values.map((d, i) => (i === idx ? { ...d, downloadable: e.target.checked } : d)))} className="h-3 w-3" />Downloadable</label>
              <button type="button" onClick={() => update(values.filter((_, i) => i !== idx))} className="rounded-lg px-2 text-[10px] font-semibold text-[#b42318] hover:bg-[#fff6f5]">Remove</button>
            </div>
          </div>
        ))}
        {values.length === 0 ? <p className="text-xs text-[#7f9d94]">No documents yet - click + Add.</p> : null}
      </div>
    </div>
  );
}

const MAX_LESSON_FILE_SIZE_MB = 300;
const MAX_LESSON_FILE_BYTES = MAX_LESSON_FILE_SIZE_MB * 1024 * 1024;

function LessonFileDrop({
  label,
  accept,
  fileName,
  disabled = false,
  onFile,
}: {
  label: string;
  accept: string;
  fileName: string;
  disabled?: boolean;
  onFile: (file: File) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handleFile = (file: File | undefined) => {
    if (!file || disabled) return;
    setError(null);
    if (file.size > MAX_LESSON_FILE_BYTES) {
      setError(`${file.name} is larger than ${MAX_LESSON_FILE_SIZE_MB} MB.`);
      return;
    }
    onFile(file);
  };
  return (
    <div
      onDragOver={(event) => { event.preventDefault(); if (!disabled) setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => { event.preventDefault(); setIsDragging(false); if (disabled) return; try { handleFile(event.dataTransfer.files[0]); } catch (dropError) { setError(dropError instanceof Error ? dropError.message : "Unable to add file."); } }}
      className={`rounded-lg border border-dashed px-3 py-4 text-center text-xs transition-all duration-150 ${disabled ? "cursor-not-allowed opacity-60" : ""} ${isDragging ? "border-[#1f6a58] bg-[#effaf4] ring-2 ring-[#1f6a58]/20 shadow-sm" : "border-[#b9d3c8] bg-[#f9fcfa] hover:-translate-y-0.5 hover:border-[#1f6a58] hover:bg-[#effaf4] hover:shadow-md focus-within:border-[#1f6a58] focus-within:ring-2 focus-within:ring-[#1f6a58]/30"}`}
    >
      <input
        type="file"
        accept={accept}
        className="sr-only"
        disabled={disabled}
        id={`lesson-file-${label.toLowerCase().replace(/\s+/g, "-")}`}
        onChange={(event) => {
          handleFile(event.target.files?.[0]);
          event.currentTarget.value = "";
        }}
      />
      <label htmlFor={`lesson-file-${label.toLowerCase().replace(/\s+/g, "-")}`} className={`inline-flex rounded-full px-3 py-1 font-semibold transition-colors ${disabled ? "cursor-not-allowed text-[#7f9d94]" : "cursor-pointer text-[#1f6a58] hover:bg-[#1f6a58] hover:text-white hover:underline"}`}>
        {fileName || `Drop ${label.toLowerCase()} here or click to browse`}
      </label>
      <p className="mt-1 text-[10px] text-[#7f9d94]">Maximum file size: {MAX_LESSON_FILE_SIZE_MB} MB</p>
      {error ? <p role="alert" className="mt-1 text-[10px] font-semibold text-[#b42318]">{error}</p> : null}
    </div>
  );
}

function LessonDetail({ trainingId, sectionId, lessonId, trainingDeliveryMode, trainingLessonDefaults, imageUploadFieldKeys, onClose, canManage = true }: { trainingId: string; sectionId: string; lessonId: string; trainingDeliveryMode: string; trainingLessonDefaults: TrainingLessonDefaults; imageUploadFieldKeys: readonly string[]; onClose: () => void; canManage?: boolean }) {
  const { t } = useTranslation("enterpriseTrainings");
  const [editMode, setEditMode] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [lessonTypeValue, setLessonTypeValue] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [detailsSource, setDetailsSource] = useState<LessonDetailsSource>("new");
  const [meetingType, setMeetingType] = useState("google_meet");
  const [meetingLink, setMeetingLink] = useState("");
  const [joinUrl, setJoinUrl] = useState("");
  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [isDownloadable, setIsDownloadable] = useState(false);
  const [fileSize, setFileSize] = useState("");
  const [durationSeconds, setDurationSeconds] = useState("");
  const [isVideoUploadPending, setIsVideoUploadPending] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [lessonVideos, setLessonVideos] = useState<string[]>([]);
  const [lessonDocs, setLessonDocs] = useState<Array<{ url: string; name: string; visibility: string; downloadable: boolean }>>([]);
  const [lessonNotes, setLessonNotes] = useState<string[]>([]);
  const [ebookDraft, setEbookDraft] = useState<EbookDraft>(createEmptyEbookDraft());
  const [ebookBaseVersion, setEbookBaseVersion] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const durationCacheKey = JSON.stringify([trainingId, sectionId, lessonId]);

  const lessonQuery = useQuery({
    queryKey: ["trainings", trainingId, "lesson", sectionId, lessonId],
    queryFn: () => getTrainingLesson(trainingId, sectionId, lessonId),
    enabled: Boolean(trainingId && sectionId && lessonId),
  });

  const ebookQuery = useQuery({
    queryKey: ["trainings", trainingId, "ebook", sectionId, lessonId],
    queryFn: () => getTrainingEbook(trainingId, sectionId, lessonId, true),
    enabled: Boolean(trainingId && sectionId && lessonId && typeof lessonQuery.data === "object" && lessonQuery.data !== null && typeof (lessonQuery.data as Record<string, unknown>).type === "string" && toUiLessonType((lessonQuery.data as Record<string, unknown>).type as string) === "ebook"),
  });

  useEffect(() => {
    if (editMode || lessonQuery.isLoading || !lessonQuery.data) return;
    const lessonRecord = lessonQuery.data && typeof lessonQuery.data === "object" ? lessonQuery.data as Record<string, unknown> : {};
    const lessonContent = typeof lessonRecord.content === "string" ? lessonRecord.content : "";
    let lessonEbookContent: unknown = null;
    try { lessonEbookContent = lessonContent.trim() ? JSON.parse(lessonContent) as unknown : null; } catch { lessonEbookContent = null; }
    const hasPages = (value: unknown) => getEbookDocumentRecord(value).pages.length > 0;
    if (hasPages(ebookQuery.data)) setEbookDraft(normaliseEbookDraft(mergeLocalEbookOrder(ebookQuery.data, lessonEbookContent)));
    else if (hasPages(lessonEbookContent)) setEbookDraft(normaliseEbookDraft(lessonEbookContent));
    const version = extractEbookVersion(ebookQuery.data);
    if (version !== null) setEbookBaseVersion(version);
  }, [ebookQuery.data, editMode, lessonQuery.data, lessonQuery.isLoading]);

  useEffect(() => {
    const cachedDuration = lessonVideoDurationCache.get(durationCacheKey);
    if (cachedDuration) {
      setDurationSeconds(cachedDuration);
      return;
    }

    const lessonData = lessonQuery.data;
    if (!lessonData || typeof lessonData !== "object" || Array.isArray(lessonData)) return;
    const lessonRecord = lessonData as Record<string, unknown>;
    const videoUrl = typeof lessonRecord.content_url === "string" && lessonRecord.content_url.trim()
      ? lessonRecord.content_url
      : typeof lessonRecord.video_url === "string" ? lessonRecord.video_url : "";
    if (!videoUrl) return;
    const lessonType = typeof lessonRecord.type === "string" ? toUiLessonType(lessonRecord.type) : "";
    if (lessonType === "youtube" || getYouTubeEmbedUrl(videoUrl)) return;

    let isCurrentLesson = true;
    void readVideoDurationInSeconds(videoUrl)
      .then((duration) => {
        if (isCurrentLesson) {
          const exactDuration = String(duration);
          lessonVideoDurationCache.set(durationCacheKey, exactDuration);
          setDurationSeconds(exactDuration);
        }
      })
      .catch(() => {
        if (isCurrentLesson) setFeedback("Could not read the exact video duration. Showing the saved duration.");
      });

    return () => { isCurrentLesson = false; };
  }, [durationCacheKey, lessonQuery.data]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const videos = lessonVideos.filter((v) => v.trim() !== "");
      const notes = lessonNotes.filter((n) => n.trim() !== "");
      const docs = lessonDocs.filter((d) => d.url.trim() !== "");
      if ((lessonTypeValue === "live" || lessonTypeValue === "venue")
        && toDateTimeLocalValue(scheduledAt) !== toDateTimeLocalValue(lessonScheduledAt)
        && !isLessonScheduleWithinTraining(scheduledAt, trainingLessonDefaults)) {
        throw new Error("Set the Training start and end dates first, then choose a lesson date and time within that range.");
      }
      const lessonUpdate = await updateTrainingLesson(trainingId, sectionId, lessonId, {
        title: title.trim(),
        content: lessonTypeValue === "ebook" ? JSON.stringify(toEbookDocument(ebookDraft)) : content.trim(),
        type: lessonTypeValue.trim() ? toApiLessonType(lessonTypeValue.trim()) : undefined,
        duration: lessonTypeValue === "video" ? toDurationMinutesFromSeconds(durationSeconds) : undefined,
        duration_minutes: null,
        content_url: videoUrl.trim() || undefined,
        video_url: null,
        ...(lessonTypeValue === "live" ? {
          scheduled_at: scheduledAt || undefined,
          meeting_type: detailsSource === "existing" ? getMeetingTypeFromProvider(trainingLessonDefaults.meetingProvider) : meetingType,
          meeting_link: (detailsSource === "existing" ? trainingLessonDefaults.meetingLink : meetingLink).trim() || undefined,
          join_meta: (detailsSource === "existing" ? trainingLessonDefaults.deliveryInstructions : joinUrl).trim() || undefined,
          join_url: null,
        } : {}),
        ...(lessonTypeValue === "venue" ? {
          scheduled_at: scheduledAt || undefined,
          venue_name: (detailsSource === "existing" ? trainingLessonDefaults.venue : venueName).trim() || undefined,
          venue_address: (detailsSource === "existing" ? trainingLessonDefaults.address : venueAddress).trim() || undefined,
        } : {}),
        is_downloadable: isDownloadable,
        file_size: fileSize.trim() || undefined,
        is_preview: isPreview,
        videos: videos.length ? videos : undefined,
        notes: notes.length ? notes : undefined,
        documents: docs.length ? docs.map((d) => ({ url: d.url.trim(), name: d.name.trim() || d.url.trim().split("/").pop() || "document", visibility: d.visibility, downloadable: d.downloadable })) : undefined,
      } as unknown as Record<string, unknown>);
      if (lessonTypeValue === "ebook") {
        const savedEbook = await saveTrainingEbookDraft(trainingId, sectionId, lessonId, toEbookDocument(ebookDraft, ebookBaseVersion));
        setEbookBaseVersion(savedEbook.version);
      }
      return lessonUpdate;
    },
    onSuccess: () => {
      const exactDuration = Number(durationSeconds);
      if (lessonTypeValue === "video" && Number.isFinite(exactDuration) && exactDuration > 0) {
        lessonVideoDurationCache.set(durationCacheKey, durationSeconds);
      }
      setFeedback("Lesson updated.");
      setEditMode(false);
      void queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "lesson", sectionId, lessonId] });
      void queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "sections"] });
    },
    onError: (error) => setFeedback(error instanceof Error ? error.message : "Unable to update lesson."),
  });

  const lesson = (lessonQuery.data ?? {}) as Record<string, unknown>;
  const lessonTitle = typeof lesson.title === "string" ? lesson.title : "";
  const lessonContent = typeof lesson.content === "string" ? lesson.content : "";
  const lessonVideoUrl = typeof lesson.content_url === "string" && lesson.content_url.trim() ? lesson.content_url : typeof lesson.video_url === "string" ? lesson.video_url : "";
  const lessonType = typeof lesson.type === "string" && lesson.type.trim() ? toUiLessonType(lesson.type) : "";
  const ebookContentRecord = (() => {
    if (!lessonContent.trim()) return null;
    try {
      return JSON.parse(lessonContent) as unknown;
    } catch {
      return null;
    }
  })();
  const ebookPreview = lessonType === "ebook" ? normaliseEbookDraft(mergeLocalEbookOrder(ebookQuery.data, ebookContentRecord)) : null;
  const ebookRecord = ebookQuery.data && typeof ebookQuery.data === "object" ? ebookQuery.data as Record<string, unknown> : {};
  const ebookNestedRecord = ebookRecord.ebook && typeof ebookRecord.ebook === "object" ? ebookRecord.ebook as Record<string, unknown> : {};
  const ebookStatus = typeof ebookRecord.status === "string" ? ebookRecord.status : typeof ebookNestedRecord.status === "string" ? ebookNestedRecord.status : "draft";
  const ebookIsPendingApproval = lessonType === "ebook" && ebookStatus === "pending_approval";
  const lessonScheduledAt = typeof lesson.scheduled_at === "string" ? lesson.scheduled_at : "";
  const lessonMeetingType = typeof lesson.meeting_type === "string" && lesson.meeting_type ? lesson.meeting_type : "google_meet";
  const lessonMeetingLink = typeof lesson.meeting_link === "string" ? lesson.meeting_link : "";
  const lessonJoinInstructions = typeof lesson.join_meta === "string" ? lesson.join_meta : "";
  const lessonJoinUrl = typeof lesson.join_meta === "string" && lesson.join_meta.trim() ? lesson.join_meta : typeof lesson.join_url === "string" ? lesson.join_url : "";
  const lessonVenueName = typeof lesson.venue_name === "string" ? lesson.venue_name : "";
  const lessonVenueAddress = typeof lesson.venue_address === "string" ? lesson.venue_address : "";
  const lessonIsDownloadable = lesson.is_downloadable === true;
  const lessonFileSize = typeof lesson.file_size === "number" ? String(lesson.file_size) : typeof lesson.file_size === "string" ? lesson.file_size : "";
  const formattedLessonFileSize = formatLessonFileSize(lessonFileSize);
  const lessonDuration = typeof lesson.duration === "number" ? String(lesson.duration) : typeof lesson.duration === "string" ? lesson.duration : typeof lesson.duration_minutes === "number" ? String(lesson.duration_minutes) : "";
  const lessonIsPreview = lesson.is_preview === true;
  const lessonVideosInit = Array.isArray(lesson.videos) ? (lesson.videos as unknown[]).filter((v): v is string => typeof v === "string") : [];
  const lessonDocsInit = Array.isArray(lesson.documents) ? (lesson.documents as unknown[]).map((d) => { if (typeof d === "string" && d.trim()) return { url: d, name: "", visibility: "public", downloadable: true }; if (d && typeof d === "object") { const r = d as Record<string, unknown>; if (typeof r.url === "string") return { url: r.url, name: typeof r.name === "string" ? r.name : typeof r.title === "string" ? r.title : "", visibility: typeof r.visibility === "string" ? r.visibility : "public", downloadable: typeof r.downloadable === "boolean" ? r.downloadable : true }; } return null; }).filter((v): v is { url: string; name: string; visibility: string; downloadable: boolean } => v !== null) : [];
  const lessonNotesInit = Array.isArray(lesson.notes) ? (lesson.notes as unknown[]).filter((n): n is string => typeof n === "string") : [];
  const availableLessonTypes = getLessonTypeOptions(trainingDeliveryMode);
  if (lessonType === "document" && !availableLessonTypes.some((option) => option.value === "document")) {
    availableLessonTypes.push({ value: "document", label: "Document (existing)" });
  }
  const selectedLessonType = availableLessonTypes.some((option) => option.value === lessonTypeValue) ? lessonTypeValue : "";

  useEffect(() => {
    if (ebookIsPendingApproval && editMode) setEditMode(false);
  }, [ebookIsPendingApproval, editMode]);

  useEffect(() => {
    if (!lessonQuery.data || editMode) return;
    {
      setTitle(lessonTitle);
      setContent(lessonContent);
      setVideoUrl(lessonVideoUrl);
      setLessonTypeValue(toUiLessonType(lessonType));
      setScheduledAt(toDateTimeLocalValue(lessonScheduledAt));
      setMeetingType(lessonMeetingType);
      setMeetingLink(lessonMeetingLink);
      setJoinUrl(lessonJoinUrl);
      setVenueName(lessonVenueName);
      setVenueAddress(lessonVenueAddress);
      const lessonMatchesExistingDefaults = lessonType === "live"
        ? Boolean((!trainingLessonDefaults.meetingLink || lessonMeetingLink === trainingLessonDefaults.meetingLink)
          && (!trainingLessonDefaults.meetingProvider || lessonMeetingType === getMeetingTypeFromProvider(trainingLessonDefaults.meetingProvider)))
        : lessonType === "venue"
          ? Boolean((!trainingLessonDefaults.venue || lessonVenueName === trainingLessonDefaults.venue)
            && (!trainingLessonDefaults.address || lessonVenueAddress === trainingLessonDefaults.address))
          : false;
      setDetailsSource(lessonMatchesExistingDefaults && hasExistingLessonDetails(lessonType as "live" | "venue", trainingLessonDefaults) ? "existing" : "new");
      setIsDownloadable(lessonIsDownloadable);
      setFileSize(lessonFileSize);
      setDurationSeconds(lessonVideoDurationCache.get(durationCacheKey) ?? (lessonDuration ? String(Number(lessonDuration) * 60) : ""));
      setIsPreview(lessonIsPreview);
      if (lessonVideosInit.length) setLessonVideos(lessonVideosInit);
      if (lessonDocsInit.length) setLessonDocs(lessonDocsInit);
      if (lessonNotesInit.length) setLessonNotes(lessonNotesInit);
    }
  }, [
    lessonQuery.data,
    editMode,
    title,
    content,
    videoUrl,
    lessonTypeValue,
    meetingLink,
    joinUrl,
    fileSize,
    durationSeconds,
    lessonVideos.length,
    lessonDocs.length,
    lessonNotes.length,
    lessonTitle,
    lessonContent,
    lessonVideoUrl,
    lessonType,
    lessonScheduledAt,
    lessonMeetingType,
    lessonMeetingLink,
    lessonJoinUrl,
    lessonVenueName,
    lessonVenueAddress,
    trainingLessonDefaults,
    lessonIsDownloadable,
    lessonFileSize,
    durationCacheKey,
    lessonDuration,
    lessonIsPreview,
    lessonVideosInit,
    lessonDocsInit,
    lessonNotesInit,
  ]);

  if (lessonQuery.isLoading) return <p className="text-xs text-[#52736a]">Loading lesson...</p>;
  if (lessonQuery.isError) return <p className="text-xs font-semibold text-[#b42318]">{(lessonQuery.error as Error).message}</p>;

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-[#cfe1d8] bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6efea] bg-[#f4faf6] px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-[.08em] text-[#7f9d94]">Lesson Detail - Videos  |  PDF  |  Notes</p>
        <div className="flex gap-1">
          {canManage && !ebookIsPendingApproval ? <button type="button" onClick={() => { if (!editMode) setFeedback(null); setEditMode(!editMode); }} className="rounded-full border border-[#1f6a58] px-2 py-0.5 text-[10px] font-bold text-[#1f6a58]">{editMode ? "Cancel" : "Edit"}</button> : ebookIsPendingApproval ? <span className="rounded-full bg-[#fff4d6] px-3 py-1 text-[10px] font-bold text-[#8a5a00]">Pending approval</span> : null}
          <button type="button" onClick={onClose} className="rounded-full border border-[#d7e5df] px-2 py-0.5 text-[10px] font-bold text-[#52736a]">Close</button>
        </div>
      </div>
      {feedback ? <p role="status" className="mx-5 mt-4 rounded-xl bg-[#effaf4] px-4 py-3 text-sm font-semibold text-[#167550]">{feedback}</p> : null}
      {editMode ? (
        <div className="space-y-4 p-5">
          <label className="block text-xs font-bold text-[#284940]">Lesson title<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter a clear lesson title" className="mt-2 h-11 w-full rounded-xl border border-[#d7e5df] bg-[#fbfdfb] px-4 text-sm font-normal outline-none transition focus:border-[#1f6a58] focus:ring-2 focus:ring-[#1f6a58]/10" /></label>
          <label className="block text-xs font-bold text-[#284940]">Lesson type<select required value={selectedLessonType} onChange={(e) => setLessonTypeValue(e.target.value)} aria-label="Lesson type" className="mt-2 h-11 w-full rounded-xl border border-[#d7e5df] bg-[#fbfdfb] px-4 text-sm font-normal outline-none transition focus:border-[#1f6a58] focus:ring-2 focus:ring-[#1f6a58]/10">
            <option value="" disabled>{lessonTypeValue ? "Choose an allowed lesson type" : "Lesson type - select"}</option>
            {availableLessonTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select></label>
          {isLessonType(lessonTypeValue, "text", "notes") ? <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Topic content..." rows={4} className="w-full rounded-lg border border-[#d7e5df] px-3 py-2 text-xs outline-none focus:border-[#1f6a58]" /> : null}
          {lessonTypeValue === "ebook" ? <div className="rounded-xl border border-[#b7d5c8] bg-[#f4fbf6] p-3"><p className="text-xs font-bold text-[#06201c]">eBook lesson</p><p className="mt-1 text-[11px] leading-5 text-[#52736a]">Upload an EPUB or PDF, or continue authoring chapters in the Course Builder.</p><LessonFileDrop label="eBook file" accept=".epub,.pdf,application/epub+zip,application/pdf" fileName={lessonDocs.length > 0 ? "Replace eBook file or keep the current file" : ""} onFile={(file) => { setFeedback(null); void uploadTrainingMedia(file, "lesson_document").then((uploaded) => { setLessonDocs((current) => [...current, { url: uploaded.url, name: uploaded.name, visibility: "public", downloadable: true }]); setFileSize(String(uploaded.size)); setFeedback("eBook uploaded. Save the lesson to apply it."); }).catch((error: Error) => setFeedback(error.message)); }} /></div> : null}
          {lessonTypeValue === "ebook" ? <><EbookCompleteEditor draft={ebookDraft} onChange={setEbookDraft} imageUploadFieldKeys={imageUploadFieldKeys} /><EbookValidationActions trainingId={trainingId} sectionId={sectionId} lessonId={lessonId} draft={ebookDraft} baseVersion={ebookBaseVersion} onBaseVersionChange={setEbookBaseVersion} status={ebookStatus} isPublished={(typeof ebookRecord.published_version === "number" && ebookRecord.published_version > 0) || (typeof ebookNestedRecord.published_version === "number" && ebookNestedRecord.published_version > 0)} onStatusChanged={() => { void ebookQuery.refetch(); }} /></> : null}
          {lessonTypeValue === "video" ? (
            <>
              <LessonFileDrop
                label="Video"
                accept="video/*"
                fileName={videoUrl ? "Replace video file or keep the current URL" : ""}
                disabled={isVideoUploadPending}
                onFile={(file) => {
                  setFeedback(null);
                  setIsVideoUploadPending(true);
                  void readVideoDurationInSeconds(file)
                    .then((videoDuration) => uploadTrainingMedia(file, "lesson_video").then((uploaded) => {
                      setVideoUrl(uploaded.url);
                      setFileSize(String(uploaded.size));
                      setDurationSeconds(String(videoDuration));
                      setFeedback("Video uploaded and its duration detected. Save the lesson to apply it.");
                    }))
                    .catch((error: Error) => setFeedback(error.message))
                    .finally(() => setIsVideoUploadPending(false));
                }}
              />
              {videoUrl ? <LessonMediaPreview url={videoUrl} name={videoUrl.split("/").pop() || "Lesson video"} kind="video" /> : null}
              <LessonDuration value={durationSeconds} />
            </>
          ) : null}
          {isLessonType(lessonTypeValue, "video", "youtube") ? <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder={lessonTypeValue === "youtube" ? "Paste YouTube link" : "Video URL https://..."} className="h-8 w-full rounded-lg border border-[#d7e5df] px-3 text-xs outline-none focus:border-[#1f6a58]" /> : null}
          {lessonTypeValue === "live" || lessonTypeValue === "venue" ? (
            <LessonScheduleFields
              type={lessonTypeValue}
              defaults={trainingLessonDefaults}
              source={detailsSource}
              setSource={setDetailsSource}
              scheduledAt={scheduledAt}
              setScheduledAt={(value) => { setScheduledAt(value); setScheduleError(null); }}
              scheduleError={scheduleError}
              meetingType={meetingType}
              setMeetingType={setMeetingType}
              meetingLink={meetingLink}
              setMeetingLink={setMeetingLink}
              joinUrl={joinUrl}
              setJoinUrl={setJoinUrl}
              venueName={venueName}
              setVenueName={setVenueName}
              venueAddress={venueAddress}
              setVenueAddress={setVenueAddress}
            />
          ) : null}
          {lessonTypeValue === "video" ? <LessonUrlList label="Videos" values={lessonVideos} update={setLessonVideos} placeholder="Additional video URL https://..." previewKind="video" /> : null}
          {lessonTypeValue === "pdf" || lessonTypeValue === "document" ? (
            <>
              <LessonDocsList values={lessonDocs} update={setLessonDocs} showPreview={lessonTypeValue !== "pdf"} />
              <LessonFileDrop
                label={lessonTypeValue === "pdf" ? "PDF" : "Document"}
                accept={lessonTypeValue === "pdf" ? "application/pdf,.pdf" : ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.rtf,application/pdf,text/plain"}
                fileName={lessonDocs.length > 0 ? "Add another PDF file" : ""}
                onFile={(file) => {
                  setFeedback(null);
                  void uploadTrainingMedia(file, lessonTypeValue === "pdf" ? "lesson_pdf" : "lesson_document")
                    .then((uploaded) => {
                      setLessonDocs((current) => [...current, { url: uploaded.url, name: uploaded.name, visibility: "public", downloadable: true }]);
                      setFileSize(String(uploaded.size));
                      setFeedback("PDF uploaded. Save the lesson to apply it.");
                    })
                    .catch((error: Error) => setFeedback(error.message));
                }}
              />
            </>
          ) : null}
          {lessonTypeValue === "notes" ? (
            <>
              <LessonUrlList label="Notes" values={lessonNotes} update={setLessonNotes} placeholder="Note URL / link https://..." previewKind="document" />
              <LessonFileDrop
                label="note"
                accept=".txt,.md,.rtf,text/plain,text/markdown"
                fileName={lessonNotes.length > 0 ? "Add another note file" : ""}
                onFile={(file) => {
                  setFeedback(null);
                  void uploadTrainingMedia(file, "lesson_document")
                    .then((uploaded) => {
                      setLessonNotes((current) => [...current, uploaded.url]);
                      setFileSize(String(uploaded.size));
                      setFeedback("Note uploaded. Save the lesson to apply it.");
                    })
                    .catch((error: Error) => setFeedback(error.message));
                }}
              />
            </>
          ) : null}
          {isLessonType(lessonTypeValue, "video", "pdf", "document", "notes", "ebook") ? (
            <div className="flex gap-4">
              <label className="flex items-center gap-1 text-xs font-semibold text-[#06201c]"><input type="checkbox" checked={isPreview} onChange={(e) => setIsPreview(e.target.checked)} className="h-3 w-3" />Is preview</label>
              <label className="flex items-center gap-1 text-xs font-semibold text-[#06201c]"><input type="checkbox" checked={isDownloadable} onChange={(e) => setIsDownloadable(e.target.checked)} className="h-3 w-3" />Is downloadable</label>
            </div>
          ) : null}
          {isLessonType(lessonTypeValue, "video", "pdf", "document", "notes", "ebook") ? <LessonFileSize value={fileSize} /> : null}
          {isLessonType(lessonTypeValue, "quiz") ? <p className="rounded-lg bg-[#f9fcfa] px-3 py-2 text-xs text-[#52736a]">After saving, use the quiz panel to attach or create questions.</p> : null}
          <p className="text-[10px] text-[#7f9d94]">Only fields for the selected lesson type are shown.</p>
          <button type="button" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending || isVideoUploadPending || ebookIsPendingApproval || !title.trim() || !selectedLessonType || ((lessonTypeValue === "live" || lessonTypeValue === "venue") && (!scheduledAt || (detailsSource === "new" && (lessonTypeValue === "live" ? !meetingLink.trim() : !venueName.trim() || !venueAddress.trim()))))} className="h-8 rounded-full bg-[#1f6a58] px-4 text-xs font-bold text-white disabled:opacity-60">{updateMutation.isPending ? "Saving..." : "Save"}</button>
        </div>
      ) : (
        <div className="space-y-4 p-5">
          <p className="text-sm font-bold text-[#06201c]">{lessonTitle || "Untitled"}</p>
          {lessonVideoUrl && lessonType === "youtube" ? (
            <a href={lessonVideoUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[#1f6a58] underline">
              Open YouTube lesson
            </a>
          ) : lessonVideoUrl ? <LessonMediaPreview url={lessonVideoUrl} name={lessonVideoUrl.split("/").pop() || "Lesson video"} kind="video" /> : null}
          {lessonType === "live" ? <p className="text-xs text-[#52736a]">{t("lessonScheduling.provider", { defaultValue: "Meeting provider" })}: {humanizeLabel(lessonMeetingType)}</p> : null}
          {lessonMeetingLink ? <p className="text-xs text-[#52736a]">{t("lessonScheduling.meetingLink", { defaultValue: "Meeting link" })}: <a href={lessonMeetingLink} className="text-[#1f6a58] underline">{lessonMeetingLink}</a></p> : null}
          {lessonJoinInstructions ? <p className="whitespace-pre-wrap text-xs text-[#52736a]">{t("lessonScheduling.joinInstructions", { defaultValue: "Join instructions" })}: {lessonJoinInstructions}</p> : null}
          {lessonType === "venue" && lessonVenueName ? <p className="text-xs text-[#52736a]">{t("lessonScheduling.venue", { defaultValue: "Venue" })}: {lessonVenueName}</p> : null}
          {lessonType === "venue" && lessonVenueAddress ? <p className="text-xs text-[#52736a]">{t("lessonScheduling.address", { defaultValue: "Address" })}: {lessonVenueAddress}</p> : null}
          {lessonScheduledAt ? <p className="text-xs text-[#52736a]">{t("lessonScheduling.scheduled", { defaultValue: "Scheduled" })}: {formatLessonScheduledAt(lessonScheduledAt)}</p> : null}
          {lessonType ? <p className="text-[10px] font-bold uppercase tracking-[.08em] text-[#7f9d94]">{lessonType}</p> : null}
          {lessonVideosInit.length > 0 ? <div><p className="text-[10px] font-bold uppercase tracking-[.08em] text-[#7f9d94]">Videos</p>{lessonVideosInit.map((videoUrl, index) => <LessonMediaPreview key={`${videoUrl}-${index}`} url={videoUrl} name={videoUrl.split("/").pop() || "Lesson video"} kind="video" />)}</div> : null}
          {lessonDocsInit.length > 0 ? <div><p className="text-[10px] font-bold uppercase tracking-[.08em] text-[#7f9d94]">Documents</p>{lessonDocsInit.map((document, index) => <div key={`${document.url}-${index}`}><LessonMediaPreview url={document.url} name={document.name || document.url.split("/").pop() || "Lesson document"} kind="document" showPreview={lessonType !== "pdf"} /><p className="text-[10px] text-[#52736a]">{document.visibility === "private" ? "Private" : "Public"}{document.downloadable ? "  |  downloadable" : ""}</p></div>)}</div> : null}
          {lessonNotesInit.length > 0 ? <div><p className="text-[10px] font-bold uppercase tracking-[.08em] text-[#7f9d94]">Notes</p>{lessonNotesInit.map((noteUrl, index) => <LessonMediaPreview key={`${noteUrl}-${index}`} url={noteUrl} name={noteUrl.split("/").pop() || "Lesson note"} kind="document" />)}</div> : null}
          <p className="text-xs text-[#7f9d94]">{lessonIsPreview ? "Preview  |  " : ""}{lessonIsDownloadable ? "Downloadable" : "Not downloadable"}{lessonDuration ? `  |  ${lessonType === "video" ? formatVideoDurationSeconds(durationSeconds) || formatLessonDuration(lessonDuration) : formatLessonDuration(lessonDuration)}` : ""}{formattedLessonFileSize ? `  |  ${formattedLessonFileSize}` : ""}</p>
          {lessonType === "ebook" && ebookPreview ? (
            <div className="rounded-xl border border-[#d7e5df] bg-[#f8fcf9] p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[#06201c]">eBook content</p>
                  <p className="mt-1 text-xs text-[#52736a]">
                    {ebookPreview.pages.length} {ebookPreview.pages.length === 1 ? "page" : "pages"}  |  Completion: {humanizeLabel(ebookPreview.completionRule)}
                  </p>
                </div>
                {!ebookIsPendingApproval ? <button type="button" onClick={() => { setFeedback(null); setEditMode(true); }} className="rounded-full border border-[#1f6a58] px-3 py-1.5 text-[11px] font-bold text-[#1f6a58]">Open eBook editor</button> : null}
              </div>
              {ebookIsPendingApproval ? <EbookPendingActions trainingId={trainingId} sectionId={sectionId} lessonId={lessonId} onWithdrawn={() => { void ebookQuery.refetch(); setFeedback("eBook submission withdrawn. You can now edit and resubmit it."); }} /> : null}
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-[#52736a]">
                <span className="rounded-full bg-white px-2.5 py-1">Bookmarks {ebookPreview.allowBookmarks ? "enabled" : "disabled"}</span>
                <span className="rounded-full bg-white px-2.5 py-1">Notes {ebookPreview.allowNotes ? "enabled" : "disabled"}</span>
              </div>
              <p className="mt-3 text-xs text-[#52736a]">{ebookPreview.pages[0]?.title || "Untitled page"}{ebookPreview.pages.length > 1 ? ` and ${ebookPreview.pages.length - 1} more` : ""}</p>
            </div>
          ) : lessonContent ? <p className="whitespace-pre-wrap text-xs leading-5 text-[#52736a]">{lessonContent}</p> : <p className="text-xs text-[#7f9d94]">No content.</p>}
        </div>
      )}
    </div>
  );
}

type EbookBlock = { id: number; type: "text" | "heading" | "quote" | "image" | "video" | "audio" | "pdf" | "link"; content: string; url: string; altText: string; caption: string; imageSize?: string; imageFit?: "cover" | "contain"; imagePosition?: string; assetId?: string };
type EbookPageDraft = { id: number; title: string; content: string; blocks: EbookBlock[] };
type EbookDraft = { subtitle: string; author: string; description: string; coverUrl: string; sourceUrl: string; pages: EbookPageDraft[]; completionRule: "read_to_end" | "opened" | "manual"; allowBookmarks: boolean; allowNotes: boolean; allowDownload: boolean; transcriptRequired: boolean };

function createEmptyEbookDraft(): EbookDraft { return { subtitle: "", author: "", description: "", coverUrl: "", sourceUrl: "", pages: [{ id: 1, title: "Page 1", content: "", blocks: [] }], completionRule: "read_to_end", allowBookmarks: true, allowNotes: true, allowDownload: false, transcriptRequired: false }; }
function getEbookDocumentRecord(value: unknown): Record<string, unknown> & { pages: unknown[] } {
  const record = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const candidates = [record, record.ebook, record.draft, record.data];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue;
    const document = candidate as Record<string, unknown>;
    if (Array.isArray(document.pages)) return document as Record<string, unknown> & { pages: unknown[] };
    const nested = document.ebook;
    if (nested && typeof nested === "object" && !Array.isArray(nested) && Array.isArray((nested as Record<string, unknown>).pages)) {
      return nested as Record<string, unknown> & { pages: unknown[] };
    }
  }
  return { pages: [] };
}
function getEbookImageProxyUrl(assetId: string): string {
  // Always resolve protected media through the Enterprise app proxy. Server
  // URLs can point at another environment/origin and the proxy validates them;
  // passing those URLs through can make an otherwise valid asset return 400.
  return `/api/v1/media/${encodeURIComponent(assetId)}/file`;
}
function normaliseEbookImagePosition(value: unknown): string {
  const position = typeof value === "string" ? value.trim().toLowerCase().replace(/\s+/g, " ") : "";
  const aliases: Record<string, string> = {
    "center center": "center",
    "top center": "top",
    "bottom center": "bottom",
    "center left": "left",
    "center right": "right",
  };
  const normalised = aliases[position] ?? position;
  return ["center", "top", "bottom", "left", "right", "top left", "top right", "bottom left", "bottom right"].includes(normalised)
    ? normalised
    : "center";
}
function createEbookImageMarkup(imageValue: unknown, index: number): string {
  if (!imageValue || typeof imageValue !== "object" || Array.isArray(imageValue)) return "";
  const imageRecord = imageValue as Record<string, unknown>;
  const assetId = typeof imageRecord.asset_id === "string" ? imageRecord.asset_id : typeof imageRecord.assetId === "string" ? imageRecord.assetId : "";
  if (!assetId) return "";
  const image = document.createElement("img");
  const imageUrl = getEbookImageProxyUrl(assetId);
  image.src = imageUrl;
  image.dataset.assetId = assetId;
  image.dataset.assetUrl = imageUrl;
  image.dataset.caption = typeof imageRecord.caption === "string" ? imageRecord.caption : "";
  image.alt = typeof imageRecord.alt_text === "string" ? imageRecord.alt_text : typeof imageRecord.altText === "string" ? imageRecord.altText : "";
  Object.assign(image.style, {
    maxWidth: "100%",
    width: imageRecord.width === "small" ? "45%" : imageRecord.width === "medium" ? "70%" : "100%",
    height: imageRecord.fit === "cover" ? "260px" : "auto",
    objectFit: imageRecord.fit === "cover" ? "cover" : "contain",
    objectPosition: normaliseEbookImagePosition(imageRecord.position),
    display: "block",
    margin: "16px 0",
  });
  image.dataset.order = String(index);
  return image.outerHTML;
}
function normaliseEbookDraft(value: unknown): EbookDraft {
  const source = getEbookDocumentRecord(value);
  const rawPages = source.pages;
  const pages = rawPages.map((page, index) => {
    const pageRecord = page && typeof page === "object" && !Array.isArray(page) ? page as Record<string, unknown> : {};
    const images = Array.isArray(pageRecord.images) ? pageRecord.images : [];
    const imageAssetIds = images.map((image) => {
      if (!image || typeof image !== "object" || Array.isArray(image)) return undefined;
      const imageRecord = image as Record<string, unknown>;
      return typeof imageRecord.asset_id === "string" ? imageRecord.asset_id : undefined;
    });
    const rawContent = typeof pageRecord.content_html === "string" ? pageRecord.content_html : typeof pageRecord.content === "string" ? pageRecord.content : "";
    const orderedBlocks = Array.isArray(pageRecord.blocks) ? pageRecord.blocks : [];
    const content = typeof DOMParser === "undefined" ? rawContent : (() => {
      const document = new DOMParser().parseFromString(rawContent, "text/html");
      const imagesById = new Map(images.flatMap((image) => {
        if (!image || typeof image !== "object" || Array.isArray(image)) return [];
        const imageRecord = image as Record<string, unknown>;
        return typeof imageRecord.id === "string" ? [[imageRecord.id, imageRecord] as const] : [];
      }));
      document.querySelectorAll<HTMLElement>("[data-image-id]").forEach((placeholder) => {
        const imageRecord = imagesById.get(placeholder.dataset.imageId ?? "");
        if (!imageRecord) return;
        const template = document.createElement("template");
        template.innerHTML = createEbookImageMarkup(imageRecord, images.indexOf(imageRecord));
        const image = template.content.firstElementChild;
        if (image) placeholder.replaceWith(image);
      });
      document.querySelectorAll<HTMLImageElement>("img").forEach((image, imageIndex) => {
        const assetId = image.dataset.assetId || imageAssetIds[imageIndex];
        if (!assetId) return;
        const imageRecord = images[imageIndex] && typeof images[imageIndex] === "object" && !Array.isArray(images[imageIndex])
          ? images[imageIndex] as Record<string, unknown>
          : {};
        const mediaUrl = getEbookImageProxyUrl(assetId);
        image.dataset.assetId = assetId;
        image.dataset.assetUrl = mediaUrl;
        image.src = mediaUrl;
      });
      if (orderedBlocks.length > 0) {
        const orderedContent = orderedBlocks.map((block, blockIndex) => {
          if (!block || typeof block !== "object" || Array.isArray(block)) return "";
          const blockRecord = block as Record<string, unknown>;
          if (blockRecord.type === "image") return createEbookImageMarkup(blockRecord, blockIndex);
          const blockContent = typeof blockRecord.content_html === "string" ? blockRecord.content_html : typeof blockRecord.content === "string" ? blockRecord.content : "";
          return blockContent;
        }).join("");
        const representedAssetIds = new Set(orderedBlocks.flatMap((block) => {
          if (!block || typeof block !== "object" || Array.isArray(block)) return [];
          const blockRecord = block as Record<string, unknown>;
          return blockRecord.type === "image" && typeof blockRecord.asset_id === "string" ? [blockRecord.asset_id] : [];
        }));
        const trailingImages = images.flatMap((image) => {
          if (!image || typeof image !== "object" || Array.isArray(image)) return [];
          const imageRecord = image as Record<string, unknown>;
          return typeof imageRecord.asset_id === "string" && !representedAssetIds.has(imageRecord.asset_id) ? [createEbookImageMarkup(imageRecord, images.indexOf(image))] : [];
        });
        return orderedContent + trailingImages.join("");
      }
      const existingAssetIds = new Set(Array.from(document.querySelectorAll<HTMLImageElement>("img")).flatMap((image) => image.dataset.assetId ? [image.dataset.assetId] : []));
      images.forEach((image, imageIndex) => {
        if (!image || typeof image !== "object" || Array.isArray(image)) return;
        const imageRecord = image as Record<string, unknown>;
        const assetId = typeof imageRecord.asset_id === "string" ? imageRecord.asset_id : imageAssetIds[imageIndex];
        if (!assetId || existingAssetIds.has(assetId)) return;
        const element = document.createElement("img");
        const mediaUrl = getEbookImageProxyUrl(assetId);
        element.src = mediaUrl;
        element.dataset.assetId = assetId;
        element.dataset.assetUrl = mediaUrl;
        element.alt = typeof imageRecord.alt_text === "string" ? imageRecord.alt_text : "";
        Object.assign(element.style, {
          maxWidth: "100%",
          width: imageRecord.width === "small" ? "45%" : imageRecord.width === "medium" ? "70%" : "100%",
          height: imageRecord.fit === "cover" ? "260px" : "auto",
          objectFit: imageRecord.fit === "cover" ? "cover" : "contain",
          objectPosition: normaliseEbookImagePosition(imageRecord.position),
          display: "block",
          margin: "16px 0",
        });
        const order = typeof imageRecord.order === "number" ? imageRecord.order : typeof imageRecord.index === "number" ? imageRecord.index : null;
        const orderedChildren = Array.from(document.body.children);
        if (order !== null && order >= 0 && order <= orderedChildren.length) {
          document.body.insertBefore(element, orderedChildren[order] ?? null);
        } else {
          document.body.appendChild(element);
        }
        existingAssetIds.add(assetId);
      });
      return document.body.innerHTML;
    })();
    const blocks = images.map((image, imageIndex) => {
      const imageRecord = image && typeof image === "object" && !Array.isArray(image) ? image as Record<string, unknown> : {};
      const assetId = typeof imageRecord.asset_id === "string" ? imageRecord.asset_id : undefined;
      return { id: imageIndex + 1, type: "image" as const, content: "", url: assetId ? getEbookImageProxyUrl(assetId) : typeof imageRecord.url === "string" ? imageRecord.url : "", altText: typeof imageRecord.alt_text === "string" ? imageRecord.alt_text : "", caption: typeof imageRecord.caption === "string" ? imageRecord.caption : "", imageSize: imageRecord.width === "small" || imageRecord.width === "medium" || imageRecord.width === "large" || imageRecord.width === "full" ? imageRecord.width : "full", imageFit: imageRecord.fit === "cover" ? "cover" as const : "contain" as const, imagePosition: normaliseEbookImagePosition(imageRecord.position), assetId };
    });
    return { id: typeof pageRecord.id === "string" ? Number.parseInt(pageRecord.id.replace(/\D/g, ""), 10) || index + 1 : index + 1, title: typeof pageRecord.title === "string" ? pageRecord.title : `Page ${index + 1}`, content, blocks };
  });
  const empty = createEmptyEbookDraft();
  return { subtitle: typeof source.subtitle === "string" ? source.subtitle : "", author: typeof source.author === "string" ? source.author : "", description: typeof source.description === "string" ? source.description : "", coverUrl: typeof source.cover_url === "string" ? source.cover_url : "", sourceUrl: typeof source.source_url === "string" ? source.source_url : "", pages: pages.length ? pages : empty.pages, completionRule: source.completion_rule === "opened" || source.completion_rule === "manual" ? source.completion_rule : "read_to_end", allowBookmarks: source.allow_bookmarks !== false, allowNotes: source.allow_notes !== false, allowDownload: source.allow_download === true, transcriptRequired: source.transcript_required === true };
}

type EbookSerializedBlock = { type: "text"; content_html: string } | { type: "image"; id: string; asset_id: string; alt_text: string; caption: string | null; width: string; fit: "cover" | "contain"; aspect_ratio: string; position: string; decorative: false; placement: "inline" | "after_content" };

function serializeEbookBlocks(content: string, fallbackImages: EbookBlock[], pageKey: string): EbookSerializedBlock[] {
  if (typeof DOMParser === "undefined") return [];
  const contentDocument = new DOMParser().parseFromString(content, "text/html");
  // Lists are sent as semantic HTML. Strip editor-only inline list styles so
  // the API sanitizer does not discard them or report unsupported styling.
  contentDocument.querySelectorAll("ul, ol, li").forEach((listElement) => listElement.removeAttribute("style"));
  let imageIndex = 0;
  const serializeNode = (node: Node): string => {
    const container = document.createElement("div");
    container.appendChild(node.cloneNode(true));
    return container.innerHTML;
  };
  const wrapContent = (element: Element, html: string): string => {
    const wrapper = element.cloneNode(false) as Element;
    wrapper.innerHTML = html;
    return wrapper.outerHTML;
  };
  const imageBlock = (image: HTMLImageElement, placement: "inline" | "after_content"): EbookSerializedBlock | null => {
    const currentIndex = imageIndex;
    imageIndex += 1;
    const assetId = image.dataset.assetId || fallbackImages[currentIndex]?.assetId;
    if (!assetId) return null;
    const fallback = fallbackImages.find((candidate) => candidate.type === "image" && candidate.assetId === assetId) ?? fallbackImages[currentIndex];
    return {
      type: "image",
      // Keep block identifiers unique per page and separate from the legacy
      // `images` collection, which represents the same image assets.
      id: `inline-image-${pageKey}-${imageIndex}`,
      asset_id: assetId,
      // Keep the API's required accessibility field without asking authors
      // to enter it in the eBook editor.
      alt_text: image.alt.trim() || fallback?.altText.trim() || "eBook image",
      caption: image.dataset.caption || fallback?.caption || null,
      width: image.style.width === "45%" ? "small" : image.style.width === "70%" ? "medium" : image.style.width === "100%" ? "full" : fallback?.imageSize ?? "full",
      fit: image.style.objectFit === "cover" ? "cover" : image.style.objectFit === "contain" ? "contain" : fallback?.imageFit === "cover" ? "cover" : "contain",
      aspect_ratio: image.style.objectFit === "cover" ? "16:9" : image.style.objectFit === "contain" ? "original" : fallback?.imageFit === "cover" ? "16:9" : "original",
      position: normaliseEbookImagePosition(image.style.objectPosition || fallback?.imagePosition),
      decorative: false,
      placement,
    };
  };
  const splitNode = (node: Node): EbookSerializedBlock[] => {
    if (node instanceof HTMLImageElement) {
      const block = imageBlock(node, "inline");
      return block ? [block] : [];
    }
    if (!(node instanceof Element) || !node.querySelector("img")) {
      const html = serializeNode(node);
      return html ? [{ type: "text", content_html: html }] : [];
    }
    return Array.from(node.childNodes).flatMap((child) => splitNode(child)).map((block) =>
      block.type === "text" ? { ...block, content_html: wrapContent(node, block.content_html) } : block,
    );
  };
  const blocks = Array.from(contentDocument.body.childNodes).flatMap((node) => splitNode(node));
  const contentAssetIds = new Set(Array.from(contentDocument.querySelectorAll<HTMLImageElement>("img")).flatMap((image) => image.dataset.assetId ? [image.dataset.assetId] : []));
  fallbackImages.filter((image) => image.type === "image" && image.assetId && !contentAssetIds.has(image.assetId)).forEach((image) => {
    blocks.push({
      type: "image",
      id: `inline-image-${pageKey}-stored-${String(image.id).replace(/[^A-Za-z0-9_-]/g, "_")}`,
      asset_id: image.assetId as string,
      alt_text: image.altText.trim() || "eBook image",
      caption: image.caption || null,
      width: image.imageSize ?? "full",
      fit: image.imageFit === "cover" ? "cover" : "contain",
      aspect_ratio: image.imageFit === "cover" ? "16:9" : "original",
      position: normaliseEbookImagePosition(image.imagePosition),
      decorative: false,
      placement: "after_content",
    });
  });
  return blocks.reduce<EbookSerializedBlock[]>((orderedBlocks, block) => {
    const previous = orderedBlocks[orderedBlocks.length - 1];
    if (block.type === "text" && previous?.type === "text") previous.content_html += block.content_html;
    else orderedBlocks.push(block);
    return orderedBlocks;
  }, []);
}

function toEbookDocument(draft: EbookDraft, baseVersion = 0): { ebook: Record<string, unknown>; base_version: number } {
  const normaliseContentHtml = (content: string) => {
    if (typeof DOMParser === "undefined") return content;
    const document = new DOMParser().parseFromString(content, "text/html");
    document.querySelectorAll<HTMLImageElement>("img[data-asset-url]").forEach((image) => {
      const assetUrl = image.dataset.assetUrl;
      if (assetUrl) image.src = assetUrl;
    });
    // Images are persisted as structured ebook image blocks. Keeping img
    // markup in content_html makes the backend strip it and produces a
    // misleading warning, so serialize text/formatting only here.
    document.querySelectorAll<HTMLImageElement>("img").forEach((image) => image.remove());
    return document.body.innerHTML;
  };
  const pageContentAndImages = (page: EbookPageDraft, pageKey: string) => {
    const invalidBlock = page.blocks.find((block) => block.type === "image" && (!block.assetId || block.url.startsWith("blob:")));
    if (invalidBlock) throw new Error("Finish uploading every eBook image before saving. Each image needs a permanent asset_id.");
    const pageDocument = new DOMParser().parseFromString(page.content, "text/html");
    const contentImages = Array.from(pageDocument.querySelectorAll<HTMLImageElement>("img"));
    const storedImages = page.blocks.filter((block) => block.type === "image");
    contentImages.forEach((image, index) => {
      const storedAssetId = storedImages[index]?.assetId;
      if (!image.dataset.assetId && storedAssetId) image.dataset.assetId = storedAssetId;
    });
    const invalidImage = contentImages.find((image) => (image.src.startsWith("blob:") && !image.dataset.assetUrl) || !image.dataset.assetId);
    if (invalidImage) throw new Error("Finish uploading every eBook image before saving. Each image needs a permanent asset_id.");
    const inlineImageAssetIds = new Set(contentImages.flatMap((image) => image.dataset.assetId ? [image.dataset.assetId] : []));
    const orderedBlocks = serializeEbookBlocks(pageDocument.body.innerHTML, page.blocks, pageKey);
    const contentAssetIds = new Set(contentImages.flatMap((image) => image.dataset.assetId ? [image.dataset.assetId] : []));
    const images = orderedBlocks.flatMap((block) => block.type === "image" ? [{
      id: block.id,
      asset_id: block.asset_id,
      alt_text: block.alt_text,
      caption: block.caption,
      width: block.width,
      fit: block.fit,
      aspect_ratio: block.aspect_ratio,
      position: block.position,
      decorative: false,
      placement: block.placement,
    }] : []);
    const contentHtml = orderedBlocks.map((block) => block.type === "text"
      ? block.content_html
      : `<div data-image-id="${block.id}"></div>`).join("");
    const detachedImages = page.blocks.filter((block) => block.type === "image" && block.assetId && !contentAssetIds.has(block.assetId));
    detachedImages.forEach((block) => images.push({
      id: `ebook-image-${pageKey}-stored-${String(block.id).replace(/[^A-Za-z0-9_-]/g, "_")}`,
      asset_id: block.assetId as string,
      alt_text: block.altText.trim() || "eBook image",
      caption: block.caption || null,
      width: block.imageSize === "small" || block.imageSize === "medium" || block.imageSize === "large" || block.imageSize === "full" ? block.imageSize : "full",
      fit: block.imageFit === "cover" ? "cover" : "contain",
      aspect_ratio: block.imageFit === "cover" ? "16:9" : "original",
      position: normaliseEbookImagePosition(block.imagePosition),
      decorative: false,
      placement: "after_content",
    }));
    return { contentHtml, images };
  };
  return {
    ebook: {
      subtitle: draft.subtitle.trim() || null,
      author: draft.author.trim() || null,
      description: draft.description.trim() || null,
      cover_asset_id: draft.coverUrl.trim() || null,
      completion_rule: draft.completionRule,
      allow_bookmarks: draft.allowBookmarks,
      allow_notes: draft.allowNotes,
      pages: draft.pages.map((page, index) => {
        const pageKey = `page-${index + 1}`;
        const pageContent = pageContentAndImages(page, pageKey);
        return ({
        id: `page_${page.id}`,
        order: index + 1,
        title: page.title.trim() || `Page ${index + 1}`,
        content_html: pageContent.contentHtml || normaliseContentHtml(page.content),
        images: pageContent.images,
        });
      }),
    },
    base_version: baseVersion,
  };
}

function extractEbookVersion(value: unknown): number | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  for (const key of ["version", "draft_version", "current_version"]) {
    const candidate = record[key];
    if (typeof candidate === "number" && Number.isInteger(candidate) && candidate >= 0) return candidate;
  }
  for (const key of ["ebook", "draft", "data"]) {
    const nestedVersion = extractEbookVersion(record[key]);
    if (nestedVersion !== null) return nestedVersion;
  }
  return null;
}

async function saveTrainingEbookDraft(trainingId: string, sectionId: string, lessonId: string, payload: { ebook: Record<string, unknown>; base_version: number }): Promise<{ data: unknown; version: number }> {
  // The API persists image order through data-image-id placeholders in
  // content_html; blocks are generated by the reader endpoint only.
  const data = await saveTrainingEbook(trainingId, sectionId, lessonId, payload);
  const savedVersion = extractEbookVersion(data);
  if (savedVersion !== null) return { data, version: savedVersion };
  const latestDraft = await getTrainingEbook(trainingId, sectionId, lessonId, true).catch(() => null);
  return { data, version: extractEbookVersion(latestDraft) ?? payload.base_version + 1 };
}

function mergeLocalEbookOrder(apiValue: unknown, lessonContentValue: unknown): unknown {
  const apiRecord = apiValue && typeof apiValue === "object" && !Array.isArray(apiValue) ? apiValue as Record<string, unknown> : {};
  const apiDocument = getEbookDocumentRecord(apiValue);
  const localDocument = getEbookDocumentRecord(lessonContentValue);
  const apiPages = apiDocument.pages;
  const localPages = localDocument.pages;
  if (apiPages.length === 0) return apiValue ?? lessonContentValue;
  const mergedPages = apiPages.map((page, index) => {
    if (!page || typeof page !== "object" || Array.isArray(page)) return page;
    const pageRecord = page as Record<string, unknown>;
    const localPage = localPages.find((candidate) => candidate && typeof candidate === "object" && !Array.isArray(candidate) && (candidate as Record<string, unknown>).id === pageRecord.id) ?? localPages[index];
    if (!localPage || typeof localPage !== "object" || Array.isArray(localPage) || !Array.isArray((localPage as Record<string, unknown>).blocks)) return page;
    return { ...pageRecord, blocks: (localPage as Record<string, unknown>).blocks };
  });
  const mergedDocument = { ...apiDocument, pages: mergedPages };
  const wrapperKey = apiRecord.ebook && typeof apiRecord.ebook === "object" && !Array.isArray(apiRecord.ebook)
    ? "ebook"
    : apiRecord.draft && typeof apiRecord.draft === "object" && !Array.isArray(apiRecord.draft)
      ? "draft"
      : null;
  return wrapperKey ? { ...apiRecord, [wrapperKey]: mergedDocument } : mergedDocument;
}

function EbookValidationActions({ trainingId, sectionId, lessonId, draft, baseVersion, onBaseVersionChange, status, isPublished, onStatusChanged }: { trainingId: string; sectionId: string; lessonId: string; draft: EbookDraft; baseVersion: number; onBaseVersionChange: (version: number) => void; status: string; isPublished: boolean; onStatusChanged: () => void }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  if (status === "pending_approval") return <p role="status" className="rounded-lg bg-[#fffaf0] px-3 py-2 text-xs font-semibold text-[#8a5a00]">This eBook is waiting for approval. Withdraw the submission before making changes.</p>;
  const validate = async () => { setPending(true); setMessage(null); try { const saved = await saveTrainingEbookDraft(trainingId, sectionId, lessonId, toEbookDocument(draft, baseVersion)); onBaseVersionChange(saved.version); const result = await validateTrainingEbook(trainingId, sectionId, lessonId) as Record<string, unknown>; const errors = Array.isArray(result.errors) ? result.errors : []; setMessage(result.valid === true && errors.length === 0 ? "eBook is ready to publish." : errors.map((error) => error && typeof error === "object" && "message" in error ? String(error.message) : "eBook validation failed").join(" ")); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to validate eBook."); } finally { setPending(false); } };
  const submit = async () => { setPending(true); setMessage(null); try { const saveResult = await saveTrainingEbookDraft(trainingId, sectionId, lessonId, toEbookDocument(draft, baseVersion)); onBaseVersionChange(saveResult.version); const result = await validateTrainingEbook(trainingId, sectionId, lessonId) as Record<string, unknown>; const errors = Array.isArray(result.errors) ? result.errors : []; if (result.valid !== true || errors.length > 0) { setMessage(errors.map((error) => error && typeof error === "object" && "message" in error ? String(error.message) : "eBook validation failed").join(" ") || "Fix validation issues before submitting for approval."); return; } await submitTrainingEbookForApproval(trainingId, sectionId, lessonId, saveResult.version); setMessage("eBook submitted for Super Admin approval. It will appear to learners after approval and publishing."); onStatusChanged(); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to submit eBook for approval."); } finally { setPending(false); } };
  const publish = async () => { setPending(true); setMessage(null); try { await publishTrainingEbook(trainingId, sectionId, lessonId); setMessage("Approved eBook published for learners."); onStatusChanged(); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to publish the approved eBook."); } finally { setPending(false); } };
  const hasActionError = message !== null && (/^(Unable to|The server is temporarily unavailable)/i.test(message));
  return <div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => void validate()} disabled={pending} className="h-8 rounded-full border border-[#1f6a58] px-3 text-xs font-bold text-[#1f6a58] disabled:opacity-60">{pending ? "Working..." : "Validate eBook"}</button>{status === "draft" || status === "changes_requested" ? <button type="button" onClick={() => void submit()} disabled={pending} className="h-8 rounded-full bg-[#1f6a58] px-3 text-xs font-bold text-white disabled:opacity-60">{pending ? "Submitting..." : "Submit for approval"}</button> : null}{status === "approved" && !isPublished ? <button type="button" onClick={() => void publish()} disabled={pending} className="h-8 rounded-full bg-[#1f6a58] px-3 text-xs font-bold text-white disabled:opacity-60">{pending ? "Publishing..." : "Publish eBook"}</button> : null}{status === "pending_approval" ? <p role="status" className="text-xs font-semibold text-[#8a5a00]">Submitted for Super Admin approval.</p> : null}{isPublished ? <p role="status" className="text-xs font-semibold text-[#167550]">Published for learners.</p> : null}{message ? <p role={hasActionError ? "alert" : "status"} className={`text-xs font-semibold ${hasActionError ? "text-[#b42318]" : "text-[#52736a]"}`}>{message}</p> : null}</div>;
}

function EbookPendingActions({ trainingId, sectionId, lessonId, onWithdrawn }: { trainingId: string; sectionId: string; lessonId: string; onWithdrawn: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const withdraw = async () => {
    setPending(true);
    setError(null);
    try {
      await withdrawTrainingEbookSubmission(trainingId, sectionId, lessonId);
      onWithdrawn();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to withdraw the eBook submission.");
    } finally {
      setPending(false);
    }
  };
  return <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#f1dfb8] bg-[#fffaf0] p-3">
    <p className="text-xs text-[#755618]">This eBook is waiting for Super Admin approval and is locked for editing.</p>
    <button type="button" onClick={() => void withdraw()} disabled={pending} className="h-9 rounded-full border border-[#8a5a00] px-4 text-xs font-bold text-[#8a5a00] disabled:opacity-60">{pending ? "Withdrawing..." : "Withdraw submission"}</button>
    {error ? <p role="alert" className="w-full text-xs font-semibold text-[#b42318]">{error}</p> : null}
  </div>;
}

const emptyEbookBlock = (type: EbookBlock["type"]): EbookBlock => ({ id: Date.now() + Math.random(), type, content: "", url: "", altText: "", caption: "" });

function EbookAuthoringCanvas({ draft, onChange }: { draft: EbookDraft; onChange: (draft: EbookDraft) => void }) {
  const [activePageId, setActivePageId] = useState(draft.pages[0]?.id ?? 1);
  const [previewing, setPreviewing] = useState(false);
  const activePage = draft.pages.find((page) => page.id === activePageId) ?? draft.pages[0];
  const update = (patch: Partial<EbookDraft>) => onChange({ ...draft, ...patch });
  const updatePage = (patch: Partial<EbookPageDraft>) => { if (!activePage) return; update({ pages: draft.pages.map((page) => page.id === activePage.id ? { ...page, ...patch } : page) }); };
  const updateBlock = (id: number, patch: Partial<EbookBlock>) => updatePage({ blocks: activePage.blocks.map((block) => block.id === id ? { ...block, ...patch } : block) });
  const addPage = () => { const page = { id: Date.now(), title: `Page ${draft.pages.length + 1}`, content: "", blocks: [] }; update({ pages: [...draft.pages, page] }); setActivePageId(page.id); setPreviewing(false); };
  const addBlock = (type: EbookBlock["type"]) => {
    if (["heading", "text", "quote"].includes(type)) {
      const marker = type === "heading" ? "\n\n## Section heading\n" : type === "quote" ? "\n\n> Add a quote\n" : "\n\nWrite more content here...\n";
      updatePage({ content: `${activePage.content}${marker}` });
      return;
    }
    updatePage({ blocks: [...activePage.blocks, emptyEbookBlock(type)] });
  };
  const removePage = () => { if (draft.pages.length === 1 || !activePage) return; const next = draft.pages.filter((page) => page.id !== activePage.id); update({ pages: next }); setActivePageId(next[0].id); };
  const removeBlock = (id: number) => updatePage({ blocks: activePage.blocks.filter((block) => block.id !== id) });
  if (!activePage) return null;
  return <div className="rounded-2xl border border-[#b7d5c8] bg-[#f4fbf6] p-3 sm:p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-extrabold text-[#06201c]">eBook authoring workspace</p><p className="mt-1 text-[11px] leading-5 text-[#52736a]">Write, arrange, and preview the book exactly as learners will read it.</p></div><button type="button" onClick={addPage} className="rounded-full bg-[#1f6a58] px-3 py-2 text-[11px] font-extrabold text-white">+ Add page</button></div>
    <div className="mt-4 rounded-xl border border-[#d7e5df] bg-white p-3"><p className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7f9d94]">Book information</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="block text-[11px] font-extrabold text-[#52736a]">Subtitle<input value={draft.subtitle} onChange={(event) => update({ subtitle: event.target.value })} placeholder="A short description of this book" className="mt-1.5 h-9 w-full rounded-lg border border-[#d7e5df] px-3 text-xs" /></label><label className="block text-[11px] font-extrabold text-[#52736a]">Author<input value={draft.author} onChange={(event) => update({ author: event.target.value })} placeholder="Author or organisation" className="mt-1.5 h-9 w-full rounded-lg border border-[#d7e5df] px-3 text-xs" /></label><label className="block text-[11px] font-extrabold text-[#52736a] sm:col-span-2">Book description<textarea value={draft.description} onChange={(event) => update({ description: event.target.value })} placeholder="Tell learners what they will learn..." rows={2} className="mt-1.5 w-full rounded-lg border border-[#d7e5df] p-2 text-xs" /></label><label className="block text-[11px] font-extrabold text-[#52736a]">Cover image URL<input value={draft.coverUrl} onChange={(event) => update({ coverUrl: event.target.value })} placeholder="Upload cover image or paste URL" className="mt-1.5 h-9 w-full rounded-lg border border-[#d7e5df] px-3 text-xs" /></label><label className="block text-[11px] font-extrabold text-[#52736a]">Import source URL<input value={draft.sourceUrl} onChange={(event) => update({ sourceUrl: event.target.value })} placeholder="Optional EPUB or document source" className="mt-1.5 h-9 w-full rounded-lg border border-[#d7e5df] px-3 text-xs" /></label></div></div>
    <div className="mt-4 grid gap-3 lg:grid-cols-[170px_minmax(0,1fr)]"><aside className="rounded-xl border border-[#d7e5df] bg-white p-2"><div className="flex items-center justify-between px-2 pb-2"><p className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7f9d94]">Pages / TOC</p><span className="text-[10px] font-bold text-[#7f9d94]">{draft.pages.length}</span></div><div className="space-y-1">{draft.pages.map((page, index) => <button key={page.id} type="button" onClick={() => { setActivePageId(page.id); setPreviewing(false); }} className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[11px] font-extrabold ${activePage.id === page.id ? "bg-[#e8f6ee] text-[#1f6a58]" : "text-[#52736a] hover:bg-[#f4faf7]"}`}><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#eff8f2] text-[10px]">{index + 1}</span><span className="truncate">{page.title || `Page ${index + 1}`}</span></button>)}</div><button type="button" onClick={addPage} className="mt-3 w-full rounded-lg border border-dashed border-[#b7d5c8] px-2 py-2 text-[11px] font-bold text-[#1f6a58]">+ Add page</button></aside>
      <section className="rounded-xl border border-[#d7e5df] bg-white p-3 sm:p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7f9d94]">Page {draft.pages.findIndex((page) => page.id === activePage.id) + 1}</p><p className="mt-1 text-xs font-bold text-[#52736a]">Build the page from content blocks</p></div><div className="flex gap-2"><button type="button" onClick={() => setPreviewing((current) => !current)} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-[11px] font-bold text-[#1f6a58]">{previewing ? "Edit page" : "Preview page"}</button><button type="button" onClick={removePage} disabled={draft.pages.length === 1} className="rounded-full border border-[#f0c7c2] px-3 py-1.5 text-[11px] font-bold text-[#b42318] disabled:opacity-40">Remove page</button></div></div>
        {previewing ? <div className="mt-4 rounded-xl border border-[#e1ebe6] bg-[#fbfdfb] p-4"><p className="text-lg font-extrabold text-[#06201c]">{activePage.title || "Untitled page"}</p>{activePage.blocks.map((block) => <div key={block.id} className="mt-3">{block.type === "heading" ? <p className="text-base font-extrabold text-[#06201c]">{block.content || "Heading"}</p> : block.type === "quote" ? <blockquote className="border-l-4 border-[#83b9a4] pl-3 text-sm italic text-[#52736a]">{block.content || "Quote"}</blockquote> : ["image", "video", "audio", "pdf", "link"].includes(block.type) ? <p className="rounded-lg bg-[#e8f6ee] px-3 py-2 text-xs font-semibold text-[#1f6a58]">{block.type.toUpperCase()} {block.caption || block.url || "content attached"}</p> : <p className="whitespace-pre-wrap text-sm leading-6 text-[#52736a]">{block.content || "Empty text block"}</p>}</div>)}</div> : <div className="mt-4 space-y-3"><label className="block text-[11px] font-extrabold text-[#52736a]">Page title<input value={activePage.title} onChange={(event) => updatePage({ title: event.target.value })} placeholder="Chapter introduction" className="mt-1.5 h-10 w-full rounded-lg border border-[#d7e5df] px-3 text-sm font-semibold text-[#06201c]" /></label><div className="flex flex-wrap gap-2 rounded-lg bg-[#f4faf7] p-2"><span className="self-center text-[10px] font-extrabold uppercase text-[#7f9d94]">Add block</span>{(["heading", "text", "quote", "image", "video", "audio", "pdf", "link"] as EbookBlock["type"][]).map((blockType) => <button key={blockType} type="button" onClick={() => addBlock(blockType)} className="rounded-full border border-[#b7d5c8] bg-white px-2.5 py-1.5 text-[10px] font-bold capitalize text-[#1f6a58]">+ {blockType}</button>)}</div>{activePage.blocks.map((block, index) => <div key={block.id} className="rounded-xl border border-[#e1ebe6] bg-[#fbfdfb] p-3"><div className="flex items-center justify-between"><p className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7f9d94]">{index + 1}. {block.type}</p><button type="button" onClick={() => removeBlock(block.id)} className="text-[11px] font-bold text-[#b42318]">Remove</button></div>{["heading", "text", "quote"].includes(block.type) ? <><div className="mt-2 flex flex-wrap gap-1.5"><button type="button" onClick={() => updateBlock(block.id, { content: `${block.content} **bold**` })} className="rounded border border-[#d7e5df] px-2 py-1 text-[10px] font-bold">B</button><button type="button" onClick={() => updateBlock(block.id, { content: `${block.content} _italic_` })} className="rounded border border-[#d7e5df] px-2 py-1 text-[10px] italic">I</button><button type="button" onClick={() => updateBlock(block.id, { content: `${block.content} [link]` })} className="rounded border border-[#d7e5df] px-2 py-1 text-[10px] text-[#1f6a58]">Link</button></div><textarea value={block.content} onChange={(event) => updateBlock(block.id, { content: event.target.value })} placeholder={block.type === "heading" ? "Section heading" : "Write learner-facing content..."} rows={block.type === "heading" ? 2 : 4} className="mt-2 w-full rounded-lg border border-[#d7e5df] p-2 text-xs leading-5" /></> : <div className="mt-2 grid gap-2 sm:grid-cols-2"><label className="block text-[10px] font-bold text-[#52736a]">{block.type === "link" ? "URL" : "File or media URL"}<input value={block.url} onChange={(event) => updateBlock(block.id, { url: event.target.value })} placeholder="https://..." className="mt-1 h-9 w-full rounded-lg border border-[#d7e5df] px-2 text-xs" /></label><label className="block text-[10px] font-bold text-[#52736a]">{block.type === "image" ? "Alt text (required for accessibility)" : "Caption / transcript note"}<input value={block.type === "image" ? block.altText : block.caption} onChange={(event) => updateBlock(block.id, block.type === "image" ? { altText: event.target.value } : { caption: event.target.value })} placeholder={block.type === "image" ? "Describe the image" : "Optional learner-facing label"} className="mt-1 h-9 w-full rounded-lg border border-[#d7e5df] px-2 text-xs" /></label></div>}</div>)}</div>}
      </section></div>
    <div className="mt-4 rounded-xl border border-[#d7e5df] bg-white p-3"><p className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7f9d94]">Learner experience and accessibility</p><div className="mt-3 grid gap-2 sm:grid-cols-2"><label className="flex items-center gap-2 text-xs font-semibold text-[#52736a]"><input type="checkbox" checked={draft.allowBookmarks} onChange={(event) => update({ allowBookmarks: event.target.checked })} /> Allow bookmarks</label><label className="flex items-center gap-2 text-xs font-semibold text-[#52736a]"><input type="checkbox" checked={draft.allowNotes} onChange={(event) => update({ allowNotes: event.target.checked })} /> Allow learner notes</label><label className="flex items-center gap-2 text-xs font-semibold text-[#52736a]"><input type="checkbox" checked={draft.allowDownload} onChange={(event) => update({ allowDownload: event.target.checked })} /> Allow book download</label><label className="flex items-center gap-2 text-xs font-semibold text-[#52736a]"><input type="checkbox" checked={draft.transcriptRequired} onChange={(event) => update({ transcriptRequired: event.target.checked })} /> Require transcripts for media</label><label className="block text-[11px] font-extrabold text-[#52736a] sm:col-span-2">Completion rule<select value={draft.completionRule} onChange={(event) => update({ completionRule: event.target.value as EbookDraft["completionRule"] })} className="mt-1.5 h-9 w-full rounded-lg border border-[#d7e5df] bg-white px-3 text-xs"><option value="read_to_end">Read to the end</option><option value="mark_complete">Learner marks complete</option></select></label></div><p className="mt-2 text-[10px] text-[#7f9d94]">Add alt text to every image and a transcript/caption note to audio or video before publishing.</p></div>
    <div className="mt-4 rounded-xl border border-[#d7e5df] bg-white p-3"><p className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7f9d94]">Learner experience and accessibility</p><div className="mt-3 grid gap-2 sm:grid-cols-2"><label className="flex items-center gap-2 text-xs font-semibold text-[#52736a]"><input type="checkbox" checked={draft.allowBookmarks} onChange={(event) => update({ allowBookmarks: event.target.checked })} /> Allow bookmarks</label><label className="flex items-center gap-2 text-xs font-semibold text-[#52736a]"><input type="checkbox" checked={draft.allowNotes} onChange={(event) => update({ allowNotes: event.target.checked })} /> Allow learner notes</label><label className="flex items-center gap-2 text-xs font-semibold text-[#52736a]"><input type="checkbox" checked={draft.allowDownload} onChange={(event) => update({ allowDownload: event.target.checked })} /> Allow book download</label><label className="flex items-center gap-2 text-xs font-semibold text-[#52736a]"><input type="checkbox" checked={draft.transcriptRequired} onChange={(event) => update({ transcriptRequired: event.target.checked })} /> Require transcripts for media</label><label className="block text-[11px] font-extrabold text-[#52736a] sm:col-span-2">Completion rule<select value={draft.completionRule} onChange={(event) => update({ completionRule: event.target.value as EbookDraft["completionRule"] })} className="mt-1.5 h-9 w-full rounded-lg border border-[#d7e5df] bg-white px-3 text-xs"><option value="read_to_end">Read to the end</option><option value="manual">Learner marks complete</option></select></label></div><p className="mt-2 text-[10px] text-[#7f9d94]">Add alt text to every image and a transcript/caption note to audio or video before publishing.</p></div>
  </div>;
}

function EbookUnifiedEditor({ draft, onChange }: { draft: EbookDraft; onChange: (draft: EbookDraft) => void }) {
  const [activePageId, setActivePageId] = useState(draft.pages[0]?.id ?? 1);
  const [previewing, setPreviewing] = useState(false);
  const activePage = draft.pages.find((page) => page.id === activePageId) ?? draft.pages[0];
  if (!activePage) return null;
  const update = (patch: Partial<EbookDraft>) => onChange({ ...draft, ...patch });
  const updatePage = (patch: Partial<EbookPageDraft>) => update({ pages: draft.pages.map((page) => page.id === activePage.id ? { ...page, ...patch } : page) });
  const insert = (value: string) => updatePage({ content: `${activePage.content}${activePage.content ? "\n\n" : ""}${value}` });
  const addPage = () => { const page = { id: Date.now(), title: `Page ${draft.pages.length + 1}`, content: "", blocks: [] }; update({ pages: [...draft.pages, page] }); setActivePageId(page.id); };
  const addMedia = (type: EbookBlock["type"]) => updatePage({ blocks: [...activePage.blocks, emptyEbookBlock(type)] });
  const updateMedia = (id: number, patch: Partial<EbookBlock>) => updatePage({ blocks: activePage.blocks.map((block) => block.id === id ? { ...block, ...patch } : block) });
  const removeMedia = (id: number) => updatePage({ blocks: activePage.blocks.filter((block) => block.id !== id) });
  return <div className="rounded-2xl border border-[#b7d5c8] bg-[#f4fbf6] p-3 sm:p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-extrabold text-[#06201c]">eBook page editor</p><p className="mt-1 text-[11px] leading-5 text-[#52736a]">Write the whole page in one editor. Use the toolbar to insert structure and supporting media.</p></div><button type="button" onClick={addPage} className="rounded-full bg-[#1f6a58] px-3 py-2 text-[11px] font-extrabold text-white">+ Add page</button></div>
    <div className="mt-4 grid gap-3 lg:grid-cols-[170px_minmax(0,1fr)]"><aside className="rounded-xl border border-[#d7e5df] bg-white p-2"><p className="px-2 pb-2 text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7f9d94]">Pages / TOC</p><div className="space-y-1">{draft.pages.map((page, index) => <button key={page.id} type="button" onClick={() => { setActivePageId(page.id); setPreviewing(false); }} className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[11px] font-extrabold ${activePage.id === page.id ? "bg-[#e8f6ee] text-[#1f6a58]" : "text-[#52736a] hover:bg-[#f4faf7]"}`}><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#eff8f2] text-[10px]">{index + 1}</span><span className="truncate">{page.title || `Page ${index + 1}`}</span></button>)}</div><button type="button" onClick={addPage} className="mt-3 w-full rounded-lg border border-dashed border-[#b7d5c8] px-2 py-2 text-[11px] font-bold text-[#1f6a58]">+ Add page</button></aside>
      <section className="rounded-xl border border-[#d7e5df] bg-white p-3 sm:p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7f9d94]">Page {draft.pages.findIndex((page) => page.id === activePage.id) + 1}</p><p className="mt-1 text-xs font-bold text-[#52736a]">One continuous learner-facing editor</p></div><div className="flex gap-2"><button type="button" onClick={() => setPreviewing((value) => !value)} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-[11px] font-bold text-[#1f6a58]">{previewing ? "Edit page" : "Preview page"}</button><button type="button" disabled={draft.pages.length === 1} onClick={() => { const pages = draft.pages.filter((page) => page.id !== activePage.id); update({ pages }); setActivePageId(pages[0].id); }} className="rounded-full border border-[#f0c7c2] px-3 py-1.5 text-[11px] font-bold text-[#b42318] disabled:opacity-40">Remove page</button></div></div>
        {previewing ? <div className="mt-4 rounded-xl border border-[#e1ebe6] bg-[#fbfdfb] p-4"><h3 className="text-lg font-extrabold text-[#06201c]">{activePage.title || "Untitled page"}</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#52736a]">{activePage.content || "This page does not have text content yet."}</p>{activePage.blocks.map((block) => <p key={block.id} className="mt-3 rounded-lg bg-[#e8f6ee] px-3 py-2 text-xs font-semibold text-[#1f6a58]">{block.type.toUpperCase()}: {block.caption || block.url || "Configure this attachment"}</p>)}</div> : <div className="mt-4 space-y-3"><label className="block text-[11px] font-extrabold text-[#52736a]">Page title<input value={activePage.title} onChange={(event) => updatePage({ title: event.target.value })} placeholder="Chapter introduction" className="mt-1.5 h-10 w-full rounded-lg border border-[#d7e5df] px-3 text-sm font-semibold text-[#06201c]" /></label><div className="flex flex-wrap gap-2 rounded-lg bg-[#f4faf7] p-2"><span className="self-center text-[10px] font-extrabold uppercase text-[#7f9d94]">Insert</span>{[["H2", "## Section heading"], ["Text", "Write more content here..."], ["Quote", "> Add a quote"], ["List", "- List item\n- List item"]].map(([label, value]) => <button key={label} type="button" onClick={() => insert(value)} className="rounded-full border border-[#b7d5c8] bg-white px-2.5 py-1.5 text-[10px] font-bold text-[#1f6a58]">+ {label}</button>)}<button type="button" onClick={() => insert("**bold text**")} className="rounded border border-[#d7e5df] bg-white px-2 py-1 text-[10px] font-bold">B</button><button type="button" onClick={() => insert("_italic text_")} className="rounded border border-[#d7e5df] bg-white px-2 py-1 text-[10px] italic">I</button><button type="button" onClick={() => insert("[link text](https://...)")} className="rounded border border-[#d7e5df] bg-white px-2 py-1 text-[10px] text-[#1f6a58]">Link</button></div><textarea value={activePage.content} onChange={(event) => updatePage({ content: event.target.value })} placeholder="Start writing the page. Add headings, paragraphs, lists, quotes, and links here..." rows={14} className="w-full resize-y rounded-xl border border-[#b7d5c8] p-4 text-sm leading-7 text-[#06201c] outline-none focus:border-[#1f6a58]" /><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-extrabold uppercase text-[#7f9d94]">Add supporting media</span>{(["image", "video", "audio", "pdf", "link"] as EbookBlock["type"][]).map((type) => <button key={type} type="button" onClick={() => addMedia(type)} className="rounded-full border border-[#b7d5c8] px-2.5 py-1.5 text-[10px] font-bold capitalize text-[#1f6a58]">+ {type}</button>)}</div>{activePage.blocks.map((block) => <div key={block.id} className="rounded-xl border border-[#e1ebe6] bg-[#fbfdfb] p-3"><div className="flex items-center justify-between"><p className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7f9d94]">{block.type} attachment</p><button type="button" onClick={() => removeMedia(block.id)} className="text-[11px] font-bold text-[#b42318]">Remove</button></div><div className="mt-2 grid gap-2 sm:grid-cols-2"><input value={block.url} onChange={(event) => updateMedia(block.id, { url: event.target.value })} placeholder={block.type === "link" ? "Paste URL" : "File or media URL"} className="h-9 rounded-lg border border-[#d7e5df] px-2 text-xs" /><input value={block.type === "image" ? block.altText : block.caption} onChange={(event) => updateMedia(block.id, block.type === "image" ? { altText: event.target.value } : { caption: event.target.value })} placeholder={block.type === "image" ? "Alt text for accessibility" : "Caption or transcript"} className="h-9 rounded-lg border border-[#d7e5df] px-2 text-xs" /></div></div>)}</div>}
      </section></div>
  </div>;
}

function EbookAllInOneEditor({ draft, onChange }: { draft: EbookDraft; onChange: (draft: EbookDraft) => void }) {
  const [activePageId, setActivePageId] = useState(draft.pages[0]?.id ?? 1);
  const [previewing, setPreviewing] = useState(false);
  const activePage = draft.pages.find((page) => page.id === activePageId) ?? draft.pages[0];
  if (!activePage) return null;
  const update = (patch: Partial<EbookDraft>) => onChange({ ...draft, ...patch });
  const updatePage = (patch: Partial<EbookPageDraft>) => update({ pages: draft.pages.map((page) => page.id === activePage.id ? { ...page, ...patch } : page) });
  const insertText = (value: string) => updatePage({ content: `${activePage.content}${activePage.content ? "\n\n" : ""}${value}` });
  const addInlineItem = (type: EbookBlock["type"]) => updatePage({ blocks: [...activePage.blocks, emptyEbookBlock(type)] });
  const addPage = () => { const page = { id: Date.now(), title: `Page ${draft.pages.length + 1}`, content: "", blocks: [] }; update({ pages: [...draft.pages, page] }); setActivePageId(page.id); setPreviewing(false); };
  const updateInlineItem = (id: number, patch: Partial<EbookBlock>) => updatePage({ blocks: activePage.blocks.map((block) => block.id === id ? { ...block, ...patch } : block) });
  const removeInlineItem = (id: number) => updatePage({ blocks: activePage.blocks.filter((block) => block.id !== id) });
  return <div className="rounded-2xl border border-[#b7d5c8] bg-[#f4fbf6] p-3 sm:p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-extrabold text-[#06201c]">eBook editor</p><p className="mt-1 text-[11px] leading-5 text-[#52736a]">Everything on this page is created inside one editor, in the same order learners will read it.</p></div><button type="button" onClick={addPage} className="rounded-full bg-[#1f6a58] px-3 py-2 text-[11px] font-extrabold text-white">+ Add page</button></div>
    <div className="mt-4 grid gap-3 lg:grid-cols-[170px_minmax(0,1fr)]"><aside className="rounded-xl border border-[#d7e5df] bg-white p-2"><p className="px-2 pb-2 text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7f9d94]">Pages / TOC</p><div className="space-y-1">{draft.pages.map((page, index) => <button key={page.id} type="button" onClick={() => { setActivePageId(page.id); setPreviewing(false); }} className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[11px] font-extrabold ${activePage.id === page.id ? "bg-[#e8f6ee] text-[#1f6a58]" : "text-[#52736a] hover:bg-[#f4faf7]"}`}><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#eff8f2] text-[10px]">{index + 1}</span><span className="truncate">{page.title || `Page ${index + 1}`}</span></button>)}</div><button type="button" onClick={addPage} className="mt-3 w-full rounded-lg border border-dashed border-[#b7d5c8] px-2 py-2 text-[11px] font-bold text-[#1f6a58]">+ Add page</button></aside>
      <section className="rounded-xl border border-[#d7e5df] bg-white p-3 sm:p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7f9d94]">Page {draft.pages.findIndex((page) => page.id === activePage.id) + 1}</p><p className="mt-1 text-xs font-bold text-[#52736a]">Single content editor</p></div><div className="flex gap-2"><button type="button" onClick={() => setPreviewing((value) => !value)} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-[11px] font-bold text-[#1f6a58]">{previewing ? "Edit page" : "Preview page"}</button><button type="button" disabled={draft.pages.length === 1} onClick={() => { const pages = draft.pages.filter((page) => page.id !== activePage.id); update({ pages }); setActivePageId(pages[0].id); }} className="rounded-full border border-[#f0c7c2] px-3 py-1.5 text-[11px] font-bold text-[#b42318] disabled:opacity-40">Remove page</button></div></div>
        {previewing ? <div className="mt-4 rounded-xl border border-[#e1ebe6] bg-[#fbfdfb] p-4"><h3 className="text-lg font-extrabold text-[#06201c]">{activePage.title || "Untitled page"}</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#52736a]">{activePage.content || "This page does not have text content yet."}</p>{activePage.blocks.map((block) => <p key={block.id} className="mt-3 rounded-lg bg-[#e8f6ee] px-3 py-2 text-xs font-semibold text-[#1f6a58]">{block.type.toUpperCase()}: {block.caption || block.url || "content attached"}</p>)}</div> : <div className="mt-4 rounded-xl border-2 border-[#b7d5c8] bg-[#fbfdfb] p-3"><label className="block text-[11px] font-extrabold text-[#52736a]">Page title<input value={activePage.title} onChange={(event) => updatePage({ title: event.target.value })} placeholder="Chapter introduction" className="mt-1.5 h-10 w-full rounded-lg border border-[#d7e5df] bg-white px-3 text-sm font-semibold text-[#06201c]" /></label><div className="mt-3 flex flex-wrap gap-2 border-y border-[#e1ebe6] py-2"><span className="self-center text-[10px] font-extrabold uppercase text-[#7f9d94]">Insert into page</span>{[["Heading", "## Section heading"], ["Paragraph", "Write more content here..."], ["Quote", "> Add a quote"], ["List", "- List item\n- List item"], ["Bold", "**bold text**"], ["Italic", "_italic text_"], ["Link", "[link text](https://...)"]].map(([label, value]) => <button key={label} type="button" onClick={() => insertText(value)} className="rounded-full border border-[#b7d5c8] bg-white px-2.5 py-1.5 text-[10px] font-bold text-[#1f6a58]">+ {label}</button>)}</div><textarea value={activePage.content} onChange={(event) => updatePage({ content: event.target.value })} placeholder="Write text, headings, lists, quotes, and links here. Use the insert buttons above to add structure..." rows={14} className="mt-3 w-full resize-y rounded-lg border border-[#d7e5df] bg-white p-4 text-sm leading-7 text-[#06201c] outline-none focus:border-[#1f6a58]" /><div className="mt-3 border-t border-[#e1ebe6] pt-3"><p className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7f9d94]">Insert media into this same page</p><div className="mt-2 flex flex-wrap gap-2">{(["image", "video", "audio", "pdf", "link"] as EbookBlock["type"][]).map((type) => <button key={type} type="button" onClick={() => addInlineItem(type)} className="rounded-full border border-[#b7d5c8] bg-white px-2.5 py-1.5 text-[10px] font-bold capitalize text-[#1f6a58]">+ {type}</button>)}</div>{activePage.blocks.map((block) => <div key={block.id} className="mt-2 rounded-lg border border-[#e1ebe6] bg-white p-2"><div className="flex items-center justify-between"><p className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7f9d94]">{block.type} inserted in page</p><button type="button" onClick={() => removeInlineItem(block.id)} className="text-[11px] font-bold text-[#b42318]">Remove</button></div><div className="mt-2 grid gap-2 sm:grid-cols-2"><input value={block.url} onChange={(event) => updateInlineItem(block.id, { url: event.target.value })} placeholder={block.type === "link" ? "Paste URL" : "Upload file or paste media URL"} className="h-9 rounded-lg border border-[#d7e5df] px-2 text-xs" /><input value={block.type === "image" ? block.altText : block.caption} onChange={(event) => updateInlineItem(block.id, block.type === "image" ? { altText: event.target.value } : { caption: event.target.value })} placeholder={block.type === "image" ? "Alt text" : "Caption or transcript"} className="h-9 rounded-lg border border-[#d7e5df] px-2 text-xs" /></div></div>)}</div></div>}
      </section></div>
  </div>;
}

function EbookInlineImageEditor({ draft, onChange }: { draft: EbookDraft; onChange: (draft: EbookDraft) => void }) {
  const [activePageId, setActivePageId] = useState(draft.pages[0]?.id ?? 1);
  const [previewing, setPreviewing] = useState(false);
  const activePage = draft.pages.find((page) => page.id === activePageId) ?? draft.pages[0];
  if (!activePage) return null;
  const update = (patch: Partial<EbookDraft>) => onChange({ ...draft, ...patch });
  const updatePage = (patch: Partial<EbookPageDraft>) => update({ pages: draft.pages.map((page) => page.id === activePage.id ? { ...page, ...patch } : page) });
  const insertText = (value: string) => updatePage({ content: `${activePage.content}${activePage.content ? "\n\n" : ""}${value}` });
  const addImage = () => updatePage({ blocks: [...activePage.blocks, emptyEbookBlock("image")] });
  const updateImage = (id: number, patch: Partial<EbookBlock>) => updatePage({ blocks: activePage.blocks.map((block) => block.id === id ? { ...block, ...patch } : block) });
  const addPage = () => { const page = { id: Date.now(), title: `Page ${draft.pages.length + 1}`, content: "", blocks: [] }; update({ pages: [...draft.pages, page] }); setActivePageId(page.id); setPreviewing(false); };
  return <div className="rounded-2xl border border-[#b7d5c8] bg-[#f4fbf6] p-3 sm:p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-extrabold text-[#06201c]">eBook editor</p><p className="mt-1 text-[11px] leading-5 text-[#52736a]">Write text and place images directly in the same learner-facing page.</p></div><button type="button" onClick={addPage} className="rounded-full bg-[#1f6a58] px-3 py-2 text-[11px] font-extrabold text-white">+ Add page</button></div><div className="mt-4 grid gap-3 lg:grid-cols-[170px_minmax(0,1fr)]"><aside className="rounded-xl border border-[#d7e5df] bg-white p-2"><p className="px-2 pb-2 text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7f9d94]">Pages / TOC</p><div className="space-y-1">{draft.pages.map((page, index) => <button key={page.id} type="button" onClick={() => { setActivePageId(page.id); setPreviewing(false); }} className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[11px] font-extrabold ${activePage.id === page.id ? "bg-[#e8f6ee] text-[#1f6a58]" : "text-[#52736a] hover:bg-[#f4faf7]"}`}><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#eff8f2] text-[10px]">{index + 1}</span><span className="truncate">{page.title || `Page ${index + 1}`}</span></button>)}</div><button type="button" onClick={addPage} className="mt-3 w-full rounded-lg border border-dashed border-[#b7d5c8] px-2 py-2 text-[11px] font-bold text-[#1f6a58]">+ Add page</button></aside><section className="rounded-xl border border-[#d7e5df] bg-white p-3 sm:p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7f9d94]">Page {draft.pages.findIndex((page) => page.id === activePage.id) + 1}</p><p className="mt-1 text-xs font-bold text-[#52736a]">One editor for text and images</p></div><div className="flex gap-2"><button type="button" onClick={() => setPreviewing((value) => !value)} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-[11px] font-bold text-[#1f6a58]">{previewing ? "Edit page" : "Preview page"}</button><button type="button" disabled={draft.pages.length === 1} onClick={() => { const pages = draft.pages.filter((page) => page.id !== activePage.id); update({ pages }); setActivePageId(pages[0].id); }} className="rounded-full border border-[#f0c7c2] px-3 py-1.5 text-[11px] font-bold text-[#b42318] disabled:opacity-40">Remove page</button></div></div>{previewing ? <div className="mt-4 rounded-xl border border-[#e1ebe6] bg-[#fbfdfb] p-4"><h3 className="text-lg font-extrabold text-[#06201c]">{activePage.title || "Untitled page"}</h3><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#52736a]">{activePage.content || "This page does not have text content yet."}</p>{activePage.blocks.map((block) => block.url ? <img key={block.id} src={block.url} alt={block.altText} className="mt-4 max-h-72 rounded-lg object-contain" /> : <p key={block.id} className="mt-3 rounded-lg bg-[#fff8e8] px-3 py-2 text-xs text-[#8a5a00]">Add an image URL to preview this image.</p>)}</div> : <div className="mt-4 rounded-xl border-2 border-[#b7d5c8] bg-[#fbfdfb] p-3"><label className="block text-[11px] font-extrabold text-[#52736a]">Page title<input value={activePage.title} onChange={(event) => updatePage({ title: event.target.value })} placeholder="Chapter introduction" className="mt-1.5 h-10 w-full rounded-lg border border-[#d7e5df] bg-white px-3 text-sm font-semibold text-[#06201c]" /></label><div className="mt-3 flex flex-wrap gap-2 border-y border-[#e1ebe6] py-2"><span className="self-center text-[10px] font-extrabold uppercase text-[#7f9d94]">Insert</span>{[["Heading", "## Section heading"], ["Paragraph", "Write more content here..."], ["Quote", "> Add a quote"], ["List", "- List item\n- List item"], ["Bold", "**bold text**"], ["Italic", "_italic text_"], ["Link", "[link text](https://...)"]].map(([label, value]) => <button key={label} type="button" onClick={() => insertText(value)} className="rounded-full border border-[#b7d5c8] bg-white px-2.5 py-1.5 text-[10px] font-bold text-[#1f6a58]">+ {label}</button>)}<button type="button" onClick={addImage} className="rounded-full bg-[#1f6a58] px-2.5 py-1.5 text-[10px] font-bold text-white">+ Image</button></div><textarea value={activePage.content} onChange={(event) => updatePage({ content: event.target.value })} placeholder="Write the page content here..." rows={14} className="mt-3 w-full resize-y rounded-lg border border-[#d7e5df] bg-white p-4 text-sm leading-7 text-[#06201c] outline-none focus:border-[#1f6a58]" />{activePage.blocks.map((block) => <div key={block.id} className="mt-3 rounded-lg border border-[#e1ebe6] bg-white p-3"><div className="flex items-center justify-between"><p className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7f9d94]">Image in this page</p><button type="button" onClick={() => updatePage({ blocks: activePage.blocks.filter((item) => item.id !== block.id) })} className="text-[11px] font-bold text-[#b42318]">Remove</button></div><div className="mt-2 grid gap-2 sm:grid-cols-2"><input value={block.url} onChange={(event) => updateImage(block.id, { url: event.target.value })} placeholder="Upload image or paste image URL" className="h-9 rounded-lg border border-[#d7e5df] px-2 text-xs" /><input value={block.altText} onChange={(event) => updateImage(block.id, { altText: event.target.value })} placeholder="Alt text for accessibility" className="h-9 rounded-lg border border-[#d7e5df] px-2 text-xs" /></div>{block.url ? <img src={block.url} alt={block.altText} className="mt-3 max-h-56 rounded-lg object-contain" /> : <p className="mt-2 text-[10px] text-[#7f9d94]">The image preview will appear here.</p>}</div>)}</div>}</section></div></div>;
}

function EbookRichContentEditor({ draft, onChange }: { draft: EbookDraft; onChange: (draft: EbookDraft) => void }) {
  const [activePageId, setActivePageId] = useState(draft.pages[0]?.id ?? 1);
  const [previewing, setPreviewing] = useState(false);
  const activePage = draft.pages.find((page) => page.id === activePageId) ?? draft.pages[0];
  if (!activePage) return null;
  const update = (patch: Partial<EbookDraft>) => onChange({ ...draft, ...patch });
  const updatePage = (patch: Partial<EbookPageDraft>) => update({ pages: draft.pages.map((page) => page.id === activePage.id ? { ...page, ...patch } : page) });
  const runCommand = (command: string, value?: string) => {
    const isListCommand = command === "insertUnorderedList" || command === "insertOrderedList";
    document.execCommand("styleWithCSS", false, isListCommand ? "false" : "true");
    document.execCommand(command, false, value);
  };
  const insertHtml = (html: string) => { document.execCommand("insertHTML", false, html); };
  const addImage = () => updatePage({ blocks: [...activePage.blocks, emptyEbookBlock("image")] });
  const updateImage = (id: number, patch: Partial<EbookBlock>) => updatePage({ blocks: activePage.blocks.map((block) => block.id === id ? { ...block, ...patch } : block) });
  const addPage = () => { const page = { id: Date.now(), title: `Page ${draft.pages.length + 1}`, content: "", blocks: [] }; update({ pages: [...draft.pages, page] }); setActivePageId(page.id); setPreviewing(false); };
  return <div className="rounded-2xl border border-[#b7d5c8] bg-[#f4fbf6] p-3 sm:p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-extrabold text-[#06201c]">eBook rich text editor</p><p className="mt-1 text-[11px] leading-5 text-[#52736a]">Write and format the whole page in one editor, then place images within the same page.</p></div><button type="button" onClick={addPage} className="rounded-full bg-[#1f6a58] px-3 py-2 text-[11px] font-extrabold text-white">+ Add page</button></div><div className="mt-4 grid gap-3 lg:grid-cols-[170px_minmax(0,1fr)]"><aside className="rounded-xl border border-[#d7e5df] bg-white p-2"><p className="px-2 pb-2 text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7f9d94]">Pages / TOC</p><div className="space-y-1">{draft.pages.map((page, index) => <button key={page.id} type="button" onClick={() => { setActivePageId(page.id); setPreviewing(false); }} className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[11px] font-extrabold ${activePage.id === page.id ? "bg-[#e8f6ee] text-[#1f6a58]" : "text-[#52736a] hover:bg-[#f4faf7]"}`}><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#eff8f2] text-[10px]">{index + 1}</span><span className="truncate">{page.title || `Page ${index + 1}`}</span></button>)}</div><button type="button" onClick={addPage} className="mt-3 w-full rounded-lg border border-dashed border-[#b7d5c8] px-2 py-2 text-[11px] font-bold text-[#1f6a58]">+ Add page</button></aside><section className="rounded-xl border border-[#d7e5df] bg-white p-3 sm:p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7f9d94]">Page {draft.pages.findIndex((page) => page.id === activePage.id) + 1}</p><p className="mt-1 text-xs font-bold text-[#52736a]">Complete writing and formatting workspace</p></div><div className="flex gap-2"><button type="button" onClick={() => setPreviewing((value) => !value)} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-[11px] font-bold text-[#1f6a58]">{previewing ? "Edit page" : "Preview page"}</button><button type="button" disabled={draft.pages.length === 1} onClick={() => { const pages = draft.pages.filter((page) => page.id !== activePage.id); update({ pages }); setActivePageId(pages[0].id); }} className="rounded-full border border-[#f0c7c2] px-3 py-1.5 text-[11px] font-bold text-[#b42318] disabled:opacity-40">Remove page</button></div></div>{previewing ? <div className="mt-4 rounded-xl border border-[#e1ebe6] bg-[#fbfdfb] p-4"><h3 className="text-lg font-extrabold text-[#06201c]">{activePage.title || "Untitled page"}</h3><div className="prose prose-sm mt-3 max-w-none text-[#52736a]" dangerouslySetInnerHTML={{ __html: activePage.content || "<p>This page does not have content yet.</p>" }} />{activePage.blocks.map((block) => block.url ? <img key={block.id} src={block.url} alt={block.altText} className="mt-4 max-h-72 rounded-lg object-contain" /> : null)}</div> : <div className="mt-4 rounded-xl border-2 border-[#b7d5c8] bg-[#fbfdfb] p-3"><label className="block text-[11px] font-extrabold text-[#52736a]">Page title<input value={activePage.title} onChange={(event) => updatePage({ title: event.target.value })} placeholder="Chapter introduction" className="mt-1.5 h-10 w-full rounded-lg border border-[#d7e5df] bg-white px-3 text-sm font-semibold text-[#06201c]" /></label><div className="mt-3 flex flex-wrap gap-1.5 border-y border-[#e1ebe6] py-2"><button type="button" onClick={() => runCommand("formatBlock", "h2")} className="rounded border border-[#d7e5df] bg-white px-2 py-1 text-[10px] font-bold">Heading</button><button type="button" onClick={() => runCommand("formatBlock", "h3")} className="rounded border border-[#d7e5df] bg-white px-2 py-1 text-[10px] font-bold">Subheading</button><button type="button" onClick={() => runCommand("formatBlock", "p")} className="rounded border border-[#d7e5df] bg-white px-2 py-1 text-[10px]">Paragraph</button><button type="button" onClick={() => runCommand("insertUnorderedList")} className="rounded border border-[#d7e5df] bg-white px-2 py-1 text-[10px]">Bulleted list</button><button type="button" onClick={() => runCommand("insertOrderedList")} className="rounded border border-[#d7e5df] bg-white px-2 py-1 text-[10px]">1. List</button><button type="button" onClick={() => insertHtml("<blockquote>Important quote</blockquote>")} className="rounded border border-[#d7e5df] bg-white px-2 py-1 text-[10px]">Quote</button><button type="button" onClick={() => insertHtml("<table><tbody><tr><td>Cell 1</td><td>Cell 2</td></tr><tr><td>Cell 3</td><td>Cell 4</td></tr></tbody></table>")} className="rounded border border-[#d7e5df] bg-white px-2 py-1 text-[10px]">Table</button><button type="button" onClick={() => insertHtml("<hr />")} className="rounded border border-[#d7e5df] bg-white px-2 py-1 text-[10px]">Divider</button><button type="button" onClick={() => insertHtml("<pre><code>Reference or code</code></pre>")} className="rounded border border-[#d7e5df] bg-white px-2 py-1 text-[10px]">Code</button><button type="button" onClick={() => runCommand("bold")} className="rounded border border-[#d7e5df] bg-white px-2 py-1 text-[10px] font-bold">B</button><button type="button" onClick={() => runCommand("italic")} className="rounded border border-[#d7e5df] bg-white px-2 py-1 text-[10px] italic">I</button><button type="button" onClick={() => runCommand("underline")} className="rounded border border-[#d7e5df] bg-white px-2 py-1 text-[10px] underline">U</button><button type="button" onClick={() => runCommand("justifyLeft")} className="rounded border border-[#d7e5df] bg-white px-2 py-1 text-[10px]">Left</button><button type="button" onClick={() => runCommand("justifyCenter")} className="rounded border border-[#d7e5df] bg-white px-2 py-1 text-[10px]">Center</button><button type="button" onClick={() => runCommand("justifyRight")} className="rounded border border-[#d7e5df] bg-white px-2 py-1 text-[10px]">Right</button><select onChange={(event) => runCommand("fontSize", event.target.value)} defaultValue="3" className="h-6 rounded border border-[#d7e5df] text-[10px]"><option value="2">Small</option><option value="3">Normal</option><option value="5">Large</option><option value="7">Huge</option></select><input type="color" title="Text color" onChange={(event) => runCommand("foreColor", event.target.value)} className="h-6 w-7 rounded border border-[#d7e5df]" /><input type="color" title="Highlight color" onChange={(event) => runCommand("hiliteColor", event.target.value)} className="h-6 w-7 rounded border border-[#d7e5df]" /><button type="button" onClick={() => { const url = window.prompt("Enter link URL"); if (url) runCommand("createLink", url); }} className="rounded border border-[#d7e5df] bg-white px-2 py-1 text-[10px] text-[#1f6a58]">Link</button><button type="button" onClick={() => runCommand("undo")} className="rounded border border-[#d7e5df] bg-white px-2 py-1 text-[10px]">Undo</button><button type="button" onClick={() => runCommand("redo")} className="rounded border border-[#d7e5df] bg-white px-2 py-1 text-[10px]">Redo</button><button type="button" onClick={addImage} className="rounded bg-[#1f6a58] px-2 py-1 text-[10px] font-bold text-white">+ Image</button></div><div contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={{ __html: activePage.content }} onInput={(event) => updatePage({ content: event.currentTarget.innerHTML })} className="mt-3 min-h-[340px] rounded-lg border border-[#d7e5df] bg-white p-4 text-sm leading-7 text-[#06201c] outline-none focus:border-[#1f6a58]" data-placeholder="Write the page content here..." />{activePage.blocks.map((block) => <div key={block.id} className="mt-3 rounded-lg border border-[#e1ebe6] bg-white p-3"><div className="flex items-center justify-between"><p className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7f9d94]">Image inserted in this page</p><button type="button" onClick={() => updatePage({ blocks: activePage.blocks.filter((item) => item.id !== block.id) })} className="text-[11px] font-bold text-[#b42318]">Remove</button></div><div className="mt-2 grid gap-2 sm:grid-cols-2"><input value={block.url} onChange={(event) => updateImage(block.id, { url: event.target.value })} placeholder="Upload image or paste image URL" className="h-9 rounded-lg border border-[#d7e5df] px-2 text-xs" /><input value={block.altText} onChange={(event) => updateImage(block.id, { altText: event.target.value })} placeholder="Alt text for accessibility" className="h-9 rounded-lg border border-[#d7e5df] px-2 text-xs" /></div>{block.url ? <img src={block.url} alt={block.altText} className="mt-3 max-h-56 rounded-lg object-contain" /> : <p className="mt-2 text-[10px] text-[#7f9d94]">The image preview will appear here.</p>}</div>)}</div>}</section></div></div>;
}

function StableEbookTextSurface({ value, onCommit }: { value: string; onCommit: (value: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) editorRef.current.innerHTML = value;
  }, [value]);
  return <div ref={editorRef} contentEditable suppressContentEditableWarning onBlur={() => onCommit(editorRef.current?.innerHTML ?? "")} className="mt-3 min-h-[340px] rounded-lg border border-[#d7e5df] bg-white p-4 text-sm leading-7 text-[#06201c] outline-none focus:border-[#1f6a58]" data-placeholder="Write the page content here..." />;
}

function EbookStableEditor({ draft, onChange }: { draft: EbookDraft; onChange: (draft: EbookDraft) => void }) {
  const [activePageId, setActivePageId] = useState(draft.pages[0]?.id ?? 1);
  const activePage = draft.pages.find((page) => page.id === activePageId) ?? draft.pages[0];
  if (!activePage) return null;
  const update = (patch: Partial<EbookDraft>) => onChange({ ...draft, ...patch });
  const updatePage = (patch: Partial<EbookPageDraft>) => update({ pages: draft.pages.map((page) => page.id === activePage.id ? { ...page, ...patch } : page) });
  const command = (name: string, value?: string) => document.execCommand(name, false, value);
  const insert = (html: string) => document.execCommand("insertHTML", false, html);
  const addPage = () => { const page = { id: Date.now(), title: `Page ${draft.pages.length + 1}`, content: "", blocks: [] }; update({ pages: [...draft.pages, page] }); setActivePageId(page.id); };
  const addImage = () => updatePage({ blocks: [...activePage.blocks, emptyEbookBlock("image")] });
  return <div className="rounded-2xl border border-[#b7d5c8] bg-[#f4fbf6] p-3 sm:p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-extrabold text-[#06201c]">eBook editor</p><p className="mt-1 text-[11px] text-[#52736a]">The cursor stays in place while you type. Content saves when you leave the editor.</p></div><button type="button" onClick={addPage} className="rounded-full bg-[#1f6a58] px-3 py-2 text-[11px] font-extrabold text-white">+ Add page</button></div><div className="mt-4 grid gap-3 lg:grid-cols-[170px_minmax(0,1fr)]"><aside className="rounded-xl border border-[#d7e5df] bg-white p-2"><p className="px-2 pb-2 text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7f9d94]">Pages / TOC</p>{draft.pages.map((page, index) => <button key={page.id} type="button" onClick={() => setActivePageId(page.id)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[11px] font-extrabold ${activePage.id === page.id ? "bg-[#e8f6ee] text-[#1f6a58]" : "text-[#52736a]"}`}><span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#eff8f2] text-[10px]">{index + 1}</span><span className="truncate">{page.title || `Page ${index + 1}`}</span></button>)}</aside><section className="rounded-xl border border-[#d7e5df] bg-white p-3"><label className="block text-[11px] font-extrabold text-[#52736a]">Page title<input value={activePage.title} onChange={(event) => updatePage({ title: event.target.value })} className="mt-1.5 h-10 w-full rounded-lg border border-[#d7e5df] px-3 text-sm font-semibold" /></label><div className="mt-3 flex flex-wrap gap-1.5 border-y border-[#e1ebe6] py-2"><button type="button" onClick={() => command("formatBlock", "h2")} className="rounded border px-2 py-1 text-[10px] font-bold">Heading</button><button type="button" onClick={() => command("formatBlock", "h3")} className="rounded border px-2 py-1 text-[10px] font-bold">Subheading</button><button type="button" onClick={() => command("insertUnorderedList")} className="rounded border px-2 py-1 text-[10px]">Bulleted list</button><button type="button" onClick={() => command("insertOrderedList")} className="rounded border px-2 py-1 text-[10px]">1. List</button><button type="button" onClick={() => insert("<blockquote>Important quote</blockquote>")} className="rounded border px-2 py-1 text-[10px]">Quote</button><button type="button" onClick={() => insert("<table style='width:100%;border-collapse:collapse;margin:12px 0'><thead><tr><th style='border:1px solid #b7d5c8;padding:8px;text-align:left'>Heading 1</th><th style='border:1px solid #b7d5c8;padding:8px;text-align:left'>Heading 2</th></tr></thead><tbody><tr><td style='border:1px solid #b7d5c8;padding:8px'>Cell 1</td><td style='border:1px solid #b7d5c8;padding:8px'>Cell 2</td></tr></tbody></table><p><br></p>") } className="rounded border px-2 py-1 text-[10px]">Table</button><button type="button" onClick={() => insert("<hr />")} className="rounded border px-2 py-1 text-[10px]">Divider</button><button type="button" onClick={() => insert("<pre><code>Reference or code</code></pre>")} className="rounded border px-2 py-1 text-[10px]">Code</button><button type="button" onClick={() => command("bold")} className="rounded border px-2 py-1 text-[10px] font-bold">B</button><button type="button" onClick={() => command("italic")} className="rounded border px-2 py-1 text-[10px] italic">I</button><button type="button" onClick={() => command("underline")} className="rounded border px-2 py-1 text-[10px] underline">U</button><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => command("justifyLeft")} className="rounded border px-2 py-1 text-[10px]">Left</button><button type="button" onClick={() => command("justifyCenter")} className="rounded border px-2 py-1 text-[10px]">Center</button><button type="button" onClick={() => command("justifyRight")} className="rounded border px-2 py-1 text-[10px]">Right</button><input type="color" title="Text color" onChange={(event) => command("foreColor", event.target.value)} className="h-6 w-7" /><input type="color" title="Highlight" onChange={(event) => command("hiliteColor", event.target.value)} className="h-6 w-7" /><button type="button" onClick={() => command("undo")} className="rounded border px-2 py-1 text-[10px]">Undo</button><button type="button" onClick={() => command("redo")} className="rounded border px-2 py-1 text-[10px]">Redo</button><button type="button" onClick={addImage} className="rounded bg-[#1f6a58] px-2 py-1 text-[10px] font-bold text-white">+ Image</button></div><StableEbookTextSurface value={activePage.content} onCommit={(content) => updatePage({ content })} />{activePage.blocks.map((block) => <div key={block.id} className="mt-3 rounded-lg border border-[#e1ebe6] p-3"><p className="text-[10px] font-extrabold uppercase text-[#7f9d94]">Image in this page</p><div className="mt-2 grid gap-2 sm:grid-cols-2"><input value={block.url} onChange={(event) => updatePage({ blocks: activePage.blocks.map((item) => item.id === block.id ? { ...item, url: event.target.value } : item) })} placeholder="Image URL" className="h-9 rounded border px-2 text-xs" /><input value={block.altText} onChange={(event) => updatePage({ blocks: activePage.blocks.map((item) => item.id === block.id ? { ...item, altText: event.target.value } : item) })} placeholder="Alt text" className="h-9 rounded border px-2 text-xs" /></div>{block.url ? <img src={block.url} alt={block.altText} className="mt-2 max-h-48 rounded object-contain" /> : null}</div>)}</section></div></div>;
}

function EbookImageEditingEditor({ draft, onChange }: { draft: EbookDraft; onChange: (draft: EbookDraft) => void }) {
  const [activePageId, setActivePageId] = useState(draft.pages[0]?.id ?? 1);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const activePage = draft.pages.find((page) => page.id === activePageId) ?? draft.pages[0];
  if (!activePage) return null;
  const update = (patch: Partial<EbookDraft>) => onChange({ ...draft, ...patch });
  const updatePage = (patch: Partial<EbookPageDraft>) => update({ pages: draft.pages.map((page) => page.id === activePage.id ? { ...page, ...patch } : page) });
  const updateImage = (id: number, patch: Partial<EbookBlock>) => updatePage({ blocks: activePage.blocks.map((block) => block.id === id ? { ...block, ...patch } : block) });
  const addPage = () => { const page = { id: Date.now(), title: `Page ${draft.pages.length + 1}`, content: "", blocks: [] }; update({ pages: [...draft.pages, page] }); setActivePageId(page.id); };
  const addImage = () => updatePage({ blocks: [...activePage.blocks, { ...emptyEbookBlock("image"), imageSize: "full", imageFit: "contain", imagePosition: "center" }] });
  const uploadImage = async (id: number, file: File) => { setUploadingId(id); try { const uploaded = await uploadTrainingMedia(file, "image"); updateImage(id, { url: uploaded.url, caption: uploaded.name }); } finally { setUploadingId(null); } };
  return <div className="rounded-2xl border border-[#b7d5c8] bg-[#f4fbf6] p-3 sm:p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-extrabold text-[#06201c]">eBook image editor</p><p className="mt-1 text-[11px] text-[#52736a]">Images appear in the page flow. Upload, resize, crop, reposition, and add accessible text.</p></div><button type="button" onClick={addPage} className="rounded-full bg-[#1f6a58] px-3 py-2 text-[11px] font-extrabold text-white">+ Add page</button></div><div className="mt-4 grid gap-3 lg:grid-cols-[170px_minmax(0,1fr)]"><aside className="rounded-xl border border-[#d7e5df] bg-white p-2"><p className="px-2 pb-2 text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7f9d94]">Pages / TOC</p>{draft.pages.map((page, index) => <button key={page.id} type="button" onClick={() => setActivePageId(page.id)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[11px] font-extrabold ${activePage.id === page.id ? "bg-[#e8f6ee] text-[#1f6a58]" : "text-[#52736a]"}`}><span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#eff8f2] text-[10px]">{index + 1}</span><span className="truncate">{page.title || `Page ${index + 1}`}</span></button>)}</aside><section className="rounded-xl border border-[#d7e5df] bg-white p-3"><input value={activePage.title} onChange={(event) => updatePage({ title: event.target.value })} placeholder="Page title" className="h-10 w-full rounded-lg border border-[#d7e5df] px-3 text-sm font-semibold" /><div contentEditable suppressContentEditableWarning onBlur={(event) => updatePage({ content: event.currentTarget.innerHTML })} dangerouslySetInnerHTML={{ __html: activePage.content }} className="mt-3 min-h-40 rounded-lg border border-[#d7e5df] p-4 text-sm leading-7 outline-none focus:border-[#1f6a58]" data-placeholder="Write your page content..." /><div className="mt-3 flex items-center justify-between border-t border-[#e1ebe6] pt-3"><p className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7f9d94]">Images in this page</p><button type="button" onClick={addImage} className="rounded-full bg-[#1f6a58] px-3 py-1.5 text-[10px] font-bold text-white">+ Add image</button></div>{activePage.blocks.map((block) => <div key={block.id} className="mt-3 rounded-xl border border-[#e1ebe6] bg-[#fbfdfb] p-3"><div className="flex items-center justify-between"><p className="text-[10px] font-extrabold uppercase text-[#7f9d94]">Inline image</p><button type="button" onClick={() => updatePage({ blocks: activePage.blocks.filter((item) => item.id !== block.id) })} className="text-[11px] font-bold text-[#b42318]">Remove</button></div>{block.url ? <div className="mt-3 overflow-hidden rounded-lg border border-[#d7e5df] bg-white p-2" style={{ width: block.imageSize === "small" ? "45%" : block.imageSize === "medium" ? "70%" : "100%", marginInline: "auto" }}><img src={block.url} alt={block.altText} className="w-full" style={{ aspectRatio: block.imageFit === "cover" ? "16 / 9" : "auto", objectFit: block.imageFit, objectPosition: block.imagePosition }} /></div> : <p className="mt-2 rounded-lg bg-[#fff8e8] px-3 py-2 text-xs text-[#8a5a00]">Upload an image to place it on this page.</p>}<div className="mt-3 grid gap-2 sm:grid-cols-2"><label className="block text-[10px] font-bold text-[#52736a]">Image file<input type="file" accept="image/*" disabled={uploadingId === block.id} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(block.id, file); }} className="mt-1 block w-full text-[10px]" />{uploadingId === block.id ? <span className="text-[#1f6a58]">Uploading...</span> : null}</label><label className="block text-[10px] font-bold text-[#52736a]">Image URL<input value={block.url} onChange={(event) => updateImage(block.id, { url: event.target.value })} placeholder="Paste image URL" className="mt-1 h-9 w-full rounded-lg border border-[#d7e5df] px-2 text-xs" /></label><label className="block text-[10px] font-bold text-[#52736a]">Size<select value={block.imageSize ?? "full"} onChange={(event) => updateImage(block.id, { imageSize: event.target.value as EbookBlock["imageSize"] })} className="mt-1 h-9 w-full rounded-lg border border-[#d7e5df] bg-white px-2 text-xs"><option value="small">Small</option><option value="medium">Medium</option><option value="full">Full width</option></select></label><label className="block text-[10px] font-bold text-[#52736a]">Crop<select value={block.imageFit ?? "contain"} onChange={(event) => updateImage(block.id, { imageFit: event.target.value as EbookBlock["imageFit"] })} className="mt-1 h-9 w-full rounded-lg border border-[#d7e5df] bg-white px-2 text-xs"><option value="contain">Show full image</option><option value="cover">Crop to 16:9</option></select></label><label className="block text-[10px] font-bold text-[#52736a]">Crop position<select value={block.imagePosition ?? "center"} onChange={(event) => updateImage(block.id, { imagePosition: event.target.value })} className="mt-1 h-9 w-full rounded-lg border border-[#d7e5df] bg-white px-2 text-xs"><option value="center">Center</option><option value="top">Top</option><option value="bottom">Bottom</option><option value="left">Left</option><option value="right">Right</option></select></label><label className="block text-[10px] font-bold text-[#52736a]">Alt text<input value={block.altText} onChange={(event) => updateImage(block.id, { altText: event.target.value })} placeholder="Describe the image" className="mt-1 h-9 w-full rounded-lg border border-[#d7e5df] px-2 text-xs" /></label><label className="block text-[10px] font-bold text-[#52736a] sm:col-span-2">Caption<input value={block.caption} onChange={(event) => updateImage(block.id, { caption: event.target.value })} placeholder="Optional caption" className="mt-1 h-9 w-full rounded-lg border border-[#d7e5df] px-2 text-xs" /></label></div></div>)}</section></div></div>;
}

function EbookCursorImageEditor({ draft, onChange }: { draft: EbookDraft; onChange: (draft: EbookDraft) => void }) {
  const [activePageId, setActivePageId] = useState(draft.pages[0]?.id ?? 1);
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedRange = useRef<Range | null>(null);
  const activePage = draft.pages.find((page) => page.id === activePageId) ?? draft.pages[0];
  useEffect(() => {
    if (editorRef.current && activePage && editorRef.current.innerHTML !== activePage.content) {
      editorRef.current.innerHTML = activePage.content;
    }
    setSelectedImage(null);
    savedRange.current = null;
  }, [activePageId, activePage?.content]);
  useEffect(() => {
    const toolbar = editorRef.current?.previousElementSibling;
    if (!toolbar) return;
    toolbar.setAttribute("aria-label", "eBook formatting toolbar");
    toolbar.classList.add("rounded-lg", "bg-[#f8fcf9]", "px-2");
    const hoverClasses = "transition-colors hover:border-[#1f6a58] hover:bg-[#e8f6ee] hover:text-[#1f6a58] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6a58]";
    toolbar.querySelectorAll<HTMLElement>("button, select, input").forEach((control) => control.classList.add(...hoverClasses.split(" ")));
    const groups = [
      { start: 0, label: "Content blocks" },
      { start: 8, label: "Text formatting" },
      { start: 11, label: "Text size" },
      { start: 12, label: "Text color" },
      { start: 13, label: "Highlight color" },
      { start: 14, label: "Alignment" },
      { start: 17, label: "History" },
      { start: 19, label: "Media" },
    ];
    const controls = Array.from(toolbar.querySelectorAll<HTMLElement>("button, select, input"));
    groups.forEach(({ start, label }) => {
      const control = controls[start];
      if (!control) return;
      control.classList.add("ml-1", "border-l", "border-[#d7e5df]", "pl-2");
      control.setAttribute("title", label);
      control.setAttribute("aria-label", label);
    });
  }, []);
  useEffect(() => {
    const rememberSelection = () => {
      const selection = window.getSelection();
      if (selection?.rangeCount && editorRef.current?.contains(selection.anchorNode)) savedRange.current = selection.getRangeAt(0).cloneRange();
    };
    document.addEventListener("selectionchange", rememberSelection);
    return () => document.removeEventListener("selectionchange", rememberSelection);
  }, []);
  if (!activePage) return null;
  const update = (patch: Partial<EbookDraft>) => onChange({ ...draft, ...patch });
  const updatePage = (content: string) => update({ pages: draft.pages.map((page) => page.id === activePage.id ? { ...page, content } : page) });
  const saveSelection = () => { const selection = window.getSelection(); if (selection?.rangeCount) savedRange.current = selection.getRangeAt(0).cloneRange(); };
  const restoreSelection = () => { if (!savedRange.current) return; const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(savedRange.current); editorRef.current?.focus(); };
  const openImageUpload = () => { saveSelection(); fileInputRef.current?.click(); };
  const uploadImageAtCursor = async (file: File) => { const uploaded = await uploadTrainingMedia(file, "image"); restoreSelection(); document.execCommand("insertHTML", false, `<img src="${uploaded.url}" alt="" style="max-width:100%;width:100%;height:auto;display:block;margin:16px 0;" />`); if (editorRef.current) updatePage(editorRef.current.innerHTML); };
  const setImageStyle = (style: Partial<CSSStyleDeclaration>) => { if (!selectedImage) return; Object.assign(selectedImage.style, style); if (editorRef.current) updatePage(editorRef.current.innerHTML); };
  const addPage = () => { const page = { id: Date.now(), title: `Page ${draft.pages.length + 1}`, content: "", blocks: [] }; update({ pages: [...draft.pages, page] }); setActivePageId(page.id); };
  return <div className="rounded-2xl border border-[#b7d5c8] bg-[#f4fbf6] p-3 sm:p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-extrabold text-[#06201c]">eBook inline editor</p><p className="mt-1 text-[11px] text-[#52736a]">Place the cursor anywhere, upload an image, then continue writing around it.</p></div><button type="button" onClick={addPage} className="rounded-full bg-[#1f6a58] px-3 py-2 text-[11px] font-extrabold text-white">+ Add page</button></div><div className="mt-4 grid gap-3 lg:grid-cols-[170px_minmax(0,1fr)]"><aside className="rounded-xl border border-[#d7e5df] bg-white p-2"><p className="px-2 pb-2 text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7f9d94]">Pages / TOC</p>{draft.pages.map((page, index) => <button key={page.id} type="button" onClick={() => setActivePageId(page.id)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[11px] font-extrabold ${activePage.id === page.id ? "bg-[#e8f6ee] text-[#1f6a58]" : "text-[#52736a]"}`}><span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#eff8f2] text-[10px]">{index + 1}</span><span className="truncate">{page.title || `Page ${index + 1}`}</span></button>)}</aside><section className="rounded-xl border border-[#d7e5df] bg-white p-3"><input value={activePage.title} onChange={(event) => update({ pages: draft.pages.map((page) => page.id === activePage.id ? { ...page, title: event.target.value } : page) })} placeholder="Page title" className="h-10 w-full rounded-lg border border-[#d7e5df] px-3 text-sm font-semibold" /><div className="mt-3 flex flex-wrap gap-2 border-y border-[#e1ebe6] py-2"><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={openImageUpload} className="rounded-full bg-[#1f6a58] px-3 py-1.5 text-[10px] font-bold text-white">+ Image</button><span className="self-center text-[10px] text-[#7f9d94]">Click an image after inserting it to edit size and crop.</span><input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImageAtCursor(file); event.currentTarget.value = ""; }} /></div><div ref={editorRef} contentEditable suppressContentEditableWarning onClick={(event) => { const image = (event.target as HTMLElement).closest("img"); setSelectedImage(image); }} onBlur={() => { if (editorRef.current) updatePage(editorRef.current.innerHTML); }} className="mt-3 min-h-[420px] rounded-lg border border-[#d7e5df] bg-white p-4 text-sm leading-7 text-[#06201c] outline-none focus:border-[#1f6a58]" data-placeholder="Write your page content here..." />{selectedImage ? <div className="mt-3 rounded-lg border border-[#b7d5c8] bg-[#f4fbf6] p-3"><p className="text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7f9d94]">Selected image controls</p><div className="mt-2 flex flex-wrap gap-2"><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setImageStyle({ width: "45%", height: "auto", objectFit: "contain" })} className="rounded border bg-white px-2 py-1 text-[10px]">Small</button><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setImageStyle({ width: "70%", height: "auto", objectFit: "contain" })} className="rounded border bg-white px-2 py-1 text-[10px]">Medium</button><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setImageStyle({ width: "100%", height: "auto", objectFit: "contain" })} className="rounded border bg-white px-2 py-1 text-[10px]">Full width</button><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setImageStyle({ width: "100%", height: "260px", objectFit: "cover", objectPosition: "center" })} className="rounded border bg-white px-2 py-1 text-[10px]">Crop 16:9</button><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setImageStyle({ objectPosition: "top" })} className="rounded border bg-white px-2 py-1 text-[10px]">Top</button><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setImageStyle({ objectPosition: "center" })} className="rounded border bg-white px-2 py-1 text-[10px]">Center</button><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setImageStyle({ objectPosition: "bottom" })} className="rounded border bg-white px-2 py-1 text-[10px]">Bottom</button></div></div> : null}</section></div></div>;
}

function EbookCompleteEditor({ draft, onChange, imageUploadFieldKeys, onUploadStateChange }: { draft: EbookDraft; onChange: (draft: EbookDraft) => void; imageUploadFieldKeys: readonly string[]; onUploadStateChange?: (pending: boolean) => void }) {
  const [activePageId, setActivePageId] = useState(draft.pages[0]?.id ?? 1);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [selectedImageCaption, setSelectedImageCaption] = useState("");
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [imageUploadPending, setImageUploadPending] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedRange = useRef<Range | null>(null);
  const imageObjectUrlsRef = useRef<string[]>([]);
  const activePage = draft.pages.find((page) => page.id === activePageId) ?? draft.pages[0];
  const activePageRef = useRef(activePage);
  activePageRef.current = activePage;
  useEffect(() => {
    const editor = editorRef.current;
    const page = activePageRef.current;
    if (!editor || !page || editor.dataset.ebookPageId === String(page.id)) return;
    // Keep React from replacing the editable DOM after every keystroke. That
    // would invalidate saved selections and make subsequent formatting fail.
    editor.dataset.ebookPageId = String(page.id);
    editor.innerHTML = page.content;
    let disposed = false;
    const editorImages = Array.from(editor.querySelectorAll<HTMLImageElement>("img"));
    const loadImages = async () => {
      await Promise.all(editorImages.map(async (image) => {
        const source = image.dataset.assetUrl || image.getAttribute("src") || "";
        if (!source || source.startsWith("blob:")) return;
        try {
          const response = await authenticatedFetch(source, { credentials: "include", cache: "no-store" });
          if (!response.ok) return;
          const objectUrl = URL.createObjectURL(await response.blob());
          if (disposed) {
            URL.revokeObjectURL(objectUrl);
            return;
          }
          imageObjectUrlsRef.current.push(objectUrl);
          image.src = objectUrl;
        } catch {
          // Keep the protected URL in place so the browser can show its alt text.
        }
      }));
    };
    void loadImages();
    return () => {
      disposed = true;
      imageObjectUrlsRef.current.splice(0).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [activePageId]);
  useEffect(() => {
    setSelectedImageId(null);
    setSelectedImageCaption("");
    savedRange.current = null;
  }, [activePageId]);
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.setAttribute("aria-label", "Page content editor");
    editor.style.minHeight = "420px";
    editor.style.display = "block";
    editor.style.boxSizing = "border-box";
    editor.style.border = "1px solid #d7e5df";
    editor.style.borderRadius = "8px";
    editor.style.backgroundColor = "#ffffff";
    editor.style.padding = "16px";
    editor.style.overflowWrap = "anywhere";
    const initialiseEmptyPage = () => {
      if (editor.innerHTML.trim()) return;
      editor.innerHTML = "<p><br></p>";
    };
    editor.addEventListener("focus", initialiseEmptyPage);
    return () => editor.removeEventListener("focus", initialiseEmptyPage);
  }, [activePageId]);
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const handleEnter = (event: KeyboardEvent) => {
      if (event.key !== "Enter") return;
      const selection = window.getSelection();
      if (!selection?.rangeCount) return;
      const range = selection.getRangeAt(0);
      const startElement = range.startContainer.nodeType === Node.ELEMENT_NODE
        ? range.startContainer as HTMLElement
        : range.startContainer.parentElement;
      const quote = startElement?.closest("blockquote");
      if (quote && editor.contains(quote)) {
        event.preventDefault();
        const paragraph = document.createElement("p");
        paragraph.innerHTML = "<br>";
        quote.parentNode?.insertBefore(paragraph, quote.nextSibling);
        const nextRange = document.createRange();
        nextRange.selectNodeContents(paragraph);
        nextRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(nextRange);
        savedRange.current = nextRange.cloneRange();
        updatePage(editor.innerHTML);
        return;
      }
      const listItem = startElement?.closest("li");
      if (listItem && editor.contains(listItem) && !listItem.textContent?.trim() && range.collapsed) {
        event.preventDefault();
        const list = listItem.parentElement;
        const paragraph = document.createElement("p");
        paragraph.innerHTML = "<br>";
        list?.parentNode?.insertBefore(paragraph, list.nextSibling);
        listItem.remove();
        if (list && !list.children.length) list.remove();
        const nextRange = document.createRange();
        nextRange.selectNodeContents(paragraph);
        nextRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(nextRange);
        savedRange.current = nextRange.cloneRange();
        updatePage(editor.innerHTML);
        return;
      }
      const heading = startElement?.closest("h1, h2, h3, h4, h5, h6");
      if (!heading || !editor.contains(heading)) return;
      event.preventDefault();
      const paragraph = document.createElement("p");
      paragraph.innerHTML = "<br>";
      heading.parentNode?.insertBefore(paragraph, heading.nextSibling);
      const nextRange = document.createRange();
      nextRange.selectNodeContents(paragraph);
      nextRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(nextRange);
      savedRange.current = nextRange.cloneRange();
      updatePage(editor.innerHTML);
    };
    editor.addEventListener("keydown", handleEnter);
    return () => editor.removeEventListener("keydown", handleEnter);
  }, [activePageId]);
  useEffect(() => {
    const toolbar = editorRef.current?.previousElementSibling;
    if (!toolbar) return;
    toolbar.setAttribute("aria-label", "eBook formatting toolbar");
    toolbar.classList.add("rounded-lg", "bg-[#f8fcf9]", "px-2");
    const hoverClasses = "transition-colors hover:border-[#1f6a58] hover:bg-[#e8f6ee] hover:text-[#1f6a58] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6a58]";
    toolbar.querySelectorAll<HTMLElement>("button, select, input").forEach((control) => control.classList.add(...hoverClasses.split(" ")));
    const groups = [
      { start: 0, label: "Content blocks" },
      { start: 8, label: "Text formatting" },
      { start: 11, label: "Text size" },
      { start: 12, label: "Text color" },
      { start: 13, label: "Highlight color" },
      { start: 14, label: "Alignment" },
      { start: 17, label: "History" },
      { start: 19, label: "Media" },
    ];
    const controls = Array.from(toolbar.querySelectorAll<HTMLElement>("button, select, input"));
    groups.forEach(({ start, label }) => {
      const control = controls[start];
      if (!control) return;
      control.classList.add("ml-1", "border-l", "border-[#d7e5df]", "pl-2");
      control.setAttribute("title", label);
      control.setAttribute("aria-label", label);
    });
  }, []);
  useEffect(() => {
    const rememberSelection = () => {
      const selection = window.getSelection();
      if (selection?.rangeCount && editorRef.current?.contains(selection.anchorNode)) savedRange.current = selection.getRangeAt(0).cloneRange();
    };
    document.addEventListener("selectionchange", rememberSelection);
    return () => document.removeEventListener("selectionchange", rememberSelection);
  }, []);
  if (!activePage) return null;
  const update = (patch: Partial<EbookDraft>) => onChange({ ...draft, ...patch });
  const updatePage = (content: string) => update({ pages: draft.pages.map((page) => page.id === activePage.id ? { ...page, content } : page) });
  const rememberCurrentSelection = () => { const selection = window.getSelection(); if (selection?.rangeCount && editorRef.current?.contains(selection.anchorNode)) savedRange.current = selection.getRangeAt(0).cloneRange(); };
  const markToolbarButton = (label: string) => {
    const toolbar = editorRef.current?.previousElementSibling;
    toolbar?.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
      const active = button.textContent?.trim() === label;
      button.classList.toggle("bg-[#dff3e6]", active);
      button.classList.toggle("border-[#1f6a58]", active);
      button.classList.toggle("text-[#1f6a58]", active);
      button.setAttribute("aria-pressed", String(active));
    });
  };
  const formatCurrentBlock = (tagName: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    restoreSelection();
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    const startElement = range.startContainer.nodeType === Node.ELEMENT_NODE
      ? range.startContainer as HTMLElement
      : range.startContainer.parentElement;
    const block = startElement?.closest("p, div, h1, h2, h3, h4, h5, h6, blockquote, pre, li");
    const target = block && editor.contains(block) ? block : null;
    const replacement = document.createElement(tagName);
    if (tagName === "h2") Object.assign(replacement.style, { fontSize: "1.5rem", lineHeight: "2rem", fontWeight: "800", margin: "0.75rem 0" });
    if (tagName === "h3") Object.assign(replacement.style, { fontSize: "1.25rem", lineHeight: "1.75rem", fontWeight: "700", margin: "0.625rem 0" });
    if (target) {
      while (target.firstChild) replacement.appendChild(target.firstChild);
      target.replaceWith(replacement);
    } else {
      while (editor.firstChild) replacement.appendChild(editor.firstChild);
      editor.appendChild(replacement);
    }
    const nextRange = document.createRange();
    nextRange.selectNodeContents(replacement);
    nextRange.collapse(false);
    selection.removeAllRanges();
    selection.addRange(nextRange);
    savedRange.current = nextRange.cloneRange();
  };
  const command = (name: string, value?: string) => {
    rememberCurrentSelection();
    restoreSelection();
    const isListCommand = name === "insertUnorderedList" || name === "insertOrderedList";
    document.execCommand("styleWithCSS", false, isListCommand ? "false" : "true");
    if (name === "formatBlock" && value) {
      formatCurrentBlock(value);
      markToolbarButton(value === "h3" ? "Subheading" : "Heading");
      if (editorRef.current) updatePage(editorRef.current.innerHTML);
      return;
    }
    if (name === "formatBlock" && value && editorRef.current && !editorRef.current.textContent?.trim()) {
      editorRef.current.innerHTML = `<${value}><br></${value}>`;
      const range = document.createRange();
      range.selectNodeContents(editorRef.current.firstElementChild ?? editorRef.current);
      range.collapse(false);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      savedRange.current = range.cloneRange();
      markToolbarButton(value === "h3" ? "Subheading" : "Heading");
      updatePage(editorRef.current.innerHTML);
      return;
    }
    const before = editorRef.current?.innerHTML;
    const commandValue = name === "formatBlock" && value ? `<${value}>` : value;
    const applied = document.execCommand(name, false, commandValue);
    if (name === "formatBlock" && value && editorRef.current?.innerHTML === before) document.execCommand(name, false, value);
    if (name === "hiliteColor" && !applied) document.execCommand("backColor", false, value);
    if (name === "formatBlock") markToolbarButton(value === "h3" ? "Subheading" : "Heading");
    if (editorRef.current) updatePage(editorRef.current.innerHTML);
  };
  const insert = (html: string) => {
    rememberCurrentSelection();
    restoreSelection();
    document.execCommand("insertHTML", false, html);
    if (editorRef.current && html.includes("<blockquote")) {
      const quotes = editorRef.current.querySelectorAll<HTMLElement>("blockquote");
      const quote = quotes[quotes.length - 1];
      if (quote) {
        Object.assign(quote.style, { borderLeft: "4px solid #83b9a4", paddingLeft: "16px", margin: "16px 0", fontStyle: "italic", color: "#52736a" });
        const quoteRange = document.createRange();
        quoteRange.selectNodeContents(quote);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(quoteRange);
        savedRange.current = quoteRange.cloneRange();
      }
    }
    if (editorRef.current) updatePage(editorRef.current.innerHTML);
  };
  const saveSelection = () => { const selection = window.getSelection(); if (selection?.rangeCount) savedRange.current = selection.getRangeAt(0).cloneRange(); };
  const restoreSelection = () => {
    const editor = editorRef.current;
    if (!editor || !savedRange.current || !editor.contains(savedRange.current.commonAncestorContainer)) return;
    editor.focus();
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(savedRange.current);
  };
  const applyFontSize = (fontSize: string) => {
    const editor = editorRef.current;
    const allowedFontSizes = new Set(["14px", "16px", "20px", "24px", "32px"]);
    if (!editor || !allowedFontSizes.has(fontSize)) return;
    restoreSelection();
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0).cloneRange();
    if (!editor.contains(range.commonAncestorContainer)) return;
    if (range.collapsed) {
      const sizeSpan = document.createElement("span");
      sizeSpan.style.fontSize = fontSize;
      sizeSpan.dataset.fontSizeCaret = "true";
      const placeholder = document.createTextNode("\u00a0");
      sizeSpan.appendChild(placeholder);
      range.insertNode(sizeSpan);
      const caret = document.createRange();
      caret.setStart(placeholder, 0);
      caret.collapse(true);
      selection.removeAllRanges();
      selection.addRange(caret);
      savedRange.current = caret.cloneRange();
    } else {
      // Wrap only the selected text runs. Wrapping an extracted multi-paragraph
      // fragment in a span creates invalid HTML and can move formatting/images.
      const textNodes: Text[] = [];
      const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
      let currentNode = walker.nextNode();
      while (currentNode) {
        const textNode = currentNode as Text;
        if (textNode.data.length > 0 && range.intersectsNode(textNode)) textNodes.push(textNode);
        currentNode = walker.nextNode();
      }
      let firstFormattedText: Text | null = null;
      let lastFormattedText: Text | null = null;
      for (const textNode of textNodes.reverse()) {
        const startOffset = textNode === range.startContainer ? range.startOffset : 0;
        const endOffset = textNode === range.endContainer ? range.endOffset : textNode.length;
        if (endOffset <= startOffset) continue;
        const selectedText = textNode.splitText(startOffset);
        selectedText.splitText(endOffset - startOffset);
        const sizeSpan = document.createElement("span");
        sizeSpan.style.fontSize = fontSize;
        selectedText.replaceWith(sizeSpan);
        sizeSpan.appendChild(selectedText);
        lastFormattedText ??= selectedText;
        firstFormattedText = selectedText;
      }
      if (!firstFormattedText || !lastFormattedText) return;
      // Keep the edited selection available so another size can be chosen
      // immediately without selecting the text again.
      const updatedRange = document.createRange();
      updatedRange.setStart(firstFormattedText, 0);
      updatedRange.setEnd(lastFormattedText, lastFormattedText.length);
      selection.removeAllRanges();
      selection.addRange(updatedRange);
      savedRange.current = updatedRange.cloneRange();
    }
    updatePage(editor.innerHTML);
  };
  const insertImageAtCursor = (src: string) => {
    const editor = editorRef.current;
    if (!editor) return null;
    editor.focus();
    const selection = window.getSelection();
    const range = savedRange.current?.cloneRange() ?? (selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null);
    if (!range || !editor.contains(range.commonAncestorContainer)) {
      const fallbackRange = document.createRange();
      fallbackRange.selectNodeContents(editor);
      fallbackRange.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(fallbackRange);
    } else {
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    const activeRange = selection?.rangeCount ? selection.getRangeAt(0) : range;
    if (!activeRange) return null;
    activeRange.deleteContents();
    const image = document.createElement("img");
    image.src = src;
    image.alt = "eBook image";
    image.dataset.uploading = "true";
    Object.assign(image.style, { maxWidth: "100%", width: "100%", height: "auto", display: "block", margin: "16px 0" });
    activeRange.insertNode(image);
    const afterImage = document.createRange();
    afterImage.setStartAfter(image);
    afterImage.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(afterImage);
    savedRange.current = afterImage.cloneRange();
    return image;
  };
  const uploadImage = async (file: File) => {
    if (imageUploadPending) return;
    setImageUploadError(null);
    setImageUploadPending(true);
    onUploadStateChange?.(true);
    let currentImage: HTMLImageElement | null = null;
    try {
      const localDisplayUrl = URL.createObjectURL(file);
      currentImage = insertImageAtCursor(localDisplayUrl);
      if (!currentImage) {
        URL.revokeObjectURL(localDisplayUrl);
        throw new Error("Place the cursor in the eBook page, then try adding the image again.");
      }
      currentImage.dataset.localDisplayUrl = localDisplayUrl;
      currentImage.dataset.uploading = "true";
      if (imageUploadFieldKeys.length === 0) {
        throw new Error("This Training form has no enabled image upload field. Enable Gallery Images or Primary Image in its form configuration, then try again.");
      }
      let uploaded: Awaited<ReturnType<typeof uploadTrainingMedia>> | null = null;
      let lastFieldError: Error | null = null;
      for (const fieldKey of imageUploadFieldKeys) {
        try {
          uploaded = await uploadTrainingMedia(file, "image", fieldKey);
          break;
        } catch (error) {
          const isFieldConfigurationError = error instanceof TrainingsApiError
            && error.status === 422
            && /field_key|enabled media field|resolved form/i.test(error.message);
          if (!isFieldConfigurationError) throw error;
          lastFieldError = error;
        }
      }
      if (!uploaded) throw lastFieldError ?? new Error("No enabled Training image field accepts this upload.");
      if (!uploaded.asset_id) throw new Error("The image upload succeeded but did not return an asset_id.");
      currentImage.dataset.assetId = uploaded.asset_id;
      currentImage.dataset.assetUrl = uploaded.url;
      currentImage.src = uploaded.url;
      currentImage.alt = file.name.replace(/\.[^.]+$/, "").replace(/[._-]+/g, " ").trim() || "eBook image";
      const localImageUrl = currentImage.dataset.localDisplayUrl;
      if (localImageUrl) URL.revokeObjectURL(localImageUrl);
      currentImage.removeAttribute("data-local-display-url");
      currentImage.removeAttribute("data-uploading");
      currentImage.removeAttribute("data-upload-error");
      if (editorRef.current) {
        const imageBlock: EbookBlock = {
          id: Date.now() + Math.random(),
          type: "image",
          content: "",
          url: uploaded.url,
          altText: currentImage.alt.trim() || "eBook image",
          caption: "",
          assetId: uploaded.asset_id,
        };
        onChange({
          ...draft,
          pages: draft.pages.map((page) => page.id === activePage.id
            ? { ...page, content: editorRef.current?.innerHTML ?? page.content, blocks: [...page.blocks, imageBlock] }
            : page),
        });
      }
    } catch (error) {
      const localImageUrl = currentImage?.dataset.localDisplayUrl;
      if (localImageUrl) URL.revokeObjectURL(localImageUrl);
      currentImage?.remove();
      if (editorRef.current) {
        onChange({
          ...draft,
          pages: draft.pages.map((page) => page.id === activePage.id ? { ...page, content: editorRef.current?.innerHTML ?? page.content } : page),
        });
      }
      setImageUploadError(error instanceof Error ? error.message : "Unable to upload this image. Please try again.");
    } finally {
      setImageUploadPending(false);
      onUploadStateChange?.(false);
    }
  };
  const addPage = () => { const page = { id: Date.now(), title: `Page ${draft.pages.length + 1}`, content: "", blocks: [] }; update({ pages: [...draft.pages, page] }); setActivePageId(page.id); };
  const getSelectedImage = () => selectedImageId && editorRef.current
    ? Array.from(editorRef.current.querySelectorAll<HTMLImageElement>("img[data-ebook-editor-image-id]")).find((image) => image.dataset.ebookEditorImageId === selectedImageId) ?? null
    : null;
  const setImageStyle = (style: Partial<CSSStyleDeclaration>) => {
    const image = getSelectedImage();
    if (!image) return;
    Object.assign(image.style, style);
    if (editorRef.current) updatePage(editorRef.current.innerHTML);
  };
  const selectImage = (image: HTMLImageElement | null) => {
    if (image && !image.dataset.ebookEditorImageId) image.dataset.ebookEditorImageId = `editor-image-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setSelectedImageId(image?.dataset.ebookEditorImageId ?? null);
    setSelectedImageCaption(image?.dataset.caption ?? "");
  };
  const updateSelectedImageMetadata = (value: string) => {
    const image = getSelectedImage();
    if (!image) return;
    image.dataset.caption = value;
    setSelectedImageCaption(value);
    if (editorRef.current) updatePage(editorRef.current.innerHTML);
  };
  return <div className="rounded-2xl border border-[#b7d5c8] bg-[#f4fbf6] p-3 sm:p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-extrabold text-[#06201c]">eBook complete editor</p><p className="mt-1 text-[11px] text-[#52736a]">Write, format, and insert images in one continuous page.</p></div><button type="button" onClick={addPage} disabled={imageUploadPending} className="rounded-full bg-[#1f6a58] px-3 py-2 text-[11px] font-extrabold text-white disabled:opacity-60">+ Add page</button></div><div className="mt-4 grid gap-3 lg:grid-cols-[170px_minmax(0,1fr)]"><aside className="rounded-xl border border-[#d7e5df] bg-white p-2"><p className="px-2 pb-2 text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7f9d94]">Pages / TOC</p>{draft.pages.map((page, index) => <button key={page.id} type="button" disabled={imageUploadPending} onClick={() => setActivePageId(page.id)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[11px] font-extrabold ${activePage.id === page.id ? "bg-[#e8f6ee] text-[#1f6a58]" : "text-[#52736a]"}`}><span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#eff8f2] text-[10px]">{index + 1}</span><span className="truncate">{page.title || `Page ${index + 1}`}</span></button>)}</aside><section className="rounded-xl border border-[#d7e5df] bg-white p-3"><input value={activePage.title} onChange={(event) => update({ pages: draft.pages.map((page) => page.id === activePage.id ? { ...page, title: event.target.value } : page) })} placeholder="Page title" className="h-10 w-full rounded-lg border border-[#d7e5df] px-3 text-sm font-semibold" /><div className="mt-3 flex flex-wrap items-center gap-1.5 border-y border-[#e1ebe6] py-2"><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => command("formatBlock", "h2")} className="rounded border px-2 py-1 text-[10px] font-bold">Heading</button><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => command("formatBlock", "h3")} className="rounded border px-2 py-1 text-[10px] font-bold">Subheading</button><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => command("insertUnorderedList")} className="rounded border px-2 py-1 text-[10px]">Bulleted list</button><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => command("insertOrderedList")} className="rounded border px-2 py-1 text-[10px]">1. List</button><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => insert("<blockquote>Important quote</blockquote>") } className="rounded border px-2 py-1 text-[10px]">Quote</button><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => insert("<table style='width:100%;border-collapse:collapse;margin:12px 0'><thead><tr><th style='border:1px solid #b7d5c8;padding:8px;text-align:left'>Heading 1</th><th style='border:1px solid #b7d5c8;padding:8px;text-align:left'>Heading 2</th></tr></thead><tbody><tr><td style='border:1px solid #b7d5c8;padding:8px'>Cell 1</td><td style='border:1px solid #b7d5c8;padding:8px'>Cell 2</td></tr></tbody></table><p><br></p>") } className="rounded border px-2 py-1 text-[10px]">Table</button><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => insert("<hr />")} className="rounded border px-2 py-1 text-[10px]">Divider</button><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => insert("<pre><code>Reference or code</code></pre>")} className="rounded border px-2 py-1 text-[10px]">Code</button><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => command("bold")} className="rounded border px-2 py-1 text-[10px] font-bold">Bold</button><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => command("italic")} className="rounded border px-2 py-1 text-[10px] italic">Italic</button><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => command("underline")} className="rounded border px-2 py-1 text-[10px] underline">Underline</button><label className="flex items-center gap-1 rounded border px-2 py-1 text-[10px]">Font size<select aria-label="Font size" defaultValue="16px" onMouseDown={() => rememberCurrentSelection()} onChange={(event) => applyFontSize(event.target.value)} className="max-w-20 bg-transparent"><option value="14px">Small</option><option value="16px">Normal</option><option value="20px">Large</option><option value="24px">X-Large</option><option value="32px">XX-Large</option></select></label><label className="flex items-center gap-1 rounded border px-2 py-1 text-[10px]">Text color<input type="color" aria-label="Text color" defaultValue="#06201c" onMouseDown={() => rememberCurrentSelection()} onChange={(event) => command("foreColor", event.target.value)} className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0" /></label><label className="flex items-center gap-1 rounded border px-2 py-1 text-[10px]">Highlight color<input type="color" aria-label="Highlight color" defaultValue="#fff4cf" onMouseDown={() => rememberCurrentSelection()} onChange={(event) => command("hiliteColor", event.target.value)} className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0" /></label><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => command("justifyLeft")} className="rounded border px-2 py-1 text-[10px]">Left</button><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => command("justifyCenter")} className="rounded border px-2 py-1 text-[10px]">Center</button><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => command("justifyRight")} className="rounded border px-2 py-1 text-[10px]">Right</button><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => command("undo")} className="rounded border px-2 py-1 text-[10px]">Undo</button><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => command("redo")} className="rounded border px-2 py-1 text-[10px]">Redo</button><button type="button" onMouseDown={(event) => { event.preventDefault(); saveSelection(); }} onClick={() => fileInputRef.current?.click()} disabled={imageUploadPending} className="rounded bg-[#1f6a58] px-3 py-1.5 text-[10px] font-bold text-white disabled:opacity-60">{imageUploadPending ? "Uploading image..." : "+ Image"}</button><input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file); event.currentTarget.value = ""; }} /></div>{imageUploadError ? <p role="alert" className="mt-2 rounded-lg border border-[#f0c7c2] bg-[#fff6f5] px-3 py-2 text-xs font-semibold text-[#b42318]">{imageUploadError}</p> : null}{imageUploadPending ? <p role="status" className="mt-2 text-xs font-semibold text-[#1f6a58]">Uploading image...</p> : null}<div ref={editorRef} contentEditable suppressContentEditableWarning onClick={(event) => selectImage((event.target as HTMLElement).closest("img"))} onInput={() => {
        const editor = editorRef.current;
        if (!editor) return;
        editor.querySelectorAll<HTMLElement>("span[data-font-size-caret]").forEach((span) => {
          const placeholder = span.firstChild;
          if (placeholder?.nodeType === Node.TEXT_NODE && placeholder.textContent?.includes("\u00a0")) {
            placeholder.textContent = placeholder.textContent.replace("\u00a0", "");
          }
          span.removeAttribute("data-font-size-caret");
        });
        updatePage(editor.innerHTML);
  }} onBlur={() => {
        const editor = editorRef.current;
        if (!editor) return;
        editor.querySelectorAll<HTMLElement>("span[data-font-size-caret]").forEach((span) => {
          if (span.textContent === "\u00a0") span.remove();
          else span.removeAttribute("data-font-size-caret");
        });
        updatePage(editor.innerHTML);
      }} className="mt-3 min-h-[420px] rounded-lg border border-[#d7e5df] bg-white p-4 text-sm leading-7 text-[#06201c] outline-none focus:border-[#1f6a58] [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-8 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-8 [&_li]:my-1" data-placeholder="Write your page content here..." />{selectedImageId ? <div className="mt-3 rounded-lg border border-[#b7d5c8] bg-[#f4fbf6] p-3"><div className="mb-3 grid gap-2 sm:grid-cols-2"><label className="text-[10px] font-bold text-[#52736a]">Caption<input value={selectedImageCaption} onChange={(event) => updateSelectedImageMetadata(event.target.value)} placeholder="Optional image caption" className="mt-1 h-9 w-full rounded border border-[#d7e5df] bg-white px-2 text-xs" /></label></div><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-extrabold uppercase text-[#7f9d94]">Image layout</span><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setImageStyle({ width: "45%", height: "auto", objectFit: "contain" })} className="rounded border bg-white px-2 py-1 text-[10px]">Small</button><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setImageStyle({ width: "70%", height: "auto", objectFit: "contain" })} className="rounded border bg-white px-2 py-1 text-[10px]">Medium</button><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setImageStyle({ width: "100%", height: "auto", objectFit: "contain" })} className="rounded border bg-white px-2 py-1 text-[10px]">Full width</button><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setImageStyle({ width: "100%", height: "260px", objectFit: "cover", objectPosition: "center" })} className="rounded border bg-white px-2 py-1 text-[10px]">Crop 16:9</button><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setImageStyle({ objectPosition: "top" })} className="rounded border bg-white px-2 py-1 text-[10px]">Top</button><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setImageStyle({ objectPosition: "center" })} className="rounded border bg-white px-2 py-1 text-[10px]">Center</button><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setImageStyle({ objectPosition: "bottom" })} className="rounded border bg-white px-2 py-1 text-[10px]">Bottom</button><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { getSelectedImage()?.remove(); setSelectedImageId(null); setSelectedImageCaption(""); if (editorRef.current) updatePage(editorRef.current.innerHTML); }} className="rounded border border-[#f0c7c2] bg-white px-2 py-1 text-[10px] font-semibold text-[#b42318]">Remove image</button></div></div> : null}</section></div></div>;
}

/** Renders the Training structure: sections, lessons, and reordering. */
function AddLessonForm({ pending, trainingDeliveryMode, trainingLessonDefaults, imageUploadFieldKeys, onSubmit }: { pending: boolean; trainingDeliveryMode: string; trainingLessonDefaults: TrainingLessonDefaults; imageUploadFieldKeys: readonly string[]; onSubmit: (payload: CreateTrainingLessonPayload) => Promise<unknown> }) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [contentUrl, setContentUrl] = useState("");
  const [type, setType] = useState("text");
  const [ebookDraft, setEbookDraft] = useState<EbookDraft>({ subtitle: "", author: "", description: "", coverUrl: "", sourceUrl: "", pages: [{ id: 1, title: "Page 1", content: "", blocks: [] }], completionRule: "read_to_end", allowBookmarks: true, allowNotes: true, allowDownload: false, transcriptRequired: false });
  const [scheduledAt, setScheduledAt] = useState("");
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [detailsSource, setDetailsSource] = useState<LessonDetailsSource>("new");
  const [meetingType, setMeetingType] = useState("google_meet");
  const [meetingLink, setMeetingLink] = useState("");
  const [joinMeta, setJoinMeta] = useState("");
  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [isPreview, setIsPreview] = useState(false);
  const [isDownloadable, setIsDownloadable] = useState(false);
  const [fileSize, setFileSize] = useState("");
  const [duration, setDuration] = useState("");
  const [isVideoUploadPending, setIsVideoUploadPending] = useState(false);
  const [videos, setVideos] = useState<string[]>([]);
  const [documents, setDocuments] = useState<Array<{ url: string; name: string; visibility: string; downloadable: boolean }>>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [videoFileName, setVideoFileName] = useState("");
  const [pdfFileName, setPdfFileName] = useState("");
  const [noteFileName, setNoteFileName] = useState("");
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  const [ebookImageUploadPending, setEbookImageUploadPending] = useState(false);

  const reset = () => {
    setTitle(""); setContent(""); setContentUrl(""); setType("text"); setEbookDraft({ subtitle: "", author: "", description: "", coverUrl: "", sourceUrl: "", pages: [{ id: 1, title: "Page 1", content: "", blocks: [] }], completionRule: "read_to_end", allowBookmarks: true, allowNotes: true, allowDownload: false, transcriptRequired: false }); setScheduledAt(""); setScheduleError(null); setDetailsSource("new"); setMeetingType("google_meet"); setMeetingLink(""); setJoinMeta("");
    setVenueName(""); setVenueAddress("");
    setIsPreview(false); setIsDownloadable(false); setFileSize(""); setDuration(""); setVideos([]); setDocuments([]); setNotes([]);
    setVideoFileName(""); setPdfFileName(""); setNoteFileName("");
    setFileUploadError(null);
  };

  return (
    <div className="mt-3">
      {!isOpen ? <button type="button" aria-expanded="false" onClick={() => setIsOpen(true)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-dashed border-[#b7d5c8] bg-white px-4 py-3 text-left transition hover:border-[#1f6a58] hover:bg-[#f7fbf8]">
        <span><span className="block text-sm font-bold text-[#1f6a58]">+ Add a lesson</span><span className="mt-0.5 block text-xs text-[#718c82]">Add a video, reading, eBook, quiz, or other course activity.</span></span>
        <span aria-hidden="true" className="text-xl text-[#1f6a58]">+</span>
      </button> : <form
      className="mt-4 space-y-5 rounded-2xl border border-[#cfe1d8] bg-white p-5 shadow-sm [&>input:not([type=checkbox])]:h-11 [&>input:not([type=checkbox])]:rounded-xl [&>input:not([type=checkbox])]:bg-[#fbfdfb] [&>input:not([type=checkbox])]:px-4 [&>input:not([type=checkbox])]:text-sm [&>select]:h-11 [&>select]:rounded-xl [&>select]:bg-[#fbfdfb] [&>select]:px-4 [&>select]:text-sm [&>textarea]:rounded-xl [&>textarea]:bg-[#fbfdfb] [&>textarea]:p-4 [&>textarea]:text-sm"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!title.trim()) return;
        if (type === "ebook" && ebookImageUploadPending) {
          setFileUploadError("Please wait for the eBook image upload to finish before saving.");
          return;
        }
        if ((type === "live" || type === "venue") && !isLessonScheduleWithinTraining(scheduledAt, trainingLessonDefaults)) {
          setScheduleError("Set the Training start and end dates first, then choose a lesson date and time within that range.");
          return;
        }
        let ebookContent: string | undefined;
        if (type === "ebook") {
          try {
            ebookContent = JSON.stringify(toEbookDocument(ebookDraft));
          } catch (error) {
            setFileUploadError(error instanceof Error ? error.message : "Finish uploading every eBook image before saving.");
            return;
          }
        }
        const payload: CreateTrainingLessonPayload = {
          title: title.trim(),
          content: type === "ebook" ? ebookContent : content.trim() || undefined,
          content_url: contentUrl.trim() || undefined,
          type: toApiLessonType(type),
          ...(type === "live" ? {
            scheduled_at: scheduledAt || undefined,
            meeting_type: detailsSource === "existing" ? getMeetingTypeFromProvider(trainingLessonDefaults.meetingProvider) : meetingType,
            meeting_link: (detailsSource === "existing" ? trainingLessonDefaults.meetingLink : meetingLink).trim() || undefined,
            join_meta: (detailsSource === "existing" ? trainingLessonDefaults.deliveryInstructions : joinMeta).trim() || undefined,
          } : {}),
          ...(type === "venue" ? {
            scheduled_at: scheduledAt || undefined,
            venue_name: (detailsSource === "existing" ? trainingLessonDefaults.venue : venueName).trim() || undefined,
            venue_address: (detailsSource === "existing" ? trainingLessonDefaults.address : venueAddress).trim() || undefined,
          } : {}),
          is_preview: isPreview,
          is_downloadable: isDownloadable,
          file_size: fileSize.trim() || undefined,
          duration: type === "video" ? toDurationMinutesFromSeconds(duration) : undefined,
          videos: videos.filter((value) => value.trim()),
          notes: notes.filter((value) => value.trim()),
          documents: documents.filter((document) => document.url.trim()).map((document) => ({
            url: document.url.trim(),
            name: document.name.trim() || document.url.trim().split("/").pop() || "document",
            visibility: document.visibility,
            downloadable: document.downloadable,
          })),
        };
        try {
          await onSubmit(payload);
          reset();
          setIsOpen(false);
        } catch (error) {
          setFileUploadError(error instanceof Error ? error.message : "Unable to add this lesson. Check the details and try again.");
        }
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e6efea] pb-4"><div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#62877a]">Build curriculum</p><h3 className="mt-1 text-lg font-extrabold text-[#103c33]">Add a lesson</h3><p className="mt-1 text-sm text-[#718c82]">Choose a lesson type, then add the content learners will use.</p></div><span className="rounded-full bg-[#e8f6ee] px-3 py-1 text-xs font-bold text-[#1f6a58]">New lesson</span></div>
      {fileUploadError ? <p role="alert" className="rounded-lg border border-[#f0c7c2] bg-[#fff6f5] px-3 py-2 text-xs font-semibold text-[#b42318]">{fileUploadError}</p> : null}
      <label className="block text-xs font-bold text-[#284940]">Lesson title<input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="For example, Foundations of patient communication" className="mt-2 h-11 w-full rounded-xl border border-[#d7e5df] bg-[#fbfdfb] px-4 text-sm font-normal outline-none transition focus:border-[#1f6a58] focus:ring-2 focus:ring-[#1f6a58]/10" /></label>
      <select required value={type} onChange={(event) => {
        const selectedType = event.target.value;
        setType(selectedType);
        setDetailsSource(getInitialLessonDetailsSource(selectedType, trainingLessonDefaults));
      }} aria-label="New lesson type" className="h-11 w-full rounded-xl border border-[#d7e5df] bg-[#fbfdfb] px-4 text-sm outline-none transition focus:border-[#1f6a58] focus:ring-2 focus:ring-[#1f6a58]/10">
        {getLessonTypeOptions(trainingDeliveryMode).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {isLessonType(type, "text", "notes") ? <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder={type === "notes" ? "Notes content..." : "Topic content..."} rows={3} className="w-full rounded-lg border border-[#d7e5df] px-3 py-2 text-xs outline-none focus:border-[#1f6a58]" /> : null}
      {type === "ebook" ? <EbookCompleteEditor draft={ebookDraft} onChange={setEbookDraft} imageUploadFieldKeys={imageUploadFieldKeys} onUploadStateChange={setEbookImageUploadPending} /> : null}
      {type === "video" ? (
        <>
          <LessonFileDrop label="Video" accept="video/*" fileName={videoFileName} disabled={isVideoUploadPending} onFile={(file) => {
            setFileUploadError(null);
            setIsVideoUploadPending(true);
            setVideoFileName(`Reading duration from ${file.name}...`);
            void readVideoDurationInSeconds(file)
              .then((videoDuration) => {
                setVideoFileName(`Uploading ${file.name}...`);
                return uploadTrainingMedia(file, "lesson_video").then((uploaded) => {
                  setContentUrl(uploaded.url);
                  setVideoFileName(uploaded.name);
                  setFileSize(String(uploaded.size));
                  setDuration(String(videoDuration));
                });
              })
              .catch((error: Error) => { setVideoFileName(""); setFileUploadError(error.message); })
              .finally(() => setIsVideoUploadPending(false));
          }} />
          {contentUrl ? <LessonMediaPreview url={contentUrl} name={videoFileName || contentUrl.split("/").pop() || "Lesson video"} kind="video" /> : null}
          <LessonDuration value={duration} />
        </>
      ) : null}
      {type === "youtube" ? <input value={contentUrl} onChange={(event) => setContentUrl(event.target.value)} placeholder="Paste YouTube link" className="h-8 w-full rounded-lg border border-[#d7e5df] px-3 text-xs outline-none focus:border-[#1f6a58]" /> : null}
      {type === "live" || type === "venue" ? (
        <LessonScheduleFields
          type={type}
          defaults={trainingLessonDefaults}
          source={detailsSource}
          setSource={setDetailsSource}
          scheduledAt={scheduledAt}
          setScheduledAt={(value) => { setScheduledAt(value); setScheduleError(null); }}
          scheduleError={scheduleError}
          meetingType={meetingType}
          setMeetingType={setMeetingType}
          meetingLink={meetingLink}
          setMeetingLink={setMeetingLink}
          joinUrl={joinMeta}
          setJoinUrl={setJoinMeta}
          venueName={venueName}
          setVenueName={setVenueName}
          venueAddress={venueAddress}
          setVenueAddress={setVenueAddress}
        />
      ) : null}
      {type === "pdf" || type === "document" ? <LessonFileDrop label={type === "pdf" ? "PDF" : "Document"} accept={type === "pdf" ? "application/pdf,.pdf" : ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.rtf,application/pdf,text/plain"} fileName={pdfFileName} onFile={(file) => {
        setFileUploadError(null);
        setPdfFileName(`Uploading ${file.name}...`);
        void uploadTrainingMedia(file, type === "pdf" ? "lesson_pdf" : "lesson_document")
          .then((uploaded) => { setDocuments((current) => [...current, { url: uploaded.url, name: uploaded.name, visibility: "public", downloadable: true }]); setFileSize(String(uploaded.size)); setPdfFileName(uploaded.name); })
          .catch((error: Error) => { setPdfFileName(""); setFileUploadError(error.message); });
      }} /> : null}
      {type === "pdf" || type === "document" ? documents.map((document) => <LessonMediaPreview key={document.url} url={document.url} name={document.name} kind="document" showPreview={type !== "pdf"} />) : null}
      {type === "notes" ? <LessonFileDrop label="note" accept=".txt,.md,.rtf,text/plain,text/markdown" fileName={noteFileName} onFile={(file) => {
        setFileUploadError(null);
        setNoteFileName(`Uploading ${file.name}...`);
        void uploadTrainingMedia(file, "lesson_document")
          .then((uploaded) => { setNotes((current) => [...current, uploaded.url]); setFileSize(String(uploaded.size)); setNoteFileName(uploaded.name); })
          .catch((error: Error) => { setNoteFileName(""); setFileUploadError(error.message); });
      }} /> : null}
      {type === "notes" ? notes.map((note) => <LessonMediaPreview key={note} url={note} name={note.split("/").pop() || "Lesson note"} kind="document" />) : null}
      {isLessonType(type, "video", "pdf", "document", "notes", "ebook") ? (
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-1 text-xs font-semibold text-[#06201c]"><input type="checkbox" checked={isPreview} onChange={(event) => setIsPreview(event.target.checked)} className="h-3 w-3" />Is preview</label>
          <label className="flex items-center gap-1 text-xs font-semibold text-[#06201c]"><input type="checkbox" checked={isDownloadable} onChange={(event) => setIsDownloadable(event.target.checked)} className="h-3 w-3" />Is downloadable</label>
        </div>
      ) : null}
      {isLessonType(type, "video", "pdf", "document", "notes", "ebook") ? <LessonFileSize value={fileSize} /> : null}
      {isLessonType(type, "quiz", "assignment") ? <p className="rounded-lg bg-[#f9fcfa] px-3 py-2 text-xs text-[#52736a]">{type === "quiz" ? "After creating this lesson, attach or create the quiz questions below." : "After creating this lesson, use the Assignments tab to create the submission task."}</p> : null}
      <p className="text-[10px] text-[#7f9d94]">Only fields for the selected lesson type are shown.</p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={pending || isVideoUploadPending || ebookImageUploadPending || !title.trim()} className="h-9 rounded-full bg-[#1f6a58] px-4 text-xs font-bold text-white hover:bg-[#195646] disabled:opacity-60">{ebookImageUploadPending ? "Uploading image..." : pending ? "Adding..." : "Add lesson"}</button>
        <button type="button" onClick={() => { reset(); setIsOpen(false); }} disabled={pending || isVideoUploadPending || ebookImageUploadPending} className="h-9 rounded-full border border-[#d7e5df] px-4 py-1 text-xs font-bold text-[#52736a] hover:bg-[#f4faf7] disabled:opacity-60">Cancel</button>
      </div>
    </form>}
    </div>
  );
}

export function TrainingSectionsTab({ trainingId, trainingDeliveryMode, trainingLessonDefaults, canManage = true }: { trainingId: string; trainingDeliveryMode: string; trainingLessonDefaults: TrainingLessonDefaults; canManage?: boolean }) {
  const { t } = useTranslation("enterpriseTrainings");
  const queryClient = useQueryClient();
  const historicalFormQuery = useTrainingHistoricalFormConfiguration(trainingId, Boolean(trainingId));
  const activeFormQuery = useActiveTrainingFormConfiguration(Boolean(trainingId));
  const imageUploadFieldKeys = getTrainingImageUploadFieldKeys([historicalFormQuery.data, activeFormQuery.data]);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editSectionTitle, setEditSectionTitle] = useState("");
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [viewingLesson, setViewingLesson] = useState<{ sectionId: string; lessonId: string } | null>(null);
  const [quizLesson, setQuizLesson] = useState<{ sectionId: string; lessonId: string } | null>(null);
  const [viewingQuizLesson, setViewingQuizLesson] = useState<{ sectionId: string; lessonId: string } | null>(null);
  const [lessonAssessmentDraft, setLessonAssessmentDraft] = useState<Record<string, string>>({});
  const [lessonAssessmentTitle, setLessonAssessmentTitle] = useState<Record<string, string>>({});
  const [lessonAssessmentInstructions, setLessonAssessmentInstructions] = useState<Record<string, string>>({});
  const [lessonAssessmentPassPercent, setLessonAssessmentPassPercent] = useState<Record<string, string>>({});
  const [lessonAssessmentType, setLessonAssessmentType] = useState<Record<string, TrainingAssessmentType>>({});
  const [lessonAssessmentTimeLimit, setLessonAssessmentTimeLimit] = useState<Record<string, string>>({});
  const [lessonAssessmentAttempts, setLessonAssessmentAttempts] = useState<Record<string, string>>({});
  const [lessonAssessmentRandomise, setLessonAssessmentRandomise] = useState<Record<string, boolean>>({});
  const [lessonAssessmentPublication, setLessonAssessmentPublication] = useState<Record<string, "immediate" | "scheduled">>({});
  const [lessonAssessmentPublishAt, setLessonAssessmentPublishAt] = useState<Record<string, string>>({});
  const [lessonQuestion, setLessonQuestion] = useState<Record<string, string>>({});
  const [lessonQuestionType, setLessonQuestionType] = useState<Record<string, string>>({});
  const [lessonQuestionOptions, setLessonQuestionOptions] = useState<Record<string, string>>({});
  const [lessonCorrectAnswer, setLessonCorrectAnswer] = useState<Record<string, string>>({});
  const [lessonQuestionPoints, setLessonQuestionPoints] = useState<Record<string, string>>({});

  const sectionsQuery = useQuery({
    queryKey: ["trainings", trainingId, "sections"],
    queryFn: () => getTrainingSections(trainingId),
    enabled: Boolean(trainingId),
  });

  const invalidateSections = () => void queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "sections"] });

  const assessmentsQuery = useQuery({
    queryKey: ["trainings", trainingId, "assessments"],
    queryFn: () => listTrainingAssessments(trainingId),
    enabled: Boolean(trainingId),
    retry: false,
  });

  const addSectionQuestionMutation = useMutation({
    mutationFn: ({ formKey, assessmentId, question, questionType, options, correctAnswer, points }: { formKey: string; assessmentId: string; question: string; questionType: string; options: string[]; correctAnswer: string; points: number }) =>
      addAssessmentQuestions(trainingId, assessmentId, {
        question_text: question,
        question_type: questionType,
        options: ["mcq", "multiple_select"].includes(questionType) ? options : null,
        correct_answer: correctAnswer || null,
        points,
      }),
    onSuccess: (_data, variables) => {
      const key = variables.formKey;
      setLessonQuestion((current) => ({ ...current, [key]: "" }));
      setLessonQuestionOptions((current) => ({ ...current, [key]: "" }));
      setLessonCorrectAnswer((current) => ({ ...current, [key]: "" }));
      setLessonQuestionPoints((current) => ({ ...current, [key]: "1" }));
      setFeedback("Question added to the quiz.");
      void queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "assessments"] });
    },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to add question."),
  });

  const deleteSectionQuestionMutation = useMutation({
    mutationFn: ({ assessmentId, questionId }: { assessmentId: string; questionId: string }) => deleteAssessmentQuestion(trainingId, assessmentId, questionId),
    onSuccess: () => { setFeedback("Question deleted."); void queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "assessments"] }); },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to delete question."),
  });

  const attachLessonAssessmentMutation = useMutation({
    mutationFn: ({ sectionId, lessonId, lessonTitle, assessmentId }: { sectionId: string; lessonId: string; lessonTitle: string; assessmentId: string }) => updateTrainingLesson(trainingId, sectionId, lessonId, { title: lessonTitle, assessment_id: assessmentId }),
    onSuccess: () => { setLessonAssessmentDraft({}); setFeedback("Quiz attached - learners see it after this lesson."); void invalidateSections(); },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to attach quiz."),
  });

  const detachLessonAssessmentMutation = useMutation({
    mutationFn: ({ sectionId, lessonId, lessonTitle }: { sectionId: string; lessonId: string; lessonTitle: string }) => updateTrainingLesson(trainingId, sectionId, lessonId, { title: lessonTitle, assessment_id: null }),
    onSuccess: () => { setFeedback("Quiz detached from this lesson."); void invalidateSections(); },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to detach quiz."),
  });

  const createLessonAssessmentMutation = useMutation({
    mutationFn: async ({ sectionId, lessonId, lessonTitle, title, instructions, assessmentType, passPercent, timeLimit, attemptsAllowed, randomise, level, publication, publishAt }: { sectionId: string; lessonId: string; lessonTitle: string; title: string; instructions: string; assessmentType: TrainingAssessmentType; passPercent: string; timeLimit: string; attemptsAllowed: string; randomise: boolean; level: TrainingAssessmentLevel; publication: "immediate" | "scheduled"; publishAt: string }) => {
      const created = await createTrainingAssessment(trainingId, {
        title: title.trim(),
        type: assessmentType,
        module_id: sectionId,
        lesson_id: lessonId,
        level,
        instructions: instructions.trim() || null,
        pass_percent: passPercent ? Number(passPercent) : null,
        time_limit_minutes: timeLimit ? Number(timeLimit) : null,
        attempts_allowed: attemptsAllowed ? Number(attemptsAllowed) : null,
        randomise,
        publication,
        publish_at: publication === "scheduled" && publishAt ? new Date(publishAt).toISOString() : null,
        is_published: false,
      });
      const assessment = created && typeof created === "object" ? created as Record<string, unknown> : {};
      const createdId = typeof assessment.id === "string" ? assessment.id : "";
      if (!createdId) {
        throw new Error("The quiz was created, but the API did not return its ID, so it could not be linked to this lesson or published.");
      }
      try {
        await updateTrainingLesson(trainingId, sectionId, lessonId, {
          title: lessonTitle,
          assessment_id: createdId,
        });
      } catch (error) {
        throw new Error(`The quiz was created but could not be linked to this lesson. ${error instanceof Error ? error.message : ""}`.trim());
      }
      try {
        await updateTrainingAssessment(trainingId, createdId, { is_published: true });
      } catch (error) {
        throw new Error(`The quiz was linked to the lesson but could not be published for learners. ${error instanceof Error ? error.message : ""}`.trim());
      }
      return { created, sectionId, lessonId };
    },
    onSuccess: (_result, vars) => {
      const lessonKey = `${vars.sectionId}:${vars.lessonId}`;
      setLessonAssessmentTitle((current) => ({ ...current, [lessonKey]: "" }));
      setLessonAssessmentInstructions((current) => ({ ...current, [lessonKey]: "" }));
      setLessonAssessmentPassPercent((current) => ({ ...current, [lessonKey]: "" }));
      setLessonAssessmentType((current) => ({ ...current, [lessonKey]: "quiz" }));
      setLessonAssessmentTimeLimit((current) => ({ ...current, [lessonKey]: "" }));
      setLessonAssessmentAttempts((current) => ({ ...current, [lessonKey]: "" }));
      setLessonAssessmentRandomise((current) => ({ ...current, [lessonKey]: false }));
      setLessonAssessmentPublication((current) => ({ ...current, [lessonKey]: "immediate" }));
      setLessonAssessmentPublishAt((current) => ({ ...current, [lessonKey]: "" }));
      setFeedback("Quiz published and linked to this lesson.");
      void queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "assessments"] });
      void invalidateSections();
    },
    onError: (error: Error) => {
      setFeedback(error.message || "Unable to create the lesson quiz.");
      void queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "assessments"] });
      void invalidateSections();
    },
  });

  const createSectionMutation = useMutation({
    mutationFn: () => {
      const payload: CreateTrainingSectionPayload = {
        title: newSectionTitle.trim(),
      };
      return createTrainingSection(trainingId, payload);
    },
    onSuccess: (data) => {
      const created = data && typeof data === "object" ? data as Record<string, unknown> : {};
      if (typeof created.id === "string") setActiveSectionId(created.id);
      setNewSectionTitle("");
      setFeedback("Section created.");
      void invalidateSections();
    },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to create the section."),
  });

  const updateSectionMutation = useMutation({
    mutationFn: ({ sectionId, title }: { sectionId: string; title: string }) =>
      updateTrainingSection(trainingId, sectionId, { title }),
    onSuccess: () => { setEditingSectionId(null); setFeedback("Section updated."); void invalidateSections(); },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to update section."),
  });

  const deleteSectionMutation = useMutation({
    mutationFn: (sectionId: string) => deleteTrainingSection(trainingId, sectionId),
    onSuccess: () => {
      setFeedback("Section deleted.");
      void invalidateSections();
    },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to delete the section."),
  });

  const createLessonMutation = useMutation({
    mutationFn: ({ sectionId, payload }: { sectionId: string; payload: CreateTrainingLessonPayload }) => createTrainingLesson(trainingId, sectionId, payload),
    onSuccess: async (data, vars) => {
      const created = (data ?? {}) as Record<string, unknown>;
      const createdId = typeof created.id === "string" ? created.id : "";
      let ebookSaveMessage: string | null = null;
      if (createdId && vars.payload.type === "ebook" && typeof vars.payload.content === "string") {
        try {
          const ebookPayload = JSON.parse(vars.payload.content) as { ebook?: Record<string, unknown> };
          if (ebookPayload.ebook) {
            await saveTrainingEbookDraft(trainingId, vars.sectionId, createdId, { ebook: ebookPayload.ebook, base_version: 0 });
          }
        } catch (error) {
          ebookSaveMessage = error instanceof Error ? `Lesson added, but eBook content could not be saved: ${error.message}` : "Lesson added, but eBook content could not be saved.";
        }
      }
      if (createdId && (vars.payload.type === "quiz" || vars.payload.type === "exam")) {
        setQuizLesson({ sectionId: vars.sectionId, lessonId: createdId });
        setFeedback("Quiz lesson added - attach an existing quiz or create one below.");
      } else {
        if (createdId) setViewingLesson({ sectionId: vars.sectionId, lessonId: createdId });
        setFeedback(ebookSaveMessage ?? (createdId ? "Lesson added - attach videos, PDFs, and notes below." : "Lesson added."));
      }
      void invalidateSections();
    },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to add the lesson."),
  });

  const deleteLessonMutation = useMutation({
    mutationFn: ({ sectionId, lessonId }: { sectionId: string; lessonId: string }) => deleteTrainingLesson(trainingId, sectionId, lessonId),
    onSuccess: () => {
      setFeedback("Lesson deleted.");
      void invalidateSections();
    },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to delete the lesson."),
  });

  const moveSectionMutation = useMutation({
    mutationFn: ({ sectionId, direction }: { sectionId: string; direction: "up" | "down" }) => {
      const sections = (sectionsQuery.data ?? []) as Array<Record<string, unknown>>;
      const currentIndex = sections.findIndex((s) => (typeof s.id === "string" ? s.id : String(s.order ?? "")) === sectionId);
      if (currentIndex < 0) return Promise.resolve();
      const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= sections.length) return Promise.resolve();
      const reordered = [...sections];
      [reordered[currentIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[currentIndex]];
      const sectionOrders = reordered.map((s, i) => ({ id: typeof s.id === "string" ? s.id : String(s.order ?? ""), order: i }));
      return authenticatedFetch(`/api/v1/trainings/${encodeURIComponent(trainingId)}/sections/reorder`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section_orders: sectionOrders }),
      }).then((r) => { if (!r.ok) throw new Error("Reorder failed"); });
    },
    onSuccess: () => { setFeedback("Sections reordered."); void invalidateSections(); },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to reorder sections."),
  });

  const moveLessonMutation = useMutation({
    mutationFn: ({ sectionId, lessonId, direction }: { sectionId: string; lessonId: string; direction: "up" | "down" }) => {
      const sections = (sectionsQuery.data ?? []) as Array<Record<string, unknown>>;
      const section = sections.find((s) => (typeof s.id === "string" ? s.id : String(s.order ?? "")) === sectionId);
      if (!section || !Array.isArray(section.lessons)) return Promise.resolve();
      const lessons = [...section.lessons];
      const currentIndex = lessons.findIndex((l) => (typeof l.id === "string" ? l.id : "") === lessonId);
      if (currentIndex < 0) return Promise.resolve();
      const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= lessons.length) return Promise.resolve();
      [lessons[currentIndex], lessons[targetIndex]] = [lessons[targetIndex], lessons[currentIndex]];
      const lessonOrder = lessons
        .map((lesson) => (typeof lesson.id === "string" ? lesson.id : ""))
        .filter((lessonId): lessonId is string => Boolean(lessonId));
      return reorderTrainingLessons(trainingId, sectionId, { order: lessonOrder });
    },
    onSuccess: () => { setFeedback("Lessons reordered."); void invalidateSections(); },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to reorder lessons."),
  });

  if (sectionsQuery.isLoading) return <div className="animate-pulse space-y-3" aria-busy="true"><div className="h-20 rounded-2xl bg-[#edf3f0]" /><div className="h-28 rounded-2xl bg-[#edf3f0]" /><span className="sr-only">Loading course structure</span></div>;
  if (sectionsQuery.isError) return <div role="alert" className="rounded-xl border border-[#f0c7c2] bg-[#fff6f5] p-4 text-sm text-[#b42318]"><p className="font-semibold">{(sectionsQuery.error as Error).message || "Unable to load the course structure."}</p><button type="button" onClick={() => void sectionsQuery.refetch()} className="mt-2 rounded-full border border-[#b42318] px-3 py-1.5 text-xs font-bold">Try again</button></div>;

  const sections = Array.isArray(sectionsQuery.data) ? (sectionsQuery.data as Array<Record<string, unknown>>) : [];
  const assessments = Array.isArray(assessmentsQuery.data) ? (assessmentsQuery.data as Array<Record<string, unknown>>) : [];
  const totalLessons = sections.reduce((count, section) => count + (Array.isArray(section.lessons) ? section.lessons.length : 0), 0);
  const activeSection = sections.find((section) => typeof section.id === "string" && section.id === activeSectionId) ?? sections[0];
  const activeSectionIdResolved = activeSection && typeof activeSection.id === "string" ? activeSection.id : "";

  return (
    <section className="overflow-hidden rounded-2xl border border-[#dce9e3] bg-white shadow-sm">
      <header className="border-b border-[#e6efea] px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold text-[#1f6a58]">Training content</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#06201c]">Sessions &amp; Lessons</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#52736a]">Group lessons into sessions. Learners will follow the same order shown here.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!canManage ? <span className="rounded-full bg-[#f0f3f2] px-3 py-1.5 text-xs font-bold text-[#52736a]">View only</span> : null}
          </div>
        </div>
      </header>
      <div className="space-y-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl bg-[#f5faf7] px-4 py-3 text-sm text-[#52736a]" aria-label="Course outline summary">
          <span><strong className="text-[#103c33]">{sections.length}</strong> {sections.length === 1 ? "session" : "sessions"}</span>
          <span className="hidden text-[#b3c8bf] sm:inline" aria-hidden="true">|</span>
          <span><strong className="text-[#103c33]">{totalLessons}</strong> {totalLessons === 1 ? "lesson" : "lessons"}</span>
          <span className="ml-auto text-xs text-[#718c82]">Arrange sessions and lessons in the order learners should follow.</span>
        </div>
        {sections.length > 0 ? <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-[#dce9e3] bg-white p-4">
          <label htmlFor="training-active-session" className="min-w-0 flex-1 text-xs font-bold text-[#52736a]">Choose a session
            <select id="training-active-session" value={activeSectionIdResolved} onChange={(event) => { setActiveSectionId(event.target.value); setViewingLesson(null); setViewingQuizLesson(null); setQuizLesson(null); }} className="mt-1.5 h-11 w-full rounded-xl border border-[#d7e5df] bg-[#fbfdfb] px-3 text-sm font-semibold text-[#103c33] outline-none focus:border-[#1f6a58]">
              {sections.map((section, index) => { const id = typeof section.id === "string" ? section.id : String(section.order ?? index); const title = typeof section.title === "string" ? section.title : `Session ${index + 1}`; const lessons = Array.isArray(section.lessons) ? section.lessons.length : 0; return <option key={id} value={id}>{index + 1}. {title} ({lessons} {lessons === 1 ? "lesson" : "lessons"})</option>; })}
            </select>
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={() => { const index = sections.findIndex((section) => section === activeSection); const previous = sections[index - 1]; if (previous && typeof previous.id === "string") setActiveSectionId(previous.id); }} disabled={sections.findIndex((section) => section === activeSection) <= 0} className="h-11 rounded-xl border border-[#dce9e3] px-4 text-sm font-semibold text-[#1f6a58] hover:bg-[#f5faf7] disabled:opacity-40">Previous</button>
            <button type="button" onClick={() => { const index = sections.findIndex((section) => section === activeSection); const next = sections[index + 1]; if (next && typeof next.id === "string") setActiveSectionId(next.id); }} disabled={sections.findIndex((section) => section === activeSection) >= sections.length - 1} className="h-11 rounded-xl border border-[#dce9e3] px-4 text-sm font-semibold text-[#1f6a58] hover:bg-[#f5faf7] disabled:opacity-40">Next</button>
          </div>
        </div> : null}
        {feedback ? <p role="status" aria-live="polite" className={`rounded-xl border px-4 py-3 text-sm font-semibold ${/unable|could not|failed|error/i.test(feedback) ? "border-[#f0c7c2] bg-[#fff6f5] text-[#b42318]" : "border-[#bce8d1] bg-[#effaf4] text-[#167550]"}`}>{feedback}</p> : null}
        {assessmentsQuery.isError ? <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#f0c7c2] bg-[#fff6f5] px-4 py-3 text-sm text-[#b42318]"><span>Quiz details could not be loaded. Sessions and lessons are still available.</span><button type="button" onClick={() => void assessmentsQuery.refetch()} className="font-bold underline">Retry quiz data</button></div> : null}
        {canManage ? <form className="flex flex-col gap-3 rounded-2xl border border-[#dce9e3] bg-white p-4 sm:flex-row sm:items-center" onSubmit={(event) => { event.preventDefault(); if (newSectionTitle.trim()) void createSectionMutation.mutate(); }}>
          <div className="min-w-0 flex-1"><label htmlFor="training-session-title" className="block text-sm font-extrabold text-[#103c33]">Add a session</label><p className="mt-1 text-xs text-[#718c82]">Use sessions to group related lessons in the order learners will follow.</p></div>
          <input id="training-session-title" value={newSectionTitle} onChange={(event) => setNewSectionTitle(event.target.value)} placeholder="For example, Module 1: Foundations" className="h-11 min-w-0 flex-1 rounded-xl border border-[#d7e5df] bg-[#fbfdfb] px-4 text-sm outline-none transition focus:border-[#1f6a58] focus:ring-2 focus:ring-[#1f6a58]/10" />
          <button type="submit" disabled={createSectionMutation.isPending || !newSectionTitle.trim()} className="h-11 shrink-0 rounded-xl bg-[#1f6a58] px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#195646] disabled:cursor-not-allowed disabled:opacity-50">{createSectionMutation.isPending ? "Adding session..." : "Add session"}</button>
        </form> : null}
        {sections.length === 0 ? <div className="rounded-2xl border border-dashed border-[#b7d5c8] bg-white px-5 py-10 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f6ee] text-xl font-bold text-[#1f6a58]">+</span><p className="mt-3 font-extrabold text-[#103c33]">Your course outline starts here</p><p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[#718c82]">{canManage ? "Create your first session above. You can add lessons and learning materials inside it." : "Sessions and lessons have not been added to this training yet."}</p></div> : null}
        <ol className="grid gap-4">
        {sections.map((section, sIndex) => {
          const id = typeof section.id === "string" ? section.id : String(section.order ?? "");
          if (id !== activeSectionIdResolved) return null;
          const sectionKey = id || `section-${sIndex}`;
          const title = typeof section.title === "string" ? section.title : "Untitled session";
          const lessons = Array.isArray(section.lessons) ? section.lessons : [];
          const isEditing = canManage && editingSectionId === id;
          const sessionIndex = sections.indexOf(section);
          return (
            <li key={sectionKey} className="relative overflow-hidden rounded-2xl border border-[#dce9e3] bg-white shadow-sm transition-shadow hover:shadow-md">
              <div className="absolute bottom-0 left-0 top-0 w-1 bg-[#9dcdb8]" />
              <div className="flex flex-wrap items-start justify-between gap-3 p-4 pl-5 sm:p-5 sm:pl-6">
                {isEditing ? (
                  <form className="grid flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); if (editSectionTitle.trim()) updateSectionMutation.mutate({ sectionId: id, title: editSectionTitle.trim() }); }}>
                    <div className="flex gap-2">
                      <input value={editSectionTitle} onChange={(e) => setEditSectionTitle(e.target.value)} className="h-8 flex-1 rounded-lg border border-[#d7e5df] px-3 text-sm font-bold text-[#06201c] outline-none focus:border-[#1f6a58]" />
                      <button type="submit" disabled={updateSectionMutation.isPending || !editSectionTitle.trim()} className="h-8 rounded-full bg-[#1f6a58] px-3 text-xs font-bold text-white disabled:opacity-60">{updateSectionMutation.isPending ? "Saving..." : "Save"}</button>
                      <button type="button" onClick={() => setEditingSectionId(null)} className="h-8 rounded-full border border-[#d7e5df] px-3 text-xs font-bold text-[#52736a]">Cancel</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="min-w-0 flex-1"><p className="min-w-0 break-words text-base font-extrabold text-[#103c33]">{title}</p><p className="mt-1 text-xs text-[#718c82]">Session {String(sessionIndex + 1).padStart(2, "0")} <span aria-hidden="true"> | </span> {lessons.length} {lessons.length === 1 ? "lesson" : "lessons"}</p></div>
                    </div>
                    {canManage ? <details className="relative shrink-0">
                      <summary aria-label={`Actions for ${title}`} className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-xl border border-[#dce9e3] text-lg font-bold leading-none text-[#52736a] transition hover:bg-[#f0f8f3] [&::-webkit-details-marker]:hidden">...</summary>
                      <div className="absolute right-0 top-11 z-20 grid min-w-44 gap-1 rounded-xl border border-[#dce9e3] bg-white p-2 shadow-lg">
                        <button type="button" aria-label={`Move ${title} up`} onClick={() => moveSectionMutation.mutate({ sectionId: id, direction: "up" })} disabled={sIndex === 0 || moveSectionMutation.isPending} className="rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#284940] hover:bg-[#f0f8f3] disabled:opacity-40">Move up</button>
                        <button type="button" aria-label={`Move ${title} down`} onClick={() => moveSectionMutation.mutate({ sectionId: id, direction: "down" })} disabled={sIndex === sections.length - 1 || moveSectionMutation.isPending} className="rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#284940] hover:bg-[#f0f8f3] disabled:opacity-40">Move down</button>
                        <button type="button" onClick={() => { setEditingSectionId(id); setEditSectionTitle(title); }} className="rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#284940] hover:bg-[#f0f8f3]">Rename session</button>
                        <button type="button" onClick={() => { if (window.confirm("Delete this session and its lessons?")) void deleteSectionMutation.mutate(id); }} className="rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#b42318] hover:bg-[#fff6f5]">Delete session</button>
                      </div>
                    </details> : null}
                  </>
                )}
              </div>
              <div className="border-t border-[#edf3f0] bg-[#fbfdfb] px-4 pb-4 sm:px-5 sm:pb-5">
              {lessons.length > 0 ? (
                <ol className="mt-4 grid gap-2">
                  {lessons.map((lesson, lIndex) => {
                    const lessonId = typeof lesson.id === "string" ? lesson.id : "";
                    const lessonTitle = typeof lesson.title === "string" ? lesson.title : "Untitled lesson";
                    const lessonType = typeof lesson.type === "string" && lesson.type.trim() ? toUiLessonType(lesson.type.trim()) : "";
                    const lessonKey = `${id}:${lessonId || lessonTitle}`;
                    const explicitLessonAssessmentId = typeof lesson.assessment_id === "string" ? lesson.assessment_id : "";
                    const lessonAssessment = explicitLessonAssessmentId ? assessments.find((a) => typeof a.id === "string" && a.id === explicitLessonAssessmentId) : lessonId ? assessments.find((a) => typeof a.lesson_id === "string" && a.lesson_id === lessonId) : undefined;
                    const lessonAssessmentId = lessonAssessment && typeof lessonAssessment.id === "string" ? lessonAssessment.id : "";
                    const lessonQuestions: Array<Record<string, unknown>> = lessonAssessment && Array.isArray(lessonAssessment.questions) ? (lessonAssessment.questions as Array<Record<string, unknown>>) : [];
                    const isQuizOpen = quizLesson?.lessonId === lessonId && quizLesson?.sectionId === id;
                    return (
                      <Fragment key={lessonId || `${lessonTitle}-${lIndex}`}>
                        <li className="group flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e7efeb] bg-white px-3 py-3 transition hover:border-[#b7d5c8] hover:shadow-sm sm:px-4">
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#f0f6f2] text-[10px] font-extrabold text-[#52736a]">{lIndex + 1}</span>
                            <p className="min-w-0 break-words text-sm font-medium text-[#284940]">{lessonTitle}</p>
                            {lessonType ? <span className="rounded-full border border-[#dce9e3] bg-[#f7fbf8] px-2.5 py-1 text-[10px] font-bold text-[#52736a]">{humanizeLabel(lessonType)}</span> : <span className="rounded-full border border-dashed border-[#d7e5df] px-2.5 py-1 text-[10px] font-semibold text-[#7f9d94]">Type not set</span>}
                            {lessonType !== "live" && ((typeof lesson.meeting_link === "string" && lesson.meeting_link) || (typeof lesson.join_meta === "string" && lesson.join_meta) || (typeof lesson.join_url === "string" && lesson.join_url)) ? <span className="rounded-full bg-[#e8f6ee] px-2.5 py-1 text-[10px] font-bold text-[#1f6a58]">Live details</span> : null}
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <button type="button" onClick={() => {
                              if (lessonType === "quiz") {
                                setViewingLesson(null);
                                setQuizLesson(null);
                                setViewingQuizLesson(viewingQuizLesson?.sectionId === id && viewingQuizLesson.lessonId === lessonId
                                  ? null
                                  : { sectionId: id, lessonId });
                                return;
                              }
                              setViewingLesson(viewingLesson?.sectionId === id && viewingLesson.lessonId === lessonId ? null : { sectionId: id, lessonId });
                            }} className="rounded-lg border border-[#dce9e3] px-3.5 py-2 text-xs font-bold text-[#1f6a58] transition hover:bg-[#f0f8f3]">View lesson</button>
                            {canManage ? <details className="relative">
                              <summary aria-label={`Actions for ${lessonTitle}`} className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-xl border border-[#dce9e3] text-lg font-bold leading-none text-[#52736a] transition hover:bg-[#f0f8f3] [&::-webkit-details-marker]:hidden">...</summary>
                              <div className="absolute right-0 top-11 z-20 grid min-w-44 gap-1 rounded-xl border border-[#dce9e3] bg-white p-2 shadow-lg">
                                <button type="button" aria-label={`Move ${lessonTitle} up`} onClick={() => moveLessonMutation.mutate({ sectionId: id, lessonId, direction: "up" })} disabled={lIndex === 0 || moveLessonMutation.isPending} className="rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#284940] hover:bg-[#f0f8f3] disabled:opacity-40">Move up</button>
                                <button type="button" aria-label={`Move ${lessonTitle} down`} onClick={() => moveLessonMutation.mutate({ sectionId: id, lessonId, direction: "down" })} disabled={lIndex === lessons.length - 1 || moveLessonMutation.isPending} className="rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#284940] hover:bg-[#f0f8f3] disabled:opacity-40">Move down</button>
                                {lessonType === "quiz" ? <button type="button" onClick={() => { setViewingQuizLesson(null); setViewingLesson(null); setQuizLesson(isQuizOpen ? null : { sectionId: id, lessonId }); }} className="rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#284940] hover:bg-[#f0f8f3]">Manage quiz</button> : null}
                                <button type="button" onClick={() => { if (window.confirm("Delete this lesson?")) void deleteLessonMutation.mutate({ sectionId: id, lessonId }); }} className="rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#b42318] hover:bg-[#fff6f5]">Delete lesson</button>
                              </div>
                            </details> : null}
                          </div>
                        </li>
                        {viewingQuizLesson?.sectionId === id && viewingQuizLesson.lessonId === lessonId && lessonType === "quiz" ? (
                          <li className="rounded-2xl border border-[#dce9e3] bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-[10px] font-bold uppercase tracking-[.08em] text-[#7f9d94]">Quiz questions</p>
                              <div className="flex items-center gap-2">
                                {canManage ? <button
                                  type="button"
                                  onClick={() => {
                                    setViewingQuizLesson(null);
                                    setQuizLesson({ sectionId: id, lessonId });
                                  }}
                                  className="rounded-full border border-[#1f6a58] px-3 py-1 text-[10px] font-bold text-[#1f6a58] hover:bg-[#e8f6ee]"
                                >
                                  Edit questions
                                </button> : null}
                                <button
                                  type="button"
                                  onClick={() => setViewingQuizLesson(null)}
                                  className="rounded-full border border-[#d7e5df] px-3 py-1 text-[10px] font-bold text-[#52736a] hover:bg-white"
                                >
                                  Close
                                </button>
                              </div>
                            </div>
                            {lessonAssessment ? (
                              <>
                                <p className="mt-1 text-sm font-bold text-[#06201c]">{typeof lessonAssessment.title === "string" ? lessonAssessment.title : "Untitled quiz"}</p>
                                {lessonQuestions.length > 0 ? (
                                  <ol className="mt-2 space-y-2">
                                    {lessonQuestions.map((question, questionIndex) => {
                                      const questionId = typeof question.id === "string" ? question.id : String(questionIndex);
                                      const questionText = typeof question.question === "string"
                                        ? question.question
                                        : typeof question.question_text === "string"
                                          ? question.question_text
                                          : typeof question.text === "string" ? question.text : "Question";
                                      const questionType = typeof question.question_type === "string"
                                        ? question.question_type
                                        : typeof question.type === "string" ? question.type : "short_answer";
                                      const options = Array.isArray(question.options) ? question.options.map((option) => {
                                        if (typeof option === "string") return option;
                                        if (option && typeof option === "object") {
                                          const optionRecord = option as Record<string, unknown>;
                                          return typeof optionRecord.label === "string"
                                            ? optionRecord.label
                                            : typeof optionRecord.text === "string"
                                              ? optionRecord.text
                                              : typeof optionRecord.value === "string" ? optionRecord.value : "";
                                        }
                                        return "";
                                      }).filter(Boolean) : [];
                                      const correctAnswer = typeof question.correct_answer === "string" ? question.correct_answer : "";
                                      const correctIndexes = getCorrectOptionIndexes(options, correctAnswer, questionType);

                                      return (
                                        <li key={questionId} className="rounded-lg bg-white px-3 py-2">
                                          <p className="text-xs font-semibold text-[#284940]">{questionIndex + 1}. {questionText}</p>
                                          <p className="mt-0.5 text-[10px] uppercase tracking-[.06em] text-[#7f9d94]">{humanizeLabel(questionType)}</p>
                                          {options.length > 0 ? (
                                            <ul className="mt-2 space-y-1">
                                              {options.map((option, optionIndex) => {
                                                const isCorrect = correctIndexes.has(optionIndex);
                                                return (
                                                  <li key={`${questionId}-${optionIndex}`} className={`rounded border px-2 py-1 text-[11px] ${isCorrect ? "border-[#bce8d1] bg-[#effaf4] font-semibold text-[#167550]" : "border-[#eef4ef] text-[#52736a]"}`}>
                                                    {String.fromCharCode(65 + optionIndex)}. {option}{isCorrect ? " (correct)" : ""}
                                                  </li>
                                                );
                                              })}
                                            </ul>
                                          ) : correctAnswer ? <p className="mt-1 text-xs font-semibold text-[#167550]">Answer: {correctAnswer}</p> : null}
                                        </li>
                                      );
                                    })}
                                  </ol>
                                ) : <p className="mt-2 text-xs text-[#7f9d94]">No questions have been added to this quiz yet.</p>}
                              </>
                            ) : <p className="mt-2 text-xs text-[#7f9d94]">No quiz is linked to this lesson yet.</p>}
                          </li>
                        ) : null}
                        {isQuizOpen && lessonType === "quiz" ? (
                          <div className="rounded-2xl border border-[#cfe1d8] bg-[#f4faf6] p-5 shadow-sm">
                            <div className="flex items-center justify-between gap-3">
                              <div><p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#62877a]">Assessment builder</p><p className="mt-1 text-base font-extrabold text-[#103c33]">Questions and settings</p><p className="mt-1 text-xs text-[#718c82]">Create or attach an assessment and manage its learner questions.</p></div>
                              <button
                                type="button"
                                onClick={() => {
                                  setQuizLesson(null);
                                  setViewingQuizLesson({ sectionId: id, lessonId });
                                }}
                                className="rounded-full border border-[#d7e5df] px-3 py-1 text-[10px] font-bold text-[#52736a] hover:bg-white"
                              >
                                Back to questions
                              </button>
                            </div>
                            {lessonAssessment ? (
                              <div className="mt-2 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-bold text-[#06201c]">{typeof lessonAssessment.title === "string" ? lessonAssessment.title : "Untitled quiz"}</p>
                                  {canManage ? <button type="button" onClick={() => { if (window.confirm("Detach this quiz from the lesson?")) detachLessonAssessmentMutation.mutate({ sectionId: id, lessonId, lessonTitle }); }} className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-[#b42318] hover:bg-[#fff6f5]">Detach</button> : null}
                                </div>
                                <p className="text-xs text-[#52736a]">{typeof lessonAssessment.type === "string" ? lessonAssessment.type : "quiz"}  |  {lessonQuestions.length} questions</p>
                                {lessonQuestions.length > 0 ? (
                                  <ul className="space-y-1">
                                    {lessonQuestions.map((q, qi) => {
                                      const qr = q as Record<string, unknown>;
                                      const qId = typeof qr.id === "string" ? qr.id : String(qi);
                                      const qText = typeof qr.question === "string" ? qr.question : typeof qr.question_text === "string" ? qr.question_text : typeof qr.text === "string" ? qr.text : "Question";
                                      const qType = typeof qr.question_type === "string" ? qr.question_type : typeof qr.type === "string" ? qr.type : "short_answer";
                                      const qOptions = Array.isArray(qr.options) ? qr.options.map((option) => {
                                        if (typeof option === "string") return option;
                                        if (option && typeof option === "object") {
                                          const optionRecord = option as Record<string, unknown>;
                                          return typeof optionRecord.label === "string" ? optionRecord.label : typeof optionRecord.text === "string" ? optionRecord.text : typeof optionRecord.value === "string" ? optionRecord.value : "";
                                        }
                                        return "";
                                      }).filter(Boolean) : [];
                                      const qCorrect = typeof qr.correct_answer === "string" ? qr.correct_answer : "";
                                      const correctOptionIndexes = getCorrectOptionIndexes(qOptions, qCorrect, qType);
                                      return (
                                        <li key={qId} className="rounded-lg bg-white px-2 py-2">
                                          <div className="flex items-start justify-between gap-2">
                                            <div>
                                              <p className="text-xs font-semibold text-[#52736a]">{qi + 1}. {qText}</p>
                                              <p className="mt-0.5 text-[10px] uppercase tracking-[.06em] text-[#7f9d94]">{humanizeLabel(qType)}{typeof qr.points === "number" ? `  |  ${qr.points} point${qr.points === 1 ? "" : "s"}` : ""}</p>
                                            </div>
                                            {canManage ? <button type="button" onClick={() => { if (lessonAssessmentId && window.confirm("Delete this question?")) deleteSectionQuestionMutation.mutate({ assessmentId: lessonAssessmentId, questionId: qId }); }} className="shrink-0 text-[10px] font-semibold text-[#b42318]">Delete</button> : null}
                                          </div>
                                          {qOptions.length > 0 ? <ul className="mt-2 space-y-1">{qOptions.map((option, optionIndex) => { const isCorrect = correctOptionIndexes.has(optionIndex); return <li key={`${qId}-${optionIndex}`} className={`rounded border px-2 py-1 text-[11px] ${isCorrect ? "border-[#bce8d1] bg-[#effaf4] font-semibold text-[#167550]" : "border-[#eef4ef] text-[#52736a]"}`}>{String.fromCharCode(65 + optionIndex)}. {option}{isCorrect ? " (correct)" : ""}</li>; })}</ul> : null}
                                          {qCorrect && correctOptionIndexes.size === 0 ? <p className="mt-1 text-[11px] font-semibold text-[#167550]">Correct answer: {qCorrect}</p> : null}
                                        </li>
                                      );
                                    })}
                                  </ul>
                                ) : <p className="text-xs text-[#7f9d94]">No questions yet - add the first one below.</p>}
                                {canManage ? <form className="grid gap-3 rounded-xl border border-[#e2ece6] bg-[#fbfdfb] p-4 sm:grid-cols-2" onSubmit={(e) => {
                                  e.preventDefault();
                                  const question = lessonQuestion[lessonKey]?.trim() ?? "";
                                  const questionType = lessonQuestionType[lessonKey] ?? "short_answer";
                                  const options = questionType === "true_false" ? ["true", "false"] : (lessonQuestionOptions[lessonKey] ?? "").split(",").map((option) => option.trim()).filter(Boolean);
                                  const correctAnswer = lessonCorrectAnswer[lessonKey]?.trim() ?? "";
                                  if (question && lessonAssessmentId && (questionType === "short_answer" || questionType === "essay" || correctAnswer) && (questionType !== "mcq" && questionType !== "multiple_select" || options.length > 0)) {
                                    addSectionQuestionMutation.mutate({ formKey: lessonKey, assessmentId: lessonAssessmentId, question, questionType, options, correctAnswer, points: Number(lessonQuestionPoints[lessonKey] || 1) });
                                  }
                                }}>
                                  <input value={lessonQuestion[lessonKey] ?? ""} onChange={(e) => setLessonQuestion((current) => ({ ...current, [lessonKey]: e.target.value }))} placeholder="Question text" className="h-8 rounded-lg border border-[#d7e5df] bg-white px-3 text-xs outline-none focus:border-[#1f6a58] sm:col-span-2" />
                                  <select value={lessonQuestionType[lessonKey] ?? "short_answer"} onChange={(e) => setLessonQuestionType((current) => ({ ...current, [lessonKey]: e.target.value }))} aria-label="Question type" className="h-8 rounded-lg border border-[#d7e5df] bg-white px-2 text-xs outline-none focus:border-[#1f6a58]">
                                    {QUIZ_QUESTION_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                  </select>
                                  <input type="number" min="1" value={lessonQuestionPoints[lessonKey] ?? "1"} onChange={(e) => setLessonQuestionPoints((current) => ({ ...current, [lessonKey]: e.target.value }))} placeholder="Points" className="h-8 rounded-lg border border-[#d7e5df] px-3 text-xs outline-none focus:border-[#1f6a58]" />
                                  {["mcq", "multiple_select"].includes(lessonQuestionType[lessonKey] ?? "short_answer") ? <input value={lessonQuestionOptions[lessonKey] ?? ""} onChange={(e) => setLessonQuestionOptions((current) => ({ ...current, [lessonKey]: e.target.value }))} placeholder="Options, separated by commas" className="h-8 rounded-lg border border-[#d7e5df] px-3 text-xs outline-none focus:border-[#1f6a58]" /> : null}
                                  {lessonQuestionType[lessonKey] === "true_false" ? <select value={lessonCorrectAnswer[lessonKey] ?? ""} onChange={(e) => setLessonCorrectAnswer((current) => ({ ...current, [lessonKey]: e.target.value }))} aria-label="Correct true or false answer" className="h-8 rounded-lg border border-[#d7e5df] px-3 text-xs outline-none focus:border-[#1f6a58]"><option value="">Correct answer</option><option value="true">True</option><option value="false">False</option></select> : null}
                                  {["mcq", "multiple_select", "task"].includes(lessonQuestionType[lessonKey] ?? "") ? <input value={lessonCorrectAnswer[lessonKey] ?? ""} onChange={(e) => setLessonCorrectAnswer((current) => ({ ...current, [lessonKey]: e.target.value }))} placeholder={lessonQuestionType[lessonKey] === "task" ? "Task grading note" : "Correct answer"} className="h-8 rounded-lg border border-[#d7e5df] px-3 text-xs outline-none focus:border-[#1f6a58]" /> : null}
                                  <button type="submit" disabled={addSectionQuestionMutation.isPending || !lessonQuestion[lessonKey]?.trim()} className="h-8 rounded-full border border-[#1f6a58] px-3 text-[10px] font-bold text-[#1f6a58] disabled:opacity-60 sm:col-span-2">{addSectionQuestionMutation.isPending ? "Adding..." : "Add question"}</button>
                                </form> : null}
                              </div>
                            ) : (
                              <p className="mt-1 text-xs text-[#7f9d94]">No quiz linked yet - learners take it right after finishing this lesson.</p>
                            )}
                            {canManage && !lessonAssessmentId ? (
                              <>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <select value={lessonAssessmentDraft[lessonKey] ?? ""} onChange={(e) => setLessonAssessmentDraft((current) => ({ ...current, [lessonKey]: e.target.value }))} className="h-8 min-w-0 flex-1 rounded-lg border border-[#d7e5df] bg-white px-2 text-xs outline-none focus:border-[#1f6a58]">
                                    <option value="">Attach existing quiz...</option>
                                    {assessments.map((a) => { const aId = typeof a.id === "string" ? a.id : ""; const aTitle = typeof a.title === "string" ? a.title : "Untitled"; return aId ? <option key={aId} value={aId}>{aTitle}</option> : null; })}
                                  </select>
                                  <button type="button" onClick={() => { const target = lessonAssessmentDraft[lessonKey]; if (target) attachLessonAssessmentMutation.mutate({ sectionId: id, lessonId, lessonTitle, assessmentId: target }); }} disabled={!lessonAssessmentDraft[lessonKey] || attachLessonAssessmentMutation.isPending} className="h-8 rounded-full bg-[#1f6a58] px-3 text-[10px] font-bold text-white disabled:opacity-60">Attach</button>
                                </div>
                                <form className="mt-3 grid gap-3 rounded-xl border border-[#e2ece6] bg-white p-4 sm:grid-cols-2 [&_input:not([type=checkbox])]:h-10 [&_input:not([type=checkbox])]:rounded-lg [&_input:not([type=checkbox])]:px-3 [&_input:not([type=checkbox])]:text-sm [&_select]:h-10 [&_select]:rounded-lg [&_select]:px-3 [&_select]:text-sm [&_textarea]:rounded-lg [&_textarea]:p-3 [&_textarea]:text-sm" onSubmit={(e) => {
                                  e.preventDefault();
                                  const title = lessonAssessmentTitle[lessonKey]?.trim() ?? "";
                                  const assessmentType = lessonAssessmentType[lessonKey] ?? "quiz";
                                  const passPercent = lessonAssessmentPassPercent[lessonKey] ?? "";
                                  const timeLimit = lessonAssessmentTimeLimit[lessonKey] ?? "";
                                  const attemptsAllowed = lessonAssessmentAttempts[lessonKey] ?? "";
                                  const randomise = lessonAssessmentRandomise[lessonKey] ?? false;
                                  const level: TrainingAssessmentLevel = "module";
                                  const publication = lessonAssessmentPublication[lessonKey] ?? "immediate";
                                  const publishAt = lessonAssessmentPublishAt[lessonKey] ?? "";
                                  if (!title || !isOptionalIntegerInRange(passPercent, 0, 100)
                                    || !isOptionalPositiveInteger(timeLimit)
                                    || !isOptionalPositiveInteger(attemptsAllowed)
                                    || (publication === "scheduled" && !publishAt)) return;
                                  createLessonAssessmentMutation.mutate({
                                    sectionId: id,
                                    lessonId,
                                    lessonTitle,
                                    title,
                                    instructions: lessonAssessmentInstructions[lessonKey] ?? "",
                                    assessmentType,
                                    passPercent,
                                    timeLimit,
                                    attemptsAllowed,
                                    randomise,
                                    level,
                                    publication,
                                    publishAt,
                                  });
                                }}>
                                  <input value={lessonAssessmentTitle[lessonKey] ?? ""} onChange={(e) => setLessonAssessmentTitle((current) => ({ ...current, [lessonKey]: e.target.value }))} placeholder="Or create a new quiz for this lesson..." aria-label="New quiz title" className="h-8 min-w-0 rounded-lg border border-[#d7e5df] bg-white px-3 text-xs outline-none focus:border-[#1f6a58] sm:col-span-2" />
                                  <textarea value={lessonAssessmentInstructions[lessonKey] ?? ""} onChange={(e) => setLessonAssessmentInstructions((current) => ({ ...current, [lessonKey]: e.target.value }))} placeholder="Instructions (optional)" aria-label="Quiz instructions" rows={2} className="min-w-0 rounded-lg border border-[#d7e5df] bg-white px-3 py-2 text-xs outline-none focus:border-[#1f6a58] sm:col-span-2" />
                                  <details className="rounded-lg border border-[#e1ebe6] bg-white p-2 sm:col-span-2">
                                    <summary className="cursor-pointer text-xs font-semibold text-[#52736a]">{t("quizBuilder.optionalSettings", { defaultValue: "Optional quiz settings" })}</summary>
                                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                      <label className="text-[10px] font-semibold text-[#52736a]">{t("quizBuilder.assessmentType", { defaultValue: "Assessment type" })}
                                        <select value={lessonAssessmentType[lessonKey] ?? "quiz"} onChange={(e) => setLessonAssessmentType((current) => ({ ...current, [lessonKey]: e.target.value as TrainingAssessmentType }))} className="mt-1 h-8 w-full rounded-lg border border-[#d7e5df] bg-white px-2 text-xs outline-none focus:border-[#1f6a58]">
                                          <option value="quiz">Quiz</option>
                                          <option value="exam">Exam</option>
                                        </select>
                                      </label>
                                      <label className="text-[10px] font-semibold text-[#52736a]">{t("quizBuilder.passPercent", { defaultValue: "Pass percentage (optional)" })}
                                        <input type="number" min="0" max="100" step="1" value={lessonAssessmentPassPercent[lessonKey] ?? ""} onChange={(e) => setLessonAssessmentPassPercent((current) => ({ ...current, [lessonKey]: e.target.value }))} placeholder="0 > 100%" className="mt-1 h-8 w-full rounded-lg border border-[#d7e5df] bg-white px-2 text-xs outline-none focus:border-[#1f6a58]" />
                                        <span className="mt-1 block font-normal">{t("quizBuilder.passPercentHelp", { defaultValue: "Learners need this percentage of the total points to pass." })}</span>
                                      </label>
                                      <label className="text-[10px] font-semibold text-[#52736a]">{t("quizBuilder.timeLimit", { defaultValue: "Time limit (minutes)" })}
                                        <input type="number" min="1" step="1" value={lessonAssessmentTimeLimit[lessonKey] ?? ""} onChange={(e) => setLessonAssessmentTimeLimit((current) => ({ ...current, [lessonKey]: e.target.value }))} placeholder={t("quizBuilder.noTimeLimit", { defaultValue: "Leave blank for no time limit" })} className="mt-1 h-8 w-full rounded-lg border border-[#d7e5df] bg-white px-2 text-xs outline-none focus:border-[#1f6a58]" />
                                      </label>
                                      <label className="text-[10px] font-semibold text-[#52736a]">{t("quizBuilder.attemptsAllowed", { defaultValue: "Attempts allowed" })}
                                        <input type="number" min="1" step="1" value={lessonAssessmentAttempts[lessonKey] ?? ""} onChange={(e) => setLessonAssessmentAttempts((current) => ({ ...current, [lessonKey]: e.target.value }))} placeholder={t("quizBuilder.unlimitedAttempts", { defaultValue: "Leave blank for unlimited attempts" })} className="mt-1 h-8 w-full rounded-lg border border-[#d7e5df] bg-white px-2 text-xs outline-none focus:border-[#1f6a58]" />
                                      </label>
                                      <label className="flex items-center gap-2 self-end pb-2 text-xs font-semibold text-[#52736a]">
                                        <input type="checkbox" checked={lessonAssessmentRandomise[lessonKey] ?? false} onChange={(e) => setLessonAssessmentRandomise((current) => ({ ...current, [lessonKey]: e.target.checked }))} />
                                        {t("quizBuilder.randomiseQuestions", { defaultValue: "Randomise questions and answer choices" })}
                                      </label>
                                      <label className="text-[10px] font-semibold text-[#52736a]">{t("quizBuilder.resultRelease", { defaultValue: "Result release" })}
                                        <select value={lessonAssessmentPublication[lessonKey] ?? "immediate"} onChange={(e) => setLessonAssessmentPublication((current) => ({ ...current, [lessonKey]: e.target.value as "immediate" | "scheduled" }))} className="mt-1 h-8 w-full rounded-lg border border-[#d7e5df] bg-white px-2 text-xs outline-none focus:border-[#1f6a58]">
                                          <option value="immediate">{t("quizBuilder.immediateResults", { defaultValue: "Immediately after submission" })}</option>
                                          <option value="scheduled">{t("quizBuilder.scheduledResults", { defaultValue: "On a scheduled date and time" })}</option>
                                        </select>
                                      </label>
                                      {(lessonAssessmentPublication[lessonKey] ?? "immediate") === "scheduled" ? <label className="text-[10px] font-semibold text-[#52736a]">{t("quizBuilder.publishAt", { defaultValue: "Release results at" })}
                                        <input type="datetime-local" required value={lessonAssessmentPublishAt[lessonKey] ?? ""} onChange={(e) => setLessonAssessmentPublishAt((current) => ({ ...current, [lessonKey]: e.target.value }))} className="mt-1 h-8 w-full rounded-lg border border-[#d7e5df] bg-white px-2 text-xs outline-none focus:border-[#1f6a58]" />
                                        <span className="mt-1 block font-normal">{t("quizBuilder.scheduledReleaseHelp", { defaultValue: "Free-text answers remain pending until an instructor grades them." })}</span>
                                      </label> : null}
                                    </div>
                                  </details>
                                  <button type="submit" disabled={createLessonAssessmentMutation.isPending || !lessonAssessmentTitle[lessonKey]?.trim() || !isOptionalIntegerInRange(lessonAssessmentPassPercent[lessonKey] ?? "", 0, 100) || !isOptionalPositiveInteger(lessonAssessmentTimeLimit[lessonKey] ?? "") || !isOptionalPositiveInteger(lessonAssessmentAttempts[lessonKey] ?? "") || ((lessonAssessmentPublication[lessonKey] ?? "immediate") === "scheduled" && !lessonAssessmentPublishAt[lessonKey])} className="h-8 rounded-full border border-[#1f6a58] px-3 text-[10px] font-bold text-[#1f6a58] disabled:opacity-60 sm:col-span-2">{createLessonAssessmentMutation.isPending ? "Creating..." : "Create and publish quiz"}</button>
                                </form>
                              </>
                            ) : null}
                          </div>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </ol>
              ) : <p className="mt-4 rounded-xl border border-dashed border-[#d7e5df] bg-white px-4 py-5 text-sm text-[#718c82]">No lessons in this session yet.{canManage ? " Add a lesson below to build this part of the course." : ""}</p>}
              {viewingLesson?.sectionId === id ? (
                <LessonDetail
                  key={`${viewingLesson.sectionId}:${viewingLesson.lessonId}`}
                  trainingId={trainingId}
                  sectionId={id}
                  lessonId={viewingLesson.lessonId}
                  trainingDeliveryMode={trainingDeliveryMode}
                  trainingLessonDefaults={trainingLessonDefaults}
                  imageUploadFieldKeys={imageUploadFieldKeys}
                  canManage={canManage}
                  onClose={() => setViewingLesson(null)}
                />
              ) : null}
              {canManage ? <AddLessonForm
                pending={createLessonMutation.isPending}
                trainingDeliveryMode={trainingDeliveryMode}
                trainingLessonDefaults={trainingLessonDefaults}
                imageUploadFieldKeys={imageUploadFieldKeys}
                onSubmit={(payload) => createLessonMutation.mutateAsync({ sectionId: id, payload })}
              /> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
    </section>
  );
}

/** Renders the Training enrolments with approve/cancel + group & CSV export. */
function EnrolmentsSection({ trainingId }: { trainingId: string }) {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [enrolName, setEnrolName] = useState("");
  const [enrolEmail, setEnrolEmail] = useState("");

  const enrolmentsQuery = useQuery({
    queryKey: ["trainings", trainingId, "enrolments"],
    queryFn: () => listTrainingEnrolments(trainingId),
    enabled: Boolean(trainingId),
  });

  const enrolMutation = useMutation({
    mutationFn: () => enrolInTraining(trainingId, { participant_name: enrolName.trim(), participant_email: enrolEmail.trim() }),
    onSuccess: () => { setEnrolName(""); setEnrolEmail(""); setFeedback("Enrolment submitted."); void Promise.all([queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "enrolments"] }), queryClient.invalidateQueries({ queryKey: ["trainings", "list"] })]); },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to enrol participant."),
  });

  const exportMutation = useMutation({
    mutationFn: () => exportTrainingEnrolments(trainingId),
    onSuccess: (data) => {
      const url = URL.createObjectURL(data.blob);
      const a = document.createElement("a");
      a.href = url; a.download = (data.filename ?? `training-${trainingId}-enrolments.csv`).replace(/"/g, ""); document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      setFeedback("CSV exported.");
    },
    onError: (error) => setFeedback(error instanceof Error ? error.message : "Unable to export CSV."),
  });

  const approveMutation = useMutation({
    mutationFn: (enrolId: string) => approveTrainingEnrolment(trainingId, enrolId),
    onSuccess: () => { setFeedback("Enrolment approved."); void Promise.all([queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "enrolments"] }), queryClient.invalidateQueries({ queryKey: ["trainings", "list"] })]); },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to approve enrolment."),
  });

  const cancelMutation = useMutation({
    mutationFn: (enrolId: string) => cancelTrainingEnrolment(trainingId, enrolId),
    onSuccess: () => { setFeedback("Enrolment cancelled."); void Promise.all([queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "enrolments"] }), queryClient.invalidateQueries({ queryKey: ["trainings", "list"] })]); },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to cancel enrolment."),
  });

  const enrolments = enrolmentsQuery.data ?? [];

  return (
    <SectionCard
      title="Enrolments"
      action={
        <button type="button" onClick={() => void exportMutation.mutate()} disabled={exportMutation.isPending} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#1f6a58] disabled:opacity-60">
          {exportMutation.isPending ? "Exporting..." : "Export CSV"}
        </button>
      }
    >
      {feedback ? <p role="status" className="mb-4 rounded-xl border border-[#bce8d1] bg-[#effaf4] px-4 py-3 text-sm font-semibold text-[#167550]">{feedback}</p> : null}
      <form className="mb-4 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (enrolName.trim() && enrolEmail.trim()) enrolMutation.mutate(); }}>
        <input value={enrolName} onChange={(e) => setEnrolName(e.target.value)} placeholder="Participant name" className="h-10 flex-1 min-w-[140px] rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-4 text-sm outline-none focus:border-[#1f6a58]" />
        <input value={enrolEmail} onChange={(e) => setEnrolEmail(e.target.value)} placeholder="Participant email" type="email" className="h-10 flex-1 min-w-[180px] rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-4 text-sm outline-none focus:border-[#1f6a58]" />
        <button type="submit" disabled={enrolMutation.isPending || !enrolName.trim() || !enrolEmail.trim()} className="h-10 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white disabled:opacity-60">{enrolMutation.isPending ? "Enrolling..." : "Enrol User"}</button>
      </form>
      {enrolmentsQuery.isLoading ? <p className="text-sm text-[#52736a]">Loading enrolments...</p> : null}
      {enrolmentsQuery.isError ? <p className="text-sm font-semibold text-[#b42318]">{(enrolmentsQuery.error as Error).message}</p> : null}
      {!enrolmentsQuery.isLoading && !enrolmentsQuery.isError && enrolments.length === 0 ? <p className="text-sm text-[#52736a]">No enrolments yet.</p> : null}
      {enrolments.length > 0 ? (
        <ul className="grid gap-2">
          {enrolments.map((enrolment, index) => {
            const record = enrolment as Record<string, unknown>;
            const id = typeof record.id === "string" ? record.id : typeof record.enrolment_id === "string" ? record.enrolment_id : String(index);
            const name = typeof record.participant_name === "string" ? record.participant_name : typeof record.name === "string" ? record.name : "Participant";
            const email = typeof record.email === "string" ? record.email : typeof record.participant_email === "string" ? record.participant_email : null;
            const rawStatus = typeof record.status === "string" ? record.status : typeof record.enrolment_status === "string" ? record.enrolment_status : typeof record.approval_status === "string" ? record.approval_status : "-";
            const status = rawStatus.toLowerCase();
            const enrolledAt = typeof record.enrolled_at === "string" ? record.enrolled_at : typeof record.created_at === "string" ? record.created_at : null;
            const settledStatuses = ["approved", "enrolled", "active", "attended", "completed", "cancelled", "rejected", "checked_in"];
            const isPending = !settledStatuses.includes(status);
            return (
              <li key={id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#06201c]">{name}</p>
                  {email ? <p className="text-xs text-[#7f9d94]">{email}</p> : null}
                  {enrolledAt ? <p className="text-xs text-[#7f9d94]">{formatTrainingDate(enrolledAt)}</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#eef4ff] px-3 py-1 text-[11px] font-bold text-[#2563eb]">{humanizeLabel(rawStatus)}</span>
                  {isPending ? (
                    <>
                      <button type="button" onClick={() => approveMutation.mutate(id)} disabled={approveMutation.isPending} className="rounded-full bg-[#1f6a58] px-3 py-1 text-[11px] font-bold text-white disabled:opacity-60">Approve</button>
                      <button type="button" onClick={() => cancelMutation.mutate(id)} disabled={cancelMutation.isPending} className="rounded-full border border-[#b42318] px-3 py-1 text-[11px] font-bold text-[#b42318] disabled:opacity-60">Cancel</button>
                    </>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </SectionCard>
  );
}

/** Renders the Training orders with status and refund actions. */
function OrdersSection({ trainingId }: { trainingId: string }) {
  const ordersQuery = useQuery({
    queryKey: ["trainings", trainingId, "orders"],
    queryFn: () => listTrainingOrders(trainingId),
    enabled: Boolean(trainingId),
  });

  const orders = ordersQuery.data ?? [];

  return (
    <SectionCard title="Orders">
      <p className="-mt-2 text-sm text-[#52736a]">Purchase and payment records for this training. Paid orders can be refunded; refund requests can be approved or rejected.</p>
      {ordersQuery.isLoading ? <p className="text-sm text-[#52736a]">Loading orders...</p> : null}
      {ordersQuery.isError ? (
        <div className="rounded-xl border border-[#f3d5d1] bg-[#fff7f6] px-4 py-3">
          <p role="alert" className="text-sm font-semibold text-[#b42318]">{(ordersQuery.error as Error).message}</p>
          <button type="button" onClick={() => void ordersQuery.refetch()} className="mt-2 text-xs font-semibold text-[#1f6a58] underline">Try again</button>
        </div>
      ) : null}
      {!ordersQuery.isLoading && !ordersQuery.isError && orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#d7e5df] bg-[#f9fcfa] px-5 py-10 text-center">
          <p className="font-bold text-[#06201c]">No orders yet.</p>
          <p className="mt-1 text-sm text-[#52736a]">Orders appear here when participants purchase this training through checkout.</p>
        </div>
      ) : null}
      {orders.length > 0 ? (
        <ul className="space-y-3">
          {orders.map((order, index) => {
            const record = order as Record<string, unknown>;
            const id = typeof record.id === "string" ? (record.id as string) : `order-${index}`;
            return <TrainingOrderRow key={id} trainingId={trainingId} order={order} />;
          })}
        </ul>
      ) : null}
    </SectionCard>
  );
}

function orderText(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeStatus(value: string): string {
  return value.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function orderAmountLabel(record: Record<string, unknown>): string | null {
  const raw = orderText(record, "amount") ?? orderText(record, "total") ?? orderText(record, "total_amount");
  if (!raw) return null;
  const numeric = Number(raw);
  const currency = orderText(record, "currency") ?? "";
  if (Number.isFinite(numeric)) {
    if (currency) {
      try {
        return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(numeric);
      } catch {
        return `${numeric} ${currency}`.trim();
      }
    }
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(numeric);
  }
  return currency ? `${raw} ${currency}`.trim() : raw;
}

/** One order row with refund request / approve / reject controls driven by backend state. */
function TrainingOrderRow({ trainingId, order }: { trainingId: string; order: unknown }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const record = (order && typeof order === "object" ? order : {}) as Record<string, unknown>;
  const id = typeof record.id === "string" ? (record.id as string) : "";

  const participantName = orderText(record, "participant_name");
  const participantEmail = orderText(record, "participant_email");
  const quantity = typeof record.quantity === "number" || typeof record.quantity === "string" ? String(record.quantity) : null;
  const amount = orderAmountLabel(record);
  const currency = orderText(record, "currency");
  const orderStatus = orderText(record, "status") ?? "";
  const paymentStatus = orderText(record, "payment_status") ?? "";
  const paymentProvider = orderText(record, "payment_provider");
  const planLabel = orderText(record, "ticket_type_id") ?? orderText(record, "plan_id") ?? orderText(record, "batch_id") ?? orderText(record, "seat_id");
  const createdAt = orderText(record, "created_at");
  const refundReason = orderText(record, "refund_reason");

  const orderNorm = normalizeStatus(orderStatus);
  const paymentNorm = normalizeStatus(paymentStatus);
  const requested = (["refund requested", "refund pending", "pending refund", "refund request"] as const).some((value) => orderNorm === value || paymentNorm === value);
  const refunded = orderNorm === "refunded" || paymentNorm === "refunded";
  const rejected = orderNorm === "refund rejected" || paymentNorm === "refund rejected";
  const cancelled = orderNorm === "cancelled" || orderNorm === "canceled" || paymentNorm === "cancelled" || paymentNorm === "canceled";
  const canRequestRefund = Boolean(id) && !requested && !refunded && !rejected && !cancelled;

  const manageAllowed = !requested && !refunded && !rejected && !cancelled;
  const confirmed = orderNorm === "confirmed";
  const completedOrder = orderNorm === "completed";
  const showConfirm = manageAllowed && !confirmed && !completedOrder && !cancelled;
  const showComplete = manageAllowed && confirmed && !completedOrder;
  const showCancel = manageAllowed && !completedOrder && !cancelled;

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "orders"] });
  const requestMutation = useMutation({
    mutationFn: (reason?: string) => refundTrainingOrder(trainingId, id, reason?.trim() ? { reason: reason.trim() } : {}),
    onSuccess: () => { setMessage({ kind: "success", text: "Refund requested. Approve or reject it from this row once it is pending." }); refresh(); },
    onError: (error) => setMessage({ kind: "error", text: error instanceof TrainingsApiError ? error.message : "Unable to request refund." }),
  });
  const decisionMutation = useMutation({
    mutationFn: ({ action, reason }: { action: "approve" | "reject"; reason?: string }) => decideTrainingOrderRefund(trainingId, id, action, reason),
    onSuccess: (_result, variables) => { setMessage({ kind: "success", text: variables.action === "approve" ? "Refund approved." : "Refund request rejected." }); refresh(); },
    onError: (error) => setMessage({ kind: "error", text: error instanceof TrainingsApiError ? error.message : "Unable to update the refund." }),
  });
  const statusMutation = useMutation({
    mutationFn: ({ status, reason }: { status: "confirmed" | "completed" | "cancelled"; reason?: string }) =>
      patchTrainingOrderStatus(trainingId, id, { status, ...(reason?.trim() ? { reason: reason.trim() } : {}) }),
    onSuccess: (_result, variables) => {
      setMessage({ kind: "success", text: variables.status === "cancelled" ? "Order cancelled." : variables.status === "completed" ? "Order marked as completed." : "Order confirmed." });
      refresh();
    },
    onError: (error) => setMessage({ kind: "error", text: error instanceof TrainingsApiError ? error.message : "Unable to update the order status." }),
  });

  const busy = requestMutation.isPending || decisionMutation.isPending || statusMutation.isPending;
  const title = participantName ?? `Order ${id.slice(0, 8)}`;

  return (
    <li className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-[#06201c]">{title}</p>
            {refunded ? <OrderPill tone="green">Refunded</OrderPill> : requested ? <OrderPill tone="amber">Refund requested</OrderPill> : rejected ? <OrderPill tone="red">Refund rejected</OrderPill> : <OrderPill tone="blue">{orderStatus || "Order"}</OrderPill>}
            {paymentStatus ? <OrderPill tone="neutral">{paymentStatus}</OrderPill> : null}
          </div>
          {participantEmail ? <p className="mt-1 break-all text-xs text-[#52736a]">{participantEmail}</p> : null}
          <p className="mt-1 text-xs text-[#7f9d94]">Order {id.slice(0, 8)}{createdAt ? `  |  ${formatTrainingDate(createdAt)}` : ""}</p>
        </div>
        {amount ? <p className="text-base font-bold text-[#06201c]">{amount}</p> : null}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
        <OrderDetail label="Order status" value={orderStatus || "-"} />
        <OrderDetail label="Payment status" value={paymentStatus || "-"} />
        {quantity !== null ? <OrderDetail label="Quantity" value={quantity} /> : null}
        {currency ? <OrderDetail label="Currency" value={currency} /> : null}
        {paymentProvider ? <OrderDetail label="Payment provider" value={paymentProvider} /> : null}
        {planLabel ? <OrderDetail label="Plan / seat" value={planLabel} /> : null}
      </dl>
      {refundReason ? <p className="mt-3 rounded-lg bg-white px-3 py-2 text-xs text-[#52736a]"><span className="font-semibold text-[#06201c]">Refund note:</span> {refundReason}</p> : null}
      {message ? <p role={message.kind === "error" ? "alert" : "status"} className={message.kind === "error" ? "mt-3 rounded-lg bg-[#fff4f2] px-3 py-2 text-xs font-semibold text-[#b42318]" : "mt-3 rounded-lg bg-[#effaf4] px-3 py-2 text-xs font-semibold text-[#167550]"}>{message.text}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-[#e1ebe6] pt-3">
        {showConfirm || showComplete || showCancel ? (
          <span className="py-1.5 pr-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Order</span>
        ) : null}
        {showConfirm ? (
          <button
            type="button"
            onClick={() => statusMutation.mutate({ status: "confirmed" })}
            disabled={busy}
            className="rounded-full bg-[#1f6a58] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#195646] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {statusMutation.isPending ? "Updating..." : "Confirm order"}
          </button>
        ) : null}
        {showComplete ? (
          <button
            type="button"
            onClick={() => statusMutation.mutate({ status: "completed" })}
            disabled={busy}
            className="rounded-full border border-[#1f6a58] px-4 py-1.5 text-xs font-bold text-[#1f6a58] hover:bg-[#e8f6ee] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {statusMutation.isPending ? "Updating..." : "Mark completed"}
          </button>
        ) : null}
        {showCancel ? (
          <button
            type="button"
            onClick={() => { const reason = window.prompt("Reason for cancelling the order? (optional)"); if (reason !== null) statusMutation.mutate({ status: "cancelled", reason: reason || undefined }); }}
            disabled={busy}
            className="rounded-full border border-[#b42318] px-4 py-1.5 text-xs font-bold text-[#b42318] hover:bg-[#fff7f6] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {statusMutation.isPending ? "Updating..." : "Cancel order"}
          </button>
        ) : null}
        {canRequestRefund ? (
          <button
            type="button"
            onClick={() => { const reason = window.prompt("Reason for the refund? (optional)"); if (reason !== null) requestMutation.mutate(reason || undefined); }}
            disabled={busy}
            className="rounded-full border border-[#b42318] px-4 py-1.5 text-xs font-bold text-[#b42318] hover:bg-[#fff7f6] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {requestMutation.isPending ? "Requesting..." : "Request refund"}
          </button>
        ) : null}
        {requested ? (
          <>
            <button
              type="button"
              onClick={() => decisionMutation.mutate({ action: "approve" })}
              disabled={busy}
              className="rounded-full bg-[#1f6a58] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#195646] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {decisionMutation.isPending ? "Updating..." : "Approve refund"}
            </button>
            <button
              type="button"
              onClick={() => { const reason = window.prompt("Reason for rejecting the refund? (optional)"); if (reason !== null) decisionMutation.mutate({ action: "reject", reason: reason || undefined }); }}
              disabled={busy}
              className="rounded-full border border-[#b42318] px-4 py-1.5 text-xs font-bold text-[#b42318] hover:bg-[#fff7f6] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {decisionMutation.isPending ? "Updating..." : "Reject refund"}
            </button>
          </>
        ) : null}
        {!showConfirm && !showComplete && !showCancel && !canRequestRefund && !requested ? (
          <span className="py-1 text-xs text-[#7f9d94]">{refunded ? "This order has been refunded." : rejected ? "This refund request was rejected." : cancelled ? "This order was cancelled." : "No action available for this order state."}</span>
        ) : null}
      </div>
    </li>
  );
}

function OrderDetail({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-bold uppercase tracking-[0.08em] text-[#7f9d94]">{label}</dt><dd className="mt-1 break-all font-semibold text-[#31594d]">{value}</dd></div>;
}

function OrderPill({ tone, children }: { tone: "green" | "amber" | "red" | "blue" | "neutral"; children: React.ReactNode }) {
  const tones = {
    green: "bg-[#e9f4ee] text-[#1f6a58]",
    amber: "bg-[#fff4d6] text-[#8a5a00]",
    red: "bg-[#fff1f0] text-[#b42318]",
    blue: "bg-[#eef4ff] text-[#2563eb]",
    neutral: "bg-[#edf3f0] text-[#52736a]",
  };
  return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${tones[tone]}`}>{children}</span>;
}

/** Renders the Training enrolment management workspace. */
export function TrainingEnrolmentsTab({ trainingId }: { trainingId: string }) {
  return <EnrolmentsSection trainingId={trainingId} />;
}

/** Renders the backend-authoritative Training attendance and check-in workspace. */
export function TrainingAttendanceTab({ trainingId }: { trainingId: string }) {
  return <TrainingLessonAttendance trainingId={trainingId} />;
}

/** Renders Training purchase records and refund/status actions. */
export function TrainingOrdersTab({ trainingId }: { trainingId: string }) {
  return <OrdersSection trainingId={trainingId} />;
}

/** Renders live sessions, discussions (with create/reply), and announcements. */
export function TrainingLiveTab({ trainingId, discussionId }: { trainingId: string; discussionId?: string | null }) {
  const queryClient = useQueryClient();
  const [newDiscussionMessage, setNewDiscussionMessage] = useState("");
  const [replyToDiscussion, setReplyToDiscussion] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [postedReplies, setPostedReplies] = useState<Record<string, Array<Record<string, unknown>>>>({});
  const [newAnnouncementTitle, setNewAnnouncementTitle] = useState("");
  const [newAnnouncementMessage, setNewAnnouncementMessage] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const discussionsQuery = useQuery({
    queryKey: ["trainings", trainingId, "discussions"],
    queryFn: () => listTrainingDiscussions(trainingId),
    enabled: Boolean(trainingId),
  });
  const announcementsQuery = useQuery({
    queryKey: ["trainings", trainingId, "announcements"],
    queryFn: () => listTrainingAnnouncements(trainingId),
    enabled: Boolean(trainingId),
  });

  const createDiscussionMutation = useMutation({
    mutationFn: () => createTrainingDiscussion(trainingId, { question: newDiscussionMessage.trim() }),
    onSuccess: () => { setNewDiscussionMessage(""); setFeedback("Discussion started."); void queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "discussions"] }); },
    onError: (error) => {
      const msg = error instanceof TrainingsApiError ? error.message : String(error);
      if (msg.includes("400") || msg.toLowerCase().includes("bad request")) {
        setFeedback("Unable to create discussion. You need an active enrolment in this training to post.");
      } else {
        setFeedback(msg || "Unable to create discussion.");
      }
    },
  });

  const replyMutation = useMutation({
    mutationFn: ({ discussionId, answer }: { discussionId: string; answer: string }) => createDiscussionReply(trainingId, discussionId, { answer }),
    onSuccess: (createdReply, variables) => {
      const replyRecord = createdReply && typeof createdReply === "object" ? createdReply : {};
      setPostedReplies((current) => ({
        ...current,
        [variables.discussionId]: [...(current[variables.discussionId] ?? []), { ...replyRecord, answer: variables.answer }],
      }));
      setReplyToDiscussion(null);
      setReplyMessage("");
      setFeedback("Reply posted.");
      void queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "discussions"] });
    },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to post reply."),
  });

  const createAnnouncementMutation = useMutation({
    mutationFn: () => createTrainingAnnouncement(trainingId, { title: newAnnouncementTitle.trim(), message: newAnnouncementMessage.trim(), recipient_type: "all" }),
    onSuccess: () => { setNewAnnouncementTitle(""); setNewAnnouncementMessage(""); setFeedback("Announcement sent."); void queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "announcements"] }); },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to send announcement."),
  });

  const discussions = discussionsQuery.data ?? [];
  const announcements = announcementsQuery.data ?? [];

  useEffect(() => {
    if (!discussionId || discussionsQuery.isLoading) return;
    const target = document.getElementById(`training-discussion-${discussionId}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [discussionId, discussionsQuery.isLoading, discussions]);

  return (
    <div className="grid gap-5">
      {feedback ? <p role="status" className="rounded-xl border border-[#bce8d1] bg-[#effaf4] px-4 py-3 text-sm font-semibold text-[#167550]">{feedback}</p> : null}
      <SectionCard title="Discussions">
        <form className="mb-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (newDiscussionMessage.trim()) createDiscussionMutation.mutate(); }}>
          <input value={newDiscussionMessage} onChange={(e) => setNewDiscussionMessage(e.target.value)} placeholder="Start a new discussion..." className="h-10 flex-1 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-4 text-sm outline-none focus:border-[#1f6a58]" />
          <button type="submit" disabled={createDiscussionMutation.isPending || !newDiscussionMessage.trim()} className="h-10 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white disabled:opacity-60">{createDiscussionMutation.isPending ? "Posting..." : "Post"}</button>
        </form>
        {discussionsQuery.isLoading ? <p className="text-sm text-[#52736a]">Loading...</p> : null}
        {!discussionsQuery.isLoading && discussions.length === 0 ? <p className="text-sm text-[#52736a]">No discussions yet.</p> : null}
        <ul className="space-y-3">
          {discussions.map((discussion, index) => {
            const record = discussion as Record<string, unknown>;
            const id = typeof record.id === "string" ? record.id : String(index);
            const message = typeof record.message === "string" ? record.message : typeof record.question === "string" ? record.question : "Discussion";
            const author = typeof record.author === "string" ? record.author : typeof record.user_name === "string" ? record.user_name : null;
            const createdAt = typeof record.created_at === "string" ? record.created_at : null;
            const storedAnswer = typeof record.answer === "string" && record.answer.trim() ? [{ answer: record.answer, author }] : [];
            const replies: Array<Record<string, unknown>> = [
              ...(Array.isArray(record.replies) ? record.replies : []),
              ...storedAnswer,
              ...(postedReplies[id] ?? []),
            ];
            const isReplying = replyToDiscussion === id;
            const isTargeted = Boolean(
              discussionId && (
                id === discussionId ||
                String(record.id) === discussionId ||
                String(record.discussion_id) === discussionId ||
                String(record.question_id) === discussionId
              )
            );
            return (
              <li key={id} id={`training-discussion-${id}`} className={`rounded-xl border p-4 transition-all duration-300 ${isTargeted ? "border-[#1f6a58] bg-[#effaf4] ring-2 ring-[#1f6a58] ring-offset-2" : "border-[#e1ebe6] bg-[#f9fcfa]"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#06201c]">{message}{isTargeted ? <span className="ml-2 rounded-full bg-[#1f6a58] px-2 py-0.5 text-[10px] font-bold text-white">Notified question</span> : null}</p>
                    {author ? <p className="mt-1 text-xs text-[#7f9d94]">by {author}</p> : null}
                    {createdAt ? <p className="text-xs text-[#7f9d94]">{formatTrainingDate(createdAt)}</p> : null}
                  </div>
                  <button type="button" onClick={() => setReplyToDiscussion(isReplying ? null : id)} className="shrink-0 rounded-full border border-[#1f6a58] px-3 py-1 text-[11px] font-bold text-[#1f6a58] hover:bg-[#e8f6ee]">{isReplying ? "Cancel" : "Reply"}</button>
                </div>
                {replies.length > 0 ? (
                  <ul className="mt-3 space-y-2 border-t border-[#e1ebe6] pt-3 pl-4">
                    {replies.map((reply, rIndex) => {
                      const rId = typeof reply.id === "string" ? reply.id : String(rIndex);
                      const rMessage = typeof reply.answer === "string" ? reply.answer : typeof reply.message === "string" ? reply.message : "Reply";
                      const rAuthor = typeof reply.author === "string" ? reply.author : typeof reply.user_name === "string" ? reply.user_name : null;
                      return (
                        <li key={rId} className="rounded-lg bg-white p-3">
                          <p className="text-sm text-[#52736a]">{rMessage}</p>
                          {rAuthor ? <p className="mt-1 text-xs text-[#7f9d94]">by {rAuthor}</p> : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
                {isReplying ? (
                  <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (replyMessage.trim()) replyMutation.mutate({ discussionId: id, answer: replyMessage.trim() }); }}>
                    <input value={replyMessage} onChange={(e) => setReplyMessage(e.target.value)} placeholder="Write a reply..." className="h-9 flex-1 rounded-lg border border-[#d7e5df] bg-white px-3 text-sm outline-none focus:border-[#1f6a58]" />
                    <button type="submit" disabled={replyMutation.isPending || !replyMessage.trim()} className="h-9 rounded-full bg-[#1f6a58] px-4 text-xs font-bold text-white disabled:opacity-60">{replyMutation.isPending ? "..." : "Reply"}</button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      </SectionCard>
      <SectionCard title="Announcements">
        <form className="mb-4 space-y-2" onSubmit={(e) => { e.preventDefault(); if (newAnnouncementTitle.trim() && newAnnouncementMessage.trim()) createAnnouncementMutation.mutate(); }}>
          <input value={newAnnouncementTitle} onChange={(e) => setNewAnnouncementTitle(e.target.value)} placeholder="Announcement title" className="h-10 w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-4 text-sm outline-none focus:border-[#1f6a58]" />
          <div className="flex gap-2">
            <textarea value={newAnnouncementMessage} onChange={(e) => setNewAnnouncementMessage(e.target.value)} placeholder="Announcement message..." rows={2} className="flex-1 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-4 py-2 text-sm outline-none focus:border-[#1f6a58]" />
            <button type="submit" disabled={createAnnouncementMutation.isPending || !newAnnouncementTitle.trim() || !newAnnouncementMessage.trim()} className="h-10 self-end rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white disabled:opacity-60">{createAnnouncementMutation.isPending ? "Sending..." : "Send"}</button>
          </div>
        </form>
        {announcementsQuery.isLoading ? <p className="text-sm text-[#52736a]">Loading...</p> : null}
        {!announcementsQuery.isLoading && announcements.length === 0 ? <p className="text-sm text-[#52736a]">No announcements yet.</p> : null}
        <ul className="space-y-2">
          {announcements.map((a, index) => {
            const record = a as Record<string, unknown>;
            const id = typeof record.id === "string" ? record.id : String(index);
            const title = typeof record.title === "string" ? record.title : null;
            const message = typeof record.message === "string" ? record.message : "";
            const createdAt = typeof record.created_at === "string" ? record.created_at : null;
            return (
              <li key={id} className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-4">
                {title ? <p className="text-sm font-bold text-[#06201c]">{title}</p> : null}
                <p className="mt-1 text-sm text-[#52736a]">{message}</p>
                {createdAt ? <p className="mt-2 text-xs text-[#7f9d94]">{formatTrainingDate(createdAt)}</p> : null}
              </li>
            );
          })}
        </ul>
      </SectionCard>
    </div>
  );
}

/** Renders the learner-facing content view: sections  >  lessons  >  topics with complete-lesson buttons. */
export function TrainingContentTab({ trainingId }: { trainingId: string }) {
  const queryClient = useQueryClient();
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  const contentQuery = useQuery({
    queryKey: ["trainings", trainingId, "content"],
    queryFn: () => getTrainingContent(trainingId, true),
    enabled: Boolean(trainingId),
    staleTime: 30_000,
  });

  if (contentQuery.isLoading) return <p className="text-sm text-[#52736a]">Loading content...</p>;
  if (contentQuery.isError) return <p className="text-sm font-semibold text-[#b42318]">{(contentQuery.error as Error).message}</p>;

  const content = contentQuery.data;
  const sections: Array<Record<string, unknown>> = Array.isArray(content)
    ? (content as Array<Record<string, unknown>>)
    : content && typeof content === "object" && Array.isArray((content as Record<string, unknown>).sections)
      ? ((content as Record<string, unknown>).sections as Array<Record<string, unknown>>)
      : [];

  return (
    <div className="mt-6">
      <section className="rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-[#06201c]">Training Content</h3>
        {sections.length === 0 ? <p className="mt-4 text-sm text-[#52736a]">No content available yet.</p> : null}
        <ul className="mt-4 space-y-3">
          {sections.map((section, sIndex) => {
            const sectionId = typeof section.id === "string" ? section.id : String(sIndex);
            const sectionTitle = typeof section.title === "string" ? section.title : "Untitled section";
            const lessons: Array<Record<string, unknown>> = Array.isArray(section.lessons) ? section.lessons : [];
            const sessionExpanded = expandedSession === sectionId;
            return (
              <li key={sectionId} className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-4">
                <button type="button" onClick={() => setExpandedSession((current) => current === sectionId ? null : sectionId)} className="flex w-full items-center justify-between gap-3 text-left">
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-[#06201c]">{sectionTitle}</span>
                    <span className="mt-1 block text-xs text-[#52736a]">{lessons.length} {lessons.length === 1 ? "lesson" : "lessons"}</span>
                  </span>
                  <span className="shrink-0 text-sm font-bold text-[#1f6a58]" aria-hidden="true">{sessionExpanded ? "'" : "+"}</span>
                </button>
                {sessionExpanded && lessons.length === 0 ? <p className="mt-3 text-xs text-[#7f9d94]">No lessons in this session.</p> : null}
                {sessionExpanded ? <ul className="mt-3 space-y-2">
                  {lessons.map((lesson, lIndex) => {
                    const lessonId = typeof lesson.id === "string" ? lesson.id : `${sectionId}-${lIndex}`;
                    const lessonTitle = typeof lesson.title === "string" ? lesson.title : "Untitled lesson";
                    const lessonContent = typeof lesson.content === "string" ? lesson.content : null;
                    const videoUrl = typeof lesson.content_url === "string" && lesson.content_url.trim() ? lesson.content_url : typeof lesson.video_url === "string" ? lesson.video_url : null;
                    const lessonType = typeof lesson.type === "string" && lesson.type.trim() ? toUiLessonType(lesson.type) : "lesson";
                    const isAssessment = ["quiz", "exam", "test", "survey"].includes(lessonType.toLowerCase()) || /\bquiz\b|\bexam\b/i.test(lessonTitle);
                    const isExpanded = expandedLesson === lessonId;
                    return (
                      <li key={lessonId} className="rounded-lg bg-white p-3">
                        <div className="flex items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => setExpandedLesson(isExpanded ? null : lessonId)}
                            className="flex-1 text-left"
                          >
                            <div className="flex items-center gap-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#d7e5df] text-xs text-[#7f9d94]">{lIndex + 1}</span>
                              <p className="text-sm font-semibold text-[#06201c]">{lessonTitle}</p>
                              {lessonType !== "text" ? <span className="rounded-full bg-[#eef4ff] px-2 py-0.5 text-[10px] font-bold text-[#2563eb]">{humanizeLabel(isAssessment ? "assessment" : lessonType)}</span> : null}
                            </div>
                          </button>
                        </div>
                        {isExpanded ? (
                          <div className="mt-3 space-y-3 pl-7">
                            {videoUrl ? (
                              <div>
                                <p className="text-xs font-bold uppercase tracking-[.08em] text-[#7f9d94]">Video</p>
                                <a href={videoUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-semibold text-[#1f6a58] underline">Watch video</a>
                              </div>
                            ) : null}
                            {typeof lesson.audio_url === "string" && lesson.audio_url.trim() ? (
                              <div>
                                <p className="text-xs font-bold uppercase tracking-[.08em] text-[#7f9d94]">Audio</p>
                                <audio controls src={lesson.audio_url} className="mt-1 w-full" />
                              </div>
                            ) : null}
                            {Array.isArray(lesson.documents) && lesson.documents.length > 0 ? (
                              <div>
                                <p className="text-xs font-bold uppercase tracking-[.08em] text-[#7f9d94]">Documents</p>
                                <ul className="mt-1 space-y-1">
                                  {lesson.documents.map((document, documentIndex) => {
                                    const documentUrl = typeof document === "string" ? document : document && typeof document === "object" && typeof (document as Record<string, unknown>).url === "string" ? (document as Record<string, unknown>).url as string : "";
                                    const documentName = typeof document === "object" && document !== null && typeof (document as Record<string, unknown>).name === "string" ? (document as Record<string, unknown>).name as string : documentUrl;
                                    return documentUrl ? <li key={`${documentUrl}-${documentIndex}`}><a href={documentUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#1f6a58] underline">{documentName || "Open document"}</a></li> : null;
                                  })}
                                </ul>
                              </div>
                            ) : null}
                            {lessonContent ? (
                              <div>
                                <p className="text-xs font-bold uppercase tracking-[.08em] text-[#7f9d94]">Content</p>
                                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#52736a]">{lessonContent}</p>
                              </div>
                            ) : null}
                            {!videoUrl && !lessonContent && !(typeof lesson.audio_url === "string" && lesson.audio_url.trim()) && !(Array.isArray(lesson.documents) && lesson.documents.length > 0) ? (
                              <p className="text-xs text-[#7f9d94]">No content for this lesson yet.</p>
                            ) : null}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul> : null}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function QuestionBankBrowser({ trainingId, onSelect }: { trainingId: string; onSelect?: (question: Record<string, unknown>) => void }) {
  const [expanded, setExpanded] = useState(false);
  const bankQuery = useQuery({
    queryKey: ["trainings", trainingId, "question-bank"],
    queryFn: () => getTrainingQuestionBank(trainingId),
    enabled: expanded && Boolean(trainingId),
    staleTime: 30_000,
  });

  const questions = Array.isArray(bankQuery.data) ? bankQuery.data : [];

  return (
    <div className="mt-3 rounded-xl border border-[#eef4ff] bg-[#f8faff] p-3">
      <button type="button" onClick={() => setExpanded(!expanded)} className="text-xs font-bold text-[#2563eb]">
        {expanded ? "Hide" : "Browse"} Question Bank ({questions.length})
      </button>
      {expanded ? (
        <div className="mt-2 space-y-1">
          {bankQuery.isLoading ? <p className="text-xs text-[#52736a]">Loading...</p> : null}
          {questions.length === 0 && !bankQuery.isLoading ? <p className="text-xs text-[#7f9d94]">No reusable questions.</p> : null}
          {(questions as Array<Record<string, unknown>>).map((q, qIndex) => {
            const qId = typeof q.id === "string" ? q.id : String(qIndex);
            const qText = typeof q.question_text === "string" ? q.question_text : typeof q.question === "string" ? q.question : typeof q.text === "string" ? q.text : "Question";
            return (
              <div key={qId} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2">
                <p className="text-xs text-[#52736a]">{qText}</p>
                {onSelect ? (
                  <button type="button" onClick={() => onSelect(q)} className="shrink-0 rounded-full border border-[#1f6a58] px-2 py-0.5 text-[10px] font-bold text-[#1f6a58]">Use</button>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function AssessmentSubmissions({ trainingId, assessmentId, totalPoints: assessmentTotalPoints, onReview }: { trainingId: string; assessmentId: string; totalPoints: number | null; onReview: (submission: AssessmentSubmissionListItem, totalPoints: number | null) => void }) {
  const { t } = useTranslation("enterpriseTrainings");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"pending" | "evaluated" | "all">("all");
  const [order, setOrder] = useState<"newest" | "oldest">("newest");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const fromTimestamp = fromDate ? new Date(fromDate).getTime() : null;
  const toTimestamp = toDate ? new Date(toDate).getTime() : null;
  const invalidDateRange = (fromTimestamp !== null && !Number.isFinite(fromTimestamp))
    || (toTimestamp !== null && !Number.isFinite(toTimestamp))
    || (fromTimestamp !== null && toTimestamp !== null && fromTimestamp > toTimestamp);
  const submissionsQuery = useQuery({
    queryKey: ["trainings", trainingId, "assessment-submissions", assessmentId, page, status, search, fromDate, toDate, order],
    queryFn: () => listTrainingAssessmentSubmissions(trainingId, assessmentId, {
      page,
      page_size: 20,
      status,
      order,
      search: search.trim(),
      from_date: fromTimestamp !== null && Number.isFinite(fromTimestamp) ? new Date(fromTimestamp).toISOString() : undefined,
      to_date: toTimestamp !== null && Number.isFinite(toTimestamp) ? new Date(toTimestamp).toISOString() : undefined,
    }),
    enabled: Boolean(trainingId && assessmentId) && !invalidDateRange,
    staleTime: 15_000,
    retry: 1,
  });
  const submissions = submissionsQuery.data?.items ?? [];
  useEffect(() => {
    const totalPages = submissionsQuery.data?.total_pages;
    if (totalPages === undefined) return;
    if (totalPages === 0 && page !== 1) setPage(1);
    else if (totalPages > 0 && page > totalPages) setPage(totalPages);
  }, [page, submissionsQuery.data?.total_pages]);
  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setFromDate("");
    setToDate("");
    setOrder("newest");
    setPage(1);
  };

  return (
    <section className="rounded-xl border border-[#dce9e3] bg-white p-4 shadow-sm" aria-label={t("assessmentGrading.submissions", { defaultValue: "Learner submissions" })}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-[#123c32]">{t("assessmentGrading.submissions", { defaultValue: "Learner submissions" })}</h3>
          <p className="mt-1 text-xs text-[#66847a]">{t("assessmentGrading.submissionsHelp", { defaultValue: "Review attempts and grade written answers." })}</p>
        </div>
        <span className="rounded-full bg-[#eef7f2] px-3 py-1 text-xs font-semibold text-[#236c58]">
          {submissionsQuery.data?.total ?? 0} {t("assessmentGrading.results", { defaultValue: "results" })}
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <label className="text-xs font-semibold text-[#52736a]">{t("assessmentGrading.findLearner", { defaultValue: "Find a learner" })}
          <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={t("assessmentGrading.searchPlaceholder", { defaultValue: "Search name or email" })} className="mt-1 h-10 w-full rounded-lg border border-[#d7e5df] px-3 text-sm outline-none focus:border-[#1f6a58]" />
        </label>
        <label className="text-xs font-semibold text-[#52736a]">{t("assessmentGrading.status", { defaultValue: "Status" })}
          <select value={status} onChange={(event) => { setStatus(event.target.value as "pending" | "evaluated" | "all"); setPage(1); }} className="mt-1 h-10 w-full rounded-lg border border-[#d7e5df] bg-white px-3 text-sm outline-none focus:border-[#1f6a58]">
            <option value="all">{t("assessmentGrading.all", { defaultValue: "All submissions" })} ({submissionsQuery.data?.status_counts.all ?? 0})</option><option value="pending">{t("assessmentGrading.pending", { defaultValue: "Pending grading" })} ({submissionsQuery.data?.status_counts.pending ?? 0})</option><option value="evaluated">{t("assessmentGrading.evaluated", { defaultValue: "Evaluated" })} ({submissionsQuery.data?.status_counts.evaluated ?? 0})</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-[#52736a]">{t("assessmentGrading.fromDate", { defaultValue: "From date and time" })}
          <input type="datetime-local" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPage(1); }} className="mt-1 h-10 w-full rounded-lg border border-[#d7e5df] bg-white px-3 text-sm outline-none focus:border-[#1f6a58]" />
        </label>
        <label className="text-xs font-semibold text-[#52736a]">{t("assessmentGrading.toDate", { defaultValue: "To date and time" })}
          <input type="datetime-local" value={toDate} onChange={(event) => { setToDate(event.target.value); setPage(1); }} className="mt-1 h-10 w-full rounded-lg border border-[#d7e5df] bg-white px-3 text-sm outline-none focus:border-[#1f6a58]" />
        </label>
        <label className="text-xs font-semibold text-[#52736a]">{t("assessmentGrading.sort", { defaultValue: "Sort by submission time" })}
          <select value={order} onChange={(event) => { setOrder(event.target.value as "newest" | "oldest"); setPage(1); }} className="mt-1 h-10 w-full rounded-lg border border-[#d7e5df] bg-white px-3 text-sm outline-none focus:border-[#1f6a58]">
            <option value="newest">{t("assessmentGrading.newestFirst", { defaultValue: "Newest first" })}</option>
            <option value="oldest">{t("assessmentGrading.oldestFirst", { defaultValue: "Oldest first" })}</option>
          </select>
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-[#78948b]">{t("assessmentGrading.utcFilterNote", { defaultValue: "Date filters are sent to the server as UTC." })}</p>
        <button type="button" onClick={clearFilters} disabled={!search && status === "all" && !fromDate && !toDate && order === "newest"} className="rounded-full border border-[#d7e5df] px-3 py-1.5 text-xs font-semibold text-[#376b5b] hover:bg-[#f4faf7] disabled:cursor-not-allowed disabled:opacity-45">{t("assessmentGrading.clearFilters", { defaultValue: "Clear filters" })}</button>
      </div>
      {invalidDateRange ? <p role="alert" className="mt-3 rounded-lg border border-[#f3c7c2] bg-[#fff6f5] px-3 py-2 text-xs text-[#b42318]">{t("assessmentGrading.invalidDateRange", { defaultValue: "The start date must be earlier than the end date." })}</p> : null}
      {submissionsQuery.isLoading && !invalidDateRange ? <div aria-live="polite" className="mt-4 grid gap-2"><div className="h-20 animate-pulse rounded-lg bg-[#f1f6f3]" /><div className="h-20 animate-pulse rounded-lg bg-[#f1f6f3]" /></div> : null}
      {submissionsQuery.isError && !invalidDateRange ? <div role="alert" className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-[#f3c7c2] bg-[#fff6f5] px-3 py-3 text-sm text-[#b42318]"><span>{t("assessmentGrading.loadError", { defaultValue: "Unable to load learner submissions." })}</span><button type="button" onClick={() => void submissionsQuery.refetch()} className="shrink-0 font-bold underline">{t("assessmentGrading.retry", { defaultValue: "Try again" })}</button></div> : null}
      {!submissionsQuery.isLoading && !submissionsQuery.isError && !invalidDateRange && submissions.length === 0 ? <div className="mt-4 rounded-lg border border-dashed border-[#cbdcd4] bg-[#fbfdfc] px-4 py-8 text-center"><p className="text-sm font-semibold text-[#31594d]">{t("assessmentGrading.emptyTitle", { defaultValue: "No submissions found" })}</p><p className="mt-1 text-xs text-[#7f9d94]">{t("assessmentGrading.emptyHelp", { defaultValue: "Try changing the filters, or check back after learners submit." })}</p></div> : null}
      {submissions.length > 0 ? (
        <ul className="mt-4 space-y-2" aria-busy={submissionsQuery.isFetching}>
          {submissions.map((submission) => (
            <li key={submission.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e7efeb] bg-[#fbfdfc] p-4 transition-colors hover:border-[#b5d4c8]">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-[#123c32]">{submission.participant_name || t("assessmentGrading.learner", { defaultValue: "Learner" })}</p>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${submission.status === "evaluated" ? "bg-[#e7f6ee] text-[#167550]" : "bg-[#fff4d6] text-[#8a5a00]"}`}>{submission.status === "evaluated" ? t("assessmentGrading.evaluated", { defaultValue: "Evaluated" }) : t("assessmentGrading.pending", { defaultValue: "Pending grading" })}</span>
                  {submission.needs_manual ? <span className="rounded-full bg-[#eef4ff] px-2.5 py-1 text-[11px] font-bold text-[#2563eb]">{t("assessmentGrading.manualRequired", { defaultValue: "Manual grading needed" })}</span> : null}
                </div>
                {submission.participant_email ? <p className="mt-1 truncate text-xs text-[#52736a]">{submission.participant_email}</p> : null}
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#718c83]">
                  {submission.attempt_number !== null ? <span>{t("assessmentGrading.attempt", { defaultValue: "Attempt {{number}}", number: submission.attempt_number })}</span> : null}
                  {submission.submitted_at ? <span>{formatDetailDateTime(submission.submitted_at)}</span> : null}
                  {submission.score !== null && submission.total_points !== null ? <span>{t("assessmentGrading.score", { defaultValue: "Score {{score}} / {{total}}", score: submission.score, total: submission.total_points })}</span> : null}
                  {submission.passed !== null ? <span className={submission.passed ? "font-semibold text-[#167550]" : "font-semibold text-[#b42318]"}>{submission.passed ? t("assessmentGrading.passed", { defaultValue: "Passed" }) : t("assessmentGrading.notPassed", { defaultValue: "Not passed" })}</span> : null}
                </div>
              </div>
              <button type="button" onClick={() => onReview(submission, submission.total_points ?? assessmentTotalPoints)} className="h-9 shrink-0 rounded-full bg-[#1f6a58] px-4 text-xs font-bold text-white hover:bg-[#195646] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6a58] focus-visible:ring-offset-2">{t("assessmentGrading.reviewSubmission", { defaultValue: "Review submission" })}</button>
            </li>
          ))}
        </ul>
      ) : null}
      {submissionsQuery.data && submissionsQuery.data.total_pages > 0 ? <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#e7efeb] pt-3 text-xs text-[#52736a]">
        <span>{t("assessmentGrading.pageOf", { defaultValue: "Page {{page}} of {{totalPages}} · {{total}} submissions", page: submissionsQuery.data.page, totalPages: submissionsQuery.data.total_pages, total: submissionsQuery.data.total })}</span>
        <div className="flex gap-2"><button type="button" disabled={page <= 1 || submissionsQuery.isFetching} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-full border border-[#d7e5df] px-3 py-1.5 font-semibold disabled:opacity-50">{t("assessmentGrading.previous", { defaultValue: "Previous" })}</button><button type="button" disabled={page >= submissionsQuery.data.total_pages || submissionsQuery.isFetching} onClick={() => setPage((current) => current + 1)} className="rounded-full border border-[#d7e5df] px-3 py-1.5 font-semibold disabled:opacity-50">{t("assessmentGrading.next", { defaultValue: "Next" })}</button></div>
      </div> : null}
    </section>
  );
}

function formatAssessmentAnswer(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(formatAssessmentAnswer).filter(Boolean).join(", ");
  if (value && typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }
  return "";
}

function AssessmentReview({ trainingId, assessmentId, submissionId, totalPoints, onClose, onGrade }: { trainingId: string; assessmentId: string; submissionId: string; totalPoints: number | null; onClose: () => void; onGrade: (score: string, totalPoints: number | null, isUpdate: boolean) => void }) {
  const { t } = useTranslation("enterpriseTrainings");
  const reviewQuery = useQuery({
    queryKey: ["trainings", trainingId, "assessment-review", assessmentId, submissionId],
    queryFn: () => getAssessmentSubmissionReview(trainingId, assessmentId, submissionId),
    enabled: Boolean(trainingId && assessmentId && submissionId),
    staleTime: 0,
    retry: 1,
  });

  if (reviewQuery.isLoading) return <p className="text-xs text-[#52736a]">{t("assessmentGrading.loadingReview", { defaultValue: "Loading review…" })}</p>;
  if (reviewQuery.isError) return <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-[#f3c7c2] bg-[#fff6f5] px-3 py-2 text-xs text-[#b42318]"><span>{t("assessmentGrading.reviewError", { defaultValue: "Unable to load this submission review." })}</span><button type="button" onClick={() => void reviewQuery.refetch()} className="shrink-0 font-bold underline">{t("assessmentGrading.retry", { defaultValue: "Try again" })}</button></div>;
  if (!reviewQuery.data) return <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-[#f3c7c2] bg-[#fff6f5] px-3 py-2 text-xs text-[#b42318]"><span>{t("assessmentGrading.reviewError", { defaultValue: "Unable to load this submission review." })}</span><button type="button" onClick={() => void reviewQuery.refetch()} className="shrink-0 font-bold underline">{t("assessmentGrading.retry", { defaultValue: "Try again" })}</button></div>;

  const review: AssessmentSubmissionReviewData = reviewQuery.data;
  const scoreValue = review.final_score ?? review.score ?? review.auto_score;
  const score = scoreValue === null ? null : String(scoreValue);
  const hasFinalScore = review.final_score !== null || review.status === "evaluated";
  const passed = review.passed;
  const feedback = review.feedback;
  const answers = review.review;
  const effectiveTotalPoints = review.total_points ?? totalPoints;

  return (
    <div className="mt-4 rounded-xl border border-[#dce9e3] bg-[#fbfdfc] p-4 space-y-3" aria-label={t("assessmentGrading.submissionReview", { defaultValue: "Submission review" })}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-[#123c32]">{t("assessmentGrading.submissionReview", { defaultValue: "Submission review" })}</p>
        <button type="button" onClick={onClose} className="rounded-full border border-[#d7e5df] px-2 py-0.5 text-[10px] font-bold text-[#52736a]">{t("assessmentGrading.close", { defaultValue: "Close" })}</button>
      </div>
      {score !== null ? <p className="text-sm font-semibold text-[#31594d]">{hasFinalScore ? t("assessmentGrading.currentScore", { defaultValue: "Final score: {{score}}{{total}}", score, total: effectiveTotalPoints !== null ? ` / ${effectiveTotalPoints}` : "" }) : t("assessmentGrading.autoScore", { defaultValue: "Auto-scored so far: {{score}}{{total}}", score, total: effectiveTotalPoints !== null ? ` / ${effectiveTotalPoints}` : "" })}</p> : null}
      {passed !== null ? <p className={`text-xs font-bold ${passed ? "text-[#167550]" : "text-[#b42318]"}`}>{passed ? t("assessmentGrading.passed", { defaultValue: "Passed" }) : t("assessmentGrading.failed", { defaultValue: "Failed" })}</p> : null}
      {feedback ? <p className="text-xs text-[#52736a]">{feedback}</p> : null}
      {answers.length > 0 ? (
        <ul className="space-y-1">
          {answers.map((answerItem, aIndex) => {
            const answer = formatAssessmentAnswer(answerItem.given);
            const correctAnswer = formatAssessmentAnswer(answerItem.correct);
            const points = answerItem.points === null ? null : String(answerItem.points);
            return (
              <li key={answerItem.question_id ?? `${submissionId}-question-${aIndex}`} className="rounded-lg bg-white p-2">
                <p className="text-xs font-semibold text-[#06201c]">{aIndex + 1}. {answerItem.question_text}</p>
                {answerItem.question_type ? <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[#7f9d94]">{humanizeLabel(answerItem.question_type)}</p> : null}
                {points !== null ? <p className="mt-1 text-[10px] font-semibold text-[#7f9d94]">{t("assessmentGrading.questionPoints", { defaultValue: "Question points: {{points}}", points })}</p> : null}
                <p className="text-xs text-[#52736a]">{t("assessmentGrading.answer", { defaultValue: "Answer: {{answer}}", answer: answer || t("assessmentGrading.noAnswer", { defaultValue: "No answer provided" }) })}</p>
                {correctAnswer ? <p className="text-[10px] font-semibold text-[#52736a]">{t("assessmentGrading.correctAnswer", { defaultValue: "Correct answer: {{answer}}", answer: correctAnswer })}</p> : null}
                {answerItem.needs_manual ? <span className="mt-2 inline-flex rounded-full bg-[#fff4d6] px-2 py-1 text-[10px] font-semibold text-[#8a5a00]">{t("assessmentGrading.manualRequired", { defaultValue: "Manual grading needed" })}</span> : null}
                {answerItem.points_awarded !== null ? <p className="text-[10px] text-[#52736a]">{t("assessmentGrading.pointsAwarded", { defaultValue: "Points awarded: {{points}}", points: answerItem.points_awarded })}</p> : null}
                {answerItem.explanation ? <p className="text-[10px] text-[#52736a]">{answerItem.explanation}</p> : null}
              </li>
            );
          })}
        </ul>
      ) : <p className="rounded-lg bg-white px-3 py-4 text-sm text-[#66847a]">{t("assessmentGrading.noAnswerDetails", { defaultValue: "No answer details were returned for this submission." })}</p>}
      {effectiveTotalPoints === null ? <p role="alert" className="rounded-lg border border-[#f3c7c2] bg-[#fff6f5] px-3 py-2 text-xs text-[#b42318]">The assessment’s maximum score is unavailable, so grading is disabled. Refresh the assessment and try again.</p> : null}
      <button type="button" disabled={effectiveTotalPoints === null} onClick={() => onGrade(score ?? "", effectiveTotalPoints, hasFinalScore)} className="h-9 rounded-full bg-[#1f6a58] px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{hasFinalScore ? t("assessmentGrading.updateGrade", { defaultValue: "Update grade" }) : t("assessmentGrading.gradeSubmission", { defaultValue: "Grade submission" })}</button>
    </div>
  );
}

/** Renders assessments list with create/delete, question management, edit, submit, grade, review, and question bank. */
export function TrainingAssessmentsTab({ trainingId }: { trainingId: string }) {
  const { t } = useTranslation("enterpriseTrainings");
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [expandedAssessment, setExpandedAssessment] = useState<string | null>(null);
  const [newQuestion, setNewQuestion] = useState("");
  const [newQuestionType, setNewQuestionType] = useState("short_answer");
  const [newQuestionOptions, setNewQuestionOptions] = useState("");
  const [newCorrectAnswer, setNewCorrectAnswer] = useState("");
  const [newQuestionPoints, setNewQuestionPoints] = useState("1");
  const [editingAssessmentId, setEditingAssessmentId] = useState<string | null>(null);
  const [editAssessmentTitle, setEditAssessmentTitle] = useState("");
  const [editAssessmentType, setEditAssessmentType] = useState<TrainingAssessmentType>("quiz");
  const [editAssessmentTypeChanged, setEditAssessmentTypeChanged] = useState(false);
  const [editAssessmentPassPercent, setEditAssessmentPassPercent] = useState("");
  const [editAssessmentTimeLimit, setEditAssessmentTimeLimit] = useState("");
  const [editAssessmentAttempts, setEditAssessmentAttempts] = useState("");
  const [editAssessmentRandomise, setEditAssessmentRandomise] = useState(false);
  const [editAssessmentPublication, setEditAssessmentPublication] = useState<"immediate" | "scheduled">("immediate");
  const [editAssessmentPublishAt, setEditAssessmentPublishAt] = useState("");
  const [reviewSubmission, setReviewSubmission] = useState<{ assessmentId: string; submissionId: string; totalPoints: number | null } | null>(null);
  const [gradeSubmission, setGradeSubmission] = useState<{ assessmentId: string; submissionId: string; totalPoints: number | null; isUpdate: boolean } | null>(null);
  const [gradeScore, setGradeScore] = useState("");
  const [gradeFeedback, setGradeFeedback] = useState("");

  const assessmentsQuery = useQuery({
    queryKey: ["trainings", trainingId, "assessments"],
    queryFn: () => listTrainingAssessments(trainingId),
    enabled: Boolean(trainingId),
  });

  const updateAssessmentMutation = useMutation({
    mutationFn: ({ assessmentId }: { assessmentId: string }) => updateTrainingAssessment(trainingId, assessmentId, {
      title: editAssessmentTitle.trim(),
      ...(editAssessmentTypeChanged ? { type: editAssessmentType } : {}),
      pass_percent: editAssessmentPassPercent ? Number(editAssessmentPassPercent) : null,
      time_limit_minutes: editAssessmentTimeLimit ? Number(editAssessmentTimeLimit) : null,
      attempts_allowed: editAssessmentAttempts ? Number(editAssessmentAttempts) : null,
      randomise: editAssessmentRandomise,
      publication: editAssessmentPublication,
      publish_at: editAssessmentPublication === "scheduled" && editAssessmentPublishAt ? new Date(editAssessmentPublishAt).toISOString() : null,
    }),
    onSuccess: () => { setEditingAssessmentId(null); setEditAssessmentTypeChanged(false); setFeedback("Assessment settings updated. Changes apply to future attempts; submitted attempts keep their original settings."); void queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "assessments"] }); },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to update assessment."),
  });

  const deleteMutation = useMutation({
    mutationFn: (assessmentId: string) => deleteTrainingAssessment(trainingId, assessmentId),
    onSuccess: () => { setFeedback("Assessment deleted."); void queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "assessments"] }); },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to delete assessment."),
  });

  const addQuestionMutation = useMutation({
    mutationFn: ({ assessmentId, question }: { assessmentId: string; question: string }) =>
      addAssessmentQuestions(trainingId, assessmentId, {
        question_text: question,
        question_type: newQuestionType,
        options: newQuestionType === "true_false"
          ? ["true", "false"]
          : ["mcq", "multiple_select"].includes(newQuestionType)
            ? newQuestionOptions.split(",").map((option) => option.trim()).filter(Boolean)
          : null,
        correct_answer: newCorrectAnswer.trim() || null,
        points: newQuestionPoints ? Number(newQuestionPoints) : 1,
      }),
    onSuccess: () => {
      setNewQuestion("");
      setNewQuestionOptions("");
      setNewCorrectAnswer("");
      setNewQuestionPoints("1");
      setFeedback("Question added.");
      void queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "assessments"] });
    },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to add question."),
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: ({ assessmentId, questionId }: { assessmentId: string; questionId: string }) => deleteAssessmentQuestion(trainingId, assessmentId, questionId),
    onSuccess: () => { setFeedback("Question deleted."); void queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "assessments"] }); },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to delete question."),
  });

  const gradeMutation = useMutation({
    mutationFn: ({ assessmentId, submissionId, score, feedbackText }: { assessmentId: string; submissionId: string; score: number; feedbackText: string }) =>
      gradeAssessmentSubmission(trainingId, assessmentId, submissionId, { score, feedback: feedbackText }),
    onSuccess: (_result, variables) => {
      setGradeSubmission(null);
      setGradeFeedback("");
      setGradeScore("");
      setFeedback("Grade saved. The learner has been notified; score visibility follows this assessment's result release setting.");
      void queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "assessment-review", variables.assessmentId, variables.submissionId] });
      void queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "assessment-submissions", variables.assessmentId] });
      void queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "assessments"] });
    },
    onError: (error) => {
      setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to save the grade. Your entries are still available to retry.");
    },
  });

  const assessments = assessmentsQuery.data ?? [];
  const questionNeedsOptions = newQuestionType === "mcq" || newQuestionType === "multiple_select";
  const questionIsValid = newQuestion.trim().length > 0
    && (!questionNeedsOptions || newQuestionOptions.split(",").some((option) => option.trim()))
    && (newQuestionType === "short_answer" || newQuestionType === "essay" || newCorrectAnswer.trim().length > 0);

  return (
    <SectionCard
      title="Assessments"
    >
      {feedback ? <p role="status" className="mb-4 rounded-xl border border-[#bce8d1] bg-[#effaf4] px-4 py-3 text-sm font-semibold text-[#167550]">{feedback}</p> : null}
      {assessmentsQuery.isLoading ? <p className="text-sm text-[#52736a]">Loading...</p> : null}
      {assessmentsQuery.isError ? <p role="alert" className="text-sm font-semibold text-[#b42318]">Assessments are temporarily unavailable from the Training API.</p> : null}
      {assessments.length === 0 && !assessmentsQuery.isLoading ? <p className="text-sm text-[#52736a]">No assessments yet.</p> : null}
      <QuestionBankBrowser trainingId={trainingId} />
      <ul className="mt-3 grid gap-2">
        {assessments.map((a, index) => {
          const record = a as Record<string, unknown>;
          const id = typeof record.id === "string" ? record.id : String(index);
          const title = typeof record.title === "string" ? record.title : "Untitled";
          const type = typeof record.type === "string" ? record.type : null;
          const questions: Array<Record<string, unknown>> = Array.isArray(record.questions) ? record.questions : [];
          const isExpanded = expandedAssessment === id;
          const isEditing = editingAssessmentId === id;
          const assessmentPassPercent = typeof record.pass_percent === "number" || typeof record.pass_percent === "string" ? String(record.pass_percent) : "";
          const assessmentTimeLimit = typeof record.time_limit_minutes === "number" || typeof record.time_limit_minutes === "string" ? String(record.time_limit_minutes) : "";
          const assessmentAttempts = typeof record.attempts_allowed === "number" || typeof record.attempts_allowed === "string" ? String(record.attempts_allowed) : "";
          const assessmentRandomise = record.randomise === true;
          const assessmentPublication = record.publication === "scheduled" ? "scheduled" : "immediate";
          const assessmentPublishAt = typeof record.publish_at === "string" ? toDateTimeLocalValue(record.publish_at) : "";
          return (
            <li key={id} className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-4">
              <div className="flex items-center justify-between gap-3">
                {isEditing ? (
                  <form className="grid flex-1 gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); if (editAssessmentTitle.trim() && isOptionalIntegerInRange(editAssessmentPassPercent, 0, 100) && isOptionalPositiveInteger(editAssessmentTimeLimit) && isOptionalPositiveInteger(editAssessmentAttempts) && (editAssessmentPublication !== "scheduled" || Boolean(editAssessmentPublishAt))) updateAssessmentMutation.mutate({ assessmentId: id }); }}>
                    <label className="text-[10px] font-semibold text-[#52736a] sm:col-span-2">Assessment title
                      <input value={editAssessmentTitle} onChange={(e) => setEditAssessmentTitle(e.target.value)} aria-label="Assessment title" className="mt-1 h-9 w-full rounded-lg border border-[#d7e5df] px-3 text-sm font-bold text-[#06201c] outline-none focus:border-[#1f6a58]" />
                    </label>
                    <label className="text-[10px] font-semibold text-[#52736a]">Assessment type
                      <select value={editAssessmentType} onChange={(e) => { setEditAssessmentType(e.target.value as TrainingAssessmentType); setEditAssessmentTypeChanged(true); }} className="mt-1 h-9 w-full rounded-lg border border-[#d7e5df] bg-white px-2 text-xs outline-none focus:border-[#1f6a58]">
                        <option value="quiz">Quiz</option><option value="exam">Exam</option>
                      </select>
                    </label>
                    <label className="text-[10px] font-semibold text-[#52736a]">Pass percentage (optional)
                      <input type="number" min="0" max="100" step="1" value={editAssessmentPassPercent} onChange={(e) => setEditAssessmentPassPercent(e.target.value)} placeholder="0 > 100%" className="mt-1 h-9 w-full rounded-lg border border-[#d7e5df] px-3 text-xs outline-none focus:border-[#1f6a58]" />
                    </label>
                    <label className="text-[10px] font-semibold text-[#52736a]">Time limit (minutes)
                      <input type="number" min="1" step="1" value={editAssessmentTimeLimit} onChange={(e) => setEditAssessmentTimeLimit(e.target.value)} placeholder="No time limit" className="mt-1 h-9 w-full rounded-lg border border-[#d7e5df] px-3 text-xs outline-none focus:border-[#1f6a58]" />
                    </label>
                    <label className="text-[10px] font-semibold text-[#52736a]">Attempts allowed
                      <input type="number" min="1" step="1" value={editAssessmentAttempts} onChange={(e) => setEditAssessmentAttempts(e.target.value)} placeholder="Unlimited attempts" className="mt-1 h-9 w-full rounded-lg border border-[#d7e5df] px-3 text-xs outline-none focus:border-[#1f6a58]" />
                    </label>
                    <label className="flex items-center gap-2 self-end pb-2 text-xs font-semibold text-[#52736a]">
                      <input type="checkbox" checked={editAssessmentRandomise} onChange={(e) => setEditAssessmentRandomise(e.target.checked)} /> Randomise questions and answer choices
                    </label>
                    <label className="text-[10px] font-semibold text-[#52736a]">Result release
                      <select value={editAssessmentPublication} onChange={(e) => setEditAssessmentPublication(e.target.value as "immediate" | "scheduled")} className="mt-1 h-9 w-full rounded-lg border border-[#d7e5df] bg-white px-2 text-xs outline-none focus:border-[#1f6a58]">
                        <option value="immediate">Immediately after submission</option><option value="scheduled">On a scheduled date and time</option>
                      </select>
                    </label>
                    {editAssessmentPublication === "scheduled" ? <label className="text-[10px] font-semibold text-[#52736a]">Release results at
                      <input type="datetime-local" required value={editAssessmentPublishAt} onChange={(e) => setEditAssessmentPublishAt(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[#d7e5df] bg-white px-2 text-xs outline-none focus:border-[#1f6a58]" />
                    </label> : null}
                    <div className="flex gap-2 sm:col-span-2">
                      <button type="submit" disabled={updateAssessmentMutation.isPending || !editAssessmentTitle.trim() || !isOptionalIntegerInRange(editAssessmentPassPercent, 0, 100) || !isOptionalPositiveInteger(editAssessmentTimeLimit) || !isOptionalPositiveInteger(editAssessmentAttempts) || (editAssessmentPublication === "scheduled" && !editAssessmentPublishAt)} className="h-8 rounded-full bg-[#1f6a58] px-3 text-xs font-bold text-white disabled:opacity-60">{updateAssessmentMutation.isPending ? "Saving..." : "Save settings"}</button>
                      <button type="button" onClick={() => { setEditingAssessmentId(null); setEditAssessmentTypeChanged(false); }} className="h-8 rounded-full border border-[#d7e5df] px-3 text-xs font-bold text-[#52736a]">Cancel</button>
                    </div>
                  </form>
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpandedAssessment(isExpanded ? null : id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setExpandedAssessment(isExpanded ? null : id);
                      }
                    }}
                    className="flex flex-1 cursor-pointer items-center gap-2 text-left"
                  >
                    <p className="text-sm font-bold text-[#06201c]">{title}</p>
                    {type ? <span className="rounded-full bg-[#eef4ff] px-2 py-0.5 text-[10px] font-bold text-[#2563eb]">{humanizeLabel(type)}</span> : null}
                    {typeof record.lesson_id === "string" && record.lesson_id ? <span className="rounded-full bg-[#eef4ff] px-2 py-0.5 text-[10px] font-bold text-[#2563eb]">In a lesson</span> : null}
                    <span className="text-xs text-[#7f9d94]">{questions.length} questions</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <button type="button" onClick={(e) => {
                    e.stopPropagation();
                    setEditingAssessmentId(id);
                    setEditAssessmentTitle(title);
                    setEditAssessmentType(type === "exam" ? "exam" : "quiz");
                    setEditAssessmentTypeChanged(false);
                    setEditAssessmentPassPercent(assessmentPassPercent);
                    setEditAssessmentTimeLimit(assessmentTimeLimit);
                    setEditAssessmentAttempts(assessmentAttempts);
                    setEditAssessmentRandomise(assessmentRandomise);
                    setEditAssessmentPublication(assessmentPublication);
                    setEditAssessmentPublishAt(assessmentPublishAt);
                  }} className="rounded-full px-2 py-1 text-xs font-semibold text-[#1f6a58] hover:bg-[#e8f6ee]">Edit</button>
                  <button type="button" onClick={() => { if (window.confirm("Delete this assessment?")) deleteMutation.mutate(id); }} className="rounded-full px-2 py-1 text-xs font-semibold text-[#b42318] hover:bg-[#fff6f5]">Delete</button>
                </div>
              </div>
              {isExpanded ? (
                <div className="mt-3 space-y-2 pl-4">
                  <AssessmentSubmissions
                    trainingId={trainingId}
                    assessmentId={id}
                    totalPoints={questions.reduce((sum, question) => {
                      const value = question.points;
                      const points = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : 0;
                      return Number.isFinite(points) && points > 0 ? sum + points : sum;
                    }, 0) || null}
                    onReview={(submission, totalPoints) => {
                      setGradeSubmission(null);
                      setGradeScore("");
                      setGradeFeedback("");
                      gradeMutation.reset();
                      setReviewSubmission({ assessmentId: id, submissionId: submission.id, totalPoints });
                    }}
                  />
                  {questions.length > 0 ? (
                    <ul className="space-y-1">
                      {questions.map((q, qIndex) => {
                        const qId = typeof q.id === "string" ? q.id : String(qIndex);
                        const qText = typeof q.question === "string" ? q.question : typeof q.text === "string" ? q.text : typeof q.question_text === "string" ? q.question_text : "Question";
                        const questionType = typeof q.question_type === "string" ? q.question_type : typeof q.type === "string" ? q.type : null;
                        const options = Array.isArray(q.options)
                          ? q.options.map((option) => {
                            if (typeof option === "string") return option;
                            if (option && typeof option === "object") {
                              const optionRecord = option as Record<string, unknown>;
                              return typeof optionRecord.label === "string" ? optionRecord.label : typeof optionRecord.text === "string" ? optionRecord.text : null;
                            }
                            return null;
                          }).filter((option): option is string => Boolean(option?.trim()))
                          : [];
                        const correctAnswer = typeof q.correct_answer === "string" ? q.correct_answer : null;
                        return (
                          <li key={qId} className="rounded-lg bg-white px-3 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold leading-5 text-[#06201c]">{qIndex + 1}. {qText}</p>
                                {questionType ? <p className="mt-1 text-[10px] font-bold uppercase tracking-[.08em] text-[#7f9d94]">{humanizeLabel(questionType)}</p> : null}
                              </div>
                              <button type="button" onClick={() => { if (window.confirm("Delete this question?")) deleteQuestionMutation.mutate({ assessmentId: id, questionId: qId }); }} className="shrink-0 text-[10px] font-semibold text-[#b42318]">Delete</button>
                            </div>
                            {options.length > 0 ? (
                              <div className="mt-2 space-y-1">
                                {options.map((option, optionIndex) => (
                                  <div key={`${qId}-option-${optionIndex}`} className={`rounded-md border px-2.5 py-1.5 text-xs ${correctAnswer === option ? "border-[#bce8d1] bg-[#effaf4] font-semibold text-[#167550]" : "border-[#eef4ef] bg-[#f9fcfa] text-[#52736a]"}`}>
                                    <span className="mr-1.5 font-bold">{String.fromCharCode(65 + optionIndex)}.</span>{option}
                                    {correctAnswer === option ? <span className="ml-2 text-[10px] uppercase tracking-[.06em]">Correct answer</span> : null}
                                  </div>
                                ))}
                              </div>
                            ) : null}
                            {correctAnswer && options.every((option) => option !== correctAnswer) ? <p className="mt-2 rounded-md bg-[#effaf4] px-2.5 py-1.5 text-xs font-semibold text-[#167550]">Correct answer: {correctAnswer}</p> : null}
                          </li>
                        );
                      })}
                    </ul>
                  ) : <p className="text-xs text-[#7f9d94]">No questions yet.</p>}
                  <form className="grid gap-2 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); if (questionIsValid) addQuestionMutation.mutate({ assessmentId: id, question: newQuestion.trim() }); }}>
                    <input value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} placeholder="Question text" className="h-8 rounded-lg border border-[#d7e5df] bg-white px-3 text-xs outline-none focus:border-[#1f6a58] sm:col-span-2" />
                    <select value={newQuestionType} onChange={(e) => setNewQuestionType(e.target.value)} aria-label="Question type" className="h-8 rounded-lg border border-[#d7e5df] bg-white px-3 text-xs outline-none focus:border-[#1f6a58]">
                      {QUIZ_QUESTION_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <input type="number" min="1" value={newQuestionPoints} onChange={(e) => setNewQuestionPoints(e.target.value)} placeholder="Points" className="h-8 rounded-lg border border-[#d7e5df] bg-white px-3 text-xs outline-none focus:border-[#1f6a58]" />
                    {["mcq", "multiple_select"].includes(newQuestionType) ? <input value={newQuestionOptions} onChange={(e) => setNewQuestionOptions(e.target.value)} placeholder="Options, separated by commas" className="h-8 rounded-lg border border-[#d7e5df] bg-white px-3 text-xs outline-none focus:border-[#1f6a58]" /> : null}
                    {newQuestionType === "true_false" ? <select value={newCorrectAnswer} onChange={(e) => setNewCorrectAnswer(e.target.value)} aria-label="Correct true or false answer" className="h-8 rounded-lg border border-[#d7e5df] bg-white px-3 text-xs outline-none focus:border-[#1f6a58]"><option value="">Correct answer</option><option value="true">True</option><option value="false">False</option></select> : null}
                    {["mcq", "multiple_select", "task"].includes(newQuestionType) ? <input value={newCorrectAnswer} onChange={(e) => setNewCorrectAnswer(e.target.value)} placeholder={newQuestionType === "task" ? "Task grading note" : "Correct answer"} className="h-8 rounded-lg border border-[#d7e5df] bg-white px-3 text-xs outline-none focus:border-[#1f6a58]" /> : null}
                    <button type="submit" disabled={addQuestionMutation.isPending || !questionIsValid} className="h-8 rounded-full border border-[#1f6a58] px-3 text-[10px] font-bold text-[#1f6a58] disabled:opacity-60 sm:col-span-2">Add question</button>
                  </form>
                </div>
              ) : null}
              {reviewSubmission?.assessmentId === id ? (
                <AssessmentReview trainingId={trainingId} assessmentId={id} submissionId={reviewSubmission.submissionId} totalPoints={reviewSubmission.totalPoints} onClose={() => { setReviewSubmission(null); setGradeSubmission(null); }} onGrade={(score, totalPoints, isUpdate) => { setGradeScore(score); setGradeFeedback(""); setGradeSubmission({ ...reviewSubmission, totalPoints, isUpdate }); }} />
              ) : null}
              {gradeSubmission?.assessmentId === id ? (
                <form className="mt-3 space-y-3 rounded-xl border border-[#e4d9b8] bg-[#fffdf5] p-4" onSubmit={(event) => {
                  event.preventDefault();
                  const parsedScore = Number(gradeScore);
                  if (gradeSubmission.totalPoints !== null && Number.isInteger(parsedScore) && parsedScore >= 0 && parsedScore <= gradeSubmission.totalPoints) {
                    gradeMutation.mutate({ assessmentId: id, submissionId: gradeSubmission.submissionId, score: parsedScore, feedbackText: gradeFeedback });
                  }
                }}>
                  <div><p className="text-sm font-bold text-[#6b4c12]">{gradeSubmission.isUpdate ? t("assessmentGrading.updateGrade", { defaultValue: "Update grade" }) : t("assessmentGrading.gradeSubmission", { defaultValue: "Grade submission" })}</p><p className="mt-1 text-xs text-[#7f6b40]">{t("assessmentGrading.gradeHelp", { defaultValue: "Enter the final score, including automatically graded points, and optional instructor feedback." })}</p></div>
                  <div className="grid gap-3 md:grid-cols-[12rem_1fr]">
                    <label className="text-xs font-semibold text-[#6b4c12]">Final score (0–{gradeSubmission.totalPoints ?? "?"})
                      <input type="number" required min="0" max={gradeSubmission.totalPoints ?? undefined} step="1" value={gradeScore} onChange={(event) => setGradeScore(event.target.value)} placeholder="Enter score" className="mt-1 h-10 w-full rounded-lg border border-[#d7e5df] bg-white px-3 text-sm outline-none focus:border-[#1f6a58]" />
                    </label>
                    <label className="text-xs font-semibold text-[#6b4c12]">{t("assessmentGrading.instructorFeedback", { defaultValue: "Instructor feedback (optional)" })}
                      <textarea value={gradeFeedback} onChange={(event) => setGradeFeedback(event.target.value)} rows={2} placeholder={t("assessmentGrading.feedbackPlaceholder", { defaultValue: "Add feedback for the learner" })} className="mt-1 w-full resize-y rounded-lg border border-[#d7e5df] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6a58]" />
                    </label>
                  </div>
                  {gradeScore.trim() && (!Number.isInteger(Number(gradeScore)) || Number(gradeScore) < 0 || gradeSubmission.totalPoints === null || Number(gradeScore) > gradeSubmission.totalPoints) ? <p role="alert" className="text-xs font-semibold text-[#b42318]">Enter a whole-number score from 0 to {gradeSubmission.totalPoints ?? "the maximum score"}.</p> : null}
                  {gradeMutation.isError ? <p role="alert" className="text-xs font-semibold text-[#b42318]">{gradeMutation.error instanceof TrainingsApiError ? gradeMutation.error.message : t("assessmentGrading.saveError", { defaultValue: "Unable to save the grade. Your entries are preserved; please try again." })}</p> : null}
                  <div className="flex flex-wrap gap-2">
                    <button type="submit" disabled={gradeMutation.isPending || !gradeScore.trim() || gradeSubmission.totalPoints === null || !Number.isInteger(Number(gradeScore)) || Number(gradeScore) < 0 || Number(gradeScore) > gradeSubmission.totalPoints} className="h-9 rounded-full bg-[#1f6a58] px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{gradeMutation.isPending ? t("assessmentGrading.savingGrade", { defaultValue: "Saving grade…" }) : gradeSubmission.isUpdate ? t("assessmentGrading.updateGrade", { defaultValue: "Update grade" }) : t("assessmentGrading.saveGrade", { defaultValue: "Save grade" })}</button>
                    <button type="button" onClick={() => { setGradeSubmission(null); gradeMutation.reset(); }} className="h-9 rounded-full border border-[#d7e5df] px-4 py-2 text-xs font-bold text-[#52736a]">{t("assessmentGrading.cancel", { defaultValue: "Cancel" })}</button>
                  </div>
                </form>
              ) : null}
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

/** Renders assignments list with create, submit, and grade functionality. */
export function TrainingAssignmentsTab({ trainingId }: { trainingId: string }) {
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newMaxScore, setNewMaxScore] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [submittingAssignment, setSubmittingAssignment] = useState<string | null>(null);
  const [submitText, setSubmitText] = useState("");
  const [submitUrl, setSubmitUrl] = useState("");
  const [gradingSubmission, setGradingSubmission] = useState<{ assignmentId: string; submissionId: string } | null>(null);
  const [gradeScore, setGradeScore] = useState("");
  const [gradeFeedbackText, setGradeFeedbackText] = useState("");

  const assignmentsQuery = useQuery({
    queryKey: ["trainings", trainingId, "assignments"],
    queryFn: () => listTrainingAssignments(trainingId),
    enabled: Boolean(trainingId),
  });

  const createMutation = useMutation({
    mutationFn: () => createTrainingAssignment(trainingId, { title: newTitle.trim(), description: newDescription.trim() || null, due_date: newDueDate || null, max_score: newMaxScore ? Number(newMaxScore) : null }),
    onSuccess: () => { setNewTitle(""); setNewDescription(""); setNewDueDate(""); setNewMaxScore(""); setFeedback("Assignment created."); void queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "assignments"] }); },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to create assignment."),
  });

  const deleteMutation = useMutation({
    mutationFn: (assignmentId: string) => deleteTrainingAssignment(trainingId, assignmentId),
    onSuccess: () => { setFeedback("Assignment deleted."); void queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "assignments"] }); },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to delete assignment."),
  });

  const submitMutation = useMutation({
    mutationFn: ({ assignmentId, text, url }: { assignmentId: string; text: string; url: string }) =>
      submitTrainingAssignment(trainingId, assignmentId, { text, url: url || undefined }),
    onSuccess: () => { setSubmittingAssignment(null); setSubmitText(""); setSubmitUrl(""); setFeedback("Assignment submitted."); void queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "assignments"] }); },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to submit assignment."),
  });

  const gradeMutation = useMutation({
    mutationFn: ({ assignmentId, submissionId, score, feedbackText }: { assignmentId: string; submissionId: string; score: number; feedbackText: string }) =>
      gradeAssignmentSubmission(trainingId, assignmentId, submissionId, { score, feedback: feedbackText }),
    onSuccess: () => { setGradingSubmission(null); setGradeScore(""); setGradeFeedbackText(""); setFeedback("Submission graded."); },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to grade submission."),
  });

  const assignments = assignmentsQuery.data ?? [];

  return (
    <SectionCard title="Assignments">
      {feedback ? <p role="status" className="mb-4 rounded-xl border border-[#bce8d1] bg-[#effaf4] px-4 py-3 text-sm font-semibold text-[#167550]">{feedback}</p> : null}
      <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); if (newTitle.trim()) createMutation.mutate(); }}>
        <div className="flex gap-2">
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="New assignment title" className="h-10 flex-1 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-4 text-sm outline-none focus:border-[#1f6a58]" />
          <button type="submit" disabled={createMutation.isPending || !newTitle.trim()} className="h-10 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white disabled:opacity-60">{createMutation.isPending ? "Adding..." : "Add"}</button>
        </div>
        <textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Instructions (optional)" rows={2} className="w-full rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-4 py-2 text-sm outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]" />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="text-sm font-semibold text-[#31594d]">Due date<input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} className="ml-2 h-10 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm text-[#06201c] outline-none focus:border-[#1f6a58]" /></label>
          <label className="text-sm font-semibold text-[#31594d]">Max score<input type="number" min="1" value={newMaxScore} onChange={(e) => setNewMaxScore(e.target.value)} placeholder="e.g. 10" className="ml-2 h-10 w-24 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-3 text-sm text-[#06201c] outline-none focus:border-[#1f6a58]" /></label>
        </div>
      </form>
      {assignmentsQuery.isLoading ? <p className="mt-4 text-sm text-[#52736a]">Loading...</p> : null}
      {!assignmentsQuery.isLoading && assignments.length === 0 ? (
        <div className="mt-4">
          <p className="text-sm font-semibold text-[#06201c]">No assignments yet.</p>
          <p className="mt-1 text-xs text-[#7f9d94]">Create assignments above.</p>
        </div>
      ) : null}
      {assignments.length > 0 ? (
        <ul className="mt-4 grid gap-2">
          {assignments.map((a, index) => {
            const record = a as Record<string, unknown>;
            const id = typeof record.id === "string" ? record.id : String(index);
            const title = typeof record.title === "string" ? record.title : "Untitled";
            const description = typeof record.description === "string" ? record.description : null;
            const dueDate = typeof record.due_date === "string" ? record.due_date : null;
            const maxScore = typeof record.max_score === "number" ? record.max_score : null;
            const submissions = Array.isArray(record.submissions) ? record.submissions : [];
            const isSubmitting = submittingAssignment === id;
            const isGrading = gradingSubmission?.assignmentId === id;
            return (
              <li key={id} className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[#06201c]">{title}</p>
                    {description ? <p className="mt-1 text-xs leading-5 text-[#52736a]">{description}</p> : null}
                    {dueDate || maxScore !== null ? <p className="mt-1 text-xs text-[#7f9d94]">{dueDate ? "Due: " + formatTrainingDate(dueDate) : ""}{dueDate && maxScore !== null ? "  |  " : ""}{maxScore !== null ? "Max score: " + maxScore : ""}</p> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setSubmittingAssignment(isSubmitting ? null : id)} className="rounded-full border border-[#1f6a58] px-3 py-1 text-[11px] font-bold text-[#1f6a58] hover:bg-[#e8f6ee]">
                      {isSubmitting ? "Cancel" : "Submit"}
                    </button>
                    <button type="button" onClick={() => { if (window.confirm("Delete this assignment?")) deleteMutation.mutate(id); }} disabled={deleteMutation.isPending} className="rounded-full px-2 py-1 text-xs font-semibold text-[#b42318] hover:bg-[#fff6f5] disabled:opacity-60">Delete</button>
                  </div>
                </div>
                {isSubmitting ? (
                  <div className="mt-3 rounded-xl border border-[#e8f6ee] bg-white p-3 space-y-2">
                    <textarea value={submitText} onChange={(e) => setSubmitText(e.target.value)} placeholder="Your submission text..." rows={3} className="w-full rounded-lg border border-[#d7e5df] px-3 py-2 text-xs outline-none focus:border-[#1f6a58]" />
                    <input value={submitUrl} onChange={(e) => setSubmitUrl(e.target.value)} placeholder="Link URL (optional)" className="h-8 w-full rounded-lg border border-[#d7e5df] px-3 text-xs outline-none focus:border-[#1f6a58]" />
                    <button type="button" onClick={() => submitMutation.mutate({ assignmentId: id, text: submitText, url: submitUrl })} disabled={submitMutation.isPending || !submitText.trim()} className="h-8 rounded-full bg-[#1f6a58] px-4 text-xs font-bold text-white disabled:opacity-60">{submitMutation.isPending ? "Submitting..." : "Submit"}</button>
                  </div>
                ) : null}
                {submissions.length > 0 ? (
                  <div className="mt-3 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-[.08em] text-[#7f9d94]">Submissions ({submissions.length})</p>
                    {(submissions as Array<Record<string, unknown>>).map((sub, subIndex) => {
                      const subId = typeof sub.id === "string" ? sub.id : String(subIndex);
                      const subScore = typeof sub.score === "number" ? sub.score : null;
                      const subText = typeof sub.text === "string" ? sub.text : typeof sub.submission_text === "string" ? sub.submission_text : null;
                      return (
                        <div key={subId} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2">
                          <div className="min-w-0">
                            {subText ? <p className="truncate text-xs text-[#52736a]">{subText}</p> : null}
                            {subScore !== null ? <p className="text-[10px] font-bold text-[#167550]">Score: {subScore}</p> : null}
                          </div>
                          <button type="button" onClick={() => { setGradingSubmission({ assignmentId: id, submissionId: subId }); setGradeScore(subScore !== null ? String(subScore) : ""); }} className="shrink-0 rounded-full border border-[#d7e5df] px-2 py-0.5 text-[10px] font-bold text-[#52736a] hover:bg-[#f9fcfa]">Grade</button>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
                {isGrading ? (
                  <div className="mt-3 rounded-xl border border-[#fff4d6] bg-[#fffdf5] p-3 space-y-2">
                    <p className="text-xs font-bold uppercase tracking-[.08em] text-[#8a5a00]">Grade Submission</p>
                    <div className="flex gap-2">
                      <input type="number" value={gradeScore} onChange={(e) => setGradeScore(e.target.value)} placeholder="Score" className="h-8 w-24 rounded-lg border border-[#d7e5df] px-3 text-xs outline-none focus:border-[#1f6a58]" />
                      <input value={gradeFeedbackText} onChange={(e) => setGradeFeedbackText(e.target.value)} placeholder="Feedback (optional)" className="h-8 flex-1 rounded-lg border border-[#d7e5df] px-3 text-xs outline-none focus:border-[#1f6a58]" />
                      <button type="button" onClick={() => { if (gradeScore && gradingSubmission) gradeMutation.mutate({ assignmentId: gradingSubmission.assignmentId, submissionId: gradingSubmission.submissionId, score: Number(gradeScore), feedbackText: gradeFeedbackText }); }} disabled={gradeMutation.isPending || !gradeScore} className="h-8 rounded-full bg-[#1f6a58] px-3 text-[10px] font-bold text-white disabled:opacity-60">Grade</button>
                      <button type="button" onClick={() => setGradingSubmission(null)} className="h-8 rounded-full border border-[#d7e5df] px-3 text-[10px] font-bold text-[#52736a]">Cancel</button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </SectionCard>
  );
}

export { TrainingReviewsTab, type ReviewStatusFilter as TrainingReviewStatusFilter, REVIEW_STATUS_OPTIONS as TRAINING_REVIEW_STATUS_OPTIONS } from "./TrainingReviewsTab";
