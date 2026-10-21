import { protectedMediaPreviewUrl } from "@ihp/shared";

type LessonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is LessonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(record: LessonRecord, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function fileLinks(value: unknown): Array<{ url: string; name: string }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry === "string" && entry.trim()) return [{ url: entry.trim(), name: entry.trim().split("/").pop() || "Download file" }];
    if (!isRecord(entry)) return [];
    const url = stringValue(entry, "url", "file_url", "download_url");
    return url ? [{ url, name: stringValue(entry, "name", "title", "filename") || url.split("/").pop() || "Download file" }] : [];
  });
}

function safeExternalHref(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function formatScheduledAt(value: string, timeZone: string): string {
  const raw = value.trim();
  if (!raw) return "Schedule not provided";
  const hasExplicitZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw);
  const date = new Date(hasExplicitZone ? raw : `${raw}Z`);
  if (!Number.isFinite(date.getTime())) return raw;
  const options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short", timeZone: hasExplicitZone ? undefined : "UTC" };
  try {
    return `${new Intl.DateTimeFormat(undefined, options).format(date)}${timeZone ? ` (${timeZone})` : ""}`;
  } catch {
    return new Intl.DateTimeFormat(undefined, { ...options, timeZone: "UTC" }).format(date);
  }
}

function answerValues(value: unknown, depth = 0): string[] {
  if (depth > 3 || value == null) return [];
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return [String(value)];
  if (Array.isArray(value)) return value.flatMap((entry) => answerValues(entry, depth + 1));
  if (!isRecord(value)) return [];
  return answerValues(value.value ?? value.id ?? value.label ?? value.text ?? value.answer ?? value.option_id ?? value.option_key, depth + 1);
}

function QuizQuestions({ questions }: { questions: unknown[] }) {
  const validQuestions = questions.filter(isRecord);
  if (!validQuestions.length) return <p className="text-sm text-[#52736a]">No quiz questions are available.</p>;
  return <ol className="space-y-3">{validQuestions.map((question, index) => {
    const questionType = stringValue(question, "question_type", "questionType", "type").toLowerCase().replace(/[\s-]+/g, "_");
    const rawOptions = Array.isArray(question.options) ? question.options : [];
    const optionEntries = rawOptions.map((option, optionIndex) => {
      if (typeof option === "string") return { label: option.trim(), values: [option.trim()], index: optionIndex, explicitlyCorrect: false };
      if (!isRecord(option)) return { label: "", values: [], index: optionIndex, explicitlyCorrect: false };
      const label = stringValue(option, "label", "text", "option_text", "option", "name", "value");
      const values = [...new Set([label, stringValue(option, "value", "id", "key", "option_id", "option_key")].filter(Boolean))];
      return { label, values, index: optionIndex, explicitlyCorrect: option.is_correct === true || option.isCorrect === true || option.correct === true };
    });
    const options = optionEntries.filter((option) => option.label);
    const displayOptions = options.length || !["true_false", "truefalse"].includes(questionType)
      ? options
      : ["True", "False"].map((label, optionIndex) => ({ label, values: [label, label.toLowerCase()], index: optionIndex, explicitlyCorrect: false }));
    const correctRaw = question.correct_answer ?? question.correct_answers ?? question.correct_answer_text ?? question.correct_option ?? question.correct_options ?? question.correct_option_id ?? question.correct_option_index ?? question.correct_index ?? question.answer_index ?? question.answer_key ?? question.correctAnswer ?? question.correctOption ?? question.answer;
    const correctValues = answerValues(correctRaw);
    const correctOptionIndexes = new Set<number>(displayOptions.filter((option) => option.explicitlyCorrect).map((option) => option.index));
    const multipleChoice = questionType.includes("multi") || questionType.includes("checkbox");
    const normalize = (value: string) => value.normalize("NFKC").toLocaleLowerCase().replace(/[\s\p{P}\p{S}]/gu, "");

    for (const correctValue of correctValues) {
      const normalizedCorrectValue = correctValue.trim().toLocaleLowerCase();
      const exactMatches = displayOptions.filter((option) => option.values.some((value) => value.trim().toLocaleLowerCase() === normalizedCorrectValue));
      if (exactMatches.length) {
        for (const option of exactMatches) correctOptionIndexes.add(option.index);
        continue;
      }
      if (multipleChoice) {
        const normalizedAnswer = normalize(correctValue);
        const candidates = displayOptions.flatMap((option) => option.values.map((value) => ({ index: option.index, value: normalize(value) })))
          .filter((option) => option.value.length > 0)
          .map((option) => ({ ...option, start: normalizedAnswer.indexOf(option.value), end: normalizedAnswer.indexOf(option.value) + option.value.length }))
          .filter((option) => option.start >= 0)
          .sort((left, right) => right.value.length - left.value.length);
        const matchedRanges: Array<{ start: number; end: number; value: string }> = [];
        for (const candidate of candidates) {
          const overlapsAnotherOption = matchedRanges.some((range) => candidate.start < range.end && candidate.end > range.start && candidate.value !== range.value);
          if (!overlapsAnotherOption) {
            matchedRanges.push(candidate);
            correctOptionIndexes.add(candidate.index);
          }
        }
        if (candidates.length) continue;
      }
      const letterIndex = /^[a-z]$/i.test(correctValue.trim()) ? correctValue.trim().toUpperCase().charCodeAt(0) - 65 : -1;
      const indexMatch = displayOptions.find((option) => String(option.index) === correctValue.trim())
        ?? (letterIndex >= 0 ? displayOptions.find((option) => option.index === letterIndex) : undefined);
      if (indexMatch) correctOptionIndexes.add(indexMatch.index);
    }

    const questionText = stringValue(question, "question", "question_text", "text", "title") || "Question";
    return <li key={stringValue(question, "id", "question_id") || `${index}-${questionText}`} className="rounded-xl bg-white p-3"><p className="font-semibold text-[#183d32]">{index + 1}. {questionText}</p>{displayOptions.length ? <ul className="mt-2 space-y-1">{displayOptions.map((option) => {
      const correct = correctOptionIndexes.has(option.index);
      return <li key={`${option.index}-${option.label}`} className={`rounded-lg border px-3 py-2 text-sm ${correct ? "border-[#bce8d1] bg-[#effaf4] font-semibold text-[#167550]" : "border-[#e1ebe6] text-[#52736a]"}`}>{String.fromCharCode(65 + option.index)}. {option.label}{correct ? " (correct answer)" : ""}</li>;
    })}</ul> : correctValues.length ? <p className="mt-2 text-sm font-semibold text-[#167550]">Correct answer: {correctValues.join(", ")}</p> : <p className="mt-2 text-sm text-[#7f9d94]">No answer key is available for this question.</p>}</li>;
  })}</ol>;
}

/** Renders the saved content and delivery details for a Training lesson in the platform review modal. */
export default function PlatformTrainingLessonContent({ lesson, assessments, timeZone }: { lesson: LessonRecord; assessments: unknown[]; timeZone: string }) {
  const type = stringValue(lesson, "type", "lesson_type").toLowerCase().replace(/[\s-]+/g, "_");
  const title = stringValue(lesson, "title") || "Lesson";
  const content = stringValue(lesson, "content", "content_text", "notes_content", "topic_content");
  const mediaUrl = stringValue(lesson, "content_url", "video_url", "youtube_url", "pdf_url", "file_url", "resource_url", "url")
    || (Array.isArray(lesson.videos) && typeof lesson.videos[0] === "string" ? lesson.videos[0] : "");
  const assessmentId = stringValue(lesson, "assessment_id");
  const assessment = assessments.filter(isRecord).find((item) => (assessmentId && stringValue(item, "id") === assessmentId) || stringValue(item, "lesson_id") === stringValue(lesson, "id"));
  const questions = Array.isArray(lesson.questions) ? lesson.questions : assessment && Array.isArray(assessment.questions) ? assessment.questions : [];
  const files = [...fileLinks(lesson.documents), ...fileLinks(lesson.notes), ...fileLinks(lesson.files)];
  if (mediaUrl && (type === "pdf" || type === "document")) files.unshift({ url: mediaUrl, name: stringValue(lesson, "file_name", "filename") || title });
  const mediaLink = mediaUrl ? protectedMediaPreviewUrl(mediaUrl, "/api/platform-super-admin/event-media") : null;
  const normalizedType = type === "exam" ? "quiz" : type === "text" ? "topic" : type;
  const youtubeUrl = normalizedType === "youtube" ? safeExternalHref(mediaUrl) : null;
  const noteUrl = normalizedType === "notes" ? stringValue(lesson, "notes_url", "notes_pdf_url", "note_file_url") : "";
  if (noteUrl && !files.some((file) => file.url === noteUrl)) files.unshift({ url: noteUrl, name: stringValue(lesson, "file_name", "filename") || title });
  const topics = Array.isArray(lesson.topics) ? lesson.topics.filter(isRecord) : [];
  const scheduledAt = stringValue(lesson, "scheduled_at", "starts_at", "start_date");
  const isLive = normalizedType === "live";
  const isVenue = normalizedType === "venue";
  const meetingLink = safeExternalHref(stringValue(lesson, "meeting_link", "join_url"));
  const venueName = stringValue(lesson, "venue_name", "venue");
  const venueAddress = stringValue(lesson, "venue_address", "address");
  const joinDetails = stringValue(lesson, "join_meta", "delivery_instructions", "instructions");
  const passCode = stringValue(lesson, "pass_code", "passcode");
  const checkInWindow = stringValue(lesson, "check_in_window");
  const meetingType = stringValue(lesson, "meeting_type", "meeting_provider").replaceAll("_", " ");
  const hasDeliveryDetails = Boolean(scheduledAt || meetingLink || venueName || venueAddress || joinDetails || passCode || checkInWindow || meetingType);

  return <div className="mt-3 space-y-3 border-t border-[#e1ebe6] pt-3">
    {isLive || isVenue ? <dl className="grid gap-3 rounded-xl bg-[#f4faf7] p-3 text-sm sm:grid-cols-2">
      {scheduledAt ? <div><dt className="font-semibold text-[#52736a]">Scheduled</dt><dd className="mt-1 text-[#183d32]">{formatScheduledAt(scheduledAt, timeZone)}</dd></div> : null}
      {isLive && meetingType ? <div><dt className="font-semibold text-[#52736a]">Meeting platform</dt><dd className="mt-1 capitalize text-[#183d32]">{meetingType}</dd></div> : null}
      {isLive && meetingLink ? <div><dt className="font-semibold text-[#52736a]">Meeting link</dt><dd className="mt-1"><a href={meetingLink} target="_blank" rel="noreferrer" className="font-semibold text-[#1f6a58] underline">Open meeting</a></dd></div> : null}
      {isVenue && venueName ? <div><dt className="font-semibold text-[#52736a]">Venue</dt><dd className="mt-1 text-[#183d32]">{venueName}</dd></div> : null}
      {isVenue && venueAddress ? <div><dt className="font-semibold text-[#52736a]">Address</dt><dd className="mt-1 text-[#183d32]">{venueAddress}</dd></div> : null}
      {isLive && joinDetails ? <div className="sm:col-span-2"><dt className="font-semibold text-[#52736a]">Joining details</dt><dd className="mt-1 whitespace-pre-wrap text-[#183d32]">{joinDetails}</dd></div> : null}
      {passCode ? <div><dt className="font-semibold text-[#52736a]">Passcode</dt><dd className="mt-1 text-[#183d32]">{passCode}</dd></div> : null}
      {checkInWindow ? <div><dt className="font-semibold text-[#52736a]">Check-in window</dt><dd className="mt-1 text-[#183d32]">{checkInWindow}</dd></div> : null}
      {!hasDeliveryDetails ? <p className="text-sm text-[#52736a]">{isLive ? "Live lesson schedule and meeting details are not available." : "Venue lesson schedule and location details are not available."}</p> : null}
    </dl> : null}
    {normalizedType === "video" && mediaLink ? <div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6a8a80]">Video</p><video controls preload="metadata" src={mediaLink} className="max-h-80 w-full rounded-xl bg-black">Your browser could not play this video.</video></div> : null}
    {normalizedType === "youtube" && youtubeUrl ? <a href={youtubeUrl} target="_blank" rel="noreferrer" className="inline-flex rounded-full border border-[#1f6a58] px-4 py-2 text-sm font-semibold text-[#1f6a58] underline">Open YouTube</a> : null}
    {normalizedType === "pdf" && files.length ? <ul className="space-y-2">{files.map((file, index) => <li key={`${file.url}-${index}`}><a href={protectedMediaPreviewUrl(file.url, "/api/platform-super-admin/event-media")} download className="font-semibold text-[#1f6a58] underline">Download PDF: {file.name}</a></li>)}</ul> : null}
    {normalizedType === "quiz" ? <div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6a8a80]">Quiz questions and answers</p><QuizQuestions questions={questions} /></div> : null}
    {(normalizedType === "topic" || normalizedType === "notes") && content ? <div><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#6a8a80]">{normalizedType === "notes" ? "Notes content" : "Topic content"}</p><p className="whitespace-pre-wrap text-sm leading-6 text-[#52736a]">{content}</p></div> : null}
    {normalizedType === "topic" && topics.length ? <div className="space-y-2">{topics.map((topic, index) => <div key={stringValue(topic, "id") || `topic-${index}`} className="rounded-xl bg-white p-3"><p className="font-semibold text-[#183d32]">{stringValue(topic, "title") || `Topic ${index + 1}`}</p>{stringValue(topic, "content", "text") ? <p className="mt-1 whitespace-pre-wrap text-sm text-[#52736a]">{stringValue(topic, "content", "text")}</p> : null}</div>)}</div> : null}
    {normalizedType === "notes" && files.length ? <ul className="space-y-2">{files.map((file, index) => <li key={`${file.url}-${index}`}><a href={protectedMediaPreviewUrl(file.url, "/api/platform-super-admin/event-media")} download className="font-semibold text-[#1f6a58] underline">Download notes: {file.name}</a></li>)}</ul> : null}
    {normalizedType !== "pdf" && normalizedType !== "notes" && files.length ? <ul className="space-y-2">{files.map((file, index) => <li key={`${file.url}-${index}`}><a href={protectedMediaPreviewUrl(file.url, "/api/platform-super-admin/event-media")} download className="font-semibold text-[#1f6a58] underline">Download: {file.name}</a></li>)}</ul> : null}
    {!content && !mediaUrl && !files.length && normalizedType !== "quiz" && !(isLive || isVenue) ? <p className="text-sm text-[#52736a]">No lesson content is available.</p> : null}
  </div>;
}
