import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getAssessmentSubmissionReview,
  gradeAssessmentSubmission,
  listTrainingAssessmentSubmissions,
} from "./trainings.service";

describe("assessment submission API integration", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("normalizes the confirmed submission contract and sends filters and ordering", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const requestUrl = String(input);
      expect(requestUrl).toContain("/trainings/training-1/assessments/assessment-1/submissions?");
      expect(requestUrl).toContain("status=pending");
      expect(requestUrl).toContain("search=Jane");
      expect(requestUrl).toContain("order=oldest");
      return new Response(JSON.stringify({
        assessment_id: "assessment-1",
        assessment_title: "Module Quiz",
        items: [{
          submission_id: "submission-1",
          attempt_id: "attempt-1",
          learner_name: "Jane Doe",
          learner_email: "jane@example.com",
          attempt_number: 2,
          status: "pending",
          needs_manual_grading: true,
          score: 4,
          total_points: 10,
          score_percent: null,
          passed: null,
          submitted_at: "2026-10-28T09:30:00Z",
          is_legacy: false,
        }],
        pagination: { total: 3, page: 1, page_size: 20, total_pages: 1 },
        status_counts: { all: 3, pending: 2, evaluated: 1 },
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await listTrainingAssessmentSubmissions("training-1", "assessment-1", {
      page: 1,
      page_size: 20,
      status: "pending",
      search: "Jane",
      order: "oldest",
    });

    expect(result.assessment_title).toBe("Module Quiz");
    expect(result.items[0]).toMatchObject({
      id: "submission-1",
      attempt_id: "attempt-1",
      participant_name: "Jane Doe",
      participant_email: "jane@example.com",
      needs_manual: true,
      score: 4,
      total_points: 10,
    });
    expect(result.status_counts).toEqual({ all: 3, pending: 2, evaluated: 1 });
    expect(result.total_pages).toBe(1);
  });

  it("accepts an empty response without losing pagination or count state", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      assessment_id: "assessment-1",
      assessment_title: "Module Quiz",
      items: [],
      pagination: { total: 0, page: 1, page_size: 20, total_pages: 0 },
      status_counts: { all: 0, pending: 0, evaluated: 0 },
    }), { status: 200, headers: { "Content-Type": "application/json" } })));

    const result = await listTrainingAssessmentSubmissions("training-1", "assessment-1");

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.status_counts).toEqual({ all: 0, pending: 0, evaluated: 0 });
  });

  it("loads wrapped review data and preserves false answers and numeric string scores", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ data: {
      submission_id: "submission-1",
      assessment_id: "assessment-1",
      status: "pending",
      score: "4",
      total_points: "10",
      review: [
        { question_id: "q1", question_text: "Is the statement true?", question_type: "true_false", given: false, correct: false, points: "2", points_awarded: "2" },
        { question_id: "q2", question_text: "Explain your reasoning.", question_type: "essay", given: "A written response", correct: null, points: "8" },
      ],
    } }), { status: 200, headers: { "Content-Type": "application/json" } })));

    const result = await getAssessmentSubmissionReview("training-1", "assessment-1", "submission-1");

    expect(result).toMatchObject({ status: "pending", score: 4, total_points: 10 });
    expect(result.review[0]).toMatchObject({ given: false, correct: false, points: 2, points_awarded: 2, needs_manual: false });
    expect(result.review[1]).toMatchObject({ given: "A written response", correct: null, points: 8, needs_manual: true });
  });

  it("submits an overall grade and normalizes the wrapped grade result", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.method).toBe("POST");
      expect(JSON.parse(String(init?.body))).toEqual({ score: 9, feedback: "Clear explanation." });
      return new Response(JSON.stringify({ data: {
        submission_id: "submission-1",
        status: "evaluated",
        final_score: "9",
        total_points: "10",
        score_percent: "90",
        passed: true,
        feedback: "Clear explanation.",
      } }), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await gradeAssessmentSubmission("training-1", "assessment-1", "submission-1", { score: 9, feedback: "Clear explanation." });

    expect(result).toMatchObject({ status: "evaluated", final_score: 9, total_points: 10, score_percent: 90, passed: true });
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
