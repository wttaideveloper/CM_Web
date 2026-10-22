"use client";

import { useState } from "react";
import { useAuth } from "@ihp/auth";
import EnterpriseGroupChatScreen from "./EnterpriseGroupChatScreen";
import EnterpriseGroupComplianceReportsScreen from "./EnterpriseGroupComplianceReportsScreen";
import EnterpriseMessagesScreen from "./EnterpriseMessagesScreen";
import { canAccessGroupChatComplianceReports } from "./group-chat-models";

type MessagingView = "direct" | "groups" | "compliance-reports";

/** Adds isolated Group Chat navigation while leaving the existing direct-chat screen intact. */
export default function EnterpriseMessagingHubScreen() {
  const { roles } = useAuth();
  const canAccessComplianceReports = canAccessGroupChatComplianceReports(roles);
  const [view, setView] = useState<MessagingView>("direct");
  return <div className="space-y-2"><nav aria-label="Messages views" className="flex flex-wrap gap-1.5 border-b border-[#e1ebe6] pb-2"><button type="button" role="tab" aria-selected={view === "direct"} onClick={() => setView("direct")} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${view === "direct" ? "bg-[#1f6a58] text-white" : "bg-[#f4faf7] text-[#52736a]"}`}>Direct Messages</button><button type="button" role="tab" aria-selected={view === "groups"} onClick={() => setView("groups")} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${view === "groups" ? "bg-[#1f6a58] text-white" : "bg-[#f4faf7] text-[#52736a]"}`}>Groups</button>{canAccessComplianceReports ? <button type="button" role="tab" aria-selected={view === "compliance-reports"} onClick={() => setView("compliance-reports")} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${view === "compliance-reports" ? "bg-[#1f6a58] text-white" : "bg-[#f4faf7] text-[#52736a]"}`}>Compliance Reports</button> : null}</nav>{view === "direct" ? <EnterpriseMessagesScreen /> : view === "groups" ? <EnterpriseGroupChatScreen /> : <EnterpriseGroupComplianceReportsScreen />}</div>;
}
