/** A lesson that can be assigned attendance in a Training session. */
export interface TrainingLessonAttendanceItem {
  id: string;
  title: string;
  type: string;
  number: number;
}

/** A Training session and its identifiable lessons, preserving source order. */
export interface TrainingLessonAttendanceSession {
  id: string;
  title: string;
  number: number;
  lessons: TrainingLessonAttendanceItem[];
}

/** Extracts sessions and lessons of every type from Training Sessions & Lessons. */
export function getTrainingLessonAttendanceSessions(sections: unknown[]): TrainingLessonAttendanceSession[] {
  const items: TrainingLessonAttendanceSession[] = [];
  sections.forEach((value, sessionIndex) => {
    const section = asRecord(value);
    if (!section) return;
    const sectionId = getString(section, "id");
    if (!sectionId || !Array.isArray(section.lessons)) return;
    const lessons = section.lessons.flatMap((lessonValue, lessonIndex) => {
      const lesson = asRecord(lessonValue);
      if (!lesson) return [];
      const id = getString(lesson, "id");
      if (!id) return [];
      return [{
        id,
        title: getString(lesson, "title") ?? "Untitled lesson",
        type: getString(lesson, "type") ?? "Lesson",
        number: lessonIndex + 1,
      }];
    });
    if (lessons.length === 0) return;
    items.push({
      id: sectionId,
      title: getString(section, "title") ?? `Session ${sessionIndex + 1}`,
      number: sessionIndex + 1,
      lessons,
    });
  });
  return items;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function getString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
