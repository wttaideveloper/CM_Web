/** Maximum Group voice-message size accepted by the confirmed backend contract. */
export const GROUP_CHAT_VOICE_MAX_BYTES = 25_000_000;

/** Client-side recording duration guard; the backend does not impose a duration limit. */
export const GROUP_CHAT_VOICE_MAX_SECONDS = 5 * 60;

const SUPPORTED_GROUP_VOICE_MIME_TYPES = [
  "audio/webm;codecs=opus",
] as const;

export type GroupChatVoiceError = "unsupported" | "permissionDenied" | "microphoneUnavailable" | "recordingFailed";
export type GroupChatVoiceState = "idle" | "recording";

export interface GroupChatVoiceRecording {
  file: File;
  durationSeconds: number;
}

export interface GroupChatVoiceObjectUrl {
  url: string;
  revoke(): void;
}

interface GroupVoiceRecorder {
  readonly state: "inactive" | "recording" | "paused";
  readonly mimeType: string;
  ondataavailable: ((event: BlobEvent) => void) | null;
  onstop: ((event: Event) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  start(): void;
  stop(): void;
}

interface GroupVoiceRecorderConstructor {
  new(stream: MediaStream, options?: MediaRecorderOptions): GroupVoiceRecorder;
  isTypeSupported?(mimeType: string): boolean;
}

interface GroupChatVoiceRecorderDependencies {
  getMediaStream(): Promise<MediaStream>;
  getRecorderConstructor(): GroupVoiceRecorderConstructor | null;
  onStateChange(state: GroupChatVoiceState): void;
  onDurationChange(seconds: number): void;
  onRecordingReady(recording: GroupChatVoiceRecording): void;
  onDurationLimit(): void;
  onError(error: GroupChatVoiceError): void;
  now?: () => number;
  setInterval?: typeof window.setInterval;
  clearInterval?: typeof window.clearInterval;
}

function getGroupVoiceFileExtension(mimeType: string): string {
  const normalizedMimeType = mimeType.toLowerCase().split(";")[0]?.trim();
  if (normalizedMimeType === "audio/ogg") return "ogg";
  if (normalizedMimeType === "audio/mp4" || normalizedMimeType === "audio/m4a") return "m4a";
  if (normalizedMimeType === "audio/wav" || normalizedMimeType === "audio/wave") return "wav";
  return "webm";
}

function isBackendConfirmedGroupVoiceMimeType(mimeType: string): boolean {
  const normalizedMimeType = mimeType.toLowerCase().replace(/\s/g, "");
  return normalizedMimeType.startsWith("audio/webm") && normalizedMimeType.includes("opus");
}

/** Selects a browser-supported Opus audio format, or leaves the format to the recorder. */
export function getGroupChatVoiceRecorderOptions(
  recorderConstructor: Pick<GroupVoiceRecorderConstructor, "isTypeSupported">,
): MediaRecorderOptions | undefined {
  if (typeof recorderConstructor.isTypeSupported !== "function") return undefined;
  const mimeType = SUPPORTED_GROUP_VOICE_MIME_TYPES.find((candidate) => recorderConstructor.isTypeSupported?.(candidate));
  return mimeType ? { mimeType } : undefined;
}

/** Formats elapsed recording time as minutes and seconds. */
export function formatGroupChatVoiceDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, "0")}`;
}

/** Creates a revocable Blob URL through the supplied browser URL implementation. */
export function createGroupChatVoiceObjectUrl(
  blob: Blob,
  urlApi: Pick<typeof URL, "createObjectURL" | "revokeObjectURL"> = URL,
): GroupChatVoiceObjectUrl {
  const url = urlApi.createObjectURL(blob);
  let active = true;
  return {
    url,
    revoke() {
      if (!active) return;
      active = false;
      urlApi.revokeObjectURL(url);
    },
  };
}

/** Creates a scope-aware MediaRecorder controller for one Group composer instance. */
export function createGroupChatVoiceRecorderController(dependencies: GroupChatVoiceRecorderDependencies) {
  const now = dependencies.now ?? Date.now;
  const scheduleInterval = dependencies.setInterval ?? globalThis.setInterval.bind(globalThis);
  const cancelInterval = dependencies.clearInterval ?? globalThis.clearInterval.bind(globalThis);
  let recorder: GroupVoiceRecorder | null = null;
  let stream: MediaStream | null = null;
  let chunks: Blob[] = [];
  let timer: number | null = null;
  let startedAt: number | null = null;
  let currentScope = "";
  let recordingScope = "";
  let accessAllowed = false;
  let discardOnStop = false;
  let disposed = false;

  const stopTracks = () => {
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
  };

  const clearTimer = () => {
    if (timer !== null) cancelInterval(timer);
    timer = null;
  };

  const cleanUpRecorder = () => {
    clearTimer();
    stopTracks();
    recorder = null;
    chunks = [];
    startedAt = null;
    recordingScope = "";
    if (!disposed) dependencies.onDurationChange(0);
  };

  const stop = (discard: boolean) => {
    if (!recorder) return;
    discardOnStop = discard;
    clearTimer();
    if (recorder.state !== "inactive") {
      try {
        recorder.stop();
        return;
      } catch {
        dependencies.onError("recordingFailed");
      }
    }
    cleanUpRecorder();
    dependencies.onStateChange("idle");
  };

  const start = async () => {
    if (disposed || recorder || !accessAllowed || !currentScope) return;
    const scopeAtStart = currentScope;
    const Recorder = dependencies.getRecorderConstructor();
    if (!Recorder) {
      dependencies.onError("unsupported");
      return;
    }

    let acquiredStream: MediaStream;
    try {
      acquiredStream = await dependencies.getMediaStream();
    } catch (error) {
      if (scopeAtStart !== currentScope || disposed) return;
      const name = error instanceof Error ? error.name : "";
      dependencies.onError(name === "NotSupportedError" ? "unsupported" : name === "NotAllowedError" || name === "SecurityError" ? "permissionDenied" : "microphoneUnavailable");
      return;
    }

    if (disposed || scopeAtStart !== currentScope || !accessAllowed) {
      acquiredStream.getTracks().forEach((track) => track.stop());
      return;
    }

    try {
      const options = getGroupChatVoiceRecorderOptions(Recorder);
      const nextRecorder = options ? new Recorder(acquiredStream, options) : new Recorder(acquiredStream);
      stream = acquiredStream;
      recorder = nextRecorder;
      chunks = [];
      startedAt = now();
      recordingScope = scopeAtStart;
      discardOnStop = false;
      nextRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      nextRecorder.onerror = () => {
        dependencies.onError("recordingFailed");
        stop(true);
      };
      nextRecorder.onstop = () => {
        const elapsedSeconds = startedAt === null ? 0 : Math.max(1, Math.floor((now() - startedAt) / 1000));
        const finalMimeType = nextRecorder.mimeType || chunks.find((chunk) => chunk.type)?.type || options?.mimeType || "audio/webm";
        if (!isBackendConfirmedGroupVoiceMimeType(finalMimeType)) {
          cleanUpRecorder();
          if (!disposed) {
            dependencies.onStateChange("idle");
            dependencies.onError("unsupported");
          }
          return;
        }
        const blob = new Blob(chunks, { type: finalMimeType });
        const shouldDiscard = discardOnStop || disposed || recordingScope !== currentScope || !accessAllowed;
        cleanUpRecorder();
        if (!disposed) dependencies.onStateChange("idle");
        if (shouldDiscard) return;
        if (blob.size === 0) {
          dependencies.onError("recordingFailed");
          return;
        }
        const file = new File([blob], `group-voice-${now()}.${getGroupVoiceFileExtension(finalMimeType)}`, { type: finalMimeType });
        dependencies.onRecordingReady({ file, durationSeconds: elapsedSeconds });
      };
      nextRecorder.start();
      dependencies.onStateChange("recording");
      dependencies.onDurationChange(0);
      timer = scheduleInterval(() => {
        if (startedAt === null) return;
        const elapsed = Math.max(0, Math.floor((now() - startedAt) / 1000));
        dependencies.onDurationChange(Math.min(elapsed, GROUP_CHAT_VOICE_MAX_SECONDS));
        if (elapsed >= GROUP_CHAT_VOICE_MAX_SECONDS) {
          dependencies.onDurationLimit();
          stop(false);
        }
      }, 1000) as unknown as number;
    } catch (error) {
      acquiredStream.getTracks().forEach((track) => track.stop());
      recorder = null;
      stream = null;
      chunks = [];
      startedAt = null;
      dependencies.onStateChange("idle");
      dependencies.onError(error instanceof Error && error.name === "NotSupportedError" ? "unsupported" : "recordingFailed");
    }
  };

  return {
    /** Re-enables a recorder controller after React development Strict Mode effect replay. */
    activate() {
      disposed = false;
    },
    /** Updates identity/permission scope and discards any in-progress recording when it changes. */
    updateScope(scope: string, allowed: boolean) {
      const scopeChanged = currentScope !== "" && currentScope !== scope;
      currentScope = scope;
      accessAllowed = allowed;
      if (scopeChanged || !allowed) stop(true);
    },
    start,
    /** Stops and keeps a completed recording for preview. */
    stop: () => stop(false),
    /** Stops and discards the current recording. */
    cancel: () => stop(true),
    /** Disposes handlers, recording, timer and microphone tracks on unmount. */
    dispose() {
      disposed = true;
      accessAllowed = false;
      if (recorder) {
        discardOnStop = true;
        clearTimer();
        try {
          if (recorder.state !== "inactive") recorder.stop();
          else cleanUpRecorder();
        } catch {
          cleanUpRecorder();
        }
      } else {
        cleanUpRecorder();
      }
    },
  };
}

/** Determines whether a recording is safe to send under the confirmed Group upload limit. */
export function isGroupChatVoiceFileWithinLimit(file: Pick<File, "size">): boolean {
  return file.size > 0 && file.size <= GROUP_CHAT_VOICE_MAX_BYTES;
}
