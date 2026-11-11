"use client";

import { useCallback, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import EventGroupAttendeePicker from "./EventGroupAttendeePicker";
import EventGroupEventPicker from "./EventGroupEventPicker";
import EventGroupProviderPicker from "./EventGroupProviderPicker";
import { GroupAvatarDisplay, GroupAvatarPicker, useGroupAvatarPreview } from "./GroupChatAvatar";
import { createEventGroup } from "./group-chat/event-group.service";
import { eventGroupQueryKeys } from "./group-chat/event-group.queries";
import { buildEventGroupCreatePayload, validateEventGroupCreatePayload } from "./group-chat/event-group.models";
import type { EventGroupAttendee, EventGroupEvent, EventGroupProvider } from "./group-chat/event-group.types";
import { uploadGroupAvatar } from "./group-chat/group-chat.service";
import { isSupportedEventGroupAvatarFile } from "./group-chat-models";
import { eventGroupReviewLabel, formatEventGroupAvatarFileSize, isEventGroupCreationEnabled, type EventGroupCreationStep, summarizeEventGroupCapacity, toggleEventAttendeeSelection, toggleEventGroupProviderSelection, validateEventGroupReview } from "./event-group-wizard-models";

interface EventGroupWizardProps {
  onClose: () => void;
  onCreated?: (groupId: string) => void;
}

/** Provides the complete Event Group preparation flow with a hard-disabled production creation gate. */
export default function EventGroupWizard({ onClose, onCreated }: EventGroupWizardProps) {
  const { t } = useTranslation("groupChatSpeech");
  const queryClient = useQueryClient();
  const [step, setStep] = useState<EventGroupCreationStep>("event");
  const [event, setEvent] = useState<EventGroupEvent | null>(null);
  const [selectedAttendees, setSelectedAttendees] = useState<Readonly<Record<string, EventGroupAttendee>>>({});
  const [selectedProviders, setSelectedProviders] = useState<Readonly<Record<string, EventGroupProvider>>>({});
  const [inviteAllRegistered, setInviteAllRegistered] = useState(false);
  const [maxMembers, setMaxMembers] = useState<number | null>(null);
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [adminsOnlyPosting, setAdminsOnlyPosting] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarPreviewUrl = useGroupAvatarPreview(avatarFile);
  const selectEvent = (selectedEvent: EventGroupEvent) => { setEvent(selectedEvent); setSelectedAttendees({}); setSelectedProviders({}); setInviteAllRegistered(false); setMaxMembers(null); setStep("attendees"); };
  const toggleAttendee = (attendee: EventGroupAttendee) => setSelectedAttendees((current) => toggleEventAttendeeSelection(current, attendee));
  const toggleProvider = (provider: EventGroupProvider) => setSelectedProviders((current) => toggleEventGroupProviderSelection(current, provider));
  const handleAvatarChange = (file: File | null) => {
    if (file && !isSupportedEventGroupAvatarFile(file)) {
      setAvatarFile(null);
      setAvatarError(t("eventGroup.avatarInvalidFormat"));
      return;
    }
    setAvatarError(null);
    setAvatarFile(file);
  };
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!event || !isEventGroupCreationEnabled()) throw new Error("Event Group creation is not enabled for this environment.");
      const attendeeInvitees = inviteAllRegistered ? [] : Object.values(selectedAttendees).map((attendee) => ({ user_id: attendee.user_id as string }));
      const providerInvitees = Object.values(selectedProviders).map((provider) => ({ user_id: provider.user_id, display_name: provider.name }));
      const basePayload = buildEventGroupCreatePayload({ name: groupName, contextId: event.id, description, invitees: [...attendeeInvitees, ...providerInvitees], adminsOnlyPosting, inviteAllRegistered, excludeUserIds: inviteAllRegistered ? Object.keys(selectedAttendees) : undefined });
      const validationError = validateEventGroupCreatePayload(basePayload);
      if (validationError) throw new Error(validationError);
      const avatarUrl = avatarFile ? await uploadGroupAvatar(avatarFile) : undefined;
      const payload = avatarUrl ? buildEventGroupCreatePayload({ name: groupName, contextId: event.id, description, avatarUrl, invitees: [...attendeeInvitees, ...providerInvitees], adminsOnlyPosting, inviteAllRegistered, excludeUserIds: inviteAllRegistered ? Object.keys(selectedAttendees) : undefined }) : basePayload;
      return createEventGroup(payload);
    },
    retry: false,
    onSuccess: async (created) => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: eventGroupQueryKeys.all }), queryClient.invalidateQueries({ queryKey: ["group-chat", "groups"] })]);
      onCreated?.(created.id);
    },
  });
  const handleCreate = () => { if (!isEventGroupCreationEnabled() || createMutation.isPending) return; createMutation.mutate(); };
  const updateCapacity = useCallback((value: number | null) => setMaxMembers(value), []);
  if (!event || step === "event") return <EventGroupEventPicker onBack={onClose} onSelect={selectEvent} />;
  if (step === "attendees") return <EventGroupAttendeePicker event={event} selectedAttendees={selectedAttendees} inviteAllRegistered={inviteAllRegistered} onBack={() => setStep("event")} onContinue={() => setStep("details")} onCapacityChange={updateCapacity} onInviteAllRegisteredChange={setInviteAllRegistered} onToggle={toggleAttendee} />;
  if (step === "details") return <DetailsStep event={event} groupName={groupName} description={description} adminsOnlyPosting={adminsOnlyPosting} avatarPreviewUrl={avatarPreviewUrl} avatarFileName={avatarFile?.name ?? null} avatarFileSize={avatarFile?.size ?? null} avatarError={avatarError} selectedProviders={selectedProviders} onBack={() => setStep("attendees")} onContinue={() => setStep("review")} onGroupNameChange={setGroupName} onDescriptionChange={setDescription} onAdminsOnlyPostingChange={setAdminsOnlyPosting} onAvatarChange={handleAvatarChange} onAvatarClear={() => { setAvatarFile(null); setAvatarError(null); }} onToggleProvider={toggleProvider} />;
  return <ReviewStep event={event} attendees={Object.values(selectedAttendees)} providers={Object.values(selectedProviders)} groupName={groupName} description={description} adminsOnlyPosting={adminsOnlyPosting} avatarPreviewUrl={avatarPreviewUrl} avatarFileName={avatarFile?.name ?? null} avatarFileSize={avatarFile?.size ?? null} inviteAllRegistered={inviteAllRegistered} maxMembers={maxMembers} isCreating={createMutation.isPending} error={createMutation.error?.message ?? null} onBack={() => setStep("details")} onClose={onClose} onCreate={handleCreate} />;
}

interface DetailsStepProps { event: EventGroupEvent; groupName: string; description: string; adminsOnlyPosting: boolean; avatarPreviewUrl: string | null; avatarFileName: string | null; avatarFileSize: number | null; avatarError: string | null; selectedProviders: Readonly<Record<string, EventGroupProvider>>; onBack: () => void; onContinue: () => void; onGroupNameChange: (value: string) => void; onDescriptionChange: (value: string) => void; onAdminsOnlyPostingChange: (value: boolean) => void; onAvatarChange: (file: File | null) => void; onAvatarClear: () => void; onToggleProvider: (provider: EventGroupProvider) => void; }

function DetailsStep({ event, groupName, description, adminsOnlyPosting, avatarPreviewUrl, avatarFileName, avatarFileSize, avatarError, selectedProviders, onBack, onContinue, onGroupNameChange, onDescriptionChange, onAdminsOnlyPostingChange, onAvatarChange, onAvatarClear, onToggleProvider }: DetailsStepProps) {
  const { t } = useTranslation("groupChatSpeech");
  const canContinue = groupName.trim().length >= 1 && groupName.trim().length <= 120 && description.length <= 500 && !avatarError;
  return <div className="mx-auto w-full max-w-3xl space-y-5"><StepHeading label={t("eventGroup.stepDetails")} title={t("eventGroup.groupDetailsTitle")} description={t("eventGroup.groupDetailsDescription")} /><div className="rounded-2xl border border-[#d7e5df] bg-white p-5 shadow-sm"><div className="rounded-xl bg-[#f4faf7] p-3"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#52736a]">{t("eventGroup.selectedEvent")}</p><p className="mt-1 font-semibold text-[#16332b]">{eventGroupReviewLabel(event)}</p><p className="text-xs text-[#52736a]">{event.status?.replace(/[_-]+/g, " ") ?? t("eventGroup.statusUnavailable")}</p></div><label className="mt-4 block text-sm font-semibold text-[#16332b]">{t("eventGroup.groupName")}<input value={groupName} onChange={(change) => onGroupNameChange(change.target.value)} maxLength={120} className="mt-1 h-11 w-full rounded-xl border border-[#d7e5df] px-3 font-normal outline-none focus:border-[#1f6a58]" placeholder={t("eventGroup.groupNamePlaceholder")} /></label><label className="mt-4 block text-sm font-semibold text-[#16332b]">{t("eventGroup.description")}<textarea value={description} onChange={(change) => onDescriptionChange(change.target.value)} maxLength={500} rows={4} className="mt-1 w-full rounded-xl border border-[#d7e5df] px-3 py-2 font-normal outline-none focus:border-[#1f6a58]" placeholder={t("eventGroup.descriptionPlaceholder")} /></label><label className="mt-4 flex items-start gap-3 text-sm font-semibold text-[#16332b]"><input type="checkbox" checked={adminsOnlyPosting} onChange={(change) => onAdminsOnlyPostingChange(change.target.checked)} className="mt-1 h-4 w-4 accent-[#1f6a58]" /><span><span className="block">{t("eventGroup.adminsOnlyPosting")}</span><span className="mt-1 block text-xs font-normal text-[#52736a]">{t("eventGroup.adminsOnlyPostingDescription")}</span></span></label><GroupAvatarPicker name={groupName || "Event Group"} previewUrl={avatarPreviewUrl} fileName={avatarFileName} fileSize={avatarFileSize} error={avatarError} accept="image/png,image/jpeg,image/webp" onSelect={onAvatarChange} onClear={onAvatarClear} /><p className="mt-2 text-xs text-[#805900]">{t("eventGroup.avatarUploadOnCreate")}</p></div><EventGroupProviderPicker eventId={event.id} selectedProviders={selectedProviders} onToggle={onToggleProvider} /><div className="flex justify-between gap-2"><button type="button" onClick={onBack} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#52736a]">{t("eventGroup.back")}</button><button type="button" disabled={!canContinue} onClick={onContinue} className="rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{t("eventGroup.review")}</button></div></div>;
}

interface ReviewStepProps { event: EventGroupEvent; attendees: readonly EventGroupAttendee[]; providers: readonly EventGroupProvider[]; groupName: string; description: string; adminsOnlyPosting: boolean; avatarPreviewUrl: string | null; avatarFileName: string | null; avatarFileSize: number | null; inviteAllRegistered: boolean; maxMembers: number | null; isCreating: boolean; error: string | null; onBack: () => void; onClose: () => void; onCreate: () => void; }

function ReviewStep({ event, attendees, providers, groupName, description, adminsOnlyPosting, avatarPreviewUrl, avatarFileName, avatarFileSize, inviteAllRegistered, maxMembers, isCreating, error, onBack, onClose, onCreate }: ReviewStepProps) {
  const { t } = useTranslation("groupChatSpeech");
  const creationEnabled = isEventGroupCreationEnabled();
  const capacity = summarizeEventGroupCapacity({ maxMembers, selectedAttendeeCount: inviteAllRegistered ? 0 : attendees.length, selectedProviderCount: providers.length, inviteAllRegistered });
  const individualSelectionFits = capacity.maxMembers === null || capacity.selectedMemberCount <= Math.max(0, capacity.maxMembers - capacity.ownerReserved);
  const reviewValidationError = validateEventGroupReview({ eventId: event.id, groupName, description, attendeeUserIds: attendees.map((attendee) => attendee.user_id).filter((userId): userId is string => Boolean(userId)), providerUserIds: providers.map((provider) => provider.user_id), inviteAllRegistered, maxMembers });
  const reviewValidationMessage = reviewValidationError ? t(`eventGroup.reviewValidation.${reviewValidationError}`) : null;
  return <div className="mx-auto w-full max-w-4xl space-y-5"><StepHeading label={t("eventGroup.stepReview")} title={t("eventGroup.reviewTitle")} description={t("eventGroup.reviewDescription")} /><div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]"><section className="space-y-4 rounded-2xl border border-[#d7e5df] bg-white p-5 shadow-sm"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#52736a]">{t("eventGroup.selectedEvent")}</p><h2 className="mt-1 text-lg font-bold text-[#16332b]">{eventGroupReviewLabel(event)}</h2><p className="text-sm text-[#52736a]">{event.status?.replace(/[_-]+/g, " ") ?? t("eventGroup.statusUnavailable")}</p></div><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#52736a]">{t("eventGroup.groupDetails")}</p><div className="mt-2 flex items-center gap-3"><GroupAvatarDisplay name={groupName || "Event Group"} url={avatarPreviewUrl} size="medium" /><div className="min-w-0 text-sm text-[#52736a]"><p className="font-semibold text-[#16332b]">{t("eventGroup.avatar")}</p><p>{avatarFileName ? `${avatarFileName} · ${formatEventGroupAvatarFileSize(avatarFileSize)}` : t("eventGroup.notSelected")}</p></div></div><dl className="mt-3 space-y-1 text-sm text-[#16332b]"><div><dt className="inline font-semibold">{t("eventGroup.groupName")}:</dt> <dd className="inline">{groupName}</dd></div><div><dt className="inline font-semibold">{t("eventGroup.description")}:</dt> <dd className="inline">{description || t("eventGroup.notProvided")}</dd></div><div><dt className="inline font-semibold">{t("eventGroup.adminsOnlyPosting")}:</dt> <dd className="inline">{adminsOnlyPosting ? t("eventGroup.enabled") : t("eventGroup.disabled")}</dd></div></dl></div><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#52736a]">{t("eventGroup.invitationMode")}</p><p className="mt-1 text-sm text-[#16332b]">{inviteAllRegistered ? t("eventGroup.inviteAllRegisteredSummary", { count: attendees.length }) : t("eventGroup.individualInvitationSummary", { attendees: attendees.length, providers: providers.length })}</p></div></section><aside className="space-y-3"><div className="rounded-2xl border border-[#d7e5df] bg-white p-4 text-sm text-[#52736a]"><h2 className="font-bold text-[#16332b]">{t("eventGroup.capacityTitle")}</h2><p className="mt-1">{capacity.maxMembers === null ? t("eventGroup.capacityUnavailable") : t("eventGroup.capacitySummary", { maxMembers: capacity.maxMembers, selected: capacity.selectedMemberCount, remaining: capacity.remainingMemberSlots })}</p>{inviteAllRegistered ? <p className="mt-2 text-xs text-[#805900]">{t("eventGroup.inviteAllCapacityNotice")}</p> : null}</div><div className="rounded-2xl border border-[#d7e5df] bg-white p-4 text-sm text-[#52736a]"><h2 className="font-bold text-[#16332b]">{t("eventGroup.providersTitle")}</h2><p className="mt-1">{t("eventGroup.providersCount", { count: providers.length })}</p></div></aside></div>{reviewValidationMessage ? <p className="rounded-xl border border-[#f1d8ad] bg-[#fff8e8] p-3 text-sm text-[#805900]" role="alert">{reviewValidationMessage}</p> : null}{error ? <p className="rounded-xl border border-[#f3d5d1] bg-[#fff7f6] p-3 text-sm text-[#7a271a]" role="alert">{error}</p> : null}<div className="flex flex-wrap justify-between gap-2"><button type="button" onClick={onBack} disabled={isCreating} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#52736a] disabled:opacity-50">{t("eventGroup.back")}</button><div className="flex gap-2"><button type="button" onClick={onClose} disabled={isCreating} className="rounded-full border border-[#d7e5df] px-4 py-2 text-sm font-semibold text-[#52736a] disabled:opacity-50">{t("eventGroup.close")}</button><button type="button" disabled={!creationEnabled || Boolean(reviewValidationError) || !individualSelectionFits || isCreating} onClick={onCreate} className="rounded-full bg-[#1f6a58] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{isCreating ? t("eventGroup.creatingGroup") : t("eventGroup.createGroup")}</button></div></div><p className="rounded-xl border border-[#f1dfab] bg-[#fff8e8] p-3 text-center text-sm font-semibold text-[#805900]">{creationEnabled ? t("eventGroup.creationGateTestOnly") : t("eventGroup.creationBlocked")}</p></div>;
}

function StepHeading({ label, title, description }: { label: string; title: string; description: string }) {
  return <header><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#7f9d94]">{label}</p><h1 className="mt-1 text-2xl font-bold text-[#06201c]">{title}</h1><p className="mt-1 text-sm text-[#52736a]">{description}</p></header>;
}
