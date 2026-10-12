/** Returns true when the API has redacted a meeting link instead of returning its URL. */
export function isProtectedMeetingLink(value: unknown): boolean {
  return typeof value === "string" && value.trim().toLowerCase() === "protected";
}

/** Returns true when a redacted link would be retained, cleared, or submitted as the redaction marker. */
export function isUnsafeProtectedMeetingLinkEdit(original: unknown, next: unknown): boolean {
  if (!isProtectedMeetingLink(original)) return false;
  const normalizedNext = typeof next === "string" ? next.trim() : "";
  return !normalizedNext || isProtectedMeetingLink(normalizedNext);
}

export type MeetingLinkRecord = {
  id?: string | null;
  meeting_link?: string | null;
};

/** Returns true when an existing protected Session would be cleared or left redacted in an update. */
export function hasUnsafeProtectedSessionMeetingLinkEdit(
  currentSessions: readonly MeetingLinkRecord[],
  initialSessions: readonly MeetingLinkRecord[],
): boolean {
  const initialById = new Map(
    initialSessions.flatMap((session) => session.id ? [[session.id, session] as const] : []),
  );
  return currentSessions.some((session) => {
    const initialSession = session.id ? initialById.get(session.id) : undefined;
    return initialSession !== undefined && isUnsafeProtectedMeetingLinkEdit(initialSession.meeting_link, session.meeting_link);
  });
}
