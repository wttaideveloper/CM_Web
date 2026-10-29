import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

export type GroupChatDataExportRecord = Record<string, unknown>;

export interface GroupChatDataExport {
  format: "group-chat-data-export";
  version: 1;
  memberships: readonly GroupChatDataExportRecord[];
  consents: readonly GroupChatDataExportRecord[];
  messages: readonly GroupChatDataExportRecord[];
}

export interface GroupChatDataExportField {
  label: string;
  value: string;
}

export interface GroupChatDataExportSection {
  title: string;
  fields: readonly GroupChatDataExportField[];
}

export interface GroupChatDataExportDocumentModel {
  membershipSections: readonly GroupChatDataExportSection[];
  consentSections: readonly GroupChatDataExportSection[];
  messageSections: readonly GroupChatDataExportSection[];
}

export interface GroupChatDataExportPdfOptions {
  fontBytes?: Uint8Array;
  fontUrl?: string;
  fallbackFontBytes?: Uint8Array;
  fallbackFontUrl?: string;
}

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 44;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const BODY_SIZE = 9.5;
const BODY_LINE_HEIGHT = 13;
const SECTION_GAP = 8;

function isRecord(value: unknown): value is GroupChatDataExportRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRecordList(value: unknown, allowAbsent = false): GroupChatDataExportRecord[] | null {
  if (value == null && allowAbsent) return [];
  if (!Array.isArray(value)) return null;
  return value.every(isRecord) ? value : null;
}

/** Validates the backend export envelope without rewriting or filtering its records. */
export function parseGroupChatDataExport(value: unknown): GroupChatDataExport | null {
  if (!isRecord(value) || value.format !== "group-chat-data-export" || value.version !== 1) return null;
  const memberships = readRecordList(value.memberships);
  const consents = readRecordList(value.consents, true);
  const messages = readRecordList(value.messages);
  if (!memberships || !consents || !messages) return null;
  return { format: "group-chat-data-export", version: 1, memberships, consents, messages };
}

function humanizeKey(key: string): string {
  return key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().replace(/^./, (character) => character.toUpperCase());
}

function jsonValue(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return String(value);
  try {
    return JSON.stringify(value) ?? "null";
  } catch {
    return "[unserializable value]";
  }
}

function looksLikeDateKey(key: string): boolean {
  return /(?:^|_)(?:date|time|at)$|(?:created|edited|updated|joined|granted|withdrawn|sent|completed|expires)/i.test(key);
}

/** Formats valid backend timestamps consistently while retaining invalid raw values. */
export function formatGroupChatExportDate(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return jsonValue(value);
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;
  return `${new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(timestamp))} UTC`;
}

function fieldValue(key: string, value: unknown): string {
  return looksLikeDateKey(key) ? formatGroupChatExportDate(value) : jsonValue(value);
}

function recordFields(record: GroupChatDataExportRecord): GroupChatDataExportField[] {
  return Object.entries(record).filter(([, value]) => value !== undefined).map(([key, value]) => ({ label: humanizeKey(key), value: fieldValue(key, value) }));
}

function recordSections(records: readonly GroupChatDataExportRecord[], label: string): GroupChatDataExportSection[] {
  return records.map((record, index) => ({ title: `${label} ${index + 1}`, fields: recordFields(record) }));
}

function messageTimestamp(record: GroupChatDataExportRecord): number {
  for (const key of ["created_at", "sent_at", "timestamp", "date"]) {
    const value = record[key];
    if (typeof value === "string") {
      const timestamp = Date.parse(value);
      if (!Number.isNaN(timestamp)) return timestamp;
    }
  }
  return Number.POSITIVE_INFINITY;
}

/** Builds a deterministic, human-readable projection without inventing absent names or fields. */
export function buildGroupChatDataExportDocumentModel(exportData: GroupChatDataExport): GroupChatDataExportDocumentModel {
  const messages = [...exportData.messages].sort((left, right) => messageTimestamp(left) - messageTimestamp(right));
  return {
    membershipSections: recordSections(exportData.memberships, "Membership record"),
    consentSections: recordSections(exportData.consents, "Consent record"),
    messageSections: recordSections(messages, "Message"),
  };
}

/** Wraps text by measured font width and preserves explicit newlines and long tokens. */
export function wrapGroupChatExportText(text: string, font: { widthOfTextAtSize: (value: string, size: number) => number }, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      if (!line && font.widthOfTextAtSize(word, size) > maxWidth) {
        line = word;
        while (font.widthOfTextAtSize(line, size) > maxWidth && line.length > 1) {
          let split = line.length;
          while (split > 1 && font.widthOfTextAtSize(line.slice(0, split), size) > maxWidth) split -= 1;
          lines.push(line.slice(0, split));
          line = line.slice(split);
        }
        continue;
      }
      const candidate = line ? `${line} ${word}` : word;
      if (!line || font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
        continue;
      }
      lines.push(line);
      line = word;
      while (font.widthOfTextAtSize(line, size) > maxWidth && line.length > 1) {
        let split = line.length;
        while (split > 1 && font.widthOfTextAtSize(line.slice(0, split), size) > maxWidth) split -= 1;
        lines.push(line.slice(0, split));
        line = line.slice(split);
      }
    }
    if (line) lines.push(line);
  }
  return lines.length > 0 ? lines : [""];
}

class PdfLayout {
  readonly pages: PDFPage[] = [];
  private page: PDFPage;
  private y = PAGE_HEIGHT - MARGIN;
  private readonly document: PDFDocument;
  private readonly bodyFont: PDFFont;
  private readonly headingFont: PDFFont;
  private readonly fallbackFont: PDFFont | null;

  constructor(document: PDFDocument, bodyFont: PDFFont, headingFont: PDFFont, fallbackFont: PDFFont | null) {
    this.document = document;
    this.bodyFont = bodyFont;
    this.headingFont = headingFont;
    this.fallbackFont = fallbackFont;
    this.page = this.addPage();
  }

  private addPage(): PDFPage {
    const page = this.document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.pages.push(page);
    this.page = page;
    this.y = PAGE_HEIGHT - MARGIN;
    return page;
  }

  private fontForText(text: string): PDFFont {
    return this.fallbackFont && /[\u0900-\u097F]/.test(text) ? this.fallbackFont : this.bodyFont;
  }

  private measureText(text: string, size: number): number {
    const runs = text.match(/[\u0900-\u097F]+|[^\u0900-\u097F]+/g) ?? [text];
    return runs.reduce((width, run) => width + this.fontForText(run).widthOfTextAtSize(run, size), 0);
  }

  private drawLine(text: string, x: number, size: number, color: ReturnType<typeof rgb>): void {
    const runs = text.match(/[\u0900-\u097F]+|[^\u0900-\u097F]+/g) ?? [text];
    let cursor = x;
    for (const run of runs) {
      const font = this.fontForText(run);
      this.page.drawText(run, { x: cursor, y: this.y - size, size, font, color });
      cursor += font.widthOfTextAtSize(run, size);
    }
  }

  private wrapText(text: string, size: number, maxWidth: number): string[] {
    return wrapGroupChatExportText(text, { widthOfTextAtSize: (value, requestedSize) => this.measureText(value, requestedSize) }, size, maxWidth);
  }

  private ensureSpace(height: number): void {
    if (this.y - height < MARGIN + 18) this.addPage();
  }

  heading(text: string, size = 14): void {
    this.ensureSpace(size + 18);
    this.page.drawText(text, { x: MARGIN, y: this.y - size, size, font: this.headingFont, color: rgb(0.03, 0.13, 0.11) });
    this.y -= size + 8;
  }

  text(text: string, options: { size?: number; color?: ReturnType<typeof rgb>; indent?: number } = {}): void {
    const size = options.size ?? BODY_SIZE;
    const indent = options.indent ?? 0;
    const lines = this.wrapText(text, size, CONTENT_WIDTH - indent);
    for (const line of lines) {
      this.ensureSpace(BODY_LINE_HEIGHT);
      this.drawLine(line, MARGIN + indent, size, options.color ?? rgb(0.1, 0.15, 0.14));
      this.y -= BODY_LINE_HEIGHT;
    }
  }

  field(field: GroupChatDataExportField): void {
    const label = `${field.label}:`;
    const labelColor = rgb(0.1, 0.32, 0.27);
    const valueColor = rgb(0.1, 0.15, 0.14);
    const separator = " ";
    const firstLineWidth = CONTENT_WIDTH - this.measureText(label + separator, BODY_SIZE);
    const valueLines = this.wrapText(field.value, BODY_SIZE, Math.max(40, firstLineWidth));
    const firstLine = valueLines[0] ?? "";
    const firstLineFits = firstLine.length > 0 && this.measureText(`${label}${separator}${firstLine}`, BODY_SIZE) <= CONTENT_WIDTH;
    this.ensureSpace(BODY_LINE_HEIGHT * (firstLineFits ? 1 : 2));
    if (firstLineFits) {
      this.drawLine(label, MARGIN, BODY_SIZE, labelColor);
      this.drawLine(firstLine, MARGIN + this.measureText(label + separator, BODY_SIZE), BODY_SIZE, valueColor);
      this.y -= BODY_LINE_HEIGHT;
      for (const line of valueLines.slice(1)) {
        this.ensureSpace(BODY_LINE_HEIGHT);
        this.drawLine(line, MARGIN + 12, BODY_SIZE, valueColor);
        this.y -= BODY_LINE_HEIGHT;
      }
      return;
    }
    this.text(label, { size: BODY_SIZE, color: labelColor });
    for (const line of this.wrapText(field.value, BODY_SIZE, CONTENT_WIDTH - 12)) {
      this.ensureSpace(BODY_LINE_HEIGHT);
      this.drawLine(line, MARGIN + 12, BODY_SIZE, valueColor);
      this.y -= BODY_LINE_HEIGHT;
    }
  }

  section(section: GroupChatDataExportSection): void {
    this.ensureSpace(SECTION_GAP + BODY_LINE_HEIGHT);
    this.heading(section.title, 11);
    if (section.fields.length === 0) this.text("No fields were included in this record.", { color: rgb(0.35, 0.4, 0.38) });
    for (const field of section.fields) this.field(field);
    this.y -= SECTION_GAP;
  }

  empty(text: string): void {
    this.text(text, { color: rgb(0.35, 0.4, 0.38) });
    this.y -= SECTION_GAP;
  }
}

async function resolveFont(document: PDFDocument, bytes: Uint8Array | undefined, url: string | undefined, fallback: PDFFont): Promise<PDFFont> {
  if (!bytes && !url) return fallback;
  const fontBytes = bytes ?? new Uint8Array(await (await fetch(url as string)).arrayBuffer());
  document.registerFontkit(fontkit);
  // Keep the local font's complete cmap so ordinary Latin and supported Unicode glyphs
  // remain visible across PDF viewers; fontkit subsetting can emit .notdef-only mappings
  // for these Fontsource subsets.
  return document.embedFont(fontBytes, { subset: false });
}

/** Generates a local PDF Blob from the already-authorized export JSON. */
export async function generateGroupChatDataExportPdf(value: unknown, options: GroupChatDataExportPdfOptions = {}): Promise<Blob> {
  const exportData = parseGroupChatDataExport(value);
  if (!exportData) throw new Error("The downloaded data export has an invalid format or version.");
  try {
    const document = await PDFDocument.create();
    const bodyFont = await resolveFont(document, options.fontBytes, options.fontUrl, await document.embedFont(StandardFonts.Helvetica));
    const fallbackFont = options.fallbackFontBytes || options.fallbackFontUrl ? await resolveFont(document, options.fallbackFontBytes, options.fallbackFontUrl, bodyFont) : null;
    const headingFont = await document.embedFont(StandardFonts.HelveticaBold);
    const layout = new PdfLayout(document, bodyFont, headingFont, fallbackFont);
    const model = buildGroupChatDataExportDocumentModel(exportData);
    layout.heading("Group Chat Data Export", 18);
    layout.text("This PDF is a copy of the data exported for the requesting account.");
    layout.text("It is not the complete Group Chat conversation. Other members' messages are not included, and attachment files are not included.");
    layout.text(`Export format: ${exportData.format} · Version: ${exportData.version}`);
    layout.heading("Group memberships", 13);
    if (model.membershipSections.length === 0) layout.empty("No membership records were included in this export.");
    for (const section of model.membershipSections) layout.section(section);
    layout.heading("Consent records", 13);
    if (model.consentSections.length === 0) layout.empty("No consent records were included in this export.");
    for (const section of model.consentSections) layout.section(section);
    layout.heading("Messages sent by the requester", 13);
    if (model.messageSections.length === 0) layout.empty("No messages were included in this export.");
    for (const section of model.messageSections) layout.section(section);
    layout.pages.forEach((page, index) => page.drawText(`Page ${index + 1} of ${layout.pages.length}`, { x: PAGE_WIDTH - MARGIN - 70, y: 20, size: 8, font: headingFont, color: rgb(0.35, 0.4, 0.38) }));
    const bytes = await document.save();
    return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  } catch {
    throw new Error("Unable to generate the Group Chat data export PDF.");
  }
}
