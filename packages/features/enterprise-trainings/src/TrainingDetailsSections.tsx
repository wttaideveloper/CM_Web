"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addAssessmentQuestions,
  approveTrainingEnrolment,
  cancelTrainingEnrolment,
  completeTrainingLesson,
  createDiscussionReply,
  createLessonTopic,
  createTrainingAnnouncement,
  createTrainingAssignment,
  createTrainingAssessment,
  createTrainingDiscussion,
  createTrainingLesson,
  createTrainingLiveSession,
  createTrainingSection,
  deleteAssessmentQuestion,
  deleteLessonTopic,
  deleteTrainingAssessment,
  deleteTrainingAssignment,
  deleteTrainingLesson,
  deleteTrainingSection,
  exportLiveSessionAttendance,
  getLiveSessionAttendance,
  getAssessmentSubmissionReview,
  getTrainingCertificate,
  getTrainingContent,
  getTrainingLesson,
  getTrainingMeetingLink,
  getTrainingModerationHistory,
  getTrainingProgress,
  getTrainingQuestionBank,
  getTrainingSections,
  gradeAssessmentSubmission,
  gradeAssignmentSubmission,
  joinTrainingWaitlist,
  leaveTrainingWaitlist,
  listLessonTopics,
  listTrainingAnnouncements,
  listTrainingAssignments,
  listTrainingAssessments,
  listTrainingDiscussions,
  listTrainingEnrolments,
  listTrainingLiveSessions,
  listTrainingOrders,
  markLiveSessionAttendance,
  refundTrainingOrder,
  decideTrainingOrderRefund,
  patchTrainingOrderStatus,
  reorderTrainingLessons,
  reorderTrainingModules,
  reorderTrainingSections,
  submitTrainingAssessment,
  submitTrainingAssignment,
  updateLessonTopic,
  updateTrainingAssessment,
  updateTrainingLesson,
  updateTrainingSection,
  downloadTrainingCalendar,
  TrainingsApiError,
  type CreateLiveSessionPayload,
  type CreateTrainingSectionPayload,
} from "./trainings.service";
import { enrolInTraining, type TrainingCheckoutRequest } from "./trainings.service";
import { formatTrainingDate, humanizeLabel } from "./detail-formatters";
import ProgressSummaryCard from "./ProgressSummaryCard";

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

function LessonTopics({ trainingId, sectionId, lessonId }: { trainingId: string; sectionId: string; lessonId: string }) {
  const queryClient = useQueryClient();
  const [newTopic, setNewTopic] = useState("");
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editTopicText, setEditTopicText] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const topicsQuery = useQuery({
    queryKey: ["trainings", trainingId, "topics", sectionId, lessonId],
    queryFn: () => listLessonTopics(trainingId, sectionId, lessonId),
    enabled: Boolean(trainingId && sectionId && lessonId),
  });

  const createMutation = useMutation({
    mutationFn: () => createLessonTopic(trainingId, sectionId, lessonId, { title: newTopic.trim() }),
    onSuccess: () => { setNewTopic(""); setFeedback("Topic added."); void queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "topics", sectionId, lessonId] }); },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to add topic."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ topicId, title }: { topicId: string; title: string }) => updateLessonTopic(trainingId, sectionId, lessonId, topicId, { title }),
    onSuccess: () => { setEditingTopicId(null); setFeedback("Topic updated."); void queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "topics", sectionId, lessonId] }); },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to update topic."),
  });

  const deleteMutation = useMutation({
    mutationFn: (topicId: string) => deleteLessonTopic(trainingId, sectionId, lessonId, topicId),
    onSuccess: () => { setFeedback("Topic deleted."); void queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "topics", sectionId, lessonId] }); },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to delete topic."),
  });

  const topics = Array.isArray(topicsQuery.data) ? topicsQuery.data : [];

  return (
    <div className="mt-2 space-y-2 pl-4 border-l-2 border-[#e1ebe6]">
      {feedback ? <p role="status" className="rounded-lg bg-[#effaf4] px-3 py-1.5 text-xs font-semibold text-[#167550]">{feedback}</p> : null}
      {topics.length > 0 ? (
        <ul className="space-y-1">
          {(topics as Array<Record<string, unknown>>).map((topic, tIndex) => {
            const tId = typeof topic.id === "string" ? topic.id : String(tIndex);
            const tTitle = typeof topic.title === "string" ? topic.title : "Topic";
            const isEditing = editingTopicId === tId;
            return (
              <li key={tId} className="flex items-center gap-2 rounded-lg bg-white px-2 py-1">
                {isEditing ? (
                  <form className="flex flex-1 gap-1" onSubmit={(e) => { e.preventDefault(); if (editTopicText.trim()) updateMutation.mutate({ topicId: tId, title: editTopicText.trim() }); }}>
                    <input value={editTopicText} onChange={(e) => setEditTopicText(e.target.value)} className="h-7 flex-1 rounded border border-[#d7e5df] px-2 text-xs outline-none focus:border-[#1f6a58]" />
                    <button type="submit" className="h-7 rounded bg-[#1f6a58] px-2 text-[10px] font-bold text-white">Save</button>
                    <button type="button" onClick={() => setEditingTopicId(null)} className="h-7 rounded border border-[#d7e5df] px-2 text-[10px] font-bold text-[#52736a]">Cancel</button>
                  </form>
                ) : (
                  <>
                    <p className="flex-1 text-xs text-[#52736a]">{tTitle}</p>
                    <button type="button" onClick={() => { setEditingTopicId(tId); setEditTopicText(tTitle); }} className="text-[10px] font-semibold text-[#1f6a58]">Edit</button>
                    <button type="button" onClick={() => { if (window.confirm("Delete this topic?")) deleteMutation.mutate(tId); }} className="text-[10px] font-semibold text-[#b42318]">Delete</button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
      <form className="flex gap-1" onSubmit={(e) => { e.preventDefault(); if (newTopic.trim()) createMutation.mutate(); }}>
        <input value={newTopic} onChange={(e) => setNewTopic(e.target.value)} placeholder="Add topic..." className="h-7 flex-1 rounded border border-[#d7e5df] px-2 text-xs outline-none focus:border-[#1f6a58]" />
        <button type="submit" disabled={createMutation.isPending || !newTopic.trim()} className="h-7 rounded border border-[#1f6a58] px-2 text-[10px] font-bold text-[#1f6a58] disabled:opacity-60">+ Topic</button>
      </form>
    </div>
  );
}

function LessonDetail({ trainingId, sectionId, lessonId, onClose }: { trainingId: string; sectionId: string; lessonId: string; onClose: () => void }) {
  const [editMode, setEditMode] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const lessonQuery = useQuery({
    queryKey: ["trainings", trainingId, "lesson", sectionId, lessonId],
    queryFn: () => getTrainingLesson(trainingId, sectionId, lessonId),
    enabled: Boolean(trainingId && sectionId && lessonId),
  });

  const updateMutation = useMutation({
    mutationFn: () => updateTrainingLesson(trainingId, sectionId, lessonId, { title: title.trim(), content: content.trim(), video_url: videoUrl.trim() || undefined }),
    onSuccess: () => { setFeedback("Lesson updated."); setEditMode(false); void queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "sections"] }); },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to update lesson."),
  });

  if (lessonQuery.isLoading) return <p className="text-xs text-[#52736a]">Loading lesson...</p>;
  if (lessonQuery.isError) return <p className="text-xs font-semibold text-[#b42318]">{(lessonQuery.error as Error).message}</p>;

  const lesson = (lessonQuery.data ?? {}) as Record<string, unknown>;
  const lessonTitle = typeof lesson.title === "string" ? lesson.title : "";
  const lessonContent = typeof lesson.content === "string" ? lesson.content : "";
  const lessonVideoUrl = typeof lesson.video_url === "string" ? lesson.video_url : "";

  if (!editMode && title === "" && content === "" && videoUrl === "") {
    setTitle(lessonTitle);
    setContent(lessonContent);
    setVideoUrl(lessonVideoUrl);
  }

  return (
    <div className="mt-3 rounded-xl border border-[#e1ebe6] bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[.08em] text-[#7f9d94]">Lesson Detail</p>
        <div className="flex gap-1">
          <button type="button" onClick={() => setEditMode(!editMode)} className="rounded-full border border-[#1f6a58] px-2 py-0.5 text-[10px] font-bold text-[#1f6a58]">{editMode ? "Cancel" : "Edit"}</button>
          <button type="button" onClick={onClose} className="rounded-full border border-[#d7e5df] px-2 py-0.5 text-[10px] font-bold text-[#52736a]">Close</button>
        </div>
      </div>
      {feedback ? <p role="status" className="rounded-lg bg-[#effaf4] px-3 py-1.5 text-xs font-semibold text-[#167550]">{feedback}</p> : null}
      {editMode ? (
        <div className="space-y-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Lesson title" className="h-8 w-full rounded-lg border border-[#d7e5df] px-3 text-xs outline-none focus:border-[#1f6a58]" />
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Lesson content..." rows={4} className="w-full rounded-lg border border-[#d7e5df] px-3 py-2 text-xs outline-none focus:border-[#1f6a58]" />
          <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Video URL (optional)" className="h-8 w-full rounded-lg border border-[#d7e5df] px-3 text-xs outline-none focus:border-[#1f6a58]" />
          <button type="button" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending || !title.trim()} className="h-8 rounded-full bg-[#1f6a58] px-4 text-xs font-bold text-white disabled:opacity-60">{updateMutation.isPending ? "Saving..." : "Save"}</button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-bold text-[#06201c]">{lessonTitle || "Untitled"}</p>
          {lessonVideoUrl ? <a href={lessonVideoUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#1f6a58] underline">Watch video →</a> : null}
          {lessonContent ? <p className="whitespace-pre-wrap text-xs leading-5 text-[#52736a]">{lessonContent}</p> : <p className="text-xs text-[#7f9d94]">No content.</p>}
        </div>
      )}
    </div>
  );
}

/** Renders the Training structure: sections, lessons, and reordering. */
export function TrainingSectionsTab({ trainingId }: { trainingId: string }) {
  const queryClient = useQueryClient();
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [sectionTitle, setSectionTitle] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editSectionTitle, setEditSectionTitle] = useState("");
  const [viewingLesson, setViewingLesson] = useState<{ sectionId: string; lessonId: string } | null>(null);

  const sectionsQuery = useQuery({
    queryKey: ["trainings", trainingId, "sections"],
    queryFn: () => getTrainingSections(trainingId),
    enabled: Boolean(trainingId),
  });

  const invalidateSections = () => void queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "sections"] });

  const createSectionMutation = useMutation({
    mutationFn: () => {
      const payload: CreateTrainingSectionPayload = { title: newSectionTitle.trim() };
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
    mutationFn: ({ sectionId, title }: { sectionId: string; title: string }) => updateTrainingSection(trainingId, sectionId, { title }),
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
    mutationFn: ({ sectionId, lessonTitle }: { sectionId: string; lessonTitle: string }) => createTrainingLesson(trainingId, sectionId, { title: lessonTitle }),
    onSuccess: () => {
      setFeedback("Lesson added.");
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
      return fetch(`/api/v1/trainings/${encodeURIComponent(trainingId)}/sections/reorder`, {
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
      const lessonOrders = lessons.map((l, i) => ({ id: typeof l.id === "string" ? l.id : String(i), order: i }));
      return fetch(`/api/v1/trainings/${encodeURIComponent(trainingId)}/sections/${encodeURIComponent(sectionId)}/lessons/reorder`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson_orders: lessonOrders }),
      }).then((r) => { if (!r.ok) throw new Error("Reorder failed"); });
    },
    onSuccess: () => { setFeedback("Lessons reordered."); void invalidateSections(); },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to reorder lessons."),
  });

  if (sectionsQuery.isLoading) return <p className="text-sm text-[#52736a]">Loading sections...</p>;
  if (sectionsQuery.isError) return <p className="text-sm font-semibold text-[#b42318]">{(sectionsQuery.error as Error).message}</p>;

  const sections = Array.isArray(sectionsQuery.data) ? (sectionsQuery.data as Array<Record<string, unknown>>) : [];

  return (
    <SectionCard title="Sections & Lessons">
      {feedback ? <p role="status" className="mb-4 rounded-xl border border-[#bce8d1] bg-[#effaf4] px-4 py-3 text-sm font-semibold text-[#167550]">{feedback}</p> : null}
      {sections.length === 0 ? <p className="text-sm text-[#52736a]">No sections yet. Add your first section to start building the training.</p> : null}
      <ul className="grid gap-3">
        {sections.map((section, sIndex) => {
          const id = typeof section.id === "string" ? section.id : String(section.order ?? "");
          const title = typeof section.title === "string" ? section.title : "Untitled section";
          const lessons = Array.isArray(section.lessons) ? section.lessons : [];
          const isEditing = editingSectionId === id;
          return (
            <li key={id} className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-4">
              <div className="flex items-center justify-between gap-3">
                {isEditing ? (
                  <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); if (editSectionTitle.trim()) updateSectionMutation.mutate({ sectionId: id, title: editSectionTitle.trim() }); }}>
                    <input value={editSectionTitle} onChange={(e) => setEditSectionTitle(e.target.value)} className="h-8 flex-1 rounded-lg border border-[#d7e5df] px-3 text-sm font-bold text-[#06201c] outline-none focus:border-[#1f6a58]" />
                    <button type="submit" className="h-8 rounded-full bg-[#1f6a58] px-3 text-xs font-bold text-white">Save</button>
                    <button type="button" onClick={() => setEditingSectionId(null)} className="h-8 rounded-full border border-[#d7e5df] px-3 text-xs font-bold text-[#52736a]">Cancel</button>
                  </form>
                ) : (
                  <>
                    <p className="text-sm font-bold text-[#06201c]">{title}</p>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => moveSectionMutation.mutate({ sectionId: id, direction: "up" })} disabled={sIndex === 0} className="rounded px-1.5 py-0.5 text-[10px] font-bold text-[#7f9d94] hover:bg-[#e8f6ee] disabled:opacity-30">↑</button>
                      <button type="button" onClick={() => moveSectionMutation.mutate({ sectionId: id, direction: "down" })} disabled={sIndex === sections.length - 1} className="rounded px-1.5 py-0.5 text-[10px] font-bold text-[#7f9d94] hover:bg-[#e8f6ee] disabled:opacity-30">↓</button>
                      <button type="button" onClick={() => { setEditingSectionId(id); setEditSectionTitle(title); }} className="rounded-full px-2 py-1 text-xs font-semibold text-[#1f6a58] hover:bg-[#e8f6ee]">Edit</button>
                      <button type="button" onClick={() => { if (window.confirm("Delete this section and its lessons?")) void deleteSectionMutation.mutate(id); }} className="rounded-full px-2 py-1 text-xs font-semibold text-[#b42318] hover:bg-[#fff6f5]">Delete</button>
                    </div>
                  </>
                )}
              </div>
              {lessons.length > 0 ? (
                <ul className="mt-3 grid gap-2">
                  {lessons.map((lesson, lIndex) => {
                    const lessonId = typeof lesson.id === "string" ? lesson.id : "";
                    const lessonTitle = typeof lesson.title === "string" ? lesson.title : "Untitled lesson";
                    return (
                      <li key={lessonId || lessonTitle} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-[#7f9d94]">{lIndex + 1}.</span>
                          <p className="text-sm text-[#52736a]">{lessonTitle}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => moveLessonMutation.mutate({ sectionId: id, lessonId, direction: "up" })} disabled={lIndex === 0} className="rounded px-1 text-[10px] font-bold text-[#7f9d94] hover:bg-[#e8f6ee] disabled:opacity-30">↑</button>
                          <button type="button" onClick={() => moveLessonMutation.mutate({ sectionId: id, lessonId, direction: "down" })} disabled={lIndex === lessons.length - 1} className="rounded px-1 text-[10px] font-bold text-[#7f9d94] hover:bg-[#e8f6ee] disabled:opacity-30">↓</button>
                          <button type="button" onClick={() => setViewingLesson(viewingLesson?.lessonId === lessonId ? null : { sectionId: id, lessonId })} className="rounded-full px-2 py-0.5 text-[10px] font-bold text-[#1f6a58] hover:bg-[#e8f6ee]">View</button>
                          <button type="button" onClick={() => { if (window.confirm("Delete this lesson?")) void deleteLessonMutation.mutate({ sectionId: id, lessonId }); }} className="text-[10px] font-semibold text-[#b42318]">Delete</button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              {viewingLesson?.sectionId === id ? (
                <LessonDetail trainingId={trainingId} sectionId={id} lessonId={viewingLesson.lessonId} onClose={() => setViewingLesson(null)} />
              ) : null}
              {lessons.length > 0 ? (
                <div className="mt-3 pl-4 border-l-2 border-[#e1ebe6]">
                  <p className="text-[10px] font-bold uppercase tracking-[.08em] text-[#7f9d94] mb-1">Topics per lesson</p>
                  {(lessons as Array<Record<string, unknown>>).map((lesson, lIndex) => {
                    const lId = typeof lesson.id === "string" ? lesson.id : String(lIndex);
                    const lTitle = typeof lesson.title === "string" ? lesson.title : `Lesson ${lIndex + 1}`;
                    return (
                      <div key={lId} className="mb-2">
                        <p className="text-[10px] font-semibold text-[#52736a]">{lTitle}</p>
                        <LessonTopics trainingId={trainingId} sectionId={id} lessonId={lId} />
                      </div>
                    );
                  })}
                </div>
              ) : null}
              <form
                className="mt-3 flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const value = sectionTitle[id]?.trim();
                  if (value) {
                    createLessonMutation.mutate({ sectionId: id, lessonTitle: value });
                    setSectionTitle((current) => ({ ...current, [id]: "" }));
                  }
                }}
              >
                <input
                  value={sectionTitle[id] ?? ""}
                  onChange={(event) => setSectionTitle((current) => ({ ...current, [id]: event.target.value }))}
                  placeholder="New lesson title"
                  className="h-9 flex-1 rounded-lg border border-[#d7e5df] bg-white px-3 text-sm outline-none focus:border-[#1f6a58]"
                />
                <button type="submit" className="h-9 rounded-full border border-[#1f6a58] px-4 text-xs font-bold text-[#1f6a58]">Add lesson</button>
              </form>
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
        <input value={newSectionTitle} onChange={(event) => setNewSectionTitle(event.target.value)} placeholder="New section title" className="h-10 flex-1 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-4 text-sm outline-none focus:border-[#1f6a58]" />
        <button type="submit" disabled={createSectionMutation.isPending} className="h-10 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white disabled:opacity-60">{createSectionMutation.isPending ? "Adding..." : "Add section"}</button>
      </form>
    </SectionCard>
  );
}

/** Renders the Training enrolments with approve/cancel actions. */
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
    onSuccess: () => { setEnrolName(""); setEnrolEmail(""); setFeedback("Enrolment submitted."); void queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "enrolments"] }); },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to enrol participant."),
  });

  const approveMutation = useMutation({
    mutationFn: (enrolId: string) => approveTrainingEnrolment(trainingId, enrolId),
    onSuccess: () => { setFeedback("Enrolment approved."); void queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "enrolments"] }); },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to approve enrolment."),
  });

  const cancelMutation = useMutation({
    mutationFn: (enrolId: string) => cancelTrainingEnrolment(trainingId, enrolId),
    onSuccess: () => { setFeedback("Enrolment cancelled."); void queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "enrolments"] }); },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to cancel enrolment."),
  });

  const enrolments = enrolmentsQuery.data ?? [];

  return (
    <SectionCard title="Enrolments">
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
            const id = typeof record.id === "string" ? record.id : String(index);
            const name = typeof record.participant_name === "string" ? record.participant_name : typeof record.name === "string" ? record.name : "Participant";
            const email = typeof record.email === "string" ? record.email : typeof record.participant_email === "string" ? record.participant_email : null;
            const status = typeof record.status === "string" ? record.status : "—";
            const enrolledAt = typeof record.enrolled_at === "string" ? record.enrolled_at : typeof record.created_at === "string" ? record.created_at : null;
            const isPending = status === "pending" || status === "awaiting_approval";
            return (
              <li key={id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#06201c]">{name}</p>
                  {email ? <p className="text-xs text-[#7f9d94]">{email}</p> : null}
                  {enrolledAt ? <p className="text-xs text-[#7f9d94]">{formatTrainingDate(enrolledAt)}</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#eef4ff] px-3 py-1 text-[11px] font-bold text-[#2563eb]">{humanizeLabel(status)}</span>
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

/** Renders the Training enrolments and orders. */
export function TrainingEnrolmentsTab({ trainingId }: { trainingId: string }) {
  return (
    <div className="grid gap-5">
      <EnrolmentsSection trainingId={trainingId} />
      <OrdersSection trainingId={trainingId} />
    </div>
  );
}

/** Renders live sessions, discussions (with create/reply), and announcements. */
export function TrainingLiveTab({ trainingId }: { trainingId: string }) {
  const queryClient = useQueryClient();
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [newSessionDate, setNewSessionDate] = useState("");
  const [newDiscussionMessage, setNewDiscussionMessage] = useState("");
  const [replyToDiscussion, setReplyToDiscussion] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [newAnnouncementTitle, setNewAnnouncementTitle] = useState("");
  const [newAnnouncementMessage, setNewAnnouncementMessage] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const liveSessionsQuery = useQuery({
    queryKey: ["trainings", trainingId, "live-sessions"],
    queryFn: () => listTrainingLiveSessions(trainingId),
    enabled: Boolean(trainingId),
  });
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

  const createLiveSessionMutation = useMutation({
    mutationFn: () => createTrainingLiveSession(trainingId, { title: newSessionTitle.trim(), scheduled_at: newSessionDate, duration_minutes: 60, meeting_link: "" }),
    onSuccess: () => { setNewSessionTitle(""); setNewSessionDate(""); setFeedback("Live session created."); void queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "live-sessions"] }); },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to create the live session."),
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
    mutationFn: ({ discussionId, message }: { discussionId: string; message: string }) => createDiscussionReply(trainingId, discussionId, { message }),
    onSuccess: () => { setReplyToDiscussion(null); setReplyMessage(""); setFeedback("Reply posted."); void queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "discussions"] }); },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to post reply."),
  });

  const createAnnouncementMutation = useMutation({
    mutationFn: () => createTrainingAnnouncement(trainingId, { title: newAnnouncementTitle.trim(), message: newAnnouncementMessage.trim(), recipient_type: "all" }),
    onSuccess: () => { setNewAnnouncementTitle(""); setNewAnnouncementMessage(""); setFeedback("Announcement sent."); void queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "announcements"] }); },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to send announcement."),
  });

  const liveSessions = liveSessionsQuery.data ?? [];
  const discussions = discussionsQuery.data ?? [];
  const announcements = announcementsQuery.data ?? [];

  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [attendeeName, setAttendeeName] = useState("");
  const [attendeeEmail, setAttendeeEmail] = useState("");

  const attendanceQuery = useQuery({
    queryKey: ["trainings", trainingId, "attendance", expandedSession],
    queryFn: () => getLiveSessionAttendance(trainingId, expandedSession!),
    enabled: Boolean(expandedSession),
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const markAttendanceMutation = useMutation({
    mutationFn: ({ sessionId, name, email }: { sessionId: string; name: string; email: string }) =>
      markLiveSessionAttendance(trainingId, sessionId, { participant_name: name, participant_email: email }),
    onSuccess: () => { setAttendeeName(""); setAttendeeEmail(""); setFeedback("Attendance marked."); void queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "attendance", expandedSession] }); },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to mark attendance."),
  });

  const exportAttendanceMutation = useMutation({
    mutationFn: (sessionId: string) => exportLiveSessionAttendance(trainingId, sessionId),
    onSuccess: (data) => {
      const url = URL.createObjectURL(data.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename || `attendance-${expandedSession}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setFeedback("Attendance exported.");
    },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to export attendance."),
  });

  const attendanceRaw = attendanceQuery.data as Record<string, unknown> | undefined;
  const attendance: Array<Record<string, unknown>> = attendanceRaw && typeof attendanceRaw === "object" && Array.isArray(attendanceRaw.attendance)
    ? (attendanceRaw.attendance as Array<Record<string, unknown>>)
    : Array.isArray(attendanceRaw)
      ? (attendanceRaw as unknown as Array<Record<string, unknown>>)
      : [];

  return (
    <div className="grid gap-5">
      {feedback ? <p role="status" className="rounded-xl border border-[#bce8d1] bg-[#effaf4] px-4 py-3 text-sm font-semibold text-[#167550]">{feedback}</p> : null}
      <SectionCard title="Live Sessions">
        {liveSessionsQuery.isLoading ? <p className="text-sm text-[#52736a]">Loading...</p> : null}
        {!liveSessionsQuery.isLoading && liveSessions.length === 0 ? <p className="text-sm text-[#52736a]">No live sessions yet.</p> : null}
        <ul className="grid gap-2">
          {liveSessions.map((session, index) => {
            const record = session as Record<string, unknown>;
            const id = typeof record.id === "string" ? record.id : String(index);
            const title = typeof record.title === "string" ? record.title : "Live session";
            const scheduledAt = typeof record.scheduled_at === "string" ? record.scheduled_at : null;
            const isExpanded = expandedSession === id;
            return (
              <li key={id} className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[#06201c]">{title}</p>
                    {scheduledAt ? <p className="text-xs text-[#52736a]">{formatTrainingDate(scheduledAt)}</p> : null}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setExpandedSession(isExpanded ? null : id)} className="rounded-full border border-[#1f6a58] px-3 py-1 text-[11px] font-bold text-[#1f6a58] hover:bg-[#e8f6ee]">
                      {isExpanded ? "Hide" : "Attendance"}
                    </button>
                    <button type="button" onClick={() => exportAttendanceMutation.mutate(id)} disabled={exportAttendanceMutation.isPending} className="rounded-full border border-[#2563eb] px-3 py-1 text-[11px] font-bold text-[#2563eb] hover:bg-[#eef4ff] disabled:opacity-60">
                      Export CSV
                    </button>
                  </div>
                </div>
                {isExpanded ? (
                  <div className="mt-4 space-y-3 border-t border-[#e1ebe6] pt-4">
                    <p className="text-xs font-bold uppercase tracking-[.08em] text-[#7f9d94]">Mark Attendance</p>
                    <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); if (attendeeName.trim()) markAttendanceMutation.mutate({ sessionId: id, name: attendeeName.trim(), email: attendeeEmail.trim() }); }}>
                      <input value={attendeeName} onChange={(e) => setAttendeeName(e.target.value)} placeholder="Participant name" className="h-9 flex-1 rounded-lg border border-[#d7e5df] bg-white px-3 text-sm outline-none focus:border-[#1f6a58]" />
                      <input value={attendeeEmail} onChange={(e) => setAttendeeEmail(e.target.value)} placeholder="Email (optional)" className="h-9 flex-1 rounded-lg border border-[#d7e5df] bg-white px-3 text-sm outline-none focus:border-[#1f6a58]" />
                      <button type="submit" disabled={markAttendanceMutation.isPending || !attendeeName.trim()} className="h-9 rounded-full bg-[#1f6a58] px-4 text-xs font-bold text-white disabled:opacity-60">{markAttendanceMutation.isPending ? "..." : "Mark"}</button>
                    </form>
                    <p className="text-xs font-bold uppercase tracking-[.08em] text-[#7f9d94]">Attendance List</p>
                    {attendanceQuery.isLoading ? <p className="text-xs text-[#52736a]">Loading...</p> : null}
                    {attendance.length === 0 && !attendanceQuery.isLoading ? <p className="text-xs text-[#52736a]">No attendance recorded yet.</p> : null}
                    {attendance.length > 0 ? (
                      <ul className="space-y-1">
                        {attendance.map((a, aIndex) => {
                          const aId = typeof a.id === "string" ? a.id : String(aIndex);
                          const email = typeof a.participant_email === "string" ? a.participant_email : typeof a.email === "string" ? a.email : null;
                          const name = typeof a.participant_name === "string" ? a.participant_name : typeof a.name === "string" ? a.name : email ?? "Participant";
                          const markedAt = typeof a.recorded_at === "string" ? a.recorded_at : typeof a.created_at === "string" ? a.created_at : typeof a.marked_at === "string" ? a.marked_at : null;
                          return (
                            <li key={aId} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2">
                              <div>
                                <p className="text-sm font-semibold text-[#06201c]">{name}</p>
                                {email ? <p className="text-xs text-[#7f9d94]">{email}</p> : null}
                              </div>
                              {markedAt ? <p className="text-xs text-[#7f9d94]">{formatTrainingDate(markedAt)}</p> : null}
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); if (newSessionTitle.trim() && newSessionDate) createLiveSessionMutation.mutate(); }}>
          <input value={newSessionTitle} onChange={(e) => setNewSessionTitle(e.target.value)} placeholder="Session title" className="h-10 flex-1 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-4 text-sm outline-none focus:border-[#1f6a58]" />
          <input type="datetime-local" value={newSessionDate} onChange={(e) => setNewSessionDate(e.target.value)} className="h-10 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-4 text-sm outline-none focus:border-[#1f6a58]" />
          <button type="submit" disabled={createLiveSessionMutation.isPending || !newSessionTitle.trim() || !newSessionDate} className="h-10 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white disabled:opacity-60">{createLiveSessionMutation.isPending ? "Adding..." : "Add session"}</button>
        </form>
      </SectionCard>
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
            const replies: Array<Record<string, unknown>> = Array.isArray(record.replies) ? record.replies : [];
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
                      const rMessage = typeof reply.message === "string" ? reply.message : "Reply";
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
                  <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (replyMessage.trim()) replyMutation.mutate({ discussionId: id, message: replyMessage.trim() }); }}>
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
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [participantEmail, setParticipantEmail] = useState<string>("");

  const enrolmentsQuery = useQuery({
    queryKey: ["trainings", trainingId, "enrolments"],
    queryFn: () => listTrainingEnrolments(trainingId),
    enabled: Boolean(trainingId),
    staleTime: 30_000,
  });
  const enrolments = enrolmentsQuery.data ?? ([] as Array<Record<string, unknown>>);

  const contentQuery = useQuery({
    queryKey: ["trainings", trainingId, "content"],
    queryFn: () => getTrainingContent(trainingId, true),
    enabled: Boolean(trainingId),
    staleTime: 30_000,
  });

  const progressQuery = useQuery({
    queryKey: ["trainings", trainingId, "progress"],
    queryFn: () => getTrainingProgress(trainingId),
    enabled: Boolean(trainingId),
    staleTime: 30_000,
  });

  const completeLessonMutation = useMutation({
    mutationFn: ({ lessonId, sectionId, participantEmail }: { lessonId: string; sectionId?: string; participantEmail?: string }) =>
      completeTrainingLesson(trainingId, {
        lesson_id: lessonId,
        section_id: sectionId ?? null,
        ...(participantEmail?.trim() ? { participant_email: participantEmail.trim() } : {}),
      }),
    onSuccess: () => {
      setFeedback({ kind: "success", text: "Lesson marked as complete." });
      void queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "progress"] });
      void queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "content"] });
    },
    onError: (error) => setFeedback({ kind: "error", text: error instanceof TrainingsApiError ? error.message : "Unable to mark lesson as complete." }),
  });

  if (contentQuery.isLoading) return <p className="text-sm text-[#52736a]">Loading content...</p>;
  if (contentQuery.isError) return <p className="text-sm font-semibold text-[#b42318]">{(contentQuery.error as Error).message}</p>;

  const canCompleteFor = (
    Array.isArray(enrolments) &&
    enrolments.some(
      (raw): raw is Record<string, unknown> =>
        !!raw &&
        typeof (raw as Record<string, unknown>).participant_email === "string" &&
        String((raw as Record<string, unknown>).participant_email).trim().length > 0,
    )
  );
  const participantPickerId = `mark-for-${trainingId}`;

  const content = contentQuery.data;
  const sections: Array<Record<string, unknown>> = Array.isArray(content)
    ? (content as Array<Record<string, unknown>>)
    : content && typeof content === "object" && Array.isArray((content as Record<string, unknown>).sections)
      ? ((content as Record<string, unknown>).sections as Array<Record<string, unknown>>)
      : [];

  const progress = progressQuery.data as Record<string, unknown> | undefined;
  const completedLessons: Set<string> = new Set();
  if (progress && typeof progress === "object") {
    if (Array.isArray(progress.lessons_detail)) {
      for (const raw of progress.lessons_detail) {
        if (!raw || typeof raw !== "object") continue;
        const detail = raw as Record<string, unknown>;
        if (detail.is_completed === true && typeof detail.lesson_id === "string") completedLessons.add(detail.lesson_id);
      }
    }
    if (Array.isArray(progress.completed_lessons)) {
      for (const lessonId of progress.completed_lessons) {
        if (typeof lessonId === "string") completedLessons.add(lessonId);
      }
    }
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">        <section className="rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-[#06201c]">Training Content</h3>
        {feedback ? (
          <p role={feedback.kind === "error" ? "alert" : "status"} className={feedback.kind === "error" ? "mt-4 rounded-xl border border-[#f3c2c0] bg-[#fff4f2] px-4 py-3 text-sm font-semibold text-[#b42318]" : "mt-4 rounded-xl border border-[#bce8d1] bg-[#effaf4] px-4 py-3 text-sm font-semibold text-[#167550]"}>{feedback.text}</p>
        ) : null}
        {sections.length === 0 ? <p className="mt-4 text-sm text-[#52736a]">No content available yet.</p> : null}              {canCompleteFor && participantEmail.trim().length > 0 ? (
                <p className="mt-4 rounded-lg bg-[#effaf4] px-3 py-2 text-xs text-[#1f6a58]">
                  Marking completion for <span className="font-semibold">{participantEmail.trim()}</span>.
                  Change it above to record progress for a different participant.
                </p>
              ) : null}
              <label htmlFor={participantPickerId} className={`mt-4 block text-sm font-semibold ${canCompleteFor ? 'text-[#06201c]' : 'text-[#52736a]'}`}>
                Mark completion as:
                {canCompleteFor ? (
                  <span className="block mt-1 text-xs text-[#52736a]">
                    Enter the enrolled participant's email to record their progress (leave empty to use your own account).
                  </span>
                ) : (
                  <span className="block mt-1 text-xs text-[#7f9d94]">
                    This training has no enrolments with emails; completion is recorded against your own account.
                  </span>
                )}
              </label>
              <input
                id={participantPickerId}
                type="email"
                value={participantEmail}
                onChange={(e) => setParticipantEmail(e.target.value)}
                placeholder={canCompleteFor ? "enrolled participant email (optional)" : "your email (no enrolments)"}
                disabled={!canCompleteFor}
                className={`mt-1.5 h-10 w-full rounded-xl border border-[#d7e5df] bg-white px-3 text-sm text-[#06201c] outline-none focus:border-[#1f6a58] focus:ring-2 focus:ring-[#1f6a58]/20 ${!canCompleteFor ? 'opacity-60' : ''}`}
              />
              <ul className="mt-4 space-y-4">
          {sections.map((section, sIndex) => {
            const sectionId = typeof section.id === "string" ? section.id : String(sIndex);
            const sectionTitle = typeof section.title === "string" ? section.title : "Untitled section";
            const lessons: Array<Record<string, unknown>> = Array.isArray(section.lessons) ? section.lessons : [];
            return (
              <li key={sectionId} className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-4">
                <p className="text-sm font-bold text-[#06201c]">{sectionTitle}</p>
                {lessons.length === 0 ? <p className="mt-2 text-xs text-[#7f9d94]">No lessons in this section.</p> : null}
                <ul className="mt-2 space-y-2">
                  {lessons.map((lesson, lIndex) => {
                    const lessonId = typeof lesson.id === "string" ? lesson.id : `${sectionId}-${lIndex}`;
                    const lessonTitle = typeof lesson.title === "string" ? lesson.title : "Untitled lesson";
                    const lessonContent = typeof lesson.content === "string" ? lesson.content : null;
                    const videoUrl = typeof lesson.video_url === "string" ? lesson.video_url : null;
                    const isExpanded = expandedLesson === lessonId;
                    const isCompleted = completedLessons.has(lessonId);
                    return (
                      <li key={lessonId} className="rounded-lg bg-white p-3">
                        <div className="flex items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => setExpandedLesson(isExpanded ? null : lessonId)}
                            className="flex-1 text-left"
                          >
                            <div className="flex items-center gap-2">
                              {isCompleted ? (
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1f6a58] text-xs text-white">✓</span>
                              ) : (
                                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#d7e5df] text-xs text-[#7f9d94]">{lIndex + 1}</span>
                              )}
                              <p className="text-sm font-semibold text-[#06201c]">{lessonTitle}</p>
                            </div>
                          </button>
                          {!isCompleted ? (
                            <button
                              type="button"
                              onClick={() => completeLessonMutation.mutate({ lessonId, sectionId, participantEmail: participantEmail || undefined })}
                              disabled={completeLessonMutation.isPending}
                              className="rounded-full border border-[#1f6a58] px-3 py-1 text-xs font-bold text-[#1f6a58] hover:bg-[#e8f6ee] disabled:opacity-60"
                            >
                              {completeLessonMutation.isPending ? "..." : "Complete"}
                            </button>
                          ) : (
                            <span className="text-xs font-bold text-[#16825b]">Completed</span>
                          )}
                        </div>
                        {isExpanded ? (
                          <div className="mt-3 space-y-3 pl-7">
                            {videoUrl ? (
                              <div>
                                <p className="text-xs font-bold uppercase tracking-[.08em] text-[#7f9d94]">Video</p>
                                <a href={videoUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-semibold text-[#1f6a58] underline">Watch video →</a>
                              </div>
                            ) : null}
                            {lessonContent ? (
                              <div>
                                <p className="text-xs font-bold uppercase tracking-[.08em] text-[#7f9d94]">Content</p>
                                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#52736a]">{lessonContent}</p>
                              </div>
                            ) : null}
                            {!videoUrl && !lessonContent ? (
                              <p className="text-xs text-[#7f9d94]">No content for this lesson yet.</p>
                            ) : null}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      </section>
      <aside className="space-y-5">
        <section className="rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Progress</p>
          {progressQuery.isLoading ? <p className="mt-2 text-sm text-[#52736a]">Loading...</p> : <ProgressSummaryCard data={progressQuery.data} />}
        </section>
      </aside>
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
  const score = typeof review.score === "number" ? review.score : null;
  const passed = typeof review.passed === "boolean" ? review.passed : null;
  const feedback = typeof review.feedback === "string" ? review.feedback : typeof review.review === "string" ? review.review : null;
  const answers = Array.isArray(review.answers) ? review.answers : [];

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
            const answer = typeof a.answer === "string" ? a.answer : typeof a.user_answer === "string" ? a.user_answer : "";
            const correct = typeof a.correct === "boolean" ? a.correct : typeof a.is_correct === "boolean" ? a.is_correct : null;
            return (
              <li key={aIndex} className="rounded-lg bg-white p-2">
                <p className="text-xs font-semibold text-[#06201c]">{qText}</p>
                <p className="text-xs text-[#52736a]">Answer: {answer}</p>
                {correct !== null ? <p className={`text-[10px] font-bold ${correct ? "text-[#167550]" : "text-[#b42318]"}`}>{correct ? "✓ Correct" : "✗ Incorrect"}</p> : null}
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
  const [newTitle, setNewTitle] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [expandedAssessment, setExpandedAssessment] = useState<string | null>(null);
  const [newQuestion, setNewQuestion] = useState("");
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

  const createMutation = useMutation({
    mutationFn: () => createTrainingAssessment(trainingId, { title: newTitle.trim(), type: "quiz" }),
    onSuccess: () => { setNewTitle(""); setFeedback("Assessment created."); void queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "assessments"] }); },
    onError: (error) => setFeedback(error instanceof TrainingsApiError ? error.message : "Unable to create assessment."),
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
      addAssessmentQuestions(trainingId, assessmentId, { question_text: question, question_type: "short_answer" }),
    onSuccess: () => { setNewQuestion(""); setFeedback("Question added."); void queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "assessments"] }); },
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

  return (
    <SectionCard
      title="Assessments"
      action={
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (newTitle.trim()) createMutation.mutate(); }}>
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="New assessment title" className="h-9 flex-1 rounded-lg border border-[#d7e5df] bg-white px-3 text-sm outline-none focus:border-[#1f6a58]" />
          <button type="submit" disabled={createMutation.isPending || !newTitle.trim()} className="h-9 rounded-full bg-[#1f6a58] px-4 text-xs font-bold text-white disabled:opacity-60">{createMutation.isPending ? "Adding..." : "Add"}</button>
        </form>
      }
    >
      {feedback ? <p role="status" className="mb-4 rounded-xl border border-[#bce8d1] bg-[#effaf4] px-4 py-3 text-sm font-semibold text-[#167550]">{feedback}</p> : null}
      {assessmentsQuery.isLoading ? <p className="text-sm text-[#52736a]">Loading...</p> : null}
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
                <button type="button" onClick={() => setExpandedAssessment(isExpanded ? null : id)} className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <form className="flex flex-1 gap-2" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); if (editAssessmentTitle.trim()) updateAssessmentMutation.mutate({ assessmentId: id, title: editAssessmentTitle.trim() }); }}>
                        <input value={editAssessmentTitle} onChange={(e) => setEditAssessmentTitle(e.target.value)} className="h-8 flex-1 rounded-lg border border-[#d7e5df] px-3 text-sm font-bold text-[#06201c] outline-none focus:border-[#1f6a58]" />
                        <button type="submit" className="h-8 rounded-full bg-[#1f6a58] px-3 text-xs font-bold text-white">Save</button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setEditingAssessmentId(null); }} className="h-8 rounded-full border border-[#d7e5df] px-3 text-xs font-bold text-[#52736a]">Cancel</button>
                      </form>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-[#06201c]">{title}</p>
                        {type ? <span className="rounded-full bg-[#eef4ff] px-2 py-0.5 text-[10px] font-bold text-[#2563eb]">{type}</span> : null}
                        <span className="text-xs text-[#7f9d94]">{questions.length} questions</span>
                      </>
                    )}
                  </div>
                </button>
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
                        return (
                          <li key={qId} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2">
                            <p className="text-sm text-[#52736a]">{qIndex + 1}. {qText}</p>
                            <button type="button" onClick={() => { if (window.confirm("Delete this question?")) deleteQuestionMutation.mutate({ assessmentId: id, questionId: qId }); }} className="shrink-0 text-[10px] font-semibold text-[#b42318]">Delete</button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : <p className="text-xs text-[#7f9d94]">No questions yet.</p>}
                  <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (newQuestion.trim()) addQuestionMutation.mutate({ assessmentId: id, question: newQuestion.trim() }); }}>
                    <input value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} placeholder="New question" className="h-8 flex-1 rounded-lg border border-[#d7e5df] bg-white px-3 text-xs outline-none focus:border-[#1f6a58]" />
                    <button type="submit" disabled={addQuestionMutation.isPending || !newQuestion.trim()} className="h-8 rounded-full border border-[#1f6a58] px-3 text-[10px] font-bold text-[#1f6a58] disabled:opacity-60">Add</button>
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
    mutationFn: () => createTrainingAssignment(trainingId, { title: newTitle.trim() }),
    onSuccess: () => { setNewTitle(""); setFeedback("Assignment created."); void queryClient.invalidateQueries({ queryKey: ["trainings", trainingId, "assignments"] }); },
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
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (newTitle.trim()) createMutation.mutate(); }}>
        <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="New assignment title" className="h-10 flex-1 rounded-xl border border-[#d7e5df] bg-[#f9fcfa] px-4 text-sm outline-none focus:border-[#1f6a58]" />
        <button type="submit" disabled={createMutation.isPending || !newTitle.trim()} className="h-10 rounded-full bg-[#1f6a58] px-5 text-sm font-bold text-white disabled:opacity-60">{createMutation.isPending ? "Adding..." : "Add"}</button>
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
            const dueDate = typeof record.due_date === "string" ? record.due_date : null;
            const submissions = Array.isArray(record.submissions) ? record.submissions : [];
            const isSubmitting = submittingAssignment === id;
            const isGrading = gradingSubmission?.assignmentId === id;
            return (
              <li key={id} className="rounded-xl border border-[#e1ebe6] bg-[#f9fcfa] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[#06201c]">{title}</p>
                    {dueDate ? <p className="text-xs text-[#7f9d94]">Due: {formatTrainingDate(dueDate)}</p> : null}
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