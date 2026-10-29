import assert from "node:assert/strict";
import test from "node:test";
import { buildGroupChatGatewayPath, createGroupChatRequestResponse } from "./group-chat-gateway.ts";

test("Group REST paths use exactly one same-origin chat gateway prefix", () => {
  assert.equal(buildGroupChatGatewayPath("/groups/group-1/messages"), "/api/chat/groups/group-1/messages");
  assert.equal(buildGroupChatGatewayPath("groups/group-1/messages"), "/api/chat/groups/group-1/messages");
});

test("Group REST transport delegates to normal authenticated access without a chat-token header", async () => {
  let requestInput: RequestInfo | URL | undefined;
  let requestInit: RequestInit | undefined;
  const normalAuthenticatedRequest = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    requestInput = input;
    requestInit = init;
    return new Response(null, { status: 204 });
  };

  await createGroupChatRequestResponse(normalAuthenticatedRequest)("/groups/group-1", { method: "GET" });

  assert.equal(requestInput, "/api/chat/groups/group-1");
  assert.equal(requestInit?.credentials, "include");
  assert.equal(requestInit?.cache, "no-store");
  assert.equal(new Headers(requestInit?.headers).get("Authorization"), null);
  assert.equal(new Headers(requestInit?.headers).get("Content-Type"), "application/json");
});

test("Group multipart requests preserve browser-selected content type", async () => {
  let requestInit: RequestInit | undefined;
  const normalAuthenticatedRequest = async (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    requestInit = init;
    return new Response(null, { status: 204 });
  };
  const formData = new FormData();
  formData.set("file", new Blob(["avatar"], { type: "image/png" }));

  await createGroupChatRequestResponse(normalAuthenticatedRequest)("/uploads/", { method: "POST", body: formData }, false);

  assert.equal(new Headers(requestInit?.headers).get("Content-Type"), null);
});
