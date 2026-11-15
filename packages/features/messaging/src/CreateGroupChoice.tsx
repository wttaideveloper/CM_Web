"use client";

import { useTranslation } from "react-i18next";

interface CreateGroupChoiceProps {
  onClose: () => void;
  onSelectTraining: () => void;
  onSelectEvent: () => void;
  canCreateEventGroup: boolean;
}

const cardClass = "group flex h-full min-h-56 flex-col rounded-2xl border bg-white p-5 text-left shadow-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#f4faf7] hover:shadow-[0_10px_24px_rgba(31,106,88,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f6a58] motion-reduce:transform-none motion-reduce:transition-none";
const activeCtaClass = "mt-auto inline-flex w-fit rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-semibold text-white transition duration-200 ease-out group-hover:bg-[#185445] group-hover:shadow-sm motion-reduce:transition-none";

/** Presents the Training and Event Group creation entry points with the same visual treatment. */
export default function CreateGroupChoice({ onClose, onSelectTraining, onSelectEvent, canCreateEventGroup }: CreateGroupChoiceProps) {
  const { t } = useTranslation("groupChatSpeech");
  return <div className="mx-auto w-full max-w-4xl space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7f9d94]">Messages / Groups</p><h1 className="mt-1 text-2xl font-bold text-[#06201c]">{t("eventGroup.createGroupTitle")}</h1><p className="mt-1 text-sm text-[#52736a]">{t("eventGroup.createGroupDescription")}</p></div>
      <button type="button" onClick={onClose} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#52736a]">{t("eventGroup.backToGroups")}</button>
    </div>
    <div className="grid items-stretch gap-4 md:grid-cols-2">
      <button type="button" onClick={onSelectTraining} className={`${cardClass} border-[#d7e5df]`}>
        <h2 className="text-xl font-bold text-[#16332b]">{t("eventGroup.trainingTitle")}</h2>
        <p className="mt-2 text-sm leading-6 text-[#52736a]">{t("eventGroup.trainingDescription")}</p>
        <span className={activeCtaClass}>{t("eventGroup.continueTraining")}</span>
      </button>
      <button type="button" disabled={!canCreateEventGroup} onClick={onSelectEvent} aria-describedby={!canCreateEventGroup ? "event-group-admin-only" : undefined} className={`${cardClass} ${canCreateEventGroup ? "border-[#d7e5df]" : "cursor-not-allowed border-[#e1ebe6] opacity-70 disabled:hover:translate-y-0 disabled:hover:bg-white disabled:hover:shadow-sm"}`}>
        <h2 className="text-xl font-bold text-[#16332b]">{t("eventGroup.eventTitle")}</h2>
        <p className="mt-2 text-sm leading-6 text-[#52736a]">{t("eventGroup.eventDescription")}</p>
        {!canCreateEventGroup ? <div className="mt-4"><span className="inline-flex rounded-full border border-[#d7e5df] bg-[#f4faf7] px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-[#52736a]">{t("eventGroup.adminOnlyLabel")}</span><span id="event-group-admin-only" className="mt-2 block text-xs leading-5 text-[#52736a]">{t("eventGroup.adminOnlyDescription")}</span></div> : <div className="mt-4 min-h-[2.75rem]" aria-hidden="true" />}
        <span className={canCreateEventGroup ? activeCtaClass : "mt-auto inline-flex w-fit rounded-full border border-[#b7c9c2] bg-[#eef5f1] px-4 py-2 text-sm font-semibold text-[#52736a]"}>{canCreateEventGroup ? t("eventGroup.continueEvent") : t("eventGroup.adminOnlyCta")}</span>
      </button>
    </div>
  </div>;
}

/** Blocks manual entry into Event Group creation for non-admin roles. */
export function EventGroupCreationBlocked({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation("groupChatSpeech");
  return <section className="mx-auto w-full max-w-2xl rounded-2xl border border-[#e1ebe6] bg-white p-6 shadow-sm" aria-labelledby="event-group-creation-blocked-title">
    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7f9d94]">{t("eventGroup.messagesGroups")}</p>
    <h1 id="event-group-creation-blocked-title" className="mt-2 text-2xl font-bold text-[#16332b]">{t("eventGroup.creationBlockedTitle")}</h1>
    <p className="mt-2 text-sm leading-6 text-[#52736a]">{t("eventGroup.adminOnlyDescription")}</p>
    <button type="button" onClick={onClose} className="mt-5 rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#52736a]">{t("eventGroup.backToGroupTypes")}</button>
  </section>;
}
