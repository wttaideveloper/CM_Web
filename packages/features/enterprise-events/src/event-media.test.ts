import assert from "node:assert/strict";
import test from "node:test";

import { buildEventMediaPayload, buildEventMediaUpdatePayload, documentName, mediaDocuments, mediaItemUrl, mediaUrls, normalizeDocumentEntries, parseEventMediaPolicy, protectedMediaPreviewUrl, validateEventMediaLink } from "./event-media.ts";

test("parses all live Event media policy fields and limits", () => {
  const policy = parseEventMediaPolicy({
    primary_image: { mime_types: ["image/jpeg", "image/png", "image/webp"], extensions: ["jpeg", "jpg", "png", "webp"], max_size_bytes: 5242880, max_count: 1 },
    gallery_images: { mime_types: ["image/jpeg", "image/png", "image/webp", "image/gif"], extensions: ["gif", "jpeg", "jpg", "png", "webp"], max_size_bytes: 5242880, max_count: 10 },
    videos: { mime_types: ["video/mp4", "video/webm", "video/quicktime"], extensions: ["m4v", "mov", "mp4", "webm"], max_size_bytes: 104857600, max_count: 3 },
    documents: { mime_types: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation"], extensions: ["doc", "docx", "pdf", "ppt", "pptx", "xls", "xlsx"], max_size_bytes: 10485760, max_count: 10 },
  });
  assert.deepEqual(policy.primary_image.mime_types, ["image/jpeg", "image/png", "image/webp"]);
  assert.deepEqual(policy.primary_image.extensions, ["jpeg", "jpg", "png", "webp"]);
  assert.equal(policy.primary_image.max_count, 1);
  assert.equal(policy.gallery_images.max_count, 10);
  assert.equal(policy.videos.max_size_bytes, 100 * 1024 * 1024);
  assert.deepEqual(policy.documents.extensions, ["doc", "docx", "pdf", "ppt", "pptx", "xls", "xlsx"]);
});
test("accepts the deployed root policy without requiring a wrapper", () => {
  const policy = parseEventMediaPolicy({
    primary_image: { mime_types: ["image/jpeg"], extensions: ["jpg"], max_size_bytes: 100, max_count: 1 },
    gallery_images: { mime_types: ["image/jpeg"], extensions: ["jpg"], max_size_bytes: 100, max_count: 10 },
    videos: { mime_types: ["video/mp4"], extensions: ["mp4"], max_size_bytes: 100, max_count: 3 },
    documents: { mime_types: ["application/pdf"], extensions: ["pdf"], max_size_bytes: 100, max_count: 10 },
  });
  assert.equal(policy.primary_image.max_count, 1);
  assert.equal(policy.documents.max_count, 10);
});

test("rejects an incomplete policy so the UI can show a settled error", () => {
  assert.throws(() => parseEventMediaPolicy({ primary_image: { mime_types: ["image/jpeg"], extensions: ["jpg"], max_size_bytes: 100, max_count: 1 } }), /missing gallery_images/);
});

test("keeps mixed link and upload values in their existing order", () => {
  const mixed = ["https://cdn.example.com/one.jpg", { id: "asset-1", field: "gallery_images" as const, url: "https://cdn.example.com/two.jpg", name: "two.jpg", size: 10, type: "image/jpeg", attached: false, expires_at: null }, "https://cdn.example.com/three.jpg"];
  assert.deepEqual(mediaUrls(mixed), ["https://cdn.example.com/one.jpg", "https://cdn.example.com/two.jpg", "https://cdn.example.com/three.jpg"]);
  assert.deepEqual(mediaDocuments(["https://docs.example.com/one.pdf", { url: "https://docs.example.com/two.pdf", name: "two.pdf" }]), [{ url: "https://docs.example.com/one.pdf" }, { url: "https://docs.example.com/two.pdf", name: "two.pdf" }]);
});

test("maps media to the Event payload without upload markers", () => {
  const payload = buildEventMediaPayload({
    primary_image: " https://cdn.example.com/primary.webp ",
    gallery_images: ["https://cdn.example.com/link.jpg", { url: "https://cdn.example.com/uploaded.jpg", id: "asset-1" }],
    videos: ["https://cdn.example.com/video.mp4"],
    documents: [{ id: "asset-1", url: "https://cdn.example.com/guide.pdf", name: "guide.pdf", size: 20, type: "application/pdf", attached: false, expires_at: null }],
  });
  assert.deepEqual(payload.gallery_images, ["https://cdn.example.com/link.jpg", "https://cdn.example.com/uploaded.jpg"]);
  assert.deepEqual(payload.documents, [{ id: "asset-1", url: "https://cdn.example.com/guide.pdf", name: "guide.pdf", size: 20, type: "application/pdf", attached: false, expires_at: null }]);
  assert.equal("upload" in payload, false);
});

test("omits untouched media on update and sends explicit clear values", () => {
  const initial = { primary_image: "https://cdn.example.com/primary.jpg", gallery_images: ["https://cdn.example.com/gallery.jpg"], videos: [], documents: [{ url: "https://docs.example.com/guide.pdf", name: "guide.pdf" }] };
  assert.deepEqual(buildEventMediaUpdatePayload(initial, initial), {});
  assert.deepEqual(buildEventMediaUpdatePayload({ ...initial, primary_image: "", gallery_images: [], documents: [] }, initial), { primary_image: null, gallery_images: [], documents: [] });
});

test("normalizes legacy bare document strings and applies documented link rules", () => {
  assert.deepEqual(normalizeDocumentEntries(["https://docs.example.com/legacy.pdf", { url: "https://docs.example.com/current.pdf", name: "current.pdf" }]), [{ url: "https://docs.example.com/legacy.pdf" }, { url: "https://docs.example.com/current.pdf", name: "current.pdf" }]);
  assert.equal(mediaItemUrl({ url: "https://docs.example.com/current.pdf", name: "current.pdf" }), "https://docs.example.com/current.pdf");
  assert.equal(documentName({ url: "https://docs.example.com/current.pdf", name: "current.pdf" }), "current.pdf");
  assert.equal(documentName("https://docs.example.com/legacy.pdf"), "legacy.pdf");
  assert.equal(validateEventMediaLink("http://cdn.example.com/file.jpg?download=1").value, "https://cdn.example.com/file.jpg?download=1");
  assert.match(validateEventMediaLink("ftp://cdn.example.com/file.jpg").error ?? "", /http and https/);
  assert.match(validateEventMediaLink("https://localhost/file.jpg").error ?? "", /public hostname/);
});

test("routes protected uploaded media through the same-origin proxy and keeps external links direct", () => {
  const protectedUrl = "https://chat.wisdomtooth.tech/api/v1/events/media/asset-1";
  assert.equal(protectedMediaPreviewUrl(protectedUrl), `/api/event-media?url=${encodeURIComponent(protectedUrl)}`);
  assert.equal(protectedMediaPreviewUrl("https://cdn.example.com/image.jpg"), "https://cdn.example.com/image.jpg");
  assert.equal(protectedMediaPreviewUrl(protectedUrl, "/api/platform-super-admin/event-media"), `/api/platform-super-admin/event-media?url=${encodeURIComponent(protectedUrl)}`);
});
