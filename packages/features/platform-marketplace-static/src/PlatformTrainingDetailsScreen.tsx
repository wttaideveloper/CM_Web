"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";

import { getTrainingById } from "@ihp/enterprise-trainings";
import type { TrainingDetail } from "@ihp/enterprise-trainings";

function displayValue(value: string | null | undefined): string {
  return typeof value === "string" && value.trim() ? value.trim() : "Not provided";
}

function formatDate(value: string | null | undefined): string {
  if (!value || !Number.isFinite(Date.parse(value))) return "Not provided";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

function humanize(value: string | null | undefined): string {
  return displayValue(value).replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-[#06201c]">{value}</dd>
    </div>
  );
}

function getLearningObjectives(training: TrainingDetail): string[] {
  return Array.isArray(training.learning_objectives)
    ? training.learning_objectives.filter((objective): objective is string => typeof objective === "string" && objective.trim().length > 0)
    : [];
}

function getFaqValue(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  const question = typeof record.question === "string" ? record.question : typeof record.q === "string" ? record.q : "";
  const answer = typeof record.answer === "string" ? record.answer : typeof record.a === "string" ? record.a : "";
  return question && answer ? `${question}: ${answer}` : question || answer;
}

/** Renders the participant-facing Training information from an authenticated marketplace response. */
export default function PlatformTrainingDetailsScreen() {
  const { trainingId } = useParams<{ trainingId: string }>();
  const trainingQuery = useQuery({
    queryKey: ["trainings", "platform-detail", trainingId],
    queryFn: () => getTrainingById(trainingId),
    enabled: Boolean(trainingId),
    staleTime: 30_000,
    retry: 1,
  });

  if (trainingQuery.isLoading) {
    return <div className="rounded-2xl border border-[#e1ebe6] bg-white p-10 text-center" aria-live="polite">Loading training...</div>;
  }

  if (trainingQuery.isError || !trainingQuery.data) {
    return (
      <div className="rounded-2xl border border-[#f3d5d1] bg-[#fff7f6] p-10 text-center" role="alert">
        <p className="font-bold text-[#b42318]">Unable to load this training.</p>
        <p className="mt-2 text-sm text-[#6b5a52]">{trainingQuery.error instanceof Error ? trainingQuery.error.message : "The training may no longer be available."}</p>
        <Link href="/trainings" className="mt-5 inline-flex rounded-full bg-[#1f6a58] px-5 py-2.5 text-sm font-bold text-white">Back to trainings</Link>
      </div>
    );
  }

  const training = trainingQuery.data;
  const objectives = getLearningObjectives(training);
  const faqs = Array.isArray(training.faqs) ? training.faqs.map(getFaqValue).filter(Boolean) : [];
  const instructorName = training.instructor?.name ?? training.instructor_name;

  return (
    <div className="w-full">
      <Link href="/trainings" className="text-sm font-semibold text-[#1f6a58] hover:underline">Back to trainings</Link>
      <article className="mt-4 overflow-hidden rounded-2xl border border-[#e1ebe6] bg-white shadow-sm">
        {training.primary_image ? <img src={training.primary_image} alt="" className="h-56 w-full object-cover sm:h-72" /> : null}
        <div className="p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">{displayValue(training.category)}</p>
          <h1 className="mt-2 text-3xl font-bold text-[#06201c]">{training.title}</h1>
          {training.subtitle ? <p className="mt-2 text-lg text-[#52736a]">{training.subtitle}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#e8f6ee] px-3 py-1 text-xs font-bold text-[#1f6a58]">{humanize(training.status)}</span>
            <span className="rounded-full bg-[#f0f3f2] px-3 py-1 text-xs font-bold text-[#52736a]">{humanize(training.delivery_mode)}</span>
          </div>

          <dl className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <DetailItem label="Course type" value={humanize(training.course_type)} />
            <DetailItem label="Starts" value={formatDate(training.start_date)} />
            <DetailItem label="Ends" value={formatDate(training.end_date)} />
            <DetailItem label="Instructor" value={displayValue(instructorName)} />
            <DetailItem label="Venue" value={displayValue(training.venue)} />
            <DetailItem label="Price" value={training.price ? `${training.price} ${training.currency ?? ""}`.trim() : "Not provided"} />
            <DetailItem label="Capacity" value={displayValue(training.capacity)} />
            <DetailItem label="Difficulty" value={displayValue(training.difficulty_level)} />
          </dl>

          <section className="mt-8">
            <h2 className="text-xl font-bold text-[#06201c]">About this training</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#52736a]">{displayValue(training.description)}</p>
          </section>

          {objectives.length > 0 ? (
            <section className="mt-8">
              <h2 className="text-xl font-bold text-[#06201c]">Learning objectives</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[#52736a]">
                {objectives.map((objective) => <li key={objective}>{objective}</li>)}
              </ul>
            </section>
          ) : null}

          {training.requirements ? (
            <section className="mt-8">
              <h2 className="text-xl font-bold text-[#06201c]">Requirements</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#52736a]">{training.requirements}</p>
            </section>
          ) : null}

          {faqs.length > 0 ? (
            <section className="mt-8">
              <h2 className="text-xl font-bold text-[#06201c]">Frequently asked questions</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-[#52736a]">{faqs.map((faq) => <li key={faq} className="rounded-xl bg-[#f9fcfa] p-4">{faq}</li>)}</ul>
            </section>
          ) : null}
        </div>
      </article>
    </div>
  );
}
