import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { inflateSync } from "node:zlib";
import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { buildGroupChatDataExportDocumentModel, generateGroupChatDataExportPdf, parseGroupChatDataExport, wrapGroupChatExportText } from "./group-chat-data-export.ts";

const validExport = {
  format: "group-chat-data-export",
  version: 1,
  memberships: [{ conversation_id: "group-1", group_name: "Care Team", role: "member", status: "active", user_id: "requester-1" }],
  consents: [{ conversation_id: "group-1", granted_at: "2026-10-20T09:00:00Z", withdrawn_at: null, guardian_name: "Guardian", guardian_relationship: "Parent", notice: { visibility_notice: "Shared group data" } }],
  messages: [
    { id: "message-2", created_at: "2026-10-22T10:00:00Z", edited_at: "2026-10-22T10:30:00Z", message_type: "text", content: "Later message", attachments: [{ attachment_id: "attachment-2", file_name: "care.pdf" }] },
    { id: "message-1", created_at: "2026-10-22T09:00:00Z", message_type: "text", content: "Earlier message — नमस्ते", sender_name: null, attachments: null },
  ],
};

function getPageContent(pdf: PDFDocument, pageIndex: number): string {
  const page = pdf.getPage(pageIndex) as unknown as { node: { Contents: () => { size: () => number; get: (index: number) => unknown } } };
  const context = (pdf as unknown as { context: { lookup: (value: unknown) => { getContents: () => Uint8Array } } }).context;
  const contents = page.node.Contents();
  return Array.from({ length: contents.size() }, (_, index) => {
    const stream = context.lookup(contents.get(index));
    return new TextDecoder().decode(inflateSync(stream.getContents()));
  }).join("\n");
}

test("validates the export envelope and preserves its records", () => {
  const parsed = parseGroupChatDataExport(validExport);
  assert.deepEqual(parsed, validExport);
  assert.equal(parseGroupChatDataExport({ ...validExport, format: "other" }), null);
  assert.equal(parseGroupChatDataExport({ ...validExport, version: 2 }), null);
  assert.equal(parseGroupChatDataExport({ ...validExport, memberships: [{ malformed: true }, "not-a-record"] }), null);
});

test("accepts absent or empty consents without inventing records", () => {
  const withoutConsents = { ...validExport, consents: undefined };
  const parsed = parseGroupChatDataExport(withoutConsents);
  assert.deepEqual(parsed?.consents, []);
  assert.deepEqual(buildGroupChatDataExportDocumentModel({ ...parsed!, consents: [] }).consentSections, []);
});

test("renders membership, consent, edited-message and attachment fields", () => {
  const model = buildGroupChatDataExportDocumentModel(parseGroupChatDataExport(validExport)!);
  assert.equal(model.membershipSections[0].fields.find((field) => field.label === "Group name")?.value, "Care Team");
  assert.equal(model.consentSections[0].fields.find((field) => field.label === "Guardian name")?.value, "Guardian");
  assert.equal(model.messageSections[0].fields.find((field) => field.label === "Id")?.value, "message-1");
  assert.equal(model.messageSections[0].fields.find((field) => field.label === "Attachments")?.value.includes("attachment-2"), false);
  assert.equal(model.messageSections[1].fields.find((field) => field.label === "Edited at")?.value, "Oct 22, 2026, 10:30 AM UTC");
  assert.equal(model.messageSections[1].fields.find((field) => field.label === "Attachments")?.value.includes("care.pdf"), true);
  assert.equal(model.messageSections[0].fields.find((field) => field.label === "Sender name")?.value, "null");
});

test("wraps long message text without clipping into one line", () => {
  const fakeFont = { widthOfTextAtSize: (value: string) => value.length };
  const lines = wrapGroupChatExportText("x".repeat(250), fakeFont, 1, 40);
  assert.ok(lines.length > 6);
  assert.equal(lines.join(""), "x".repeat(250));
});

test("embeds visible membership and message glyphs with compact nine-message pagination", async () => {
  const fontBytes = new Uint8Array(await readFile(resolve("node_modules/@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff2")));
  const font = fontkit.create(fontBytes);
  assert.ok(font.glyphForCodePoint("C".codePointAt(0) ?? 0).id > 0);
  const fontUrl = `data:font/woff2;base64,${Buffer.from(fontBytes).toString("base64")}`;
  const exportData = parseGroupChatDataExport({
    format: "group-chat-data-export",
    version: 1,
    memberships: [{ group_name: "Care Team", status: "active", role: "member", joined_at: "2026-10-20T09:00:00Z", description: "Community care group" }],
    consents: [],
    messages: Array.from({ length: 9 }, (_, index) => ({ id: `message-${index + 1}`, created_at: `2026-10-22T09:0${index}:00Z`, message_type: "text", content: `Message content ${index + 1} — café`, attachments: index === 2 ? [{ file_name: "care.pdf" }] : null })),
  });
  assert.ok(exportData);
  const blob = await generateGroupChatDataExportPdf(exportData, { fontUrl });
  const pdf = await PDFDocument.load(new Uint8Array(await blob.arrayBuffer()));
  assert.equal(pdf.getPageCount(), 2);
  const content = getPageContent(pdf, 0);
  assert.match(content, /<002600440055004800030037004800440050>/);
  assert.match(content, /<00300048005600560044004A00480003004600520051005700480051005700030014[0-9A-F]+>/);
  assert.match(content, /00CC/);
  assert.match(content, /00AB/);
  assert.doesNotMatch(content, /<000000000000000000000000>/);
});

test("generates a paginated PDF and rejects invalid export data", async () => {
  const fontPath = resolve("node_modules/@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff2");
  const fontBytes = new Uint8Array(await readFile(fontPath));
  const fallbackFontBytes = new Uint8Array(await readFile(resolve("node_modules/@fontsource/noto-sans/files/noto-sans-devanagari-400-normal.woff2")));
  const fontUrl = `data:font/woff2;base64,${Buffer.from(fontBytes).toString("base64")}`;
  const fallbackFontUrl = `data:font/woff2;base64,${Buffer.from(fallbackFontBytes).toString("base64")}`;
  const longExport = { ...validExport, messages: Array.from({ length: 30 }, (_, index) => ({ id: `message-${index}`, created_at: `2026-10-22T09:${String(index % 60).padStart(2, "0")}:00Z`, content: `${"Long message content. ".repeat(50)} ${index}`, message_type: "text" })) };
  const blob = await generateGroupChatDataExportPdf(longExport, { fontUrl, fallbackFontUrl });
  assert.equal(blob.type, "application/pdf");
  const pdf = await PDFDocument.load(new Uint8Array(await blob.arrayBuffer()));
  assert.ok(pdf.getPageCount() > 1);
  await assert.rejects(() => generateGroupChatDataExportPdf({ ...validExport, format: "invalid" }, { fontUrl, fallbackFontUrl }), /invalid format or version/i);
  await assert.rejects(() => generateGroupChatDataExportPdf(validExport, { fontUrl: "http://127.0.0.1:1/missing-font.woff2" }), /unable to generate/i);
});
