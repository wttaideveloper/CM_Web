export type GroupChatSpeechError =
  | "unsupported"
  | "permissionDenied"
  | "noSpeech"
  | "recognitionError";

export interface GroupChatSpeechAlternative {
  transcript?: string;
}

export interface GroupChatSpeechResult {
  readonly [index: number]: GroupChatSpeechAlternative | undefined;
}

export interface GroupChatSpeechResultEvent {
  results: ArrayLike<GroupChatSpeechResult>;
}

export interface GroupChatSpeechErrorEvent {
  error: string;
}

export interface GroupChatSpeechRecognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: GroupChatSpeechResultEvent) => void) | null;
  onerror: ((event: GroupChatSpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export interface GroupChatSpeechControllerOptions {
  createRecognition: () => GroupChatSpeechRecognition | undefined;
  onTranscript: (draft: string) => void;
  onListeningChange: (isListening: boolean) => void;
  onError: (error: GroupChatSpeechError) => void;
}

export interface GroupChatSpeechController {
  activate(): void;
  updateScope(scopeToken: string, allowed: boolean): void;
  start(baseDraft: string, scopeToken: string): void;
  stop(): void;
  dispose(): void;
}

/**
 * Combines recognized speech with the text present when recognition starts.
 */
export function mergeGroupChatSpeechDraft(baseDraft: string, transcript: string): string {
  const trimmedTranscript = transcript.trim();
  if (!trimmedTranscript) return baseDraft;

  const trimmedBase = baseDraft.trimEnd();
  return trimmedBase ? `${trimmedBase} ${trimmedTranscript}` : trimmedTranscript;
}

/**
 * Creates a Group-only speech controller with scope validation and lifecycle cleanup.
 */
export function createGroupChatSpeechController(
  options: GroupChatSpeechControllerOptions,
): GroupChatSpeechController {
  let activeRecognition: GroupChatSpeechRecognition | null = null;
  let activeScopeToken = "";
  let baseDraft = "";
  let recognizedSpeech = false;
  let reportedError = false;
  let stopRequested = false;
  let disposed = false;
  let currentScopeToken = "";
  let currentScopeAllowed = false;

  const isCurrent = (recognition: GroupChatSpeechRecognition) =>
    !disposed &&
    activeRecognition === recognition &&
    currentScopeAllowed &&
    currentScopeToken === activeScopeToken;

  const clearRecognition = (recognition: GroupChatSpeechRecognition) => {
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    if (activeRecognition === recognition) activeRecognition = null;
    activeScopeToken = "";
    baseDraft = "";
    stopRequested = false;
    if (!disposed) options.onListeningChange(false);
  };

  const stopRecognition = (recognition: GroupChatSpeechRecognition) => {
    if (stopRequested) return;
    stopRequested = true;
    try {
      recognition.stop();
    } catch {
      try {
        recognition.abort();
      } catch {
        clearRecognition(recognition);
      }
    }
  };

  return {
    activate() {
      if (!disposed) return;
      disposed = false;
      stopRequested = false;
      activeRecognition = null;
      activeScopeToken = "";
      baseDraft = "";
    },

    updateScope(scopeToken, allowed) {
      if (disposed) return;
      currentScopeToken = scopeToken;
      currentScopeAllowed = allowed;
      if (activeRecognition && (!allowed || activeScopeToken !== scopeToken)) {
        stopRecognition(activeRecognition);
      }
    },

    start(initialDraft, scopeToken) {
      if (disposed || activeRecognition || !currentScopeAllowed || currentScopeToken !== scopeToken) return;
      let recognition: GroupChatSpeechRecognition | undefined;
      try {
        recognition = options.createRecognition();
      } catch {
        options.onError("recognitionError");
        return;
      }
      if (!recognition) {
        options.onError("unsupported");
        return;
      }

      activeRecognition = recognition;
      activeScopeToken = scopeToken;
      baseDraft = initialDraft;
      recognizedSpeech = false;
      reportedError = false;
      stopRequested = false;
      recognition.lang = "en-IN";
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onresult = (event) => {
        if (!isCurrent(recognition)) {
          stopRecognition(recognition);
          return;
        }

        let transcript = "";
        for (let index = 0; index < event.results.length; index += 1) {
          const alternative = event.results[index]?.[0];
          if (alternative?.transcript) transcript += alternative.transcript;
        }
        if (transcript.trim()) {
          recognizedSpeech = true;
          options.onTranscript(mergeGroupChatSpeechDraft(baseDraft, transcript));
        }
      };

      recognition.onerror = (event) => {
        if (!isCurrent(recognition)) return;
        reportedError = true;
        const error: GroupChatSpeechError =
          event.error === "not-allowed" || event.error === "service-not-allowed"
            ? "permissionDenied"
            : event.error === "no-speech"
              ? "noSpeech"
              : "recognitionError";
        options.onError(error);
      };

      recognition.onend = () => {
        if (isCurrent(recognition) && !recognizedSpeech && !reportedError) {
          options.onError("noSpeech");
        }
        clearRecognition(recognition);
      };

      try {
        recognition.start();
        options.onListeningChange(true);
      } catch {
        reportedError = true;
        options.onError("recognitionError");
        clearRecognition(recognition);
      }
    },

    stop() {
      if (activeRecognition) stopRecognition(activeRecognition);
    },

    dispose() {
      disposed = true;
      const recognition = activeRecognition;
      activeRecognition = null;
      activeScopeToken = "";
      baseDraft = "";
      currentScopeToken = "";
      currentScopeAllowed = false;
      if (!recognition) return;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.abort();
      } catch {
        // Detached handlers prevent callbacks from reaching an unmounted component.
      }
    },
  };
}

/** Routes the Group composer button to start or stop the active speech session. */
export function toggleGroupChatSpeech(
  controller: GroupChatSpeechController,
  isListening: boolean,
  allowed: boolean,
  draft: string,
  scopeToken: string,
): void {
  if (isListening) {
    controller.stop();
    return;
  }
  if (allowed) controller.start(draft, scopeToken);
}

/**
 * Creates a recognizer from the browser's standard or WebKit-prefixed speech API.
 */
export function createBrowserGroupChatSpeechRecognition():
  | GroupChatSpeechRecognition
  | undefined {
  if (typeof window === "undefined") return undefined;

  const speechWindow = window as Window & {
    SpeechRecognition?: new () => GroupChatSpeechRecognition;
    webkitSpeechRecognition?: new () => GroupChatSpeechRecognition;
  };
  const RecognitionConstructor =
    speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
  return RecognitionConstructor ? new RecognitionConstructor() : undefined;
}
