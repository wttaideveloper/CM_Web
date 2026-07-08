"use client";

import AppShell from "@/components/layout/AppShell";
import {
  deleteMessage,
  getConversationById,
  getConversationMessages,
  getTypingUsers,
  getProviderConversations,
  markConversationRead,
  editMessage,
  uploadAttachment,
  sendMessage,
  updateTypingStatus,
} from "@/services/chat.service";
import { createChatSocket, type ChatSocket } from "@/services/chat-socket.service";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

type ChatStatus = "ACTIVE" | "READ_ONLY" | "CLOSED";
type LimitReason = "CHAT_WINDOW_CLOSED" | "FREE_LIMIT_REACHED" | "BOOKING_REQUIRED";
type FilterKind = "ALL" | "UNREAD" | "CLOSED";

type Conversation = {
  id: string;
  userName: string;
  serviceName: string;
  doctorName: string;
  enterpriseName: string;
  status: ChatStatus;
  canSendMessage: boolean;
  limitReason?: LimitReason;
  unreadCount: number;
  lastMessage: string;
  lastMessagePreview?: string;
  last_message_preview?: string;
  lastMessageAt: string;
  chatCloseAt?: string;
};

type ChatMessage = {
  id: string;
  conversationId: string;
  text: string;
  createdAt: string;
  isMine: boolean;
  messageType?: string;
  deliveryState?: "sent" | "read";
  isEdited?: boolean;
  editedAt?: string;
  isDeleted?: boolean;
  isPending?: boolean;
  readByUserIds?: string[];
  readAt?: string;
  attachmentName?: string;
};

type BackendConversation = {
  id: string;
  status?: string;
  conversation_type?: string;
  subject?: string;
  last_message_at?: string;
  last_message_preview?: string;
  unread_count?: number;
  assigned_provider_id?: string;
  updated_at?: string;
  participants?: unknown;
  is_read_only?: boolean;
  expires_at?: string;
};

type BackendMessage = {
  id: string;
  _id?: string;
  conversation_id: string;
  sender_id?: string;
  content?: string;
  message_type?: string;
  attachment_id?: string | null;
  is_deleted?: boolean;
  is_edited?: boolean;
  edited_at?: string;
  created_at?: string;
  read_by?: unknown;
};

type BackendAttachment = {
  id?: string;
  attachment_id?: string;
  file_name?: string;
  filename?: string;
  attachment_type?: string;
  download_url?: string;
};

const DEV_CHAT_USER_ID = "550e8400-e29b-41d4-a716-446655440020"; // TODO: replace with the real logged-in user id later.
const emojiOptions = ["😀", "😊", "👍", "🙏", "❤️", "👋", "✅", "🩺", "💬", "📎"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractListResponse<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (isRecord(value)) {
    if (Array.isArray(value.items)) {
      return value.items as T[];
    }

    if (Array.isArray(value.data)) {
      return value.data as T[];
    }
  }

  return [];
}

function extractObjectResponse<T>(value: unknown): T | null {
  if (isRecord(value)) {
    if (isRecord(value.data)) {
      return value.data as T;
    }

    if (isRecord(value.item)) {
      return value.item as T;
    }

    return value as T;
  }

  return null;
}

function firstString(...values: Array<unknown>): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function normalizeStatus(value?: string, isReadOnly?: boolean): ChatStatus {
  const normalized = value?.toUpperCase();

  if (normalized === "CLOSED") {
    return "CLOSED";
  }

  if (normalized === "READ_ONLY" || isReadOnly) {
    return "READ_ONLY";
  }

  return "ACTIVE";
}

function shortenIdentifier(value?: string) {
  if (!value) {
    return undefined;
  }

  return value.length > 10 ? `${value.slice(0, 8)}…` : value;
}

function getParticipantDisplayName(participants: unknown, roleMatchers: string[]) {
  if (!Array.isArray(participants)) {
    return undefined;
  }

  for (const participant of participants) {
    if (!isRecord(participant)) {
      continue;
    }

    const roleCandidates = [
      participant.role,
      participant.type,
      participant.participant_type,
      participant.kind,
    ]
      .filter((candidate): candidate is string => typeof candidate === "string")
      .map((candidate) => candidate.toLowerCase());

    const roleMatches = roleCandidates.some((candidate) =>
      roleMatchers.some((matcher) => candidate.includes(matcher)),
    );

    if (!roleMatches) {
      continue;
    }

    const displayName = firstString(
      participant.display_name,
      participant.full_name,
      participant.name,
      participant.title,
    );

    if (displayName) {
      return displayName;
    }
  }

  return undefined;
}

function formatTimestamp(value?: string) {
  if (!value) {
    return "Just now";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const now = new Date();
  const isSameDay = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isSameDay) {
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  if (isYesterday) {
    return "Yesterday";
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

function mapConversationSummary(data: BackendConversation): Conversation {
  const status = normalizeStatus(data.status, data.is_read_only);
  const serviceName = firstString(data.subject) ?? "General enquiry";
  const customerName =
    getParticipantDisplayName(data.participants, ["customer", "patient", "user", "tenant"]) ??
    "Customer";
  const providerName =
    getParticipantDisplayName(data.participants, ["provider", "doctor", "staff", "clinician"]) ??
    shortenIdentifier(data.assigned_provider_id) ??
    "Assigned provider";
  const enterpriseName =
    getParticipantDisplayName(data.participants, ["enterprise", "organization", "organisation", "company", "clinic"]) ??
    "Enterprise";

  return {
    id: data.id,
    userName: customerName,
    serviceName,
    doctorName: providerName,
    enterpriseName,
    status,
    canSendMessage: status === "ACTIVE",
    limitReason:
      status === "CLOSED"
        ? "CHAT_WINDOW_CLOSED"
        : status === "READ_ONLY"
          ? "FREE_LIMIT_REACHED"
          : undefined,
    unreadCount: data.unread_count ?? 0,
    lastMessage: firstString(data.last_message_preview) ?? "",
    lastMessagePreview: firstString(data.last_message_preview) ?? "",
    last_message_preview: firstString(data.last_message_preview) ?? "",
    lastMessageAt: formatTimestamp(data.last_message_at ?? data.updated_at),
    chatCloseAt: data.expires_at ? formatTimestamp(data.expires_at) : undefined,
  };
}

function mapConversationDetail(data: BackendConversation): Conversation {
  const status = normalizeStatus(data.status, data.is_read_only);
  const serviceName = firstString(data.subject) ?? "General enquiry";
  const customerName =
    getParticipantDisplayName(data.participants, ["customer", "patient", "user", "tenant"]) ??
    "Customer";
  const providerName =
    getParticipantDisplayName(data.participants, ["provider", "doctor", "staff", "clinician"]) ??
    shortenIdentifier(data.assigned_provider_id) ??
    "Assigned provider";
  const enterpriseName =
    getParticipantDisplayName(data.participants, ["enterprise", "organization", "organisation", "company", "clinic"]) ??
    "Enterprise";

  return {
    id: data.id,
    userName: customerName,
    serviceName,
    doctorName: providerName,
    enterpriseName,
    status,
    canSendMessage: status === "ACTIVE",
    limitReason:
      status === "CLOSED"
        ? "CHAT_WINDOW_CLOSED"
        : status === "READ_ONLY"
          ? "FREE_LIMIT_REACHED"
          : undefined,
    unreadCount: data.unread_count ?? 0,
    lastMessage: firstString(data.last_message_preview) ?? "",
    lastMessagePreview: firstString(data.last_message_preview) ?? "",
    last_message_preview: firstString(data.last_message_preview) ?? "",
    lastMessageAt: formatTimestamp(data.last_message_at ?? data.updated_at),
    chatCloseAt: data.expires_at ? formatTimestamp(data.expires_at) : undefined,
  };
}

function mapMessage(data: BackendMessage): ChatMessage {
  const isMine = data.sender_id === DEV_CHAT_USER_ID;
  const readByUserIds = Array.isArray(data.read_by)
    ? data.read_by.filter((value): value is string => typeof value === "string")
    : [];
  const hasBeenReadByOtherParticipant = readByUserIds.some(
    (value) => typeof value === "string" && value !== DEV_CHAT_USER_ID,
  );

  return {
    id: data.id,
    conversationId: data.conversation_id,
    text: firstString(data.content) ?? "",
    createdAt: formatTimestamp(data.created_at),
    isMine,
    messageType:
      firstString(data.message_type)?.toLowerCase() ?? (data.attachment_id ? "attachment" : "text"),
    deliveryState: isMine ? (hasBeenReadByOtherParticipant ? "read" : "sent") : undefined,
    isDeleted: data.is_deleted ?? false,
    isEdited: data.is_edited ?? false,
    editedAt: firstString(data.edited_at),
    readByUserIds,
    attachmentName: data.attachment_id ? "Attachment" : undefined,
  };
}

function updateMessageReadStatus(message: ChatMessage, userId: string, readAt?: string) {
  const readByUserIds = Array.from(new Set([...(message.readByUserIds ?? []), userId]));
  const hasBeenReadByOtherParticipant = readByUserIds.some((value) => value !== DEV_CHAT_USER_ID);

  return {
    ...message,
    readByUserIds,
    readAt: readAt ?? message.readAt,
    deliveryState: message.isMine && hasBeenReadByOtherParticipant ? "read" : message.deliveryState,
  };
}

function getAttachmentType(file: File): "image" | "document" | "audio" | "video" {
  if (file.type.startsWith("image/")) {
    return "image";
  }

  if (file.type.startsWith("audio/")) {
    return "audio";
  }

  if (file.type.startsWith("video/")) {
    return "video";
  }

  return "document";
}

function getChatMessagePreviewText(message: ChatMessage) {
  return message.isDeleted ? "This message was deleted" : message.text || "No messages yet";
}

function upsertChatMessages(
  existingMessages: ChatMessage[],
  incomingMessage: ChatMessage,
  options?: { replaceTempId?: string },
) {
  const duplicateIndex = existingMessages.findIndex((item) => item.id === incomingMessage.id);

  if (duplicateIndex !== -1) {
    const next = [...existingMessages];
    next[duplicateIndex] = {
      ...next[duplicateIndex],
      ...incomingMessage,
      isPending: false,
    };
    return next;
  }

  if (options?.replaceTempId) {
    const tempIndex = existingMessages.findIndex((item) => item.id === options.replaceTempId);

    if (tempIndex !== -1) {
      const next = [...existingMessages];
      next[tempIndex] = {
        ...incomingMessage,
        isPending: false,
      };
      return next;
    }
  }

  return [...existingMessages, incomingMessage];
}

function mergeConversationWithMessage(
  conversation: Conversation,
  message: ChatMessage,
  isSelectedConversation: boolean,
) {
  const previewText = getChatMessagePreviewText(message);

  return {
    ...conversation,
    lastMessage: previewText,
    lastMessagePreview: previewText,
    last_message_preview: previewText,
    lastMessageAt: message.createdAt,
    unreadCount: message.isMine || isSelectedConversation ? 0 : conversation.unreadCount + 1,
  };
}

function mergeConversationSnapshot(
  conversation: Conversation,
  data: BackendConversation,
): Conversation {
  const mappedConversation = mapConversationSummary(data);
  const lastMessageAtSource = data.last_message_at ?? data.updated_at;

  return {
    ...conversation,
    status: mappedConversation.status,
    canSendMessage: mappedConversation.canSendMessage,
    limitReason: mappedConversation.limitReason,
    unreadCount: typeof data.unread_count === "number" ? data.unread_count : conversation.unreadCount,
    lastMessage: firstString(data.last_message_preview) ?? conversation.lastMessage,
    lastMessagePreview: firstString(data.last_message_preview) ?? conversation.lastMessagePreview,
    last_message_preview: firstString(data.last_message_preview) ?? conversation.last_message_preview,
    lastMessageAt: lastMessageAtSource ? formatTimestamp(lastMessageAtSource) : conversation.lastMessageAt,
    chatCloseAt: data.expires_at ? formatTimestamp(data.expires_at) : conversation.chatCloseAt,
    userName: conversation.userName || mappedConversation.userName,
    serviceName: conversation.serviceName || mappedConversation.serviceName,
    doctorName: conversation.doctorName || mappedConversation.doctorName,
    enterpriseName: conversation.enterpriseName || mappedConversation.enterpriseName,
  };
}

function getListStatusLabel(conversation: Conversation) {
  if (conversation.status === "CLOSED") {
    return "Closed";
  }

  if (conversation.canSendMessage) {
    return "Active";
  }

  return "Read only";
}

function getHeaderStatusLabel(conversation: Conversation) {
  if (conversation.status === "CLOSED") {
    return "Closed";
  }

  if (conversation.canSendMessage) {
    return "Live reply enabled";
  }

  return "Read only";
}

function getStatusStyles(label: string) {
  if (label === "Active" || label === "Live reply enabled") {
    return "bg-[#e8f6ee] text-[#16825b]";
  }

  if (label === "Closed") {
    return "bg-[#f1f4f3] text-[#6b7f79]";
  }

  return "bg-[#eef4ff] text-[#2457d6]";
}

function getLimitBanner(limitReason?: LimitReason) {
  if (limitReason === "CHAT_WINDOW_CLOSED") {
    return "This chat window has closed. You can still view previous messages.";
  }

  if (limitReason === "FREE_LIMIT_REACHED") {
    return "Free chat limit reached. User must book a service to continue.";
  }

  if (limitReason === "BOOKING_REQUIRED") {
    return "Doctor chat is available only after booking a service.";
  }

  return null;
}

function formatMessageBody(message: ChatMessage) {
  if (message.isDeleted) {
    return "This message was deleted.";
  }

  return message.text;
}

function canEditMessage(message: ChatMessage) {
  return message.isMine && !message.isDeleted && message.messageType === "text" && !message.attachmentName;
}

function getQuickReplies(conversation: Conversation) {
  if (!conversation.canSendMessage) {
    return [];
  }

  const serviceName = conversation.serviceName.toLowerCase();
  const isServiceChat = serviceName.includes("session") || serviceName.includes("follow-up");

  if (isServiceChat) {
    return [
      "Thank you for reaching out. We are checking this for you.",
      "Could you confirm your preferred date and time?",
      "Please upload any relevant reports or prescriptions.",
      "Your booking is confirmed. We will update you shortly.",
    ];
  }

  return [
    "Hi, I would like to know more about this service.",
    "Can you please share more details about your concern?",
    "The doctor will review this and get back to you.",
    "Please upload any relevant reports or prescriptions.",
  ];
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path
        d="M7 18.5 4 21V7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v8.5a3 3 0 0 1-3 3H7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M8 9.5h8M8 13h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 12 20 4l-4 16-4.5-6L4 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="m20 4-8.5 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path
        d="m9 12.5 6.5-6.5a3 3 0 0 1 4.2 4.2l-8.2 8.2a5 5 0 0 1-7.1-7.1l8.2-8.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MoreVerticalIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="5" r="1.6" fill="currentColor" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <circle cx="12" cy="19" r="1.6" fill="currentColor" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path
        d="M20 20a8 8 0 1 0-16 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 6h16v9h-4l-2 3H10l-2-3H4V6Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9 12h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function isTypingConversationReadOnly(conversation?: Conversation | null) {
  if (!conversation) {
    return true;
  }

  return !conversation.canSendMessage || conversation.status !== "ACTIVE";
}

function extractTypingUsers(value: unknown) {
  if (Array.isArray(value)) {
    return value;
  }

  if (isRecord(value)) {
    if (Array.isArray(value.items)) {
      return value.items;
    }

    if (Array.isArray(value.data)) {
      return value.data;
    }
  }

  return [];
}

function getVisibleTypingUsers(value: unknown) {
  const typingUsers = extractTypingUsers(value);

  return typingUsers
    .filter((entry) => {
      if (typeof entry === "string") {
        return entry !== DEV_CHAT_USER_ID;
      }

      if (!isRecord(entry)) {
        return false;
      }

      return (
        entry.is_typing === true ||
        entry.isTyping === true ||
        entry.typing === true ||
        entry.active === true
      );
    })
    .map((entry) => {
      if (typeof entry === "string") {
        return entry;
      }

      return firstString(entry.user_id, entry.userId, entry.id, entry.participant_id) ?? "";
    })
    .filter((userId) => userId !== "" && userId !== DEV_CHAT_USER_ID);
}

export default function AdminMessagesPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKind>("ALL");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [draftMessage, setDraftMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, ChatMessage[]>>(
    {},
  );
  const [isConversationsLoading, setIsConversationsLoading] = useState(true);
  const [conversationsError, setConversationsError] = useState<string | null>(null);
  const [selectedConversationLoading, setSelectedConversationLoading] = useState(false);
  const [selectedConversationError, setSelectedConversationError] = useState<string | null>(null);
  const [selectedConversationDetail, setSelectedConversationDetail] = useState<Conversation | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [attachmentUploadStatus, setAttachmentUploadStatus] = useState<
    "idle" | "uploading" | "uploaded" | "failed"
  >("idle");
  const [attachmentUploadFileName, setAttachmentUploadFileName] = useState("");
  const [openMessageActionId, setOpenMessageActionId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageError, setEditingMessageError] = useState<string | null>(null);
  const [deletedPreviewByConversationId, setDeletedPreviewByConversationId] = useState<
    Record<string, boolean>
  >({});
  const [socketStatus, setSocketStatus] = useState<"connected" | "reconnecting" | "disconnected">(
    "disconnected",
  );
  const [visibleTypingUsers, setVisibleTypingUsers] = useState<string[]>([]);
  const socketRef = useRef<ChatSocket | null>(null);
  const activeRoomConversationIdRef = useRef<string | null>(null);
  const selectedConversationIdRef = useRef<string | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const pendingSocketMessageRef = useRef<{
    conversationId: string;
    tempId: string;
    content: string;
  } | null>(null);
  const typingConversationIdRef = useRef<string | null>(null);
  const typingActiveByConversationRef = useRef<Record<string, boolean>>({});
  const conversationsRef = useRef<Conversation[]>([]);
  const messagesByConversationRef = useRef<Record<string, ChatMessage[]>>({});
  const typingStopTimerRef = useRef<number | null>(null);
  const typingAutoHideTimerRef = useRef<number | null>(null);
  const typingPollTimerRef = useRef<number | null>(null);
  const typingPollErrorCountRef = useRef(0);
  const typingPollInFlightRef = useRef(false);
  const typingPollConversationIdRef = useRef<string | null>(null);
  const markReadThrottleRef = useRef<Record<string, number>>({});
  const messagesListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    messagesByConversationRef.current = messagesByConversation;
  }, [messagesByConversation]);

  const getConversationPreview = useCallback(
    (conversation: Conversation) => {
      if (deletedPreviewByConversationId[conversation.id]) {
        return "This message was deleted";
      }

      return (
        conversation.lastMessage ||
        conversation.lastMessagePreview ||
        conversation.last_message_preview ||
        "No messages yet"
      );
    },
    [deletedPreviewByConversationId],
  );

  const applyDeletedPreviewOverride = useCallback(
    (conversation: Conversation) => {
      if (!deletedPreviewByConversationId[conversation.id]) {
        return conversation;
      }

      return {
        ...conversation,
        lastMessage: "This message was deleted",
        lastMessagePreview: "This message was deleted",
        last_message_preview: "This message was deleted",
      };
    },
    [deletedPreviewByConversationId],
  );

  const stopTypingTimers = useCallback(() => {
    if (typingStopTimerRef.current !== null) {
      window.clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = null;
    }

    if (typingAutoHideTimerRef.current !== null) {
      window.clearTimeout(typingAutoHideTimerRef.current);
      typingAutoHideTimerRef.current = null;
    }

    if (typingPollTimerRef.current !== null) {
      window.clearInterval(typingPollTimerRef.current);
      typingPollTimerRef.current = null;
    }
  }, []);

  const sendTypingStatus = useCallback(async (conversationId: string, isTyping: boolean) => {
    const socket = socketRef.current;

    if (socket?.connected) {
      socket.emit(isTyping ? "typing_start" : "typing_stop", {
        conversation_id: conversationId,
      });

      if (process.env.NODE_ENV !== "production") {
        console.log(
          `[Chat socket] emitted ${isTyping ? "typing_start" : "typing_stop"} conversation id`,
          conversationId,
        );
      }

      return;
    }

    try {
      await updateTypingStatus(conversationId, isTyping);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Typing status update failed", error);
      }
    }
  }, []);

  const clearAttachmentUploadState = useCallback(() => {
    setAttachmentUploadStatus("idle");
    setAttachmentUploadFileName("");

    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = "";
    }
  }, []);

  const clearEditMode = useCallback(() => {
    setEditingMessageId(null);
    setEditingMessageError(null);
    setOpenMessageActionId(null);
  }, []);

  const stopTypingForConversation = useCallback(
    (conversationId: string) => {
      typingActiveByConversationRef.current[conversationId] = false;

      if (typingStopTimerRef.current !== null) {
        window.clearTimeout(typingStopTimerRef.current);
        typingStopTimerRef.current = null;
      }

      void sendTypingStatus(conversationId, false);
    },
    [sendTypingStatus],
  );

  const emitMarkRead = useCallback(
    (conversationId: string, messageId?: string) => {
      const socket = socketRef.current;
      const now = Date.now();
      const lastEmitAt = markReadThrottleRef.current[conversationId] ?? 0;

      if (now - lastEmitAt < 1200) {
        return;
      }

      markReadThrottleRef.current[conversationId] = now;

      if (socket?.connected) {
        socket.emit("mark_read", messageId ? { message_id: messageId } : { conversation_id: conversationId });

        if (process.env.NODE_ENV !== "production") {
          console.log("[Chat socket] emitted mark_read conversation id", conversationId);
        }
        return;
      }

      void markConversationRead(conversationId).catch((error) => {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Mark conversation read failed", error);
        }
      });
    },
    [],
  );

  const handleSocketTyping = useCallback(
    (payload: unknown) => {
      if (!isRecord(payload)) {
        return;
      }

      const conversationId =
        typeof payload.conversation_id === "string"
          ? payload.conversation_id
          : typeof payload.conversationId === "string"
            ? payload.conversationId
            : undefined;
      const userId =
        typeof payload.user_id === "string"
          ? payload.user_id
          : typeof payload.userId === "string"
            ? payload.userId
            : undefined;
      const isTyping =
        typeof payload.is_typing === "boolean"
          ? payload.is_typing
          : typeof payload.isTyping === "boolean"
            ? payload.isTyping
            : undefined;

      if (!conversationId || !userId || typeof isTyping !== "boolean") {
        return;
      }

      if (process.env.NODE_ENV !== "production") {
        console.log(
          "[Chat socket] received typing conversation id / user id / is_typing",
          conversationId,
          userId,
          isTyping,
        );
      }

      if (userId === DEV_CHAT_USER_ID || selectedConversationIdRef.current !== conversationId) {
        return;
      }

      if (typingAutoHideTimerRef.current !== null) {
        window.clearTimeout(typingAutoHideTimerRef.current);
        typingAutoHideTimerRef.current = null;
      }

      if (isTyping) {
        setVisibleTypingUsers((current) => (current.includes(userId) ? current : [...current, userId]));
        typingAutoHideTimerRef.current = window.setTimeout(() => {
          setVisibleTypingUsers((current) => current.filter((item) => item !== userId));
          typingAutoHideTimerRef.current = null;
        }, 5000);
      } else {
        setVisibleTypingUsers((current) => current.filter((item) => item !== userId));
      }
    },
    [],
  );

  const handleSocketMessageRead = useCallback(
    (payload: unknown) => {
      if (!isRecord(payload)) {
        return;
      }

      const conversationId =
        typeof payload.conversation_id === "string"
          ? payload.conversation_id
          : typeof payload.conversationId === "string"
            ? payload.conversationId
            : undefined;
      const messageId =
        typeof payload.message_id === "string"
          ? payload.message_id
          : typeof payload.messageId === "string"
            ? payload.messageId
            : undefined;
      const userId =
        typeof payload.user_id === "string"
          ? payload.user_id
          : typeof payload.userId === "string"
            ? payload.userId
            : undefined;
      const readAt =
        typeof payload.read_at === "string"
          ? payload.read_at
          : typeof payload.readAt === "string"
            ? payload.readAt
            : undefined;

      if (!conversationId || !userId) {
        return;
      }

      if (process.env.NODE_ENV !== "production") {
        console.log(
          "[Chat socket] received message_read conversation id / message id / user id",
          conversationId,
          messageId ?? "(conversation)",
          userId,
        );
      }

      setMessagesByConversation((current) => {
        const existingMessages = current[conversationId] ?? [];

        return {
          ...current,
          [conversationId]: existingMessages.map((message) => {
            if (messageId) {
              const candidateIds = [message.id, (message as { _id?: string })._id];
              if (!candidateIds.includes(messageId)) {
                return message;
              }

              return updateMessageReadStatus(message, userId, readAt);
            }

            if (!message.isMine) {
              return message;
            }

            return updateMessageReadStatus(message, userId, readAt);
          }),
        };
      });
    },
    [],
  );

  const syncTypingIndicator = useCallback(
    async (conversationId: string) => {
      if (socketRef.current?.connected) {
        return;
      }

      if (typingPollInFlightRef.current) {
        return;
      }

      typingPollInFlightRef.current = true;

      const conversation = conversationsRef.current.find((item) => item.id === conversationId);

      if (!conversation || isTypingConversationReadOnly(conversation)) {
        window.setTimeout(() => setVisibleTypingUsers([]), 0);
        typingPollErrorCountRef.current = 0;
        typingPollInFlightRef.current = false;
        return;
      }

      try {
        const response = await getTypingUsers(conversationId);
        const otherTypingUsers = getVisibleTypingUsers(response);
        typingPollErrorCountRef.current = 0;
        window.setTimeout(() => setVisibleTypingUsers(otherTypingUsers), 0);
      } catch (error) {
        typingPollErrorCountRef.current += 1;

        if (process.env.NODE_ENV !== "production") {
          console.warn("Typing poll failed", error);
        }

        if (typingPollErrorCountRef.current >= 2) {
          window.setTimeout(() => setVisibleTypingUsers([]), 0);
        }
      } finally {
        typingPollInFlightRef.current = false;
      }
    },
    [],
  );

  const refreshConversationList = useCallback(async () => {
    setIsConversationsLoading(true);
    setConversationsError(null);

    try {
      const response = await getProviderConversations({ page: 1, pageSize: 20 });
      const items = extractListResponse<BackendConversation>(response)
        .map(mapConversationSummary)
        .map(applyDeletedPreviewOverride);
      setConversations(items);

      const selectedId = selectedConversationIdRef.current;
      if (selectedId) {
        const refreshedSelectedConversation = items.find((conversation) => conversation.id === selectedId);

        if (refreshedSelectedConversation) {
          setSelectedConversationDetail((current) =>
            current && current.id === selectedId
              ? {
                  ...current,
                  ...refreshedSelectedConversation,
                }
              : current,
          );
        } else {
          const socket = socketRef.current;
          const activeConversationId = activeRoomConversationIdRef.current;

          if (socket && activeConversationId) {
            socket.emit("leave_room", { conversation_id: activeConversationId });
          }

          clearAttachmentUploadState();
          setSelectedConversationId(null);
          setSelectedConversationDetail(null);
          activeRoomConversationIdRef.current = null;
        }
      }
    } catch (error) {
      setConversationsError(error instanceof Error ? error.message : "Failed to load conversations.");
    } finally {
      setIsConversationsLoading(false);
    }
  }, [applyDeletedPreviewOverride, clearAttachmentUploadState]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshConversationList();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [refreshConversationList]);

  useEffect(() => {
    if (!selectedConversationId) {
      return;
    }

    let active = true;

    async function loadSelectedConversation() {
      setSelectedConversationLoading(true);
      setSelectedConversationError(null);

      try {
        const [conversationResponse, messagesResponse] = await Promise.all([
          getConversationById(selectedConversationId),
          getConversationMessages(selectedConversationId, { limit: 20 }),
        ]);

        if (!active) {
          return;
        }

        const detail = extractObjectResponse<BackendConversation>(conversationResponse);
        const messages = extractListResponse<BackendMessage>(messagesResponse).map(mapMessage);

        if (detail) {
          setSelectedConversationDetail(mapConversationDetail(detail));
        }

        setMessagesByConversation((current) => ({
          ...current,
          [selectedConversationId]: messages,
        }));

        if (socketRef.current?.connected) {
          emitMarkRead(selectedConversationId);
        } else {
          await markConversationRead(selectedConversationId).catch(() => undefined);
        }

        if (!active) {
          return;
        }

        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === selectedConversationId
              ? {
                  ...conversation,
                  unreadCount: 0,
                }
              : conversation,
          ),
        );
      } catch (error) {
        if (!active) {
          return;
        }

        setSelectedConversationError(
          error instanceof Error ? error.message : "Failed to load conversation.",
        );
      } finally {
        if (active) {
          setSelectedConversationLoading(false);
        }
      }
    }

    const timer = window.setTimeout(() => {
      void loadSelectedConversation();
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [selectedConversationId, emitMarkRead]);

  function normalizeSocketMessage(payload: unknown): BackendMessage | null {
    if (!isRecord(payload)) {
      return null;
    }

    const candidate =
      isRecord(payload.message)
        ? payload.message
        : isRecord(payload.data)
          ? payload.data
          : isRecord(payload.item)
            ? payload.item
            : payload;

    const conversationId =
      typeof payload.conversation_id === "string"
        ? payload.conversation_id
        : typeof candidate.conversation_id === "string"
          ? candidate.conversation_id
          : undefined;
    const messageId =
      typeof candidate.id === "string"
        ? candidate.id
        : typeof candidate._id === "string"
          ? candidate._id
          : undefined;

    if (!isRecord(candidate) || !messageId || !conversationId) {
      return null;
    }

    return {
      id: messageId,
      _id: typeof candidate._id === "string" ? candidate._id : undefined,
      conversation_id: conversationId,
      sender_id: typeof candidate.sender_id === "string" ? candidate.sender_id : undefined,
      content: typeof candidate.content === "string" ? candidate.content : undefined,
      message_type: typeof candidate.message_type === "string" ? candidate.message_type : undefined,
      attachment_id:
        typeof candidate.attachment_id === "string" || candidate.attachment_id === null
          ? candidate.attachment_id
          : undefined,
      is_deleted: typeof candidate.is_deleted === "boolean" ? candidate.is_deleted : false,
      is_edited: typeof candidate.is_edited === "boolean" ? candidate.is_edited : false,
      edited_at: typeof candidate.edited_at === "string" ? candidate.edited_at : undefined,
      created_at: typeof candidate.created_at === "string" ? candidate.created_at : undefined,
      read_by: candidate.read_by,
    };
  }

  function normalizeSocketConversation(payload: unknown): BackendConversation | null {
    if (!isRecord(payload)) {
      return null;
    }

    const candidate =
      isRecord(payload.conversation)
        ? payload.conversation
        : isRecord(payload.data)
          ? payload.data
          : isRecord(payload.item)
            ? payload.item
            : payload;

    if (!isRecord(candidate) || typeof candidate.id !== "string") {
      return null;
    }

    return {
      id: candidate.id,
      status: typeof candidate.status === "string" ? candidate.status : undefined,
      conversation_type:
        typeof candidate.conversation_type === "string" ? candidate.conversation_type : undefined,
      subject: typeof candidate.subject === "string" ? candidate.subject : undefined,
      last_message_at:
        typeof candidate.last_message_at === "string" ? candidate.last_message_at : undefined,
      last_message_preview:
        typeof candidate.last_message_preview === "string" ? candidate.last_message_preview : undefined,
      unread_count:
        typeof candidate.unread_count === "number" ? candidate.unread_count : undefined,
      assigned_provider_id:
        typeof candidate.assigned_provider_id === "string"
          ? candidate.assigned_provider_id
          : undefined,
      updated_at: typeof candidate.updated_at === "string" ? candidate.updated_at : undefined,
      participants: candidate.participants,
      is_read_only:
        typeof candidate.is_read_only === "boolean" ? candidate.is_read_only : undefined,
      expires_at: typeof candidate.expires_at === "string" ? candidate.expires_at : undefined,
    };
  }

  const handleSocketNewMessage = useCallback(
    (payload: unknown) => {
      const message = normalizeSocketMessage(payload);

      if (!message) {
        return;
      }

      const mappedMessage = mapMessage(message);
      const conversationId = mappedMessage.conversationId;
      const selectedConversationIdCurrent = selectedConversationIdRef.current;
      const isSelectedConversation = selectedConversationIdCurrent === conversationId;
      const conversationExists = conversationsRef.current.some(
        (conversation) => conversation.id === conversationId,
      );
      const pendingSocketMessage = pendingSocketMessageRef.current;
      const shouldReplaceOptimisticMessage =
        pendingSocketMessage !== null &&
        pendingSocketMessage.conversationId === conversationId &&
        pendingSocketMessage.content === mappedMessage.text &&
        mappedMessage.isMine;

      if (process.env.NODE_ENV !== "production") {
        console.log("[Chat socket] received new_message conversation id", conversationId);
      }

      setMessagesByConversation((current) => {
        const existingMessages = current[conversationId] ?? [];
        const nextMessages = upsertChatMessages(existingMessages, mappedMessage, {
          replaceTempId: shouldReplaceOptimisticMessage ? pendingSocketMessage.tempId : undefined,
        });
        return {
          ...current,
          [conversationId]: nextMessages,
        };
      });

      if (shouldReplaceOptimisticMessage) {
        pendingSocketMessageRef.current = null;
        setIsSendingMessage(false);
      }

      if (mappedMessage.isDeleted && editingMessageId === mappedMessage.id) {
        clearEditMode();
        setDraftMessage("");
      }

      if (!mappedMessage.isDeleted) {
        setDeletedPreviewByConversationId((current) => {
          if (!current[conversationId]) {
            return current;
          }

          const next = { ...current };
          delete next[conversationId];
          return next;
        });
      }

      setConversations((current) => {
        const index = current.findIndex((conversation) => conversation.id === conversationId);

        if (index === -1) {
          return current;
        }

        const next = [...current];
        const existingConversation = next[index];

        next[index] = mergeConversationWithMessage(
          existingConversation,
          mappedMessage,
          isSelectedConversation,
        );

        return next;
      });

      if (isSelectedConversation) {
        setSelectedConversationDetail((current) =>
          current && current.id === conversationId
            ? mergeConversationWithMessage(current, mappedMessage, true)
            : current,
        );

        emitMarkRead(conversationId, mappedMessage.id);
      }

      if (!conversationExists) {
        void refreshConversationList();
      }
    },
    [refreshConversationList, emitMarkRead, clearEditMode, editingMessageId],
  );

  const handleConversationUpdated = useCallback(
    (payload: unknown) => {
      const conversation = normalizeSocketConversation(payload);

      if (!conversation) {
        return;
      }

      const conversationId = conversation.id;

      if (process.env.NODE_ENV !== "production") {
        console.log("[Chat socket] received conversation_updated conversation id", conversationId);
      }

      setConversations((current) => {
        const index = current.findIndex((item) => item.id === conversationId);

        if (index === -1) {
          return current;
        }

        const next = [...current];
        const existingConversation = next[index];

        next[index] = mergeConversationSnapshot(existingConversation, conversation);

        return next;
      });

      if (selectedConversationIdRef.current === conversationId) {
        setSelectedConversationDetail((current) =>
          current && current.id === conversationId
            ? mergeConversationSnapshot(current, conversation)
            : current,
        );
      }

      if (!conversationsRef.current.some((item) => item.id === conversationId)) {
        void refreshConversationList();
      }
    },
    [refreshConversationList],
  );

  const applyMessageToConversation = useCallback(
    (conversationId: string, mappedMessage: ChatMessage, replaceTempId?: string) => {
      setMessagesByConversation((current) => ({
        ...current,
        [conversationId]: upsertChatMessages(current[conversationId] ?? [], mappedMessage, {
          replaceTempId,
        }),
      }));

      if (!mappedMessage.isDeleted) {
        setDeletedPreviewByConversationId((current) => {
          if (!current[conversationId]) {
            return current;
          }

          const next = { ...current };
          delete next[conversationId];
          return next;
        });
      }

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? mergeConversationWithMessage(conversation, mappedMessage, true)
            : conversation,
        ),
      );

      setSelectedConversationDetail((current) =>
        current && current.id === conversationId
          ? mergeConversationWithMessage(current, mappedMessage, true)
          : current,
      );
    },
    [],
  );

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_DEV_CHAT_TOKEN;
    const socket = createChatSocket(token ?? undefined);
    socketRef.current = socket;

    const handleConnect = () => {
      if (process.env.NODE_ENV !== "production") {
        console.log("Chat socket connected");
      }

      setSocketStatus("connected");

      const conversationId = selectedConversationIdRef.current;
      if (conversationId) {
        socket.emit("join_room", { conversation_id: conversationId });
        if (process.env.NODE_ENV !== "production") {
          console.log("[Chat socket] joined room conversation id", conversationId);
        }
        activeRoomConversationIdRef.current = conversationId;
        emitMarkRead(conversationId);
      }
    };

    const handleDisconnect = () => {
      setSocketStatus("disconnected");
      activeRoomConversationIdRef.current = null;
      setVisibleTypingUsers([]);
    };

    const handleConnectError = (error: unknown) => {
      setSocketStatus("reconnecting");

      if (process.env.NODE_ENV !== "production") {
        console.warn("Chat socket connect_error", error);
      }
    };

    const handleSocketErrorEvent = (payload: unknown) => {
      setSocketStatus("reconnecting");

      if (process.env.NODE_ENV !== "production") {
        console.warn("[Chat socket] error event detail", payload);
      }

      const pendingSocketMessage = pendingSocketMessageRef.current;
      const eventName =
        isRecord(payload) && typeof payload.event === "string" ? payload.event : undefined;

      if (
        pendingSocketMessage &&
        (!eventName || eventName === "send_message" || eventName === "message")
      ) {
        const fallbackPendingMessage = pendingSocketMessage;
        pendingSocketMessageRef.current = null;
        void (async () => {
          try {
            const response = await sendMessage({
              conversation_id: fallbackPendingMessage.conversationId,
              content: fallbackPendingMessage.content,
              message_type: "text",
            });

            stopTypingForConversation(fallbackPendingMessage.conversationId);
            if (typingStopTimerRef.current !== null) {
              window.clearTimeout(typingStopTimerRef.current);
              typingStopTimerRef.current = null;
            }

            const createdMessage = extractObjectResponse<BackendMessage>(response);

            if (createdMessage) {
              applyMessageToConversation(
                fallbackPendingMessage.conversationId,
                mapMessage(createdMessage),
                fallbackPendingMessage.tempId,
              );
            } else {
              applyMessageToConversation(
                fallbackPendingMessage.conversationId,
                {
                  id: fallbackPendingMessage.tempId,
                  conversationId: fallbackPendingMessage.conversationId,
                  text: fallbackPendingMessage.content,
                  createdAt: "Just now",
                  isMine: true,
                  deliveryState: "sent",
                  isPending: false,
                },
                fallbackPendingMessage.tempId,
              );
            }

            await refreshConversationList();
            setDraftMessage("");
            setShowEmojiPicker(false);
            setOpenMessageActionId(null);
            setIsSendingMessage(false);
          } catch (fallbackError) {
            setMessagesByConversation((current) => {
              const existingMessages = current[fallbackPendingMessage.conversationId] ?? [];
              const nextMessages = existingMessages.filter(
                (message) => message.id !== fallbackPendingMessage.tempId,
              );

              return {
                ...current,
                [fallbackPendingMessage.conversationId]: nextMessages,
              };
            });
            setDraftMessage(fallbackPendingMessage.content);
            setIsSendingMessage(false);
            setSelectedConversationError(
              fallbackError instanceof Error ? fallbackError.message : "Failed to send message.",
            );
          }
        })();
      }
    };

    const handleReconnectAttempt = () => {
      setSocketStatus("reconnecting");
    };

    const handleReconnect = () => {
      setSocketStatus("connected");
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("error", handleSocketErrorEvent);
    socket.io.on("reconnect_attempt", handleReconnectAttempt);
    socket.io.on("reconnect", handleReconnect);
    socket.on("typing", handleSocketTyping);
    socket.on("message_read", handleSocketMessageRead);
    socket.on("new_message", handleSocketNewMessage);
    socket.on("conversation_updated", handleConversationUpdated);

    socket.connect();

    return () => {
      const activeConversationId = activeRoomConversationIdRef.current;
      if (activeConversationId) {
        socket.emit("leave_room", { conversation_id: activeConversationId });
        if (process.env.NODE_ENV !== "production") {
          console.log("[Chat socket] left room conversation id", activeConversationId);
        }
      }

      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("error", handleSocketErrorEvent);
      socket.io.off("reconnect_attempt", handleReconnectAttempt);
      socket.io.off("reconnect", handleReconnect);
      socket.off("typing", handleSocketTyping);
      socket.off("message_read", handleSocketMessageRead);
      socket.off("new_message", handleSocketNewMessage);
      socket.off("conversation_updated", handleConversationUpdated);
      const activeTypingConversationId = typingConversationIdRef.current;
      if (activeTypingConversationId) {
        stopTypingForConversation(activeTypingConversationId);
      }
      socket.disconnect();
      socketRef.current = null;
      activeRoomConversationIdRef.current = null;
      pendingSocketMessageRef.current = null;
      setVisibleTypingUsers([]);
    };
  }, [
    handleConversationUpdated,
    handleSocketNewMessage,
    handleSocketMessageRead,
    handleSocketTyping,
    applyMessageToConversation,
    emitMarkRead,
    refreshConversationList,
    stopTypingForConversation,
  ]);

  useEffect(() => {
    const socket = socketRef.current;
    const nextConversationId = selectedConversationId;
    const previousConversationId = activeRoomConversationIdRef.current;

    if (!socket?.connected) {
      activeRoomConversationIdRef.current = null;
      return;
    }

    if (previousConversationId && previousConversationId !== nextConversationId) {
      socket.emit("leave_room", { conversation_id: previousConversationId });
      if (process.env.NODE_ENV !== "production") {
        console.log("[Chat socket] left room conversation id", previousConversationId);
      }
    }

    if (nextConversationId && previousConversationId !== nextConversationId) {
      socket.emit("join_room", { conversation_id: nextConversationId });
      if (process.env.NODE_ENV !== "production") {
        console.log("[Chat socket] joined room conversation id", nextConversationId);
      }
      activeRoomConversationIdRef.current = nextConversationId;
    }

    if (!nextConversationId) {
      activeRoomConversationIdRef.current = null;
    }
  }, [selectedConversationId]);

  useEffect(() => {
    const nextConversationId = selectedConversationId;
    const previousConversationId = typingConversationIdRef.current;

    if (previousConversationId && previousConversationId !== nextConversationId) {
      stopTypingForConversation(previousConversationId);
    }

    typingConversationIdRef.current = nextConversationId;
    stopTypingTimers();
    window.setTimeout(() => setVisibleTypingUsers([]), 0);
    typingPollErrorCountRef.current = 0;
  }, [selectedConversationId, stopTypingForConversation, stopTypingTimers]);

  useEffect(() => {
    const conversationId = selectedConversationId;
    const conversation = conversationsRef.current.find((item) => item.id === conversationId) ?? null;

    if (!conversationId || isTypingConversationReadOnly(conversation)) {
      stopTypingTimers();
      typingPollConversationIdRef.current = null;
      window.setTimeout(() => setVisibleTypingUsers([]), 0);
      typingPollErrorCountRef.current = 0;

      if (conversationId) {
        stopTypingForConversation(conversationId);
      }

      return;
    }

    if (socketStatus === "connected") {
      stopTypingTimers();
      typingPollConversationIdRef.current = null;
      typingPollErrorCountRef.current = 0;
      return;
    }

    typingPollConversationIdRef.current = conversationId;

    void syncTypingIndicator(conversationId);

    const interval = window.setInterval(() => {
      const activeConversationId = typingPollConversationIdRef.current;

      if (!activeConversationId) {
        return;
      }

      void syncTypingIndicator(activeConversationId);
    }, 3000);

    typingPollTimerRef.current = interval;

    return () => {
      if (typingPollTimerRef.current !== null) {
        window.clearInterval(typingPollTimerRef.current);
        typingPollTimerRef.current = null;
      }

      typingPollConversationIdRef.current = null;
    };
  }, [
    conversations,
    selectedConversationId,
    socketStatus,
    stopTypingForConversation,
    stopTypingTimers,
    syncTypingIndicator,
  ]);

  useEffect(() => {
    return () => {
      const conversationId = typingConversationIdRef.current;

      if (conversationId) {
        stopTypingForConversation(conversationId);
      }

      stopTypingTimers();
    };
  }, [stopTypingForConversation, stopTypingTimers]);

  const filteredConversations = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return conversations.filter((conversation) => {
      const preview = getConversationPreview(conversation);
      const matchesSearch =
        !normalized ||
        conversation.userName.toLowerCase().includes(normalized) ||
        conversation.serviceName.toLowerCase().includes(normalized) ||
        conversation.doctorName.toLowerCase().includes(normalized) ||
        conversation.enterpriseName.toLowerCase().includes(normalized) ||
        preview.toLowerCase().includes(normalized) ||
        conversation.id.toLowerCase().includes(normalized);

      const matchesFilter =
        filter === "ALL"
          ? true
          : filter === "UNREAD"
            ? conversation.unreadCount > 0
            : conversation.status !== "ACTIVE" || !conversation.canSendMessage;

      return matchesSearch && matchesFilter;
    });
  }, [conversations, filter, getConversationPreview, search]);

  const selectedConversation =
    selectedConversationDetail?.id === selectedConversationId
      ? selectedConversationDetail
      : conversations.find((conversation) => conversation.id === selectedConversationId) ?? null;

  const visibleSelectedConversation =
    selectedConversationId &&
    filteredConversations.some((conversation) => conversation.id === selectedConversationId)
      ? selectedConversation
      : null;

  const selectedMessages = visibleSelectedConversation
    ? messagesByConversation[visibleSelectedConversation.id] ?? []
    : [];

  const quickReplies = visibleSelectedConversation ? getQuickReplies(visibleSelectedConversation) : [];

  useEffect(() => {
    const element = messagesListRef.current;

    if (!element) {
      return;
    }

    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    if (distanceFromBottom <= 120) {
      element.scrollTop = element.scrollHeight;
    }
  }, [selectedMessages.length, visibleTypingUsers.length, selectedConversationId]);

  const activeCount = conversations.filter(
    (conversation) => conversation.status === "ACTIVE" && conversation.canSendMessage,
  ).length;
  const unreadCount = conversations.filter((conversation) => conversation.unreadCount > 0).length;
  const closedCount = conversations.filter(
    (conversation) => conversation.status !== "ACTIVE" || !conversation.canSendMessage,
  ).length;

  async function handleSend() {
    const text = draftMessage.trim();

    if (!selectedConversation || isSendingMessage) {
      return;
    }

    if (editingMessageId) {
      const targetMessage = selectedMessages.find((message) => message.id === editingMessageId);

      if (!targetMessage) {
        clearEditMode();
        return;
      }

      if (!text) {
        setEditingMessageError("Message cannot be empty.");
        return;
      }

      if (text === targetMessage.text) {
        clearEditMode();
        setDraftMessage("");
        return;
      }

      setIsSendingMessage(true);
      setEditingMessageError(null);
      setSelectedConversationError(null);

      try {
        const response = await editMessage(editingMessageId, text);
        const updatedMessage = extractObjectResponse<BackendMessage>(response);
        const mappedUpdatedMessage = updatedMessage
          ? mapMessage(updatedMessage)
          : {
              ...targetMessage,
              text,
              isEdited: true,
              editedAt: new Date().toISOString(),
            };
        const conversationId = targetMessage.conversationId;
        const isLatestMessage = selectedMessages[selectedMessages.length - 1]?.id === editingMessageId;

        setMessagesByConversation((current) => ({
          ...current,
          [conversationId]: (current[conversationId] ?? []).map((message) =>
            message.id === editingMessageId
              ? {
                  ...message,
                  ...mappedUpdatedMessage,
                  isPending: false,
                  isEdited: true,
                }
              : message,
          ),
        }));

        if (isLatestMessage) {
          setDeletedPreviewByConversationId((current) => {
            if (!current[conversationId]) {
              return current;
            }

            const next = { ...current };
            delete next[conversationId];
            return next;
          });

          setConversations((current) =>
            current.map((conversation) =>
              conversation.id === conversationId
                ? {
                    ...conversation,
                    lastMessage: mappedUpdatedMessage.text,
                    lastMessagePreview: mappedUpdatedMessage.text,
                    last_message_preview: mappedUpdatedMessage.text,
                    lastMessageAt: mappedUpdatedMessage.createdAt,
                  }
                : conversation,
            ),
          );

          setSelectedConversationDetail((current) =>
            current && current.id === conversationId
              ? {
                  ...current,
                  lastMessage: mappedUpdatedMessage.text,
                  lastMessagePreview: mappedUpdatedMessage.text,
                  last_message_preview: mappedUpdatedMessage.text,
                  lastMessageAt: mappedUpdatedMessage.createdAt,
                }
              : current,
          );
        }

        clearEditMode();
        setDraftMessage("");
        setShowEmojiPicker(false);
        stopTypingForConversation(conversationId);

        if (typingStopTimerRef.current !== null) {
          window.clearTimeout(typingStopTimerRef.current);
          typingStopTimerRef.current = null;
        }
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[Chat messages] edit_message failed", {
            messageId: editingMessageId,
            error,
          });
        }

        setEditingMessageError(error instanceof Error ? error.message : "Failed to edit message.");
      } finally {
        setIsSendingMessage(false);
      }

      return;
    }

    if (!text || !selectedConversation.canSendMessage) {
      return;
    }

    const conversationId = selectedConversation.id;
    const socket = socketRef.current;
    const shouldUseSocket = Boolean(socket?.connected);
    const optimisticTempId = shouldUseSocket ? `temp-${Date.now()}` : null;

    setIsSendingMessage(true);

    const applyMessageToState = (mappedMessage: ChatMessage, replaceTempId?: string) => {
      setMessagesByConversation((current) => ({
        ...current,
        [conversationId]: upsertChatMessages(current[conversationId] ?? [], mappedMessage, {
          replaceTempId,
        }),
      }));

      if (!mappedMessage.isDeleted) {
        setDeletedPreviewByConversationId((current) => {
          if (!current[conversationId]) {
            return current;
          }

          const next = { ...current };
          delete next[conversationId];
          return next;
        });
      }

      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? mergeConversationWithMessage(conversation, mappedMessage, true)
            : conversation,
        ),
      );

      setSelectedConversationDetail((current) =>
        current && current.id === conversationId
          ? mergeConversationWithMessage(current, mappedMessage, true)
          : current,
      );
    };

    const sendViaRest = async (replaceTempId?: string, restoreDraftOnFailure = false) => {
      try {
        const response = await sendMessage({
          conversation_id: conversationId,
          content: text,
          message_type: "text",
        });

        stopTypingForConversation(conversationId);
        if (typingStopTimerRef.current !== null) {
          window.clearTimeout(typingStopTimerRef.current);
          typingStopTimerRef.current = null;
        }

        const createdMessage = extractObjectResponse<BackendMessage>(response);

        if (createdMessage) {
          applyMessageToState(mapMessage(createdMessage), replaceTempId);
        } else {
          applyMessageToState(
            {
              id: replaceTempId ?? `temp-${Date.now()}`,
              conversationId,
              text,
              createdAt: "Just now",
              isMine: true,
              deliveryState: "sent",
              isPending: false,
            },
            replaceTempId,
          );
        }

        await refreshConversationList();
        setDraftMessage("");
        setShowEmojiPicker(false);
        setOpenMessageActionId(null);
        pendingSocketMessageRef.current = null;
        setIsSendingMessage(false);
      } catch (error) {
        if (replaceTempId) {
          setMessagesByConversation((current) => {
            const existingMessages = current[conversationId] ?? [];
            const nextMessages = existingMessages.filter((message) => message.id !== replaceTempId);

            return {
              ...current,
              [conversationId]: nextMessages,
            };
          });
        }

        if (restoreDraftOnFailure) {
          setDraftMessage(text);
        }

        setIsSendingMessage(false);
        throw error;
      }
    };

    try {
      if (shouldUseSocket && socket) {
        const optimisticMessage: ChatMessage = {
          id: optimisticTempId ?? `temp-${Date.now()}`,
          conversationId,
          text,
          createdAt: "Just now",
          isMine: true,
          deliveryState: "sent",
          isPending: true,
        };

        pendingSocketMessageRef.current = {
          conversationId,
          tempId: optimisticMessage.id,
          content: text,
        };

        applyMessageToState(optimisticMessage);
        socket.emit("send_message", {
          conversation_id: conversationId,
          content: text,
          message_type: "text",
        });

        if (process.env.NODE_ENV !== "production") {
          console.log("[Chat socket] emitted send_message conversation id", conversationId);
        }

        stopTypingForConversation(conversationId);
        if (typingStopTimerRef.current !== null) {
          window.clearTimeout(typingStopTimerRef.current);
          typingStopTimerRef.current = null;
        }

        setDraftMessage("");
        setShowEmojiPicker(false);
        setOpenMessageActionId(null);
      } else {
        await sendViaRest();
      }
    } catch (error) {
      if (shouldUseSocket && socket && optimisticTempId) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[Chat socket] send_message emit failed", error);
        }

        pendingSocketMessageRef.current = null;

        try {
          await sendViaRest(optimisticTempId, true);
        } catch (fallbackError) {
          setSelectedConversationError(
            fallbackError instanceof Error ? fallbackError.message : "Failed to send message.",
          );
        }
      } else {
        setSelectedConversationError(error instanceof Error ? error.message : "Failed to send message.");
      }
    } finally {
      if (!pendingSocketMessageRef.current) {
        setIsSendingMessage(false);
      }
    }
  }

  function handleConversationSelect(conversationId: string) {
    clearAttachmentUploadState();
    if (editingMessageId) {
      setDraftMessage("");
    }
    clearEditMode();
    setSelectedConversationId(conversationId);
  }

  function handleDraftMessageChange(value: string) {
    setDraftMessage(value);
    if (editingMessageId) {
      setEditingMessageError(null);
    }

    const conversationId = selectedConversationIdRef.current;
    const conversation = selectedConversation;

    if (!conversationId || isTypingConversationReadOnly(conversation)) {
      return;
    }

    const trimmedValue = value.trim();

    if (!trimmedValue) {
      stopTypingForConversation(conversationId);
      return;
    }

    if (!typingActiveByConversationRef.current[conversationId]) {
      void sendTypingStatus(conversationId, true);
      typingActiveByConversationRef.current[conversationId] = true;
    }

    if (typingStopTimerRef.current !== null) {
      window.clearTimeout(typingStopTimerRef.current);
    }

    typingStopTimerRef.current = window.setTimeout(() => {
      typingActiveByConversationRef.current[conversationId] = false;
      void sendTypingStatus(conversationId, false);
      typingStopTimerRef.current = null;
    }, 1200);
  }

  async function handleAttachmentSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    const conversationId = selectedConversationIdRef.current;
    const conversation = selectedConversation;

    if (!conversationId || !conversation || !conversation.canSendMessage) {
      setAttachmentUploadStatus("failed");
      setAttachmentUploadFileName(file.name);
      return;
    }

    const attachmentType = getAttachmentType(file);

    setAttachmentUploadStatus("uploading");
    setAttachmentUploadFileName(file.name);

    try {
      const response = await uploadAttachment(conversationId, file, attachmentType);
      const attachment =
        extractObjectResponse<BackendAttachment>(response) ??
        (isRecord(response) ? (response as BackendAttachment) : null);
      const attachmentId = firstString(attachment?.id, attachment?.attachment_id);
      const responseFileName = firstString(attachment?.file_name, attachment?.filename) ?? file.name;
      const responseAttachmentType = firstString(attachment?.attachment_type) ?? attachmentType;
      const downloadUrlExists = Boolean(attachment?.download_url);

      if (process.env.NODE_ENV !== "production") {
        console.log("[Chat attachment] upload response", {
          attachmentId,
          fileName: responseFileName,
          attachmentType: responseAttachmentType,
          downloadUrlExists,
        });
      }

      setAttachmentUploadStatus("uploaded");
      setAttachmentUploadFileName(responseFileName);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Attachment upload failed", error);
      }

      setAttachmentUploadStatus("failed");
      setAttachmentUploadFileName(file.name);
    }
  }

  function handleEditMessage(messageId: string) {
    const message = selectedMessages.find((item) => item.id === messageId);

    if (!message || !canEditMessage(message)) {
      return;
    }

    setEditingMessageId(message.id);
    setEditingMessageError(null);
    setDraftMessage(message.text);
    setOpenMessageActionId(null);
    setShowEmojiPicker(false);
  }

  async function handleDeleteMessage(messageId: string) {
    try {
      await deleteMessage(messageId);

      const selectedConversationIdForDelete = selectedConversation?.id ?? null;
      const deletedMessage = selectedMessages.find((message) => message.id === messageId);
      const selectedConversationPreview = selectedConversation
        ? getConversationPreview(selectedConversation)
        : "";
      const isLatestMessage = selectedMessages[selectedMessages.length - 1]?.id === messageId;
      const shouldOverridePreview =
        Boolean(selectedConversationIdForDelete) &&
        Boolean(deletedMessage) &&
        (isLatestMessage || selectedConversationPreview === deletedMessage.text);

      setMessagesByConversation((current) => {
        if (!selectedConversation) {
          return current;
        }

        return {
          ...current,
          [selectedConversation.id]: (current[selectedConversation.id] ?? []).map((message) =>
            message.id === messageId
              ? {
                  ...message,
                  isDeleted: true,
                  text: "",
                  deliveryState: undefined,
                }
              : message,
          ),
        };
      });

      if (editingMessageId === messageId) {
        clearEditMode();
        setDraftMessage("");
      }

      if (shouldOverridePreview && selectedConversationIdForDelete) {
        setDeletedPreviewByConversationId((current) => ({
          ...current,
          [selectedConversationIdForDelete]: true,
        }));

        setConversations((current) =>
          current.map((conversation) =>
            conversation.id === selectedConversationIdForDelete
              ? {
                  ...conversation,
                  lastMessage: "This message was deleted",
                  lastMessagePreview: "This message was deleted",
                  last_message_preview: "This message was deleted",
                }
              : conversation,
          ),
        );

        setSelectedConversationDetail((current) =>
          current && current.id === selectedConversationIdForDelete
            ? {
                ...current,
                lastMessage: "This message was deleted",
                lastMessagePreview: "This message was deleted",
                last_message_preview: "This message was deleted",
              }
            : current,
        );
      }

    } catch (error) {
      setSelectedConversationError(error instanceof Error ? error.message : "Failed to delete message.");
    } finally {
      setOpenMessageActionId(null);
    }
  }

  function handleQuickReply(reply: string) {
    setDraftMessage(reply);
    setShowEmojiPicker(false);
  }

  function handleEmojiPick(emoji: string) {
    setDraftMessage((current) => `${current}${current ? " " : ""}${emoji}`);
    setShowEmojiPicker(false);
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1480px]">
        <div className="mb-4 flex flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#7f9d94]">
            ADMIN MESSAGES
          </p>
          <div className="flex flex-col gap-1">
            <h2 className="text-[26px] font-bold text-[#06201c] sm:text-[28px]">Messages</h2>
            <p className="max-w-2xl text-[13px] text-[#52736a]">
              Manage user conversations across services.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <span className="inline-flex items-center rounded-full bg-[#eef8f2] px-3 py-1 text-[11px] font-semibold text-[#1f6a58]">
              {activeCount} Active conversations
            </span>
            <span className="inline-flex items-center rounded-full bg-[#eef4ff] px-3 py-1 text-[11px] font-semibold text-[#2457d6]">
              {unreadCount} Unread
            </span>
            <span className="inline-flex items-center rounded-full bg-[#f4f7f5] px-3 py-1 text-[11px] font-semibold text-[#6b7f79]">
              {closedCount} Closed
            </span>
          </div>
        </div>

        <div className="grid h-[calc(100vh-210px)] min-h-[680px] gap-4 xl:grid-cols-[392px_minmax(0,1fr)]">
          <section className="flex min-h-0 flex-col overflow-hidden rounded-[20px] border border-[#e1ebe6] bg-white shadow-[0_8px_24px_rgba(15,61,51,0.06)]">
            <div className="border-b border-[#edf3f0] px-4 py-3.5">
              <label className="relative block">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8ca69e]">
                  <SearchIcon />
                </span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by user, service, or doctor"
                  className="h-9 w-full rounded-xl border border-[#d7e5df] bg-[#f8fbf9] pl-10 pr-4 text-[13px] text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]"
                />
              </label>

              <div className="mt-3 flex flex-wrap gap-2">
                {(["ALL", "UNREAD", "CLOSED"] as FilterKind[]).map((item) => {
                  const isActive = filter === item;
                  const label = item === "ALL" ? "All" : item === "UNREAD" ? "Unread" : "Closed";

                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setFilter(item)}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
                        isActive
                          ? "bg-[#1f6a58] text-white shadow-sm"
                          : "bg-[#f1f4f3] text-[#52736a] hover:bg-[#e8f0ec]"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {conversationsError ? (
                <div className="flex min-h-[320px] items-center justify-center px-6 py-12 text-center">
                  <div className="max-w-sm rounded-2xl border border-[#f0d8d2] bg-[#fff6f4] px-4 py-4">
                    <p className="text-sm font-semibold text-[#8f3b2f]">Failed to load conversations</p>
                    <p className="mt-1 text-[13px] leading-6 text-[#a35b4c]">{conversationsError}</p>
                    <button
                      type="button"
                      onClick={() => void refreshConversationList()}
                      className="mt-3 inline-flex items-center rounded-full bg-[#1f6a58] px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-[#175245]"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : isConversationsLoading ? (
                <div className="divide-y divide-[#edf3f0]">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="flex gap-3 px-4 py-3">
                      <div className="h-9 w-9 animate-pulse rounded-full bg-[#edf3f0]" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-3.5 w-3/5 animate-pulse rounded-full bg-[#edf3f0]" />
                        <div className="h-3 w-4/5 animate-pulse rounded-full bg-[#f1f4f3]" />
                        <div className="h-3 w-2/3 animate-pulse rounded-full bg-[#f1f4f3]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex min-h-[320px] items-center justify-center px-6 py-12 text-center">
                  <div>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#eef8f2] text-[#1f6a58]">
                      <InboxIcon />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-[#06201c]">No conversations found</p>
                    <p className="mt-1 text-[13px] text-[#52736a]">
                      Try a different search or switch filters.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-[#edf3f0]">
                  {filteredConversations.map((conversation) => {
                    const isSelected = conversation.id === selectedConversationId;
                    const statusLabel = getListStatusLabel(conversation);

                    return (
                      <button
                        key={conversation.id}
                        type="button"
                        onClick={() => handleConversationSelect(conversation.id)}
                        className={`flex w-full items-start gap-3 px-4 py-3 text-left transition ${
                          isSelected ? "bg-[#f4faf7] ring-1 ring-inset ring-[#d9eee4]" : "hover:bg-[#fbfdfc]"
                        }`}
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1f6a58] text-[11px] font-bold text-white">
                          {getInitials(conversation.userName)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-bold text-[#06201c]">
                                {conversation.userName}
                              </p>
                              <p className="truncate text-xs text-[#52736a]">{conversation.serviceName}</p>
                              <p className="truncate text-xs text-[#7f9d94]">{conversation.doctorName}</p>
                            </div>

                            <div className="flex shrink-0 flex-col items-end gap-1">
                              <span className="text-[11px] font-medium text-[#7f9d94]">
                                {conversation.lastMessageAt}
                              </span>
                              {conversation.unreadCount > 0 ? (
                                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#1f6a58] px-1.5 py-0.5 text-[10px] font-bold text-white">
                                  {conversation.unreadCount}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className="mt-2 flex items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getStatusStyles(
                                statusLabel,
                              )}`}
                            >
                              {statusLabel}
                            </span>
                            <span className="truncate text-[11px] text-[#52736a]">
                              {getConversationPreview(conversation)}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section className="flex min-h-0 flex-col overflow-hidden rounded-[20px] border border-[#e1ebe6] bg-white shadow-[0_8px_24px_rgba(15,61,51,0.06)]">
            {!visibleSelectedConversation ? (
              <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-12 text-center">
                <div className="max-w-md">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#eef8f2] text-[#1f6a58] shadow-sm">
                    <MessageIcon />
                  </div>
                  <h3 className="mt-4 text-[17px] font-semibold text-[#06201c]">No chat selected</h3>
                  <p className="mt-2 text-[13px] leading-6 text-[#52736a]">
                    Select a user conversation to view messages, service details, and chat status.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="border-b-2 border-[#bfdccd] bg-[#f3fbf7] px-4 pb-4 pt-3.5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[17px] font-bold text-[#06201c]">
                          {visibleSelectedConversation.userName}
                        </h3>
                        {selectedConversationLoading ? (
                          <span className="inline-flex items-center rounded-full bg-[#eef4ff] px-2.5 py-1 text-[11px] font-semibold text-[#2457d6]">
                            Loading
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-1.5 space-y-1 text-[12px] text-[#52736a]">
                        <p className="truncate">Service: {visibleSelectedConversation.serviceName}</p>
                        <p className="truncate">
                          Provider: {visibleSelectedConversation.doctorName} · Enterprise:{" "}
                          {visibleSelectedConversation.enterpriseName}
                        </p>
                      </div>

                      <p className="mt-2 text-[11px] text-[#7f9d94]">
                        Service: {visibleSelectedConversation.serviceName} · Doctor:{" "}
                        {visibleSelectedConversation.doctorName} · Enterprise:{" "}
                        {visibleSelectedConversation.enterpriseName}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col items-start gap-2 lg:items-end">
                      {visibleSelectedConversation.chatCloseAt ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#f4f7f5] px-2.5 py-1 text-[11px] font-medium text-[#6b7f79]">
                          <ClockIcon />
                          Closes {visibleSelectedConversation.chatCloseAt}
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#eef8f2] px-2.5 py-1 text-[11px] font-semibold text-[#1f6a58]">
                        <UserIcon />
                        {getHeaderStatusLabel(visibleSelectedConversation)}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          socketStatus === "connected"
                            ? "bg-[#eef8f2] text-[#1f6a58]"
                            : socketStatus === "reconnecting"
                              ? "bg-[#fff6f4] text-[#8b5b17]"
                              : "bg-[#f4f7f5] text-[#6b7f79]"
                        }`}
                      >
                        Live updates:{" "}
                        {socketStatus === "connected"
                          ? "Connected"
                          : socketStatus === "reconnecting"
                            ? "Reconnecting"
                            : "Disconnected"}
                      </span>
                    </div>
                  </div>

                  {getLimitBanner(visibleSelectedConversation.limitReason) ? (
                    <div className="mt-3 rounded-2xl border border-[#f0e2cc] bg-[#fffaf2] px-3 py-2.5 text-[13px] text-[#8b5b17]">
                      {getLimitBanner(visibleSelectedConversation.limitReason)}
                    </div>
                  ) : null}

                  {selectedConversationError ? (
                    <div className="mt-3 rounded-2xl border border-[#f0d8d2] bg-[#fff6f4] px-3 py-2.5 text-[13px] text-[#8f3b2f]">
                      {selectedConversationError}
                    </div>
                  ) : null}
                </div>

                <div ref={messagesListRef} className="min-h-0 flex-1 overflow-y-auto bg-[#fbfdfc] px-4 py-4">
                  {selectedConversationLoading && selectedMessages.length === 0 ? (
                    <div className="flex min-h-[220px] items-center justify-center text-center">
                      <div>
                        <div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-[#edf3f0]" />
                        <p className="mt-3 text-sm font-semibold text-[#06201c]">Loading messages</p>
                        <p className="mt-1 text-[13px] text-[#52736a]">Fetching the conversation thread.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedMessages.map((message) => {
                        const isMine = message.isMine;
                        const showDeleteAction = isMine && !message.isDeleted;
                        const showEditAction = canEditMessage(message);
                        const showMessageActions = showDeleteAction || showEditAction;
                        const isActionOpen = openMessageActionId === message.id;

                        return (
                          <div
                            key={message.id}
                            className={`group relative flex ${isMine ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`relative w-fit max-w-[70%] rounded-xl border px-3 py-1.5 shadow-sm sm:max-w-[60%] ${
                                isMine
                                  ? "border-[#cdebd8] bg-[#dcf8e6] text-[#06201c]"
                                  : "border-[#dfeee6] bg-white text-[#06201c]"
                              }`}
                            >
                              {showMessageActions ? (
                                <div className="absolute right-1 top-1 z-10">
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setOpenMessageActionId((current) =>
                                        current === message.id ? null : message.id,
                                      );
                                    }}
                                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#d7e5df] bg-white/95 text-[#52736a] shadow-sm transition hover:border-[#1f6a58] hover:text-[#1f6a58] ${
                                      isActionOpen
                                        ? "opacity-100"
                                        : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto"
                                    }`}
                                    aria-label="More actions"
                                  >
                                    <MoreVerticalIcon />
                                  </button>

                                  {isActionOpen ? (
                                    <div className="absolute right-0 top-7 z-20 w-28 overflow-hidden rounded-xl border border-[#dfeee6] bg-white shadow-[0_12px_24px_rgba(15,61,51,0.12)]">
                                      {showEditAction ? (
                                        <button
                                          type="button"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            handleEditMessage(message.id);
                                          }}
                                          className="flex w-full items-center px-3 py-2 text-left text-[12px] font-medium text-[#06201c] transition hover:bg-[#f4faf7]"
                                        >
                                          Edit
                                        </button>
                                      ) : null}

                                      {showDeleteAction ? (
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          void handleDeleteMessage(message.id);
                                        }}
                                        className="flex w-full items-center px-3 py-2 text-left text-[12px] font-medium text-[#8f3b2f] transition hover:bg-[#fff6f4]"
                                      >
                                        Delete
                                      </button>
                                      ) : null}
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}

                              {message.attachmentName ? (
                                <div className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-[#f1f4f3] px-2 py-1 text-[12px] font-semibold text-[#506b63]">
                                  <PaperclipIcon />
                                  {message.attachmentName}
                                </div>
                              ) : null}

                              <p
                                className={`text-[13px] leading-5 ${
                                  message.isDeleted ? "italic text-[#6b7f79]" : ""
                                }`}
                              >
                                {formatMessageBody(message)}
                              </p>

                              <div
                                className={`mt-1 flex items-center text-[10px] leading-none text-[#6b7f79] ${
                                  isMine ? "justify-between gap-2" : "justify-end gap-1"
                                }`}
                              >
                                {isMine && !message.isDeleted && message.deliveryState ? (
                                  <span className="flex items-center gap-1 font-medium text-[#6b7f79]">
                                    <span>{message.deliveryState === "read" ? "Read" : "Sent"}</span>
                                    {message.isEdited ? (
                                      <span className="text-[#8ca69e]">edited</span>
                                    ) : null}
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1">
                                    {message.isEdited ? (
                                      <span className="text-[#8ca69e]">edited</span>
                                    ) : null}
                                  </span>
                                )}

                                <span>{message.createdAt}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {visibleTypingUsers.length > 0 && !isTypingConversationReadOnly(visibleSelectedConversation) ? (
                        <div className="flex justify-start">
                          <div className="w-fit max-w-[70%] rounded-xl border border-[#dfeee6] bg-white px-3 py-2 shadow-sm sm:max-w-[60%]">
                            <div className="flex items-center gap-2 text-[12px] text-[#52736a]">
                              <span className="font-medium text-[#06201c]">Typing</span>
                              <span className="inline-flex items-center gap-0.5">
                                <span
                                  className="typing-dot"
                                  style={{ animationDelay: "0ms" }}
                                  aria-hidden="true"
                                >
                                  •
                                </span>
                                <span
                                  className="typing-dot"
                                  style={{ animationDelay: "140ms" }}
                                  aria-hidden="true"
                                >
                                  •
                                </span>
                                <span
                                  className="typing-dot"
                                  style={{ animationDelay: "280ms" }}
                                  aria-hidden="true"
                                >
                                  •
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                {visibleSelectedConversation.canSendMessage ? (
                  <div className="sticky bottom-0 relative border-t border-[#edf3f0] bg-white px-4 py-3.5">
                    {showEmojiPicker ? (
                      <div className="absolute bottom-[calc(100%+12px)] right-4 z-20 w-[240px] rounded-2xl border border-[#e1ebe6] bg-white p-3 shadow-[0_16px_32px_rgba(15,61,51,0.12)]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7f9d94]">
                          Emoji
                        </p>
                        <div className="mt-2 grid grid-cols-5 gap-2">
                          {emojiOptions.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleEmojiPick(emoji)}
                              className="flex h-10 items-center justify-center rounded-xl border border-[#edf3f0] text-lg transition hover:border-[#c7ddd2] hover:bg-[#f4faf7]"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {quickReplies.length > 0 ? (
                      <div className="mb-2">
                        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7f9d94]">
                          Quick replies
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-0.5">
                          {quickReplies.map((reply) => (
                            <button
                              key={reply}
                              type="button"
                              onClick={() => handleQuickReply(reply)}
                              className="shrink-0 rounded-full border border-[#d7e5df] bg-[#f8fbf9] px-2.5 py-1 text-left text-[11px] text-[#355a51] transition hover:border-[#1f6a58] hover:bg-[#eef8f2]"
                            >
                              {reply}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {attachmentUploadStatus !== "idle" ? (
                      <div
                        className={`mb-2 rounded-xl border px-3 py-2 text-[11px] ${
                          attachmentUploadStatus === "failed"
                            ? "border-[#f0d8d2] bg-[#fff6f4] text-[#8f3b2f]"
                            : "border-[#dfeee6] bg-[#f8fbf9] text-[#52736a]"
                        }`}
                      >
                        {attachmentUploadStatus === "uploading"
                          ? "Uploading..."
                          : attachmentUploadStatus === "uploaded"
                            ? `Uploaded: ${attachmentUploadFileName}`
                            : "Upload failed"}
                      </div>
                    ) : null}

                    {editingMessageId ? (
                      <div className="mb-2 rounded-xl border border-[#d7e5df] bg-[#f8fbf9] px-3 py-2 text-[11px] text-[#52736a]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-[#06201c]">Editing message</span>
                          <button
                            type="button"
                            onClick={() => {
                              clearEditMode();
                              setDraftMessage("");
                            }}
                            className="font-semibold text-[#1f6a58] transition hover:text-[#175245]"
                          >
                            Cancel
                          </button>
                        </div>
                        {editingMessageError ? (
                          <p className="mt-1 text-[#8f3b2f]">{editingMessageError}</p>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="flex items-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker((current) => !current)}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#d7e5df] bg-[#f8fbf9] text-[#52736a] transition hover:border-[#c3d7cf] hover:text-[#1f6a58]"
                        aria-label="Pick emoji"
                      >
                        🙂
                      </button>

                      <button
                        type="button"
                        onClick={() => attachmentInputRef.current?.click()}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#d7e5df] bg-[#f8fbf9] text-[#52736a] transition hover:border-[#c3d7cf] hover:text-[#1f6a58]"
                        aria-label="Attach file"
                      >
                        <PaperclipIcon />
                      </button>
                      <input
                        ref={attachmentInputRef}
                        type="file"
                        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,audio/*,video/*"
                        className="hidden"
                        onChange={(event) => void handleAttachmentSelected(event)}
                      />

                      <label className="flex-1">
                        <span className="sr-only">Type your reply</span>
                        <textarea
                          value={draftMessage}
                          onChange={(event) => handleDraftMessageChange(event.target.value)}
                          placeholder="Type your reply..."
                          rows={2}
                          className="min-h-[76px] w-full resize-none rounded-2xl border border-[#d7e5df] bg-[#f8fbf9] px-3.5 py-2.5 text-[13px] text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => void handleSend()}
                        disabled={!draftMessage.trim() || isSendingMessage}
                        className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full bg-[#1f6a58] px-3.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#175245] disabled:cursor-not-allowed disabled:bg-[#9eb5ad]"
                      >
                        <SendIcon />
                        {editingMessageId ? "Save" : "Send"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="sticky bottom-0 relative border-t border-[#edf3f0] bg-[#fbfdfc] px-4 py-3.5">
                    <div className="rounded-2xl border border-[#e7dfcf] bg-[#fffaf2] px-3 py-2.5 text-[13px] text-[#8b5b17]">
                      {getLimitBanner(visibleSelectedConversation.limitReason) ??
                        "Replying is disabled for this conversation."}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      <style jsx>{`
        @keyframes typingDotPulse {
          0%,
          80%,
          100% {
            transform: translateY(0);
            opacity: 0.35;
          }
          40% {
            transform: translateY(-2px);
            opacity: 1;
          }
        }

        .typing-dot {
          display: inline-block;
          animation: typingDotPulse 1.1s infinite ease-in-out;
        }
      `}</style>
    </AppShell>
  );
}
