import { redirect } from "next/navigation";

type DiscussionRouteProps = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstQueryValue(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

/** Redirects the legacy flagged Event discussion URL to the canonical Enterprise Admin route. */
export default async function LegacyFlaggedEventDiscussionPage({ params, searchParams }: DiscussionRouteProps) {
  const { eventId } = await params;
  const query = await searchParams;
  const messageId = firstQueryValue(query.message_id) ?? firstQueryValue(query.messageId) ?? firstQueryValue(query.message);
  const replyId = firstQueryValue(query.reply_id) ?? firstQueryValue(query.replyId) ?? firstQueryValue(query.reply);
  const target = new URLSearchParams({ tab: "discussion" });

  if (messageId) target.set("message_id", messageId);
  if (replyId) target.set("reply_id", replyId);
  target.set("flagged", "true");

  redirect(`/admin/events/${encodeURIComponent(eventId)}?${target.toString()}`);
}