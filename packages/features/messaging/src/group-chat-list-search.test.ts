import assert from "node:assert/strict";
import test from "node:test";
import { keepPreviousData, QueryClient, QueryObserver } from "@tanstack/react-query";
import { canReuseGroupChatListPlaceholder, GROUP_CHAT_SEARCH_DEBOUNCE_MS, groupChatGroupListQueryKey, resolveGroupChatListEmptyState, scheduleGroupChatSearch } from "./group-chat-list-search.ts";
import { groupChatSpeechEnglish } from "./group-chat-speech.en.ts";

test("Group list distinguishes first load, available results, and completed empty searches", () => {
  assert.equal(resolveGroupChatListEmptyState({ search: "", isPending: true, isFetching: true, isPlaceholderData: false, hasError: false, hasItems: false }), "loading");
  assert.equal(resolveGroupChatListEmptyState({ search: "", isPending: false, isFetching: false, isPlaceholderData: false, hasError: false, hasItems: false }), "no-groups");
  assert.equal(resolveGroupChatListEmptyState({ search: "cohort", isPending: false, isFetching: false, isPlaceholderData: false, hasError: false, hasItems: false }), "no-matches");
});

test("Group list keeps prior results during debounce, fetch, and placeholder states", () => {
  for (const state of [
    { search: "cohort", isPending: false, isFetching: true, isPlaceholderData: true, hasError: false, hasItems: false },
    { search: "cohort", isPending: false, isFetching: true, isPlaceholderData: false, hasError: false, hasItems: true },
    { search: "cohort", isPending: false, isFetching: false, isPlaceholderData: false, hasError: false, hasItems: true },
  ]) assert.equal(resolveGroupChatListEmptyState(state), "none");
});

test("Group list does not report an empty search result after a request error", () => {
  assert.equal(resolveGroupChatListEmptyState({ search: "cohort", isPending: false, isFetching: false, isPlaceholderData: false, hasError: true, hasItems: false }), "none");
});

test("Group search copy differentiates account-empty and no-match states", () => {
  assert.equal(groupChatSpeechEnglish.groupSearch.noGroups, "No Groups are available for your account.");
  assert.equal(groupChatSpeechEnglish.groupSearch.noMatches, "No Groups match your search.");
  assert.equal(groupChatSpeechEnglish.groupSearch.searching, "Searching Groups…");
});

test("Group search debounces rapid typing and applies a cleared search", async () => {
  assert.equal(GROUP_CHAT_SEARCH_DEBOUNCE_MS, 300);
  const applied: string[] = [];
  const cancelOneCharacter = scheduleGroupChatSearch("a", (value) => applied.push(value));
  const cancelIntermediate = scheduleGroupChatSearch("well", (value) => applied.push(value));
  cancelOneCharacter();
  cancelIntermediate();
  const cancelLatest = scheduleGroupChatSearch(" Wellness ", (value) => applied.push(value));
  await new Promise((resolve) => setTimeout(resolve, GROUP_CHAT_SEARCH_DEBOUNCE_MS + 30));
  assert.deepEqual(applied, ["Wellness"]);
  const cancelClear = scheduleGroupChatSearch("", (value) => applied.push(value));
  await new Promise((resolve) => setTimeout(resolve, GROUP_CHAT_SEARCH_DEBOUNCE_MS + 30));
  assert.deepEqual(applied, ["Wellness", ""]);
  cancelLatest();
  cancelClear();
});

test("late response for an older search cannot replace the current search result", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const oldKey = groupChatGroupListQueryKey("account", "tenant", "a", 1);
  const currentKey = groupChatGroupListQueryKey("account", "tenant", "ab", 1);
  let resolveOld!: (value: string[]) => void;
  let resolveCurrent!: (value: string[]) => void;
  const oldRequest = new Promise<string[]>((resolve) => { resolveOld = resolve; });
  const currentRequest = new Promise<string[]>((resolve) => { resolveCurrent = resolve; });
  client.setQueryData(oldKey, ["cached old result"]);
  const observer = new QueryObserver(client, { queryKey: oldKey, queryFn: () => oldRequest, retry: false });
  const unsubscribe = observer.subscribe(() => undefined);
  const oldFetch = observer.refetch();
  observer.setOptions({ queryKey: currentKey, queryFn: () => currentRequest, placeholderData: keepPreviousData, retry: false });
  assert.deepEqual(observer.getCurrentResult().data, ["cached old result"]);
  assert.equal(observer.getCurrentResult().isPlaceholderData, true);
  resolveCurrent(["current result"]);
  await observer.refetch();
  resolveOld(["late old result"]);
  await oldFetch;
  assert.deepEqual(observer.getCurrentResult().data, ["current result"]);
  unsubscribe();
  client.clear();
});

test("Group list cache keys isolate account, tenant, search, and pagination", () => {
  const key = groupChatGroupListQueryKey("account-a", "tenant-a", " wellness ", 2);
  assert.deepEqual(key, ["group-chat", "groups", "account-a", "tenant-a", "wellness", 2]);
  assert.notDeepEqual(key, groupChatGroupListQueryKey("account-b", "tenant-a", "wellness", 2));
  assert.notDeepEqual(key, groupChatGroupListQueryKey("account-a", "tenant-b", "wellness", 2));
  assert.notDeepEqual(key, groupChatGroupListQueryKey("account-a", "tenant-a", "wellness", 1));
  assert.notDeepEqual(key, groupChatGroupListQueryKey("account-a", "tenant-a", "wellness cohort", 1));
});

test("Group list placeholders are never reused across account or tenant changes", () => {
  const previous = groupChatGroupListQueryKey("account-a", "tenant-a", "old search", 1);
  assert.equal(canReuseGroupChatListPlaceholder(previous, "account-a", "tenant-a"), true);
  assert.equal(canReuseGroupChatListPlaceholder(previous, "account-b", "tenant-a"), false);
  assert.equal(canReuseGroupChatListPlaceholder(previous, "account-a", "tenant-b"), false);
  assert.equal(canReuseGroupChatListPlaceholder(undefined, "account-a", "tenant-a"), false);
});
