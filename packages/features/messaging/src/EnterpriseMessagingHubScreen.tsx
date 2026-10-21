"use client";

import { useState } from "react";
import EnterpriseGroupChatScreen from "./EnterpriseGroupChatScreen";
import EnterpriseMessagesScreen from "./EnterpriseMessagesScreen";

type MessagingView = "direct" | "groups";

/** Adds isolated Group Chat navigation while leaving the existing direct-chat screen intact. */
export default function EnterpriseMessagingHubScreen() {
  const [view, setView] = useState<MessagingView>("direct");
  return <div className="space-y-4"><nav aria-label="Messages views" className="flex flex-wrap gap-2 border-b border-[#e1ebe6] pb-3"><button type="button" role="tab" aria-selected={view === "direct"} onClick={() => setView("direct")} className={`rounded-full px-4 py-2 text-sm font-semibold ${view === "direct" ? "bg-[#1f6a58] text-white" : "bg-[#f4faf7] text-[#52736a]"}`}>Direct Messages</button><button type="button" role="tab" aria-selected={view === "groups"} onClick={() => setView("groups")} className={`rounded-full px-4 py-2 text-sm font-semibold ${view === "groups" ? "bg-[#1f6a58] text-white" : "bg-[#f4faf7] text-[#52736a]"}`}>Groups</button></nav>{view === "direct" ? <EnterpriseMessagesScreen /> : <EnterpriseGroupChatScreen />}</div>;
}
