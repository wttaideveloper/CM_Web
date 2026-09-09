"use client";

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

type SectionProgressRow = { title: string; done: number | null; total: number | null };

/** Friendly progress summary for the training/program overview sidebar. Never renders raw JSON. */
export default function ProgressSummaryCard({ data }: { data: unknown }) {
  if (!data || typeof data !== "object") {
    return <p className="mt-2 text-sm text-[#52736a]">No progress data yet.</p>;
  }

  const record = data as Record<string, unknown>;

  const overallPercent = asNumber(record.overall_percent) ?? asNumber(record.percentage) ?? asNumber(record.progress_percent);
  const lessonsDone = asNumber(record.lessons_done);
  const totalLessons = asNumber(record.total_lessons);
  const sectionsDone = asNumber(record.sections_done);
  const totalSections = asNumber(record.total_sections);
  const status = typeof record.status === "string" && record.status.trim() ? record.status : null;
  const expired = record.expired === true;

  const derivedPercent =
    overallPercent ??
    (lessonsDone !== null && totalLessons !== null && totalLessons > 0 ? (lessonsDone / totalLessons) * 100 : null) ??
    (sectionsDone !== null && totalSections !== null && totalSections > 0 ? (sectionsDone / totalSections) * 100 : null);

  const sectionRows: SectionProgressRow[] = [];
  if (Array.isArray(record.sections_detail)) {
    for (const raw of record.sections_detail) {
      if (!raw || typeof raw !== "object") continue;
      const row = raw as Record<string, unknown>;
      sectionRows.push({
        title: typeof row.section_title === "string" && row.section_title.trim() ? row.section_title : "Section",
        done: asNumber(row.lessons_done),
        total: asNumber(row.total_lessons),
      });
    }
  }

  const empty = overallPercent === null && lessonsDone === null && sectionsDone === null && sectionRows.length === 0 && !status && !expired;
  if (empty) {
    return <p className="mt-2 text-sm text-[#52736a]">No progress data yet.</p>;
  }

  return (
    <div className="mt-3 space-y-4 text-sm text-[#52736a]">
      {derivedPercent !== null ? (
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-2xl font-bold text-[#06201c]">{Math.round(derivedPercent)}%</p>
            <p className="text-xs text-[#7f9d94]">complete</p>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#e1ebe6]">
            <div className="h-full rounded-full bg-[#1f6a58] transition-all" style={{ width: `${clampPercent(derivedPercent)}%` }} />
          </div>
        </div>
      ) : null}
      {status || expired ? (
        <p className="inline-block rounded-full bg-[#e9f4ee] px-3 py-1 text-xs font-bold text-[#1f6a58]">
          {status ? status.replaceAll("_", " ") : "Enrolment"}{expired ? " · expired" : ""}
        </p>
      ) : null}
      {lessonsDone !== null || sectionsDone !== null ? (
        <div className="grid gap-3">
          {lessonsDone !== null && totalLessons !== null ? (
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Lessons</p>
              <p className="mt-1 font-semibold text-[#06201c]">{lessonsDone} of {totalLessons} completed</p>
            </div>
          ) : null}
          {sectionsDone !== null && totalSections !== null ? (
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">Sections</p>
              <p className="mt-1 font-semibold text-[#06201c]">{sectionsDone} of {totalSections} completed</p>
            </div>
          ) : null}
        </div>
      ) : null}
      {sectionRows.length > 0 ? (
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7f9d94]">By section</p>
          <ul className="mt-2 space-y-1.5">
            {sectionRows.map((section, index) => (
              <li key={`${section.title}-${index}`} className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-xs font-semibold text-[#06201c]">{section.title}</span>
                {section.done !== null && section.total !== null ? (
                  <span className="shrink-0 text-xs text-[#52736a]">{section.done}/{section.total}</span>
                ) : (
                  <span className="shrink-0 text-xs text-[#7f9d94]">—</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
