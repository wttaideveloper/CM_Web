"use client";

import { useState } from "react";
import { useAuth } from "@ihp/auth";
import EnterpriseGroupChatScreen from "./EnterpriseGroupChatScreen";
import EnterpriseGroupComplianceReportsScreen from "./EnterpriseGroupComplianceReportsScreen";
import EnterpriseGroupAuditTrailScreen from "./EnterpriseGroupAuditTrailScreen";
import EnterpriseGroupOwnerReassignmentScreen from "./EnterpriseGroupOwnerReassignmentScreen";
import EnterpriseGroupLegalHoldScreen from "./EnterpriseGroupLegalHoldScreen";
import EnterpriseGroupOriginalMessageReviewScreen from "./EnterpriseGroupOriginalMessageReviewScreen";
import EnterpriseMessagesScreen from "./EnterpriseMessagesScreen";
import { canAccessGroupChatComplianceReports } from "./group-chat-models";

type MessagingView = "direct" | "groups" | "compliance-reports" | "owner-reassignment" | "group-audit" | "legal-hold" | "secure-message-review";

/** Adds isolated Group Chat navigation while leaving the existing direct-chat screen intact. */
export default function EnterpriseMessagingHubScreen() {
  const { roles } = useAuth();
  const canAccessComplianceReports = canAccessGroupChatComplianceReports(roles);
  const [view, setView] = useState<MessagingView>("direct");
  const [auditContext, setAuditContext] = useState<{ groupId?: string; action?: string }>({});
  const [reviewContext, setReviewContext] = useState<{ groupId?: string; messageId?: string }>({});
  const openAudit = (groupId?: string, action?: string) => { setAuditContext({ groupId, action }); setView("group-audit"); };
  const openReview = (groupId: string, messageId: string) => { setReviewContext({ groupId, messageId }); setView("secure-message-review"); };
  return <div className="space-y-2">
    <nav aria-label="Messages views" className="flex flex-wrap gap-1.5 border-b border-[#e1ebe6] pb-2">
      <button type="button" role="tab" aria-selected={view === "direct"} onClick={() => setView("direct")} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${view === "direct" ? "bg-[#1f6a58] text-white" : "bg-[#f4faf7] text-[#52736a]"}`}>Direct Messages</button>
      <button type="button" role="tab" aria-selected={view === "groups"} onClick={() => setView("groups")} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${view === "groups" ? "bg-[#1f6a58] text-white" : "bg-[#f4faf7] text-[#52736a]"}`}>Groups</button>
      {canAccessComplianceReports ? <>
        <button type="button" role="tab" aria-selected={view === "compliance-reports"} onClick={() => setView("compliance-reports")} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${view === "compliance-reports" ? "bg-[#1f6a58] text-white" : "bg-[#f4faf7] text-[#52736a]"}`}>Compliance Reports</button>
        <button type="button" role="tab" aria-selected={view === "owner-reassignment"} onClick={() => setView("owner-reassignment")} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${view === "owner-reassignment" ? "bg-[#1f6a58] text-white" : "bg-[#f4faf7] text-[#52736a]"}`}>Owner Reassignment</button>
        <button type="button" role="tab" aria-selected={view === "group-audit"} onClick={() => openAudit()} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${view === "group-audit" ? "bg-[#1f6a58] text-white" : "bg-[#f4faf7] text-[#52736a]"}`}>Group Audit Trail</button>
        <button type="button" role="tab" aria-selected={view === "legal-hold"} onClick={() => setView("legal-hold")} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${view === "legal-hold" ? "bg-[#1f6a58] text-white" : "bg-[#f4faf7] text-[#52736a]"}`}>Legal Hold</button>
        <button type="button" role="tab" aria-selected={view === "secure-message-review"} onClick={() => { setReviewContext({}); setView("secure-message-review"); }} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${view === "secure-message-review" ? "bg-[#1f6a58] text-white" : "bg-[#f4faf7] text-[#52736a]"}`}>Secure Message Review</button>
      </> : null}
    </nav>
    {view === "direct" ? <EnterpriseMessagesScreen /> : view === "groups" ? <EnterpriseGroupChatScreen /> : view === "compliance-reports" ? <EnterpriseGroupComplianceReportsScreen /> : view === "owner-reassignment" ? <EnterpriseGroupOwnerReassignmentScreen /> : view === "group-audit" ? <EnterpriseGroupAuditTrailScreen initialGroupId={auditContext.groupId} initialAction={auditContext.action} ownerEntry={false} onOpenSecureReview={openReview} /> : view === "legal-hold" ? <EnterpriseGroupLegalHoldScreen /> : <EnterpriseGroupOriginalMessageReviewScreen initialGroupId={reviewContext.groupId} initialMessageId={reviewContext.messageId} onOpenAudit={openAudit} />}
  </div>;
}
