import assert from "node:assert/strict";
import test from "node:test";
import { createGroupChatVoiceObjectUrl, createGroupChatVoiceRecorderController, formatGroupChatVoiceDuration, getGroupChatVoiceRecorderOptions, GROUP_CHAT_VOICE_MAX_BYTES, GROUP_CHAT_VOICE_MAX_SECONDS, isGroupChatVoiceFileWithinLimit, type GroupChatVoiceError, type GroupChatVoiceRecording, type GroupChatVoiceState } from "./group-chat-voice.ts";

class FakeRecorder {
  static instances: FakeRecorder[] = [];
  static supported = new Set(["audio/webm;codecs=opus"]);
  state: "inactive" | "recording" = "inactive";
  mimeType = "audio/webm;codecs=opus";
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onstop: ((event: Event) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  options: MediaRecorderOptions | undefined;

  constructor(_stream: MediaStream, options?: MediaRecorderOptions) {
    this.options = options;
    FakeRecorder.instances.push(this);
  }
  static isTypeSupported(mimeType: string) { return FakeRecorder.supported.has(mimeType); }
  start() { this.state = "recording"; }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["voice"], { type: this.mimeType }) } as BlobEvent);
    this.onstop?.(new Event("stop"));
  }
}

function createStream() {
  let stopCount = 0;
  const stream = { getTracks: () => [{ stop: () => { stopCount += 1; } }] } as unknown as MediaStream;
  return { stream, get stopCount() { return stopCount; } };
}

function setup(overrides: Partial<Parameters<typeof createGroupChatVoiceRecorderController>[0]> = {}) {
  FakeRecorder.instances = [];
  const media = createStream();
  const states: GroupChatVoiceState[] = [];
  const durations: number[] = [];
  const recordings: GroupChatVoiceRecording[] = [];
  const errors: GroupChatVoiceError[] = [];
  const limits: number[] = [];
  let now = 10_000;
  let tick: (() => void) | null = null;
  const controller = createGroupChatVoiceRecorderController({
    getMediaStream: async () => media.stream,
    getRecorderConstructor: () => FakeRecorder as unknown as typeof MediaRecorder,
    onStateChange: (state) => states.push(state),
    onDurationChange: (seconds) => durations.push(seconds),
    onRecordingReady: (recording) => recordings.push(recording),
    onDurationLimit: () => limits.push(1),
    onError: (error) => errors.push(error),
    now: () => now,
    setInterval: ((callback: TimerHandler) => { tick = callback as () => void; return 1; }) as typeof window.setInterval,
    clearInterval: (() => { tick = null; }) as typeof window.clearInterval,
    ...overrides,
  });
  controller.updateScope("group-a:account-a:tenant-a", true);
  return {
    controller, media, states, durations, recordings, errors, limits,
    setNow(value: number) { now = value; },
    runTick() { tick?.(); },
  };
}

test("recorder selects a supported WebM/Opus MIME and retains the recorder MIME in the File", async () => {
  const state = setup();
  assert.deepEqual(getGroupChatVoiceRecorderOptions(FakeRecorder), { mimeType: "audio/webm;codecs=opus" });
  await state.controller.start();
  assert.equal(FakeRecorder.instances[0]?.options?.mimeType, "audio/webm;codecs=opus");
  state.setNow(12_500);
  state.controller.stop();
  assert.equal(state.recordings[0]?.file.type, "audio/webm;codecs=opus");
  assert.match(state.recordings[0]?.file.name ?? "", /\.webm$/);
  assert.equal(state.recordings[0]?.durationSeconds, 2);
  assert.equal(state.media.stopCount, 1);
});

test("unsupported MediaRecorder and denied microphone permission are surfaced", async () => {
  const unsupported = setup({ getRecorderConstructor: () => null });
  await unsupported.controller.start();
  assert.deepEqual(unsupported.errors, ["unsupported"]);
  const denied = setup({ getMediaStream: async () => { throw new DOMException("denied", "NotAllowedError"); } });
  await denied.controller.start();
  assert.deepEqual(denied.errors, ["permissionDenied"]);
});

test("stop retains a preview recording while cancel discards it", async () => {
  const stopped = setup();
  await stopped.controller.start();
  stopped.controller.stop();
  assert.equal(stopped.recordings.length, 1);
  const cancelled = setup();
  await cancelled.controller.start();
  cancelled.controller.cancel();
  assert.equal(cancelled.recordings.length, 0);
  assert.equal(cancelled.media.stopCount, 1);
});

test("Group identity or posting permission changes discard the active recording", async () => {
  const state = setup();
  await state.controller.start();
  state.controller.updateScope("group-b:account-a:tenant-a", true);
  assert.equal(state.recordings.length, 0);
  assert.equal(state.media.stopCount, 1);
  const revoked = setup();
  await revoked.controller.start();
  revoked.controller.updateScope("group-a:account-a:tenant-a", false);
  assert.equal(revoked.recordings.length, 0);
  assert.equal(revoked.media.stopCount, 1);
});

test("a microphone permission result arriving after scope change is stopped and discarded", async () => {
  let resolveStream: ((stream: MediaStream) => void) | null = null;
  const media = createStream();
  const state = setup({ getMediaStream: () => new Promise((resolve) => { resolveStream = resolve; }) });
  const starting = state.controller.start();
  state.controller.updateScope("group-b:account-a:tenant-a", true);
  resolveStream?.(media.stream);
  await starting;
  assert.equal(FakeRecorder.instances.length, 0);
  assert.equal(media.stopCount, 1);
  assert.equal(state.recordings.length, 0);
});

test("the five-minute duration limit stops recording and keeps the preview", async () => {
  const state = setup();
  await state.controller.start();
  state.setNow(10_000 + GROUP_CHAT_VOICE_MAX_SECONDS * 1000);
  state.runTick();
  assert.deepEqual(state.limits, [1]);
  assert.equal(state.recordings[0]?.durationSeconds, GROUP_CHAT_VOICE_MAX_SECONDS);
  assert.equal(state.states.at(-1), "idle");
});

test("25 MB file limit, duration formatting and Blob URL cleanup are safe", () => {
  assert.equal(GROUP_CHAT_VOICE_MAX_BYTES, 25_000_000);
  assert.equal(isGroupChatVoiceFileWithinLimit({ size: GROUP_CHAT_VOICE_MAX_BYTES }), true);
  assert.equal(isGroupChatVoiceFileWithinLimit({ size: GROUP_CHAT_VOICE_MAX_BYTES + 1 }), false);
  assert.equal(isGroupChatVoiceFileWithinLimit({ size: 0 }), false);
  assert.equal(formatGroupChatVoiceDuration(GROUP_CHAT_VOICE_MAX_SECONDS), "5:00");
  const revoked: string[] = [];
  const objectUrl = createGroupChatVoiceObjectUrl(new Blob(["audio"]), {
    createObjectURL: () => "blob:group-audio",
    revokeObjectURL: (url) => revoked.push(url),
  });
  objectUrl.revoke();
  objectUrl.revoke();
  assert.deepEqual(revoked, ["blob:group-audio"]);
});
