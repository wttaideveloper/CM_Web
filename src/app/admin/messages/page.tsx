"use client";

import AppShell from "@/components/layout/AppShell";
import { useMemo, useState } from "react";

type ChatStatus = "ACTIVE" | "READ_ONLY" | "CLOSED";
type LimitReason = "CHAT_WINDOW_CLOSED" | "FREE_LIMIT_REACHED" | "BOOKING_REQUIRED";
type SenderType = "USER" | "PROVIDER";

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
  lastMessageAt: string;
  chatCloseAt?: string;
};

type ChatMessage = {
  id: string;
  conversationId: string;
  sender: SenderType;
  text: string;
  createdAt: string;
  status?: "sent" | "delivered" | "seen";
  isEdited?: boolean;
  isDeleted?: boolean;
  attachmentName?: string;
};

type FilterKind = "ALL" | "UNREAD" | "CLOSED";

const emojiOptions = ["😀", "😊", "👍", "🙏", "❤️", "👋", "✅", "🩺", "💬", "📎"];

const initialConversations: Conversation[] = [
  {
    id: "conv-1",
    userName: "Alicia Bennett",
    serviceName: "Physiotherapy Session",
    doctorName: "Dr. Maya Rao",
    enterpriseName: "IHP Care Clinic",
    status: "ACTIVE",
    canSendMessage: true,
    unreadCount: 3,
    lastMessage: "Can we move my follow-up to Friday?",
    lastMessageAt: "10:42 AM",
  },
  {
    id: "conv-2",
    userName: "Marcus Lee",
    serviceName: "Dermatology Consult",
    doctorName: "Dr. Elena Cruz",
    enterpriseName: "IHP Specialty Network",
    status: "ACTIVE",
    canSendMessage: true,
    unreadCount: 0,
    lastMessage: "Prescription uploaded. Please review the dosage notes.",
    lastMessageAt: "09:18 AM",
  },
  {
    id: "conv-3",
    userName: "Nina Patel",
    serviceName: "Nutrition Check-in",
    doctorName: "Dr. Samir Khan",
    enterpriseName: "IHP Wellness",
    status: "CLOSED",
    canSendMessage: false,
    limitReason: "CHAT_WINDOW_CLOSED",
    unreadCount: 0,
    lastMessage: "Thanks for the update.",
    lastMessageAt: "Yesterday",
    chatCloseAt: "Jul 08, 10:30 AM",
  },
  {
    id: "conv-4",
    userName: "Jonas Reed",
    serviceName: "Post-op Follow-up",
    doctorName: "Dr. Aisha Malik",
    enterpriseName: "IHP Surgical Care",
    status: "READ_ONLY",
    canSendMessage: false,
    limitReason: "FREE_LIMIT_REACHED",
    unreadCount: 1,
    lastMessage: "I have a quick question about wound care.",
    lastMessageAt: "Mon",
  },
];

const initialMessages: Record<string, ChatMessage[]> = {
  "conv-1": [
    {
      id: "c1-m1",
      conversationId: "conv-1",
      sender: "USER",
      text: "Hi, I am feeling a bit more sore after yesterday's session.",
      createdAt: "10:08 AM",
    },
    {
      id: "c1-m2",
      conversationId: "conv-1",
      sender: "PROVIDER",
      text: "Thanks for the update. Please keep the warm compress routine and share any swelling changes.",
      createdAt: "10:14 AM",
      status: "seen",
    },
    {
      id: "c1-m3",
      conversationId: "conv-1",
      sender: "USER",
      text: "Can we move my follow-up to Friday?",
      createdAt: "10:42 AM",
      isEdited: true,
    },
    {
      id: "c1-m4",
      conversationId: "conv-1",
      sender: "PROVIDER",
      text: "I have shared the new slot options with the front desk.",
      createdAt: "10:45 AM",
      status: "seen",
      attachmentName: "Prescription.pdf",
    },
  ],
  "conv-2": [
    {
      id: "c2-m1",
      conversationId: "conv-2",
      sender: "USER",
      text: "The rash is improving, but there is still a little redness.",
      createdAt: "08:52 AM",
    },
    {
      id: "c2-m2",
      conversationId: "conv-2",
      sender: "PROVIDER",
      text: "Please continue the ointment for three more days and avoid direct sun exposure.",
      createdAt: "09:02 AM",
      status: "seen",
    },
    {
      id: "c2-m3",
      conversationId: "conv-2",
      sender: "PROVIDER",
      text: "Prescription uploaded. Please review the dosage notes.",
      createdAt: "09:18 AM",
      status: "seen",
      attachmentName: "Prescription.pdf",
    },
  ],
  "conv-3": [
    {
      id: "c3-m1",
      conversationId: "conv-3",
      sender: "USER",
      text: "Thanks for adjusting the meal plan.",
      createdAt: "Yesterday",
    },
    {
      id: "c3-m2",
      conversationId: "conv-3",
      sender: "PROVIDER",
      text: "You are welcome. I have also added a hydration checklist.",
      createdAt: "Yesterday",
      status: "seen",
    },
    {
      id: "c3-m3",
      conversationId: "conv-3",
      sender: "PROVIDER",
      text: "This message was deleted.",
      createdAt: "Yesterday",
      status: "seen",
      isDeleted: true,
    },
  ],
  "conv-4": [
    {
      id: "c4-m1",
      conversationId: "conv-4",
      sender: "USER",
      text: "I have a quick question about wound care.",
      createdAt: "Mon",
    },
    {
      id: "c4-m2",
      conversationId: "conv-4",
      sender: "PROVIDER",
      text: "You can keep the area clean and dry. If the dressing loosens, replace it gently.",
      createdAt: "Mon",
      status: "delivered",
    },
  ],
};

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
      <path d="M20 20a8 8 0 1 0-16 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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

export default function AdminMessagesPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKind>("ALL");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [draftMessage, setDraftMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [conversations, setConversations] = useState(initialConversations);
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, ChatMessage[]>>(
    initialMessages
  );

  const filteredConversations = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return conversations.filter((conversation) => {
      const matchesSearch =
        !normalized ||
        conversation.userName.toLowerCase().includes(normalized) ||
        conversation.serviceName.toLowerCase().includes(normalized) ||
        conversation.doctorName.toLowerCase().includes(normalized) ||
        conversation.enterpriseName.toLowerCase().includes(normalized);

      const matchesFilter =
        filter === "ALL"
          ? true
          : filter === "UNREAD"
            ? conversation.unreadCount > 0
            : conversation.status !== "ACTIVE" || !conversation.canSendMessage;

      return matchesSearch && matchesFilter;
    });
  }, [conversations, filter, search]);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  );

  const visibleSelectedConversation =
    selectedConversationId && filteredConversations.some((conversation) => conversation.id === selectedConversationId)
      ? selectedConversation
      : null;

  const selectedMessages = visibleSelectedConversation
    ? messagesByConversation[visibleSelectedConversation.id] ?? []
    : [];

  const quickReplies = visibleSelectedConversation ? getQuickReplies(visibleSelectedConversation) : [];

  const activeCount = conversations.filter(
    (conversation) => conversation.status === "ACTIVE" && conversation.canSendMessage
  ).length;
  const unreadCount = conversations.filter((conversation) => conversation.unreadCount > 0).length;
  const closedCount = conversations.filter(
    (conversation) => conversation.status !== "ACTIVE" || !conversation.canSendMessage
  ).length;

  function handleSend() {
    const text = draftMessage.trim();
    if (!text || !selectedConversation || !selectedConversation.canSendMessage) {
      return;
    }

    const nextMessage: ChatMessage = {
      id: `${selectedConversation.id}-${Date.now()}`,
      conversationId: selectedConversation.id,
      sender: "PROVIDER",
      text,
      createdAt: "Just now",
      status: "sent",
    };

    setMessagesByConversation((current) => ({
      ...current,
      [selectedConversation.id]: [...(current[selectedConversation.id] ?? []), nextMessage],
    }));

    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === selectedConversation.id
          ? {
              ...conversation,
              lastMessage: text,
              lastMessageAt: "Just now",
              unreadCount: 0,
            }
          : conversation
      )
    );

    setDraftMessage("");
    setShowEmojiPicker(false);
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
              {filteredConversations.length === 0 ? (
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
                        onClick={() => setSelectedConversationId(conversation.id)}
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
                                statusLabel
                              )}`}
                            >
                              {statusLabel}
                            </span>
                            <span className="truncate text-[11px] text-[#52736a]">
                              {conversation.lastMessage}
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
                      </div>

                      <div className="mt-1.5 space-y-1 text-[12px] text-[#52736a]">
                        <p className="truncate">
                          Service: {visibleSelectedConversation.serviceName}
                        </p>
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
                    </div>
                  </div>

                  {getLimitBanner(visibleSelectedConversation.limitReason) ? (
                    <div className="mt-3 rounded-2xl border border-[#f0e2cc] bg-[#fffaf2] px-3 py-2.5 text-[13px] text-[#8b5b17]">
                      {getLimitBanner(visibleSelectedConversation.limitReason)}
                    </div>
                  ) : null}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto bg-[#fbfdfc] px-4 py-4">
                  <div className="space-y-2.5">
                    {selectedMessages.map((message) => {
                      const isProvider = message.sender === "PROVIDER";

                      return (
                        <div key={message.id} className={`flex ${isProvider ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`w-fit max-w-[70%] rounded-xl border px-3 py-1.5 shadow-sm sm:max-w-[60%] ${
                              isProvider
                                ? "border-[#cdebd8] bg-[#dcf8e6] text-[#06201c]"
                                : "border-[#dfeee6] bg-white text-[#06201c]"
                            }`}
                          >
                            {message.attachmentName ? (
                              <div className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-[#f1f4f3] px-2 py-1 text-[12px] font-semibold text-[#506b63]">
                                <PaperclipIcon />
                                {message.attachmentName}
                              </div>
                            ) : null}

                            <p className={`text-[13px] leading-5 ${message.isDeleted ? "italic text-[#6b7f79]" : ""}`}>
                              {formatMessageBody(message)}
                            </p>

                            <div className="mt-1 flex items-center justify-end gap-1 text-[10px] leading-none text-[#6b7f79]">
                              <span>{message.createdAt}</span>
                              {message.isEdited ? <span>Edited</span> : null}
                              {isProvider && message.status ? (
                                <span className="font-semibold text-[#1f6a58]">
                                  {message.status === "seen"
                                    ? "Seen"
                                    : message.status === "delivered"
                                      ? "Delivered"
                                      : "Sent"}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#d7e5df] bg-[#f8fbf9] text-[#52736a] transition hover:border-[#c3d7cf] hover:text-[#1f6a58]"
                        aria-label="Attach file"
                      >
                        <PaperclipIcon />
                      </button>

                      <label className="flex-1">
                        <span className="sr-only">Type your reply</span>
                        <textarea
                          value={draftMessage}
                          onChange={(event) => setDraftMessage(event.target.value)}
                          placeholder="Type your reply..."
                          rows={2}
                          className="min-h-[76px] w-full resize-none rounded-2xl border border-[#d7e5df] bg-[#f8fbf9] px-3.5 py-2.5 text-[13px] text-[#06201c] outline-none placeholder:text-[#8ca69e] focus:border-[#1f6a58]"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={handleSend}
                        disabled={!draftMessage.trim()}
                        className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full bg-[#1f6a58] px-3.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#175245] disabled:cursor-not-allowed disabled:bg-[#9eb5ad]"
                      >
                        <SendIcon />
                        Send
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
    </AppShell>
  );
}

