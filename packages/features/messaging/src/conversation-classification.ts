export type ConversationClassification = {
  conversation_type?: string | null;
  group_kind?: string | null;
};

/**
 * Direct Chat remains compatible with legacy records that do not carry a
 * classification. Only an explicitly classified Group Chat is excluded.
 */
export function isDirectChatConversation(
  conversation: ConversationClassification | null | undefined,
): boolean {
  return conversation?.conversation_type?.trim().toLowerCase() !== "group";
}

export function filterDirectChatConversations<T extends ConversationClassification>(
  conversations: readonly T[],
): T[] {
  return conversations.filter(isDirectChatConversation);
}

export function isKnownDirectChatConversationId(
  conversationId: string,
  conversations: readonly (ConversationClassification & { id: string })[],
): boolean {
  const conversation = conversations.find((item) => item.id === conversationId);
  return !conversation || isDirectChatConversation(conversation);
}
