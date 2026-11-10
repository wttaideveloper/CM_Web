"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { downloadGroupChatAttachment, sendGroupChatAttachmentMessage, uploadGroupChatAttachment } from "./group-chat/group-chat.service";
import { createGroupChatVoiceObjectUrl, createGroupChatVoiceRecorderController, formatGroupChatVoiceDuration, GROUP_CHAT_VOICE_MAX_SECONDS, isGroupChatVoiceFileWithinLimit, type GroupChatVoiceError, type GroupChatVoiceObjectUrl, type GroupChatVoiceRecording, type GroupChatVoiceState } from "./group-chat-voice";

type GroupChatVoiceComposerProps = {
  groupId: string;
  scopeToken: string;
  enabled: boolean;
  onRecordingStateChange(recording: boolean): void;
};

/** Records, previews, and explicitly sends one authorized Group voice message. */
export function GroupChatVoiceComposer({ groupId, scopeToken, enabled, onRecordingStateChange }: GroupChatVoiceComposerProps) {
  const { t } = useTranslation("groupChatSpeech");
  const queryClient = useQueryClient();
  const [recordingState, setRecordingState] = useState<GroupChatVoiceState>("idle");
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [recordingError, setRecordingError] = useState<GroupChatVoiceError | null>(null);
  const [durationLimitReached, setDurationLimitReached] = useState(false);
  const [recording, setRecording] = useState<GroupChatVoiceRecording | null>(null);
  const [previewResource, setPreviewResource] = useState<GroupChatVoiceObjectUrl | null>(null);
  const [uploadedAttachmentId, setUploadedAttachmentId] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const currentScopeRef = useRef("");
  const enabledRef = useRef(false);
  const submissionInFlightRef = useRef(false);

  const [recorderController] = useState(() => createGroupChatVoiceRecorderController({
    getMediaStream: () => {
      if (!navigator.mediaDevices?.getUserMedia) return Promise.reject(new DOMException("Microphone capture unavailable", "NotSupportedError"));
      return navigator.mediaDevices.getUserMedia({ audio: true });
    },
    getRecorderConstructor: () => typeof MediaRecorder === "undefined" ? null : MediaRecorder,
    onStateChange: (state) => {
      setRecordingState(state);
      onRecordingStateChange(state === "recording");
    },
    onDurationChange: setDurationSeconds,
    onRecordingReady: (nextRecording) => {
      setPreviewResource(createGroupChatVoiceObjectUrl(nextRecording.file));
      setRecording(nextRecording);
      setUploadedAttachmentId(null);
      setSendError(null);
    },
    onDurationLimit: () => setDurationLimitReached(true),
    onError: setRecordingError,
  }));

  useLayoutEffect(() => {
    currentScopeRef.current = scopeToken;
    enabledRef.current = enabled;
    recorderController.activate();
    recorderController.updateScope(scopeToken, enabled);
  }, [enabled, recorderController, scopeToken]);

  useEffect(() => {
    return () => {
      recorderController.dispose();
      onRecordingStateChange(false);
    };
  }, [onRecordingStateChange, recorderController]);

  useEffect(() => {
    return () => previewResource?.revoke();
  }, [previewResource]);

  const sendMutation = useMutation({
    mutationFn: ({ targetGroupId, attachmentId, requestScope }: { targetGroupId: string; attachmentId: string; requestScope: string }) => {
      if (currentScopeRef.current !== requestScope || !enabledRef.current) throw new Error(t("voice.permissionChanged"));
      return sendGroupChatAttachmentMessage(targetGroupId, "audio", attachmentId);
    },
    retry: false,
    onSuccess: async (_message, variables) => {
      if (currentScopeRef.current !== variables.requestScope) return;
      setRecording(null);
      setPreviewResource(null);
      setUploadedAttachmentId(null);
      setSendError(null);
      await queryClient.invalidateQueries({ queryKey: ["group-chat", "messages", variables.targetGroupId] });
    },
    onSettled: () => { submissionInFlightRef.current = false; },
    onError: (error, variables) => {
      if (currentScopeRef.current === variables.requestScope) setSendError(error instanceof Error ? error.message : t("voice.sendFailed"));
    },
  });

  const uploadMutation = useMutation({
    mutationFn: ({ targetGroupId, file, requestScope }: { targetGroupId: string; file: File; requestScope: string }) => {
      if (currentScopeRef.current !== requestScope || !enabledRef.current) throw new Error(t("voice.permissionChanged"));
      if (!isGroupChatVoiceFileWithinLimit(file)) throw new Error(t("voice.fileTooLarge"));
      return uploadGroupChatAttachment(targetGroupId, file, "audio");
    },
    retry: false,
    onSuccess: (attachment, variables) => {
      if (currentScopeRef.current !== variables.requestScope || !enabledRef.current) {
        submissionInFlightRef.current = false;
        return;
      }
      setUploadedAttachmentId(attachment.id);
      sendMutation.mutate({ targetGroupId: variables.targetGroupId, attachmentId: attachment.id, requestScope: variables.requestScope });
    },
    onError: (error, variables) => {
      submissionInFlightRef.current = false;
      if (currentScopeRef.current === variables.requestScope) setSendError(error instanceof Error ? error.message : t("voice.uploadFailed"));
    },
  });

  const clearRecording = () => {
    recorderController.cancel();
    setRecording(null);
    setPreviewResource(null);
    setUploadedAttachmentId(null);
    setRecordingError(null);
    setSendError(null);
    setDurationLimitReached(false);
    setDurationSeconds(0);
    uploadMutation.reset();
    sendMutation.reset();
  };

  const toggleRecording = () => {
    setRecordingError(null);
    setSendError(null);
    setDurationLimitReached(false);
    if (recordingState === "recording") recorderController.stop();
    else if (enabled) void recorderController.start();
  };

  const sendRecording = () => {
    if (!enabled || !recording || submissionInFlightRef.current || sendMutation.isPending || uploadMutation.isPending) return;
    if (!isGroupChatVoiceFileWithinLimit(recording.file)) {
      setSendError(t("voice.fileTooLarge"));
      return;
    }
    setSendError(null);
    submissionInFlightRef.current = true;
    if (uploadedAttachmentId) {
      sendMutation.mutate({ targetGroupId: groupId, attachmentId: uploadedAttachmentId, requestScope: scopeToken });
    } else {
      uploadMutation.mutate({ targetGroupId: groupId, file: recording.file, requestScope: scopeToken });
    }
  };

  const isSending = uploadMutation.isPending || sendMutation.isPending;
  const tooLarge = recording !== null && !isGroupChatVoiceFileWithinLimit(recording.file);

  return <div className="relative flex shrink-0 flex-col gap-1">
    <button type="button" onClick={toggleRecording} disabled={!enabled || isSending || Boolean(recording)} aria-label={t(recordingState === "recording" ? "voice.stopRecording" : "voice.startRecording")} aria-pressed={recordingState === "recording"} title={t(recordingState === "recording" ? "voice.stopRecording" : "voice.startRecording")} className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition disabled:cursor-not-allowed disabled:opacity-50 ${recordingState === "recording" ? "border-[#b42318] bg-[#fff7f6] text-[#b42318] ring-2 ring-[#f3d5d1]" : "border-[#d7e5df] bg-[#f8fbf9] text-[#1f6a58] hover:border-[#1f6a58]"}`}>
      {recordingState === "recording" ? <span aria-hidden="true" className="h-3.5 w-3.5 rounded-sm bg-current" /> : <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 10v4m4-8v12m4-15v18m4-13v8m4-11v14m3-10v6" /></svg>}
    </button>
    {recordingState === "recording" ? <div className="absolute bottom-full right-2 z-20 mb-2 w-64 rounded-xl border border-[#d7e5df] bg-white p-3 text-xs text-[#16332b] shadow-lg" role="status" aria-live="polite">
      <p className="font-semibold text-[#b42318]">{t("voice.recording", { duration: formatGroupChatVoiceDuration(durationSeconds) })}</p>
      <p className="mt-1 text-[#52736a]">{t("voice.durationLimit", { duration: formatGroupChatVoiceDuration(GROUP_CHAT_VOICE_MAX_SECONDS) })}</p>
      <div className="mt-2 flex justify-end gap-2"><button type="button" onClick={() => recorderController.cancel()} className="rounded-full border border-[#d7e5df] px-3 py-1.5 font-semibold text-[#52736a]">{t("voice.cancel")}</button><button type="button" onClick={() => recorderController.stop()} className="rounded-full bg-[#1f6a58] px-3 py-1.5 font-semibold text-white">{t("voice.stopRecording")}</button></div>
    </div> : null}
    {recording ? <div className="absolute bottom-full right-2 z-20 mb-2 w-72 rounded-xl border border-[#d7e5df] bg-white p-3 text-xs text-[#16332b] shadow-lg" aria-label={t("voice.previewTitle")}>
      <p className="font-semibold">{t("voice.previewTitle")}</p>
      <p className="mt-0.5 text-[#52736a]">{t("voice.previewDuration", { duration: formatGroupChatVoiceDuration(recording.durationSeconds) })}</p>
      {previewResource ? <audio controls preload="metadata" src={previewResource.url} className="mt-2 w-full" aria-label={t("voice.previewTitle")}>{t("voice.audioUnsupported")}</audio> : null}
      {tooLarge ? <p className="mt-2 text-[#b42318]" role="alert">{t("voice.fileTooLarge")}</p> : null}
      {durationLimitReached ? <p className="mt-2 text-[#8b5e00]" role="status">{t("voice.durationLimitReached")}</p> : null}
      {sendError ? <p className="mt-2 text-[#b42318]" role="alert">{sendError}</p> : null}
      {isSending ? <p className="mt-2 text-[#52736a]" role="status">{uploadMutation.isPending ? t("voice.uploading") : t("voice.sending")}</p> : null}
      <div className="mt-2 flex justify-end gap-2"><button type="button" disabled={isSending} onClick={clearRecording} className="rounded-full border border-[#d7e5df] px-3 py-1.5 font-semibold text-[#52736a] disabled:opacity-50">{t("voice.discard")}</button><button type="button" disabled={!enabled || tooLarge || isSending} onClick={sendRecording} className="rounded-full bg-[#1f6a58] px-3 py-1.5 font-semibold text-white disabled:opacity-50">{sendMutation.isPending ? t("voice.sending") : uploadMutation.isPending ? t("voice.uploading") : uploadedAttachmentId ? t("voice.retrySend") : t("voice.send")}</button></div>
    </div> : null}
    {recordingError ? <span className="absolute bottom-full right-2 z-20 mb-2 max-w-64 rounded-lg border border-[#f3d5d1] bg-white p-2 text-xs text-[#8f3b2f] shadow" role="alert">{t(`voice.errors.${recordingError}`)}</span> : null}
  </div>;
}

type GroupChatAudioPlayerProps = { attachmentId: string; label: string };

/** Downloads Group audio through the authenticated service and owns its Blob URL. */
export function GroupChatAudioPlayer({ attachmentId, label }: GroupChatAudioPlayerProps) {
  const { t } = useTranslation("groupChatSpeech");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    let active = true;
    let revokeObjectUrl: (() => void) | null = null;
    const audioElement = audioRef.current;
    void downloadGroupChatAttachment(attachmentId).then((response) => {
      if (response.blob.size === 0) throw new Error("Empty protected audio response");
      const objectUrl = createGroupChatVoiceObjectUrl(response.blob);
      revokeObjectUrl = objectUrl.revoke;
      if (active) setAudioUrl(objectUrl.url);
      else objectUrl.revoke();
    }).catch(() => {
      if (active) setError(true);
    });
    return () => {
      active = false;
      audioElement?.pause();
      revokeObjectUrl?.();
    };
  }, [attachmentId, attempt]);

  if (error) return <div className="mt-2 text-xs text-[#8f3b2f]" role="alert"><p>{t("voice.playbackFailed")}</p><button type="button" onClick={() => { setAudioUrl(null); setError(false); setAttempt((value) => value + 1); }} className="mt-1 font-semibold underline">{t("voice.retryPlayback")}</button></div>;
  if (!audioUrl) return <p className="mt-2 text-xs text-[#52736a]" role="status">{t("voice.loadingAudio")}</p>;
  return <audio ref={audioRef} controls preload="none" src={audioUrl} className="mt-2 w-full max-w-[280px]" aria-label={label} onError={() => setError(true)}>{t("voice.audioUnsupported")}</audio>;
}
