import assert from "node:assert/strict";
import test from "node:test";
import {
  createGroupChatSpeechController,
  mergeGroupChatSpeechDraft,
  toggleGroupChatSpeech,
  type GroupChatSpeechError,
  type GroupChatSpeechErrorEvent,
  type GroupChatSpeechRecognition,
  type GroupChatSpeechResultEvent,
} from "./group-chat-speech.ts";

class FakeRecognition implements GroupChatSpeechRecognition {
  lang = "";
  interimResults = false;
  continuous = true;
  onresult: ((event: GroupChatSpeechResultEvent) => void) | null = null;
  onerror: ((event: GroupChatSpeechErrorEvent) => void) | null = null;
  onend: (() => void) | null = null;
  startCount = 0;
  stopCount = 0;
  abortCount = 0;

  start() { this.startCount += 1; }
  stop() { this.stopCount += 1; }
  abort() { this.abortCount += 1; }

  emitTranscript(transcript: string) {
    const result = { 0: { transcript }, length: 1 };
    this.onresult?.({ results: [result] });
  }

  emitError(error: string) { this.onerror?.({ error }); }
  emitEnd() { this.onend?.(); }
}

function setup(scopeIsCurrent = true) {
  const recognition = new FakeRecognition();
  const transcripts: string[] = [];
  const errors: GroupChatSpeechError[] = [];
  const listening: boolean[] = [];
  let currentScope = "group-a:account-a:tenant-a";
  let currentAccess = scopeIsCurrent;
  let sends = 0;
  const controller = createGroupChatSpeechController({
    createRecognition: () => recognition,
    onTranscript: (draft) => transcripts.push(draft),
    onListeningChange: (value) => listening.push(value),
    onError: (error) => errors.push(error),
  });
  controller.updateScope(currentScope, currentAccess);
  return {
    controller,
    recognition,
    transcripts,
    errors,
    listening,
    get sends() { return sends; },
    send: () => { sends += 1; },
    setScope: (scope: string) => { currentScope = scope; controller.updateScope(currentScope, currentAccess); },
    setAccess: (allowed: boolean) => { currentAccess = allowed; controller.updateScope(currentScope, currentAccess); },
  };
}

const token = "group-a:account-a:tenant-a";

test("supported recognition starts with the Direct Chat language and interim settings", () => {
  const state = setup();
  state.controller.start("", token);
  assert.equal(state.recognition.startCount, 1);
  assert.equal(state.recognition.lang, "en-IN");
  assert.equal(state.recognition.interimResults, true);
  assert.equal(state.recognition.continuous, false);
  assert.deepEqual(state.listening, [true]);
});
test("unsupported browser reports a clear unsupported state", () => {
  const errors: GroupChatSpeechError[] = [];
  const controller = createGroupChatSpeechController({
    createRecognition: () => undefined,
    onTranscript: () => undefined,
    onListeningChange: () => undefined,
    onError: (error) => errors.push(error),
  });
  controller.updateScope(token, true);
  controller.start("", token);
  assert.deepEqual(errors, ["unsupported"]);
});

test("recognition constructor failures become visible recognition errors", () => {
  const errors: GroupChatSpeechError[] = [];
  const controller = createGroupChatSpeechController({
    createRecognition: () => { throw new Error("browser denied recognition startup"); },
    onTranscript: () => undefined,
    onListeningChange: () => undefined,
    onError: (error) => errors.push(error),
  });
  controller.updateScope(token, true);
  controller.start("", token);
  assert.deepEqual(errors, ["recognitionError"]);
});

test("recognition starts once and manual stop ends the listening state", () => {
  const state = setup();
  state.controller.start("", token);
  state.controller.start("ignored", token);
  assert.equal(state.recognition.startCount, 1);
  state.controller.stop();
  assert.equal(state.recognition.stopCount, 1);
  state.recognition.emitEnd();
  assert.deepEqual(state.listening, [true, false]);
});
test("recognized transcript populates the editable draft without losing typed text", () => {
  const state = setup();
  state.controller.start("I typed this", token);
  state.recognition.emitTranscript("recognized words");
  assert.deepEqual(state.transcripts, ["I typed this recognized words"]);
});

test("blank or whitespace transcript preserves the existing draft", () => {
  assert.equal(mergeGroupChatSpeechDraft("Existing draft  ", "  "), "Existing draft  ");
  assert.equal(mergeGroupChatSpeechDraft("Existing draft  ", "more words"), "Existing draft more words");
});

test("speech recognition never invokes the message-send action", () => {
  const state = setup();
  state.controller.start("", token);
  state.recognition.emitTranscript("draft only");
  assert.deepEqual(state.transcripts, ["draft only"]);
  assert.equal(state.sends, 0);
});

test("microphone permission denial is distinguished from other recognition errors", () => {
  const state = setup();
  state.controller.start("", token);
  state.recognition.emitError("not-allowed");
  assert.deepEqual(state.errors, ["permissionDenied"]);
});

test("generic recognition errors are shown distinctly", () => {
  const state = setup();
  state.controller.start("", token);
  state.recognition.emitError("network");
  assert.deepEqual(state.errors, ["recognitionError"]);
});

test("no speech detected is reported when recognition ends without a transcript", () => {
  const state = setup();
  state.controller.start("", token);
  state.recognition.emitEnd();
  assert.deepEqual(state.errors, ["noSpeech"]);
});

test("revoked posting permission prevents transcript insertion and stops recognition", () => {
  const state = setup();
  state.controller.start("existing", token);
  state.setAccess(false);
  state.recognition.emitTranscript("must not enter draft");
  assert.deepEqual(state.transcripts, []);
  assert.equal(state.recognition.stopCount, 1);
});

test("Group, account or tenant scope changes prevent stale transcript insertion", () => {
  const state = setup();
  state.controller.start("", token);
  state.recognition.emitTranscript("same scope");
  assert.deepEqual(state.transcripts, ["same scope"]);
  state.recognition.emitEnd();
  const newScope = "group-b:account-a:tenant-a";
  state.setScope(newScope);
  state.controller.start("", newScope);
  state.setScope("group-c:account-a:tenant-a");
  state.recognition.emitTranscript("stale group");
  assert.equal(state.recognition.stopCount, 1);
  assert.equal(state.transcripts.length, 1);
  state.recognition.emitEnd();
  const accountScope = "group-c:account-b:tenant-a";
  state.setScope(accountScope);
  state.controller.start("", accountScope);
  state.setScope("group-c:account-c:tenant-a");
  state.recognition.emitTranscript("stale account");
  assert.equal(state.transcripts.length, 1);
  state.recognition.emitEnd();
  const tenantScope = "group-c:account-b:tenant-b";
  state.setScope(tenantScope);
  state.controller.start("", tenantScope);
  state.setScope("group-c:account-b:tenant-c");
  state.recognition.emitTranscript("stale tenant");
  assert.equal(state.transcripts.length, 1);
});

test("component cleanup detaches handlers and aborts recognition", () => {
  const state = setup();
  state.controller.start("", token);
  const resultHandler = state.recognition.onresult;
  assert.ok(resultHandler);
  state.controller.dispose();
  assert.equal(state.recognition.abortCount, 1);
  assert.equal(state.recognition.onresult, null);
  assert.equal(state.recognition.onerror, null);
  assert.equal(state.recognition.onend, null);
  resultHandler?.({ results: [{ 0: { transcript: "late" }, length: 1 }] });
  assert.deepEqual(state.transcripts, []);
});

test("controller can be disposed repeatedly without restarting recognition", () => {
  const state = setup();
  state.controller.start("", token);
  state.controller.dispose();
  state.controller.dispose();
  state.controller.start("", token);
  assert.equal(state.recognition.startCount, 1);
});

test("composer click starts and stops recognition after React Strict Mode effect replay", () => {
  const state = setup();

  // Mirrors effect setup → cleanup → setup on a mounted Strict Mode component.
  state.controller.activate();
  state.controller.dispose();
  state.controller.activate();
  state.controller.updateScope(token, true);

  toggleGroupChatSpeech(state.controller, false, true, "typed draft", token);
  assert.equal(state.recognition.startCount, 1);
  assert.deepEqual(state.listening, [true]);

  toggleGroupChatSpeech(state.controller, true, true, "typed draft", token);
  assert.equal(state.recognition.stopCount, 1);
  state.recognition.emitEnd();
  assert.deepEqual(state.listening, [true, false]);
});
