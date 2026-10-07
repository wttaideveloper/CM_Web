"use client";

import { Fragment, useEffect, useState } from "react";
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
  deleteTrainingReview,
  deleteAssessmentQuestion,
  deleteTrainingAssessment,
  deleteTrainingAssignment,
  deleteTrainingLesson,
  deleteTrainingSection,
  exportTrainingEnrolments,
  getAssessmentSubmissionReview,
  getTrainingCertificate,
  getTrainingContent,
  getTrainingLesson,
  getTrainingMeetingLink,
  getTrainingModerationHistory,
  getTrainingQuestionBank,
  getTrainingSections,
  gradeAssessmentSubmission,
  gradeAssignmentSubmission,
  joinTrainingWaitlist,
  leaveTrainingWaitlist,
  listTrainingAnnouncements,
  listTrainingAssignments,
  listTrainingAssessments,
  listTrainingDiscussions,
  listTrainingEnrolments,
  listTrainingOrders,
  listTrainingReviews,
  refundTrainingOrder,
  decideTrainingOrderRefund,
  patchTrainingOrderStatus,
  reorderTrainingLessons,
  reorderTrainingModules,
  reorderTrainingSections,
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
} from "./trainings.service";
import { enrolInTraining, type TrainingCheckoutRequest } from "./trainings.service";
import { formatDetailDateTime, formatTrainingDate, humanizeLabel } from "./detail-formatters";
import TrainingLessonAttendance from "./TrainingLessonAttendance";
import { LessonMediaPreview } from "./LessonMediaPreview";

const LESSON_TYPE_OPTIONS = [
  { value: "text", label: "Topic" },
  { value: "video", label: "Video" },
  { value: "youtube", label: "YouTube" },
  { value: "pdf", label: "PDF" },
  { value: "notes", label: "Notes" },
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
              <input value={val} onChange={(e) => update(values.map((c, i) => (i === idx ? e.target.value : c)))} placeholder={placeholder ?? "https://…"} className="h-8 min-w-0 flex-1 rounded-lg border border-[#d7e5df] bg-white px-3 text-xs outline-none focus:border-[#1f6a58]" />
              <button type="button" onClick={() => update(values.filter((_, i) => i !== idx))} className="shrink-0 rounded-lg px-2 text-[10px] font-semibold text-[#b42318] hover:bg-[#fff6f5]">Remove</button>
            </div>
            {val.trim() && previewKind ? <LessonMediaPreview url={val} name={val.split("/").pop() || label} kind={previewKind} /> : null}
          </div>
        ))}
        {values.length === 0 ? <p className="text-xs text-[#7f9d94]">No {label.toLowerCase()} yet — click + Add.</p> : null}
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

function getLocalDateTimeMinimum(): string {
  const now = new Date();
  const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localDateTime.toISOString().slice(0, 16);
}

function LessonScheduleFields({
  type,
  defaults,
  source,
  setSource,
  scheduledAt,
  setScheduledAt,
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
    : [defaults.startDate, defaults.startTime].filter(Boolean).join(" · ");
  const isLive = type === "live";
  const existingLiveDate = new Date(scheduledAt);
  const lessonDateMinimum = isLive || type === "venue"
    ? scheduledAt && !Number.isNaN(existingLiveDate.getTime()) && existingLiveDate < new Date()
      ? scheduledAt
      : getLocalDateTimeMinimum()
    : undefined;
  const title = isLive ? copy("meetingSetup", "Meeting setup") : copy("venueSetup", "Venue setup");

  return (
    <div className="space-y-2 rounded-lg border border-[#d7e5df] bg-[#f9fcfa] p-3">
      <label className="block text-[10px] font-semibold text-[#52736a]">
        {title}
        <select
          value={source}
          onChange={(event) => setSource(event.target.value as LessonDetailsSource)}
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
          onChange={setScheduledAt}
          aria-label={copy("lessonDateTime", "Lesson date and time (required)")}
          className="mt-1 h-8 w-full rounded-lg border border-[#d7e5df] bg-white px-2 text-xs outline-none focus:border-[#1f6a58]"
        />
      </label>
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
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[.08em] text-[#7f9d94]">Documents</p>
        <button type="button" onClick={() => update([...values, { url: "", name: "", visibility: "public", downloadable: true }])} className="text-[10px] font-bold text-[#1f6a58]">+ Add</button>
      </div>
      <div className="mt-1 space-y-2">
        {values.map((doc, idx) => (
          <div key={idx} className="space-y-1 rounded-lg border border-[#e1ebe6] bg-[#f9fcfa] p-2">
            <input value={doc.url} onChange={(e) => update(values.map((d, i) => (i === idx ? { ...d, url: e.target.value } : d)))} placeholder="PDF URL https://…" className="h-8 w-full rounded-lg border border-[#d7e5df] bg-white px-3 text-xs outline-none focus:border-[#1f6a58]" />
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
        {values.length === 0 ? <p className="text-xs text-[#7f9d94]">No documents yet — click + Add.</p> : null}
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

function LessonDetail({ trainingId, sectionId, lessonId, trainingDeliveryMode, trainingLessonDefaults, onClose }: { trainingId: string; sectionId: string; lessonId: string; trainingDeliveryMode: string; trainingLessonDefaults: TrainingLessonDefaults; onClose: () => void }) {
  const { t } = useTranslation("enterpriseTrainings");
  const [editMode, setEditMode] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [lessonTypeValue, setLessonTypeValue] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
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
  const [feedback, setFeedback] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const durationCacheKey = JSON.stringify([trainingId, sectionId, lessonId]);

  const lessonQuery = useQuery({
    queryKey: ["trainings", trainingId, "lesson", sectionId, lessonId],
    queryFn: () => getTrainingLesson(trainingId, sectionId, lessonId),
    enabled: Boolean(trainingId && sectionId && lessonId),
  });

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
    mutationFn: () => {
      const videos = lessonVideos.filter((v) => v.trim() !== "");
      const notes = lessonNotes.filter((n) => n.trim() !== "");
      const docs = lessonDocs.filter((d) => d.url.trim() !== "");
      return updateTrainingLesson(trainingId, sectionId, lessonId, {
        title: title.trim(),
        content: content.trim(),
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
    },
    onSuccess: () => {
      const exactDuration = Number(durationSeconds);
      if (lessonTypeValue === "video" && Number.isFinite(exactDuration) && exactDuration > 0) {
        lessonVideoDurationCache.set(durationCacheKey, durationSeconds);
      }
      setFeedback("Lesson updated.");
      setEditMode(false);
      void queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "sections"] });
    },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to update lesson."),
  });

  const lesson = (lessonQuery.data ?? {}) as Record<string, unknown>;
  const lessonTitle = typeof lesson.title === "string" ? lesson.title : "";
  const lessonContent = typeof lesson.content === "string" ? lesson.content : "";
  const lessonVideoUrl = typeof lesson.content_url === "string" && lesson.content_url.trim() ? lesson.content_url : typeof lesson.video_url === "string" ? lesson.video_url : "";
  const lessonType = typeof lesson.type === "string" && lesson.type.trim() ? toUiLessonType(lesson.type) : "";
  const lessonScheduledAt = typeof lesson.scheduled_at === "string" ? lesson.scheduled_at : "";
  const lessonMeetingType = typeof lesson.meeting_type === "string" && lesson.meeting_type ? lesson.meeting_type : "google_meet";
  const lessonMeetingLink = typeof lesson.meeting_link === "string" ? lesson.meeting_link : "";
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
    if (!lessonQuery.data) return;
    if (!editMode && title === "" && content === "" && videoUrl === "" && lessonTypeValue === "" && meetingLink === "" && joinUrl === "" && fileSize === "" && durationSeconds === "" && lessonVideos.length === 0 && lessonDocs.length === 0 && lessonNotes.length === 0) {
      setTitle(lessonTitle);
      setContent(lessonContent);
      setVideoUrl(lessonVideoUrl);
      setLessonTypeValue(toUiLessonType(lessonType));
      setScheduledAt(lessonScheduledAt ? lessonScheduledAt.slice(0, 16) : "");
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
    <div className="mt-3 rounded-xl border border-[#e1ebe6] bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[.08em] text-[#7f9d94]">Lesson Detail — Videos · PDF · Notes</p>
        <div className="flex gap-1">
          <button type="button" onClick={() => setEditMode(!editMode)} className="rounded-full border border-[#1f6a58] px-2 py-0.5 text-[10px] font-bold text-[#1f6a58]">{editMode ? "Cancel" : "Edit"}</button>
          <button type="button" onClick={onClose} className="rounded-full border border-[#d7e5df] px-2 py-0.5 text-[10px] font-bold text-[#52736a]">Close</button>
        </div>
      </div>
      {feedback ? <p role="status" className="rounded-lg bg-[#effaf4] px-3 py-1.5 text-xs font-semibold text-[#167550]">{feedback}</p> : null}
      {editMode ? (
        <div className="space-y-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Lesson title" className="h-8 w-full rounded-lg border border-[#d7e5df] px-3 text-xs outline-none focus:border-[#1f6a58]" />
          <select required value={selectedLessonType} onChange={(e) => setLessonTypeValue(e.target.value)} aria-label="Lesson type" className="h-8 w-full rounded-lg border border-[#d7e5df] px-3 text-xs outline-none focus:border-[#1f6a58]">
            <option value="" disabled>{lessonTypeValue ? "Choose an allowed lesson type" : "Lesson type — select"}</option>
            {availableLessonTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          {isLessonType(lessonTypeValue, "text", "notes") ? <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Topic content..." rows={4} className="w-full rounded-lg border border-[#d7e5df] px-3 py-2 text-xs outline-none focus:border-[#1f6a58]" /> : null}
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
          {isLessonType(lessonTypeValue, "video", "youtube") ? <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder={lessonTypeValue === "youtube" ? "Paste YouTube link" : "Video URL https://…"} className="h-8 w-full rounded-lg border border-[#d7e5df] px-3 text-xs outline-none focus:border-[#1f6a58]" /> : null}
          {lessonTypeValue === "live" || lessonTypeValue === "venue" ? (
            <LessonScheduleFields
              type={lessonTypeValue}
              defaults={trainingLessonDefaults}
              source={detailsSource}
              setSource={setDetailsSource}
              scheduledAt={scheduledAt}
              setScheduledAt={setScheduledAt}
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
          {lessonTypeValue === "video" ? <LessonUrlList label="Videos" values={lessonVideos} update={setLessonVideos} placeholder="Additional video URL https://…" previewKind="video" /> : null}
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
              <LessonUrlList label="Notes" values={lessonNotes} update={setLessonNotes} placeholder="Note URL / link https://…" previewKind="document" />
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
          {isLessonType(lessonTypeValue, "video", "pdf", "document", "notes") ? (
            <div className="flex gap-4">
              <label className="flex items-center gap-1 text-xs font-semibold text-[#06201c]"><input type="checkbox" checked={isPreview} onChange={(e) => setIsPreview(e.target.checked)} className="h-3 w-3" />Is preview</label>
              <label className="flex items-center gap-1 text-xs font-semibold text-[#06201c]"><input type="checkbox" checked={isDownloadable} onChange={(e) => setIsDownloadable(e.target.checked)} className="h-3 w-3" />Is downloadable</label>
            </div>
          ) : null}
          {isLessonType(lessonTypeValue, "video", "pdf", "document", "notes") ? <LessonFileSize value={fileSize} /> : null}
          {isLessonType(lessonTypeValue, "quiz") ? <p className="rounded-lg bg-[#f9fcfa] px-3 py-2 text-xs text-[#52736a]">After saving, use the quiz panel to attach or create questions.</p> : null}
          <p className="text-[10px] text-[#7f9d94]">Only fields for the selected lesson type are shown.</p>
          <button type="button" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending || isVideoUploadPending || !title.trim() || !selectedLessonType || ((lessonTypeValue === "live" || lessonTypeValue === "venue") && (!scheduledAt || (detailsSource === "new" && (lessonTypeValue === "live" ? !meetingLink.trim() : !venueName.trim() || !venueAddress.trim()))))} className="h-8 rounded-full bg-[#1f6a58] px-4 text-xs font-bold text-white disabled:opacity-60">{updateMutation.isPending ? "Saving..." : "Save"}</button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-bold text-[#06201c]">{lessonTitle || "Untitled"}</p>
          {lessonVideoUrl ? <LessonMediaPreview url={lessonVideoUrl} name={lessonVideoUrl.split("/").pop() || "Lesson video"} kind="video" /> : null}
          {lessonType === "live" ? <p className="text-xs text-[#52736a]">{t("lessonScheduling.provider", { defaultValue: "Meeting provider" })}: {humanizeLabel(lessonMeetingType)}</p> : null}
          {lessonMeetingLink ? <p className="text-xs text-[#52736a]">{t("lessonScheduling.meetingLink", { defaultValue: "Meeting link" })}: <a href={lessonMeetingLink} className="text-[#1f6a58] underline">{lessonMeetingLink}</a></p> : null}
          {lessonJoinUrl ? <p className="text-xs text-[#52736a]">{t("lessonScheduling.joinInstructions", { defaultValue: "Join instructions" })}: <a href={lessonJoinUrl} className="text-[#1f6a58] underline">{lessonJoinUrl}</a></p> : null}
          {lessonType === "venue" && lessonVenueName ? <p className="text-xs text-[#52736a]">{t("lessonScheduling.venue", { defaultValue: "Venue" })}: {lessonVenueName}</p> : null}
          {lessonType === "venue" && lessonVenueAddress ? <p className="text-xs text-[#52736a]">{t("lessonScheduling.address", { defaultValue: "Address" })}: {lessonVenueAddress}</p> : null}
          {lessonScheduledAt ? <p className="text-xs text-[#52736a]">{t("lessonScheduling.scheduled", { defaultValue: "Scheduled" })}: {formatLessonScheduledAt(lessonScheduledAt)}</p> : null}
          {lessonType ? <p className="text-[10px] font-bold uppercase tracking-[.08em] text-[#7f9d94]">{lessonType}</p> : null}
          {lessonVideosInit.length > 0 ? <div><p className="text-[10px] font-bold uppercase tracking-[.08em] text-[#7f9d94]">Videos</p>{lessonVideosInit.map((videoUrl, index) => <LessonMediaPreview key={`${videoUrl}-${index}`} url={videoUrl} name={videoUrl.split("/").pop() || "Lesson video"} kind="video" />)}</div> : null}
          {lessonDocsInit.length > 0 ? <div><p className="text-[10px] font-bold uppercase tracking-[.08em] text-[#7f9d94]">Documents</p>{lessonDocsInit.map((document, index) => <div key={`${document.url}-${index}`}><LessonMediaPreview url={document.url} name={document.name || document.url.split("/").pop() || "Lesson document"} kind="document" showPreview={lessonType !== "pdf"} /><p className="text-[10px] text-[#52736a]">{document.visibility === "private" ? "Private" : "Public"}{document.downloadable ? " • downloadable" : ""}</p></div>)}</div> : null}
          {lessonNotesInit.length > 0 ? <div><p className="text-[10px] font-bold uppercase tracking-[.08em] text-[#7f9d94]">Notes</p>{lessonNotesInit.map((noteUrl, index) => <LessonMediaPreview key={`${noteUrl}-${index}`} url={noteUrl} name={noteUrl.split("/").pop() || "Lesson note"} kind="document" />)}</div> : null}
          <p className="text-xs text-[#7f9d94]">{lessonIsPreview ? "Preview • " : ""}{lessonIsDownloadable ? "Downloadable" : "Not downloadable"}{lessonDuration ? ` • ${lessonType === "video" ? formatVideoDurationSeconds(durationSeconds) || formatLessonDuration(lessonDuration) : formatLessonDuration(lessonDuration)}` : ""}{formattedLessonFileSize ? ` • ${formattedLessonFileSize}` : ""}</p>
          {lessonContent ? <p className="whitespace-pre-wrap text-xs leading-5 text-[#52736a]">{lessonContent}</p> : <p className="text-xs text-[#7f9d94]">No content.</p>}
        </div>
      )}
    </div>
  );
}

/** Renders the Training structure: sections, lessons, and reordering. */
function AddLessonForm({ pending, trainingDeliveryMode, trainingLessonDefaults, onSubmit }: { pending: boolean; trainingDeliveryMode: string; trainingLessonDefaults: TrainingLessonDefaults; onSubmit: (payload: CreateTrainingLessonPayload) => void }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [contentUrl, setContentUrl] = useState("");
  const [type, setType] = useState("text");
  const [scheduledAt, setScheduledAt] = useState("");
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

  const reset = () => {
    setTitle(""); setContent(""); setContentUrl(""); setType("text"); setScheduledAt(""); setDetailsSource("new"); setMeetingType("google_meet"); setMeetingLink(""); setJoinMeta("");
    setVenueName(""); setVenueAddress("");
    setIsPreview(false); setIsDownloadable(false); setFileSize(""); setDuration(""); setVideos([]); setDocuments([]); setNotes([]);
    setVideoFileName(""); setPdfFileName(""); setNoteFileName("");
    setFileUploadError(null);
  };

  return (
    <form
      className="mt-3 space-y-2 rounded-xl border border-[#d7e5df] bg-white p-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!title.trim()) return;
        onSubmit({
          title: title.trim(),
          content: content.trim() || undefined,
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
        });
        reset();
      }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[.08em] text-[#7f9d94]">New lesson details</p>
      {fileUploadError ? <p role="alert" className="rounded-lg border border-[#f0c7c2] bg-[#fff6f5] px-3 py-2 text-xs font-semibold text-[#b42318]">{fileUploadError}</p> : null}
      <input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Lesson title" className="h-8 w-full rounded-lg border border-[#d7e5df] px-3 text-xs outline-none focus:border-[#1f6a58]" />
      <select required value={type} onChange={(event) => {
        const selectedType = event.target.value;
        setType(selectedType);
        setDetailsSource(getInitialLessonDetailsSource(selectedType, trainingLessonDefaults));
      }} aria-label="New lesson type" className="h-8 w-full rounded-lg border border-[#d7e5df] px-3 text-xs outline-none focus:border-[#1f6a58]">
        {getLessonTypeOptions(trainingDeliveryMode).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {isLessonType(type, "text", "notes") ? <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder={type === "notes" ? "Notes content..." : "Topic content..."} rows={3} className="w-full rounded-lg border border-[#d7e5df] px-3 py-2 text-xs outline-none focus:border-[#1f6a58]" /> : null}
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
          setScheduledAt={setScheduledAt}
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
      {isLessonType(type, "video", "pdf", "document", "notes") ? (
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-1 text-xs font-semibold text-[#06201c]"><input type="checkbox" checked={isPreview} onChange={(event) => setIsPreview(event.target.checked)} className="h-3 w-3" />Is preview</label>
          <label className="flex items-center gap-1 text-xs font-semibold text-[#06201c]"><input type="checkbox" checked={isDownloadable} onChange={(event) => setIsDownloadable(event.target.checked)} className="h-3 w-3" />Is downloadable</label>
        </div>
      ) : null}
      {isLessonType(type, "video", "pdf", "document", "notes") ? <LessonFileSize value={fileSize} /> : null}
      {isLessonType(type, "quiz", "assignment") ? <p className="rounded-lg bg-[#f9fcfa] px-3 py-2 text-xs text-[#52736a]">{type === "quiz" ? "After creating this lesson, attach or create the quiz questions below." : "After creating this lesson, use the Assignments tab to create the submission task."}</p> : null}
      <p className="text-[10px] text-[#7f9d94]">Only fields for the selected lesson type are shown.</p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={pending || isVideoUploadPending || !title.trim()} className="h-9 rounded-full bg-[#1f6a58] px-4 text-xs font-bold text-white hover:bg-[#195646] disabled:opacity-60">{pending ? "Adding..." : "Add lesson"}</button>
        <button type="button" onClick={reset} disabled={pending || isVideoUploadPending} className="h-9 rounded-full border border-[#d7e5df] px-4 text-xs font-bold text-[#52736a] hover:bg-[#f4faf7] disabled:opacity-60">Clear</button>
      </div>
    </form>
  );
}

export function TrainingSectionsTab({ trainingId, trainingDeliveryMode, trainingLessonDefaults }: { trainingId: string; trainingDeliveryMode: string; trainingLessonDefaults: TrainingLessonDefaults }) {
  const queryClient = useQueryClient();
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editSectionTitle, setEditSectionTitle] = useState("");
  const [viewingLesson, setViewingLesson] = useState<{ sectionId: string; lessonId: string } | null>(null);
  const [quizLesson, setQuizLesson] = useState<{ sectionId: string; lessonId: string } | null>(null);
  const [viewingQuizLesson, setViewingQuizLesson] = useState<{ sectionId: string; lessonId: string } | null>(null);
  const [lessonAssessmentDraft, setLessonAssessmentDraft] = useState<Record<string, string>>({});
  const [lessonAssessmentTitle, setLessonAssessmentTitle] = useState<Record<string, string>>({});
  const [lessonAssessmentInstructions, setLessonAssessmentInstructions] = useState<Record<string, string>>({});
  const [lessonAssessmentPassPercent, setLessonAssessmentPassPercent] = useState<Record<string, string>>({});
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
    onSuccess: () => { setLessonAssessmentDraft({}); setFeedback("Quiz attached — learners see it after this lesson."); void invalidateSections(); },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to attach quiz."),
  });

  const detachLessonAssessmentMutation = useMutation({
    mutationFn: ({ sectionId, lessonId, lessonTitle }: { sectionId: string; lessonId: string; lessonTitle: string }) => updateTrainingLesson(trainingId, sectionId, lessonId, { title: lessonTitle, assessment_id: null }),
    onSuccess: () => { setFeedback("Quiz detached from this lesson."); void invalidateSections(); },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to detach quiz."),
  });

  const createLessonAssessmentMutation = useMutation({
    mutationFn: async ({ sectionId, lessonId, lessonTitle, title, instructions, passPercent }: { sectionId: string; lessonId: string; lessonTitle: string; title: string; instructions: string; passPercent: string }) => {
      const created = await createTrainingAssessment(trainingId, {
        title: title.trim(),
        type: "quiz",
        section_id: sectionId,
        lesson_id: lessonId,
        instructions: instructions.trim() || null,
        passing_score: passPercent ? Number(passPercent) : null,
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
    onSuccess: () => {
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
    onSuccess: (data, vars) => {
      const created = (data ?? {}) as Record<string, unknown>;
      const createdId = typeof created.id === "string" ? created.id : "";
      if (createdId && (vars.payload.type === "quiz" || vars.payload.type === "exam")) {
        setQuizLesson({ sectionId: vars.sectionId, lessonId: createdId });
        setFeedback("Quiz lesson added — attach an existing quiz or create one below.");
      } else {
        if (createdId) setViewingLesson({ sectionId: vars.sectionId, lessonId: createdId });
        setFeedback(createdId ? "Lesson added — attach videos, PDFs, and notes below." : "Lesson added.");
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

  if (sectionsQuery.isLoading) return <p className="text-sm text-[#52736a]">Loading sections...</p>;
  if (sectionsQuery.isError) return <p className="text-sm font-semibold text-[#b42318]">{(sectionsQuery.error as Error).message}</p>;

  const sections = Array.isArray(sectionsQuery.data) ? (sectionsQuery.data as Array<Record<string, unknown>>) : [];
  const assessments = Array.isArray(assessmentsQuery.data) ? (assessmentsQuery.data as Array<Record<string, unknown>>) : [];

  return (
    <SectionCard title="Sessions & Lessons">
      {sections.length === 0 ? <p className="text-sm text-[#52736a]">No sessions yet. Add your first session to start building the training.</p> : null}
      <ul className="grid gap-3">
        {sections.map((section, sIndex) => {
          const id = typeof section.id === "string" ? section.id : String(section.order ?? "");
          const title = typeof section.title === "string" ? section.title : "Untitled session";
          const lessons = Array.isArray(section.lessons) ? section.lessons : [];
          const isEditing = editingSectionId === id;
          return (
            <li key={id} className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-4">
              <div className="flex items-start justify-between gap-3">
                {isEditing ? (
                  <form className="grid flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); if (editSectionTitle.trim()) updateSectionMutation.mutate({ sectionId: id, title: editSectionTitle.trim() }); }}>
                    <div className="flex gap-2">
                      <input value={editSectionTitle} onChange={(e) => setEditSectionTitle(e.target.value)} className="h-8 flex-1 rounded-lg border border-[#d7e5df] px-3 text-sm font-bold text-[#06201c] outline-none focus:border-[#1f6a58]" />
                      <button type="submit" className="h-8 rounded-full bg-[#1f6a58] px-3 text-xs font-bold text-white">Save</button>
                      <button type="button" onClick={() => setEditingSectionId(null)} className="h-8 rounded-full border border-[#d7e5df] px-3 text-xs font-bold text-[#52736a]">Cancel</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="min-w-0 break-words text-sm font-bold text-[#06201c]">{title}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button type="button" onClick={() => moveSectionMutation.mutate({ sectionId: id, direction: "up" })} disabled={sIndex === 0} className="rounded px-1.5 py-0.5 text-[10px] font-bold text-[#7f9d94] hover:bg-[#e8f6ee] disabled:opacity-30">↑</button>
                      <button type="button" onClick={() => moveSectionMutation.mutate({ sectionId: id, direction: "down" })} disabled={sIndex === sections.length - 1} className="rounded px-1.5 py-0.5 text-[10px] font-bold text-[#7f9d94] hover:bg-[#e8f6ee] disabled:opacity-30">↓</button>
                      <button type="button" onClick={() => {
                        setEditingSectionId(id);
                        setEditSectionTitle(title);
                      }} className="rounded-full px-2 py-1 text-xs font-semibold text-[#1f6a58] hover:bg-[#e8f6ee]">Edit</button>
                      <button type="button" onClick={() => { if (window.confirm("Delete this session and its lessons?")) void deleteSectionMutation.mutate(id); }} className="rounded-full px-2 py-1 text-xs font-semibold text-[#b42318] hover:bg-[#fff6f5]">Delete</button>
                    </div>
                  </>
                )}
              </div>
              {lessons.length > 0 ? (
                <ul className="mt-3 grid gap-2">
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
                      <Fragment key={lessonId || lessonTitle}>
                        <li className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-[#7f9d94]">{lIndex + 1}.</span>
                            <p className="text-sm text-[#52736a]">{lessonTitle}</p>
                            {lessonType && lessonType !== "text" ? <span className="rounded-full bg-[#f0f3f2] px-2 py-0.5 text-[10px] font-bold text-[#52736a]">{humanizeLabel(lessonType)}</span> : null}
                            {lessonType !== "live" && ((typeof lesson.meeting_link === "string" && lesson.meeting_link) || (typeof lesson.join_meta === "string" && lesson.join_meta) || (typeof lesson.join_url === "string" && lesson.join_url)) ? <span className="rounded-full bg-[#e8f6ee] px-2 py-0.5 text-[10px] font-bold text-[#1f6a58]">Live</span> : null}
                          </div>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => moveLessonMutation.mutate({ sectionId: id, lessonId, direction: "up" })} disabled={lIndex === 0} className="rounded px-1 text-[10px] font-bold text-[#7f9d94] hover:bg-[#e8f6ee] disabled:opacity-30">↑</button>
                            <button type="button" onClick={() => moveLessonMutation.mutate({ sectionId: id, lessonId, direction: "down" })} disabled={lIndex === lessons.length - 1} className="rounded px-1 text-[10px] font-bold text-[#7f9d94] hover:bg-[#e8f6ee] disabled:opacity-30">↓</button>
                            {lessonType === "quiz" ? <button type="button" onClick={() => {
                              setViewingQuizLesson(null);
                              setViewingLesson(null);
                              setQuizLesson(isQuizOpen ? null : { sectionId: id, lessonId });
                            }} className="rounded-full px-2 py-0.5 text-[10px] font-bold text-[#2563eb] hover:bg-[#eef4ff]">Quiz</button> : null}
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
                            }} className="rounded-full px-2 py-0.5 text-[10px] font-bold text-[#1f6a58] hover:bg-[#e8f6ee]">View</button>
                            <button type="button" onClick={() => { if (window.confirm("Delete this lesson?")) void deleteLessonMutation.mutate({ sectionId: id, lessonId }); }} className="text-[10px] font-semibold text-[#b42318]">Delete</button>
                          </div>
                        </li>
                        {viewingQuizLesson?.sectionId === id && viewingQuizLesson.lessonId === lessonId && lessonType === "quiz" ? (
                          <li className="rounded-lg border border-[#e1ebe6] bg-[#f9fcfa] p-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-[10px] font-bold uppercase tracking-[.08em] text-[#7f9d94]">Quiz questions</p>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setViewingQuizLesson(null);
                                    setQuizLesson({ sectionId: id, lessonId });
                                  }}
                                  className="rounded-full border border-[#1f6a58] px-3 py-1 text-[10px] font-bold text-[#1f6a58] hover:bg-[#e8f6ee]"
                                >
                                  Edit questions
                                </button>
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
                          <div className="rounded-lg border border-[#e1ebe6] bg-[#f9fcfa] p-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-[10px] font-bold uppercase tracking-[.08em] text-[#7f9d94]">Manage quiz questions</p>
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
                                  <button type="button" onClick={() => { if (window.confirm("Detach this quiz from the lesson?")) detachLessonAssessmentMutation.mutate({ sectionId: id, lessonId, lessonTitle }); }} className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-[#b42318] hover:bg-[#fff6f5]">Detach</button>
                                </div>
                                <p className="text-xs text-[#52736a]">{typeof lessonAssessment.type === "string" ? lessonAssessment.type : "quiz"} • {lessonQuestions.length} questions</p>
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
                                              <p className="mt-0.5 text-[10px] uppercase tracking-[.06em] text-[#7f9d94]">{humanizeLabel(qType)}{typeof qr.points === "number" ? ` • ${qr.points} point${qr.points === 1 ? "" : "s"}` : ""}</p>
                                            </div>
                                            <button type="button" onClick={() => { if (lessonAssessmentId && window.confirm("Delete this question?")) deleteSectionQuestionMutation.mutate({ assessmentId: lessonAssessmentId, questionId: qId }); }} className="shrink-0 text-[10px] font-semibold text-[#b42318]">Delete</button>
                                          </div>
                                          {qOptions.length > 0 ? <ul className="mt-2 space-y-1">{qOptions.map((option, optionIndex) => { const isCorrect = correctOptionIndexes.has(optionIndex); return <li key={`${qId}-${optionIndex}`} className={`rounded border px-2 py-1 text-[11px] ${isCorrect ? "border-[#bce8d1] bg-[#effaf4] font-semibold text-[#167550]" : "border-[#eef4ef] text-[#52736a]"}`}>{String.fromCharCode(65 + optionIndex)}. {option}{isCorrect ? " (correct)" : ""}</li>; })}</ul> : null}
                                          {qCorrect && correctOptionIndexes.size === 0 ? <p className="mt-1 text-[11px] font-semibold text-[#167550]">Correct answer: {qCorrect}</p> : null}
                                        </li>
                                      );
                                    })}
                                  </ul>
                                ) : <p className="text-xs text-[#7f9d94]">No questions yet — add the first one below.</p>}
                                <form className="grid gap-2 sm:grid-cols-2" onSubmit={(e) => {
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
                                  <button type="submit" disabled={addSectionQuestionMutation.isPending || !lessonQuestion[lessonKey]?.trim()} className="h-8 rounded-full border border-[#1f6a58] px-3 text-[10px] font-bold text-[#1f6a58] disabled:opacity-60 sm:col-span-2">{addSectionQuestionMutation.isPending ? "Adding…" : "Add question"}</button>
                                </form>
                              </div>
                            ) : (
                              <p className="mt-1 text-xs text-[#7f9d94]">No quiz linked yet — learners take it right after finishing this lesson.</p>
                            )}
                            {!lessonAssessmentId ? (
                              <>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <select value={lessonAssessmentDraft[lessonKey] ?? ""} onChange={(e) => setLessonAssessmentDraft((current) => ({ ...current, [lessonKey]: e.target.value }))} className="h-8 min-w-0 flex-1 rounded-lg border border-[#d7e5df] bg-white px-2 text-xs outline-none focus:border-[#1f6a58]">
                                    <option value="">Attach existing quiz…</option>
                                    {assessments.map((a) => { const aId = typeof a.id === "string" ? a.id : ""; const aTitle = typeof a.title === "string" ? a.title : "Untitled"; return aId ? <option key={aId} value={aId}>{aTitle}</option> : null; })}
                                  </select>
                                  <button type="button" onClick={() => { const target = lessonAssessmentDraft[lessonKey]; if (target) attachLessonAssessmentMutation.mutate({ sectionId: id, lessonId, lessonTitle, assessmentId: target }); }} disabled={!lessonAssessmentDraft[lessonKey] || attachLessonAssessmentMutation.isPending} className="h-8 rounded-full bg-[#1f6a58] px-3 text-[10px] font-bold text-white disabled:opacity-60">Attach</button>
                                </div>
                                <form className="mt-2 grid gap-2 sm:grid-cols-2" onSubmit={(e) => {
                                  e.preventDefault();
                                  const title = lessonAssessmentTitle[lessonKey]?.trim() ?? "";
                                  const passPercent = lessonAssessmentPassPercent[lessonKey] ?? "";
                                  if (!title || !isOptionalIntegerInRange(passPercent, 0, 100)) return;
                                  createLessonAssessmentMutation.mutate({
                                    sectionId: id,
                                    lessonId,
                                    lessonTitle,
                                    title,
                                    instructions: lessonAssessmentInstructions[lessonKey] ?? "",
                                    passPercent,
                                  });
                                }}>
                                  <input value={lessonAssessmentTitle[lessonKey] ?? ""} onChange={(e) => setLessonAssessmentTitle((current) => ({ ...current, [lessonKey]: e.target.value }))} placeholder="Or create a new quiz for this lesson…" aria-label="New quiz title" className="h-8 min-w-0 rounded-lg border border-[#d7e5df] bg-white px-3 text-xs outline-none focus:border-[#1f6a58] sm:col-span-2" />
                                  <textarea value={lessonAssessmentInstructions[lessonKey] ?? ""} onChange={(e) => setLessonAssessmentInstructions((current) => ({ ...current, [lessonKey]: e.target.value }))} placeholder="Instructions (optional)" aria-label="Quiz instructions" rows={2} className="min-w-0 rounded-lg border border-[#d7e5df] bg-white px-3 py-2 text-xs outline-none focus:border-[#1f6a58] sm:col-span-2" />
                                  <label className="text-[10px] font-semibold text-[#52736a]">Pass percentage (optional)
                                    <input type="number" min="0" max="100" step="1" value={lessonAssessmentPassPercent[lessonKey] ?? ""} onChange={(e) => setLessonAssessmentPassPercent((current) => ({ ...current, [lessonKey]: e.target.value }))} placeholder="0–100%" className="mt-1 h-8 w-full rounded-lg border border-[#d7e5df] bg-white px-2 text-xs outline-none focus:border-[#1f6a58]" />
                                  </label>
                                  <button type="submit" disabled={createLessonAssessmentMutation.isPending || !lessonAssessmentTitle[lessonKey]?.trim() || !isOptionalIntegerInRange(lessonAssessmentPassPercent[lessonKey] ?? "", 0, 100)} className="h-8 rounded-full border border-[#1f6a58] px-3 text-[10px] font-bold text-[#1f6a58] disabled:opacity-60 sm:col-span-2">{createLessonAssessmentMutation.isPending ? "Creating…" : "Create and publish quiz"}</button>
                                </form>
                              </>
                            ) : null}
                          </div>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </ul>
              ) : null}
              {viewingLesson?.sectionId === id ? (
                <LessonDetail
                  key={`${viewingLesson.sectionId}:${viewingLesson.lessonId}`}
                  trainingId={trainingId}
                  sectionId={id}
                  lessonId={viewingLesson.lessonId}
                  trainingDeliveryMode={trainingDeliveryMode}
                  trainingLessonDefaults={trainingLessonDefaults}
                  onClose={() => setViewingLesson(null)}
                />
              ) : null}
              <AddLessonForm
                pending={createLessonMutation.isPending}
                trainingDeliveryMode={trainingDeliveryMode}
                trainingLessonDefaults={trainingLessonDefaults}
                onSubmit={(payload) => createLessonMutation.mutate({ sectionId: id, payload })}
              />
            </li>
          );
        })}
      </ul>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (newSectionTitle.trim()) void createSectionMutation.mutate();
        }}
      >
        <input value={newSectionTitle} onChange={(event) => setNewSectionTitle(event.target.value)} placeholder="New session title" className="h-10 min-w-0 flex-1 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-4 text-sm outline-none focus:border-[#1f6a58]" />
        <button type="submit" disabled={createSectionMutation.isPending || !newSectionTitle.trim()} className="h-10 shrink-0 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white disabled:opacity-60">{createSectionMutation.isPending ? "Adding..." : "Add session"}</button>
      </form>
    </SectionCard>
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
            const rawStatus = typeof record.status === "string" ? record.status : typeof record.enrolment_status === "string" ? record.enrolment_status : typeof record.approval_status === "string" ? record.approval_status : "—";
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
          <p className="mt-1 text-xs text-[#7f9d94]">Order {id.slice(0, 8)}{createdAt ? ` · ${formatTrainingDate(createdAt)}` : ""}</p>
        </div>
        {amount ? <p className="text-base font-bold text-[#06201c]">{amount}</p> : null}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
        <OrderDetail label="Order status" value={orderStatus || "—"} />
        <OrderDetail label="Payment status" value={paymentStatus || "—"} />
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
export function TrainingLiveTab({ trainingId }: { trainingId: string }) {
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
            return (
              <li key={id} className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#06201c]">{message}</p>
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

/** Renders the learner-facing content view: sections → lessons → topics with complete-lesson buttons. */
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
                  <span className="shrink-0 text-sm font-bold text-[#1f6a58]" aria-hidden="true">{sessionExpanded ? "−" : "+"}</span>
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
                                <a href={videoUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-semibold text-[#1f6a58] underline">Watch video →</a>
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
                                    return documentUrl ? <li key={`${documentUrl}-${documentIndex}`}><a href={documentUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#1f6a58] underline">{documentName || "Open document"} →</a></li> : null;
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

function AssessmentReview({ trainingId, assessmentId, submissionId, onClose }: { trainingId: string; assessmentId: string; submissionId: string; onClose: () => void }) {
  const reviewQuery = useQuery({
    queryKey: ["trainings", trainingId, "assessment-review", assessmentId, submissionId],
    queryFn: () => getAssessmentSubmissionReview(trainingId, assessmentId, submissionId),
    enabled: Boolean(trainingId && assessmentId && submissionId),
  });

  if (reviewQuery.isLoading) return <p className="text-xs text-[#52736a]">Loading review...</p>;
  if (reviewQuery.isError) return <p className="text-xs font-semibold text-[#b42318]">{(reviewQuery.error as Error).message}</p>;

  const review = (reviewQuery.data ?? {}) as Record<string, unknown>;
  const score = typeof review.score === "number" || typeof review.score === "string" ? String(review.score) : null;
  const passed = typeof review.passed === "boolean" ? review.passed : null;
  const feedback = typeof review.feedback === "string" ? review.feedback : null;
  const answers = Array.isArray(review.review) ? review.review : Array.isArray(review.answers) ? review.answers : [];

  return (
    <div className="mt-3 rounded-xl border border-[#eef4ff] bg-[#f8faff] p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[.08em] text-[#2563eb]">Submission Review</p>
        <button type="button" onClick={onClose} className="rounded-full border border-[#d7e5df] px-2 py-0.5 text-[10px] font-bold text-[#52736a]">Close</button>
      </div>
      {score !== null ? <p className="text-sm font-bold text-[#06201c]">Score: {score}</p> : null}
      {passed !== null ? <p className={`text-xs font-bold ${passed ? "text-[#167550]" : "text-[#b42318]"}`}>{passed ? "Passed" : "Failed"}</p> : null}
      {feedback ? <p className="text-xs text-[#52736a]">{feedback}</p> : null}
      {answers.length > 0 ? (
        <ul className="space-y-1">
          {(answers as Array<Record<string, unknown>>).map((a, aIndex) => {
            const qText = typeof a.question === "string" ? a.question : typeof a.question_text === "string" ? a.question_text : `Q${aIndex + 1}`;
            const answer = typeof a.answer === "string" ? a.answer : typeof a.given === "string" ? a.given : typeof a.user_answer === "string" ? a.user_answer : "";
            const correctAnswer = typeof a.correct === "string" ? a.correct : null;
            return (
              <li key={aIndex} className="rounded-lg bg-white p-2">
                <p className="text-xs font-semibold text-[#06201c]">{qText}</p>
                <p className="text-xs text-[#52736a]">Answer: {answer}</p>
                {correctAnswer ? <p className="text-[10px] font-semibold text-[#52736a]">Correct answer: {correctAnswer}</p> : null}
                {typeof a.explanation === "string" && a.explanation ? <p className="text-[10px] text-[#52736a]">{a.explanation}</p> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

/** Renders assessments list with create/delete, question management, edit, submit, grade, review, and question bank. */
export function TrainingAssessmentsTab({ trainingId }: { trainingId: string }) {
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
  const [reviewSubmission, setReviewSubmission] = useState<{ assessmentId: string; submissionId: string } | null>(null);
  const [gradeSubmission, setGradeSubmission] = useState<{ assessmentId: string; submissionId: string } | null>(null);
  const [gradeScore, setGradeScore] = useState("");
  const [gradeFeedback, setGradeFeedback] = useState("");

  const assessmentsQuery = useQuery({
    queryKey: ["trainings", trainingId, "assessments"],
    queryFn: () => listTrainingAssessments(trainingId),
    enabled: Boolean(trainingId),
  });

  const updateAssessmentMutation = useMutation({
    mutationFn: ({ assessmentId, title }: { assessmentId: string; title: string }) => updateTrainingAssessment(trainingId, assessmentId, { title }),
    onSuccess: () => { setEditingAssessmentId(null); setFeedback("Assessment updated."); void queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "assessments"] }); },
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
    onSuccess: () => { setGradeSubmission(null); setGradeScore(""); setGradeFeedback(""); setFeedback("Submission graded."); },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to grade submission."),
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
          return (
            <li key={id} className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-4">
              <div className="flex items-center justify-between gap-3">
                {isEditing ? (
                  <form className="flex flex-1 flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (editAssessmentTitle.trim()) updateAssessmentMutation.mutate({ assessmentId: id, title: editAssessmentTitle.trim() }); }}>
                    <input value={editAssessmentTitle} onChange={(e) => setEditAssessmentTitle(e.target.value)} aria-label="Assessment title" className="h-8 flex-1 rounded-lg border border-[#d7e5df] px-3 text-sm font-bold text-[#06201c] outline-none focus:border-[#1f6a58]" />
                    <button type="submit" className="h-8 rounded-full bg-[#1f6a58] px-3 text-xs font-bold text-white">Save</button>
                    <button type="button" onClick={() => setEditingAssessmentId(null)} className="h-8 rounded-full border border-[#d7e5df] px-3 text-xs font-bold text-[#52736a]">Cancel</button>
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
                    {type ? <span className="rounded-full bg-[#eef4ff] px-2 py-0.5 text-[10px] font-bold text-[#2563eb]">{type.toLowerCase() === "exam" ? "Quiz" : humanizeLabel(type)}</span> : null}
                    {typeof record.lesson_id === "string" && record.lesson_id ? <span className="rounded-full bg-[#eef4ff] px-2 py-0.5 text-[10px] font-bold text-[#2563eb]">In a lesson</span> : null}
                    <span className="text-xs text-[#7f9d94]">{questions.length} questions</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <button type="button" onClick={(e) => { e.stopPropagation(); setEditingAssessmentId(id); setEditAssessmentTitle(title); }} className="rounded-full px-2 py-1 text-xs font-semibold text-[#1f6a58] hover:bg-[#e8f6ee]">Edit</button>
                  <button type="button" onClick={() => { if (window.confirm("Delete this assessment?")) deleteMutation.mutate(id); }} className="rounded-full px-2 py-1 text-xs font-semibold text-[#b42318] hover:bg-[#fff6f5]">Delete</button>
                </div>
              </div>
              {isExpanded ? (
                <div className="mt-3 space-y-2 pl-4">
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
                <AssessmentReview trainingId={trainingId} assessmentId={id} submissionId={reviewSubmission.submissionId} onClose={() => setReviewSubmission(null)} />
              ) : null}
              {gradeSubmission?.assessmentId === id ? (
                <div className="mt-3 rounded-xl border border-[#fff4d6] bg-[#fffdf5] p-3 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-[.08em] text-[#8a5a00]">Grade Submission</p>
                  <div className="flex gap-2">
                    <input type="number" value={gradeScore} onChange={(e) => setGradeScore(e.target.value)} placeholder="Score" className="h-8 w-24 rounded-lg border border-[#d7e5df] px-3 text-xs outline-none focus:border-[#1f6a58]" />
                    <input value={gradeFeedback} onChange={(e) => setGradeFeedback(e.target.value)} placeholder="Feedback (optional)" className="h-8 flex-1 rounded-lg border border-[#d7e5df] px-3 text-xs outline-none focus:border-[#1f6a58]" />
                    <button type="button" onClick={() => { if (gradeScore) gradeMutation.mutate({ assessmentId: id, submissionId: gradeSubmission.submissionId, score: Number(gradeScore), feedbackText: gradeFeedback }); }} disabled={gradeMutation.isPending || !gradeScore} className="h-8 rounded-full bg-[#1f6a58] px-3 text-[10px] font-bold text-white disabled:opacity-60">Grade</button>
                    <button type="button" onClick={() => setGradeSubmission(null)} className="h-8 rounded-full border border-[#d7e5df] px-3 text-[10px] font-bold text-[#52736a]">Cancel</button>
                  </div>
                </div>
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
                    {dueDate || maxScore !== null ? <p className="mt-1 text-xs text-[#7f9d94]">{dueDate ? "Due: " + formatTrainingDate(dueDate) : ""}{dueDate && maxScore !== null ? " · " : ""}{maxScore !== null ? "Max score: " + maxScore : ""}</p> : null}
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

/** Renders training reviews backed by `GET/POST /trainings/{id}/reviews`. */
export function TrainingReviewsTab({ trainingId }: { trainingId: string }) {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const reviewsQuery = useQuery({
    queryKey: ["trainings", trainingId, "reviews"],
    queryFn: () => listTrainingReviews(trainingId),
    enabled: Boolean(trainingId),
    retry: 1,
  });

  const deleteMutation = useMutation({
    mutationFn: (reviewId: string) => deleteTrainingReview(trainingId, reviewId),
    onSuccess: () => {
      setDeleteError(null);
      setFeedback("Review deleted.");
      void queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "reviews"] });
      void queryClient.invalidateQueries({ queryKey: ["trainings", "detail", trainingId] });
      void queryClient.invalidateQueries({ queryKey: ["trainings", "list"] });
    },
    onError: (error) => setDeleteError(error instanceof TrainingsApiError ? error.message : "Unable to delete review."),
  });

  const handleDeleteReview = (reviewId: string) => {
    if (deleteMutation.isPending || !window.confirm("Permanently delete this review? This cannot be undone.")) return;
    setFeedback(null);
    setDeleteError(null);
    deleteMutation.mutate(reviewId);
  };

  const reviews = reviewsQuery.data ?? [];

  return (
    <SectionCard title="Reviews">
      {feedback ? <p role="status" className="mb-4 rounded-xl border border-[#bce8d1] bg-[#effaf4] px-4 py-3 text-sm font-semibold text-[#167550]">{feedback}</p> : null}
      {deleteError ? <p role="alert" className="mb-4 rounded-xl border border-[#f3c7c3] bg-[#fff5f4] px-4 py-3 text-sm font-semibold text-[#b42318]">{deleteError}</p> : null}
      {reviewsQuery.isLoading ? <p className="mt-4 text-sm text-[#52736a]">Loading reviews...</p> : null}
      {reviewsQuery.isError ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p role="alert" className="text-sm font-semibold text-[#b42318]">{(reviewsQuery.error as Error).message}</p>
          <button type="button" onClick={() => void reviewsQuery.refetch()} className="text-sm font-bold text-[#1f6a58] underline">Retry</button>
        </div>
      ) : null}
      {!reviewsQuery.isLoading && !reviewsQuery.isError && reviews.length === 0 ? <p className="mt-4 text-sm text-[#52736a]">No reviews have been submitted for this Training yet.</p> : null}
      {reviews.length > 0 ? (
        <ul className="mt-4 grid gap-2">
          {reviews.map((review, index) => {
            const record = review as Record<string, unknown>;
            const reviewId = typeof record.id === "string" && record.id.trim() ? record.id : null;
            const id = reviewId ?? String(index);
            const author = typeof record.participant_name === "string" && record.participant_name.trim()
              ? record.participant_name
              : typeof record.author === "string" && record.author.trim()
                ? record.author
                : typeof record.participant_email === "string"
                  ? record.participant_email
                  : "Participant";
            const ratingValue = typeof record.rating === "number" ? record.rating : null;
            const commentText = typeof record.comment === "string" ? record.comment : null;
            const createdAt = typeof record.created_at === "string" ? record.created_at : null;
            const verified = record.verified === true;
            return (
              <li key={id} className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-[#06201c]">{author}{verified ? " · Verified" : ""}</p>
                  <div className="flex shrink-0 items-center gap-2">
                    {ratingValue !== null ? <span className="rounded-full bg-[#e8f6ee] px-3 py-1 text-xs font-bold text-[#1f6a58]">{ratingValue} ★</span> : null}
                    {reviewId ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteReview(reviewId)}
                        disabled={deleteMutation.isPending}
                        aria-label={`Delete review by ${author}`}
                        className="rounded-full border border-[#e1c9c6] px-3 py-1 text-xs font-bold text-[#a52a20] hover:bg-[#fff1ef] hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deleteMutation.isPending && deleteMutation.variables === reviewId ? "Deleting…" : "Delete review"}
                      </button>
                    ) : null}
                  </div>
                </div>
                {commentText ? <p className="mt-1 text-sm text-[#52736a]">{commentText}</p> : null}
                {createdAt ? <p className="mt-1 text-xs text-[#7f9d94]">{formatTrainingDate(createdAt)}</p> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </SectionCard>
  );
}
