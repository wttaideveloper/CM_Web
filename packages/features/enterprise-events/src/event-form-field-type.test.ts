import { describe, expect, it } from "vitest";
import {
  getEventFormFieldType,
  getEventMediaAccept,
  getEventMediaKind,
  isEventMediaRenderer,
} from "./event-form-field-type";
import type { ActiveEventFormField } from "./events.service";

function createField(overrides: Partial<ActiveEventFormField>): ActiveEventFormField {
  return {
    id: "field-1",
    source: "custom",
    core_key: null,
    stable_key: null,
    label: "Custom Field",
    renderer: "text",
    value_type: "string",
    required: false,
    position: 0,
    is_enabled: true,
    placeholder: null,
    help_text: null,
    options: [],
    validation: {
      min_length: null,
      max_length: null,
      min: null,
      max: null,
      pattern: null,
    },
    composite_config: null,
    ...overrides,
  };
}

describe("getEventFormFieldType", () => {
  it("recognizes explicit media renderers", () => {
    expect(getEventFormFieldType(createField({ renderer: "media_upload" }))).toBe("media_upload");
    expect(getEventFormFieldType(createField({ renderer: "image_uploader" }))).toBe("media_upload");
    expect(getEventFormFieldType(createField({ renderer: "file_upload" }))).toBe("file_upload");
    expect(getEventFormFieldType(createField({ renderer: "document_uploader" }))).toBe("file_upload");
    expect(getEventFormFieldType(createField({ renderer: "video" }))).toBe("video");
    expect(getEventFormFieldType(createField({ renderer: "video_input" }))).toBe("video");
  });

  it("infers media type from custom field label and key", () => {
    expect(getEventFormFieldType(createField({ label: "imahes", renderer: "text" }))).toBe("media_upload");
    expect(getEventFormFieldType(createField({ label: "Event Images", renderer: "text" }))).toBe("media_upload");
    expect(getEventFormFieldType(createField({ label: "docs", renderer: "text" }))).toBe("file_upload");
    expect(getEventFormFieldType(createField({ label: "Supporting Documents", renderer: "text" }))).toBe("file_upload");
    expect(getEventFormFieldType(createField({ label: "videos", renderer: "text" }))).toBe("video");
    expect(getEventFormFieldType(createField({ label: "Session Video", renderer: "text" }))).toBe("video");
  });

  it("recognizes rich text, tags, and radio", () => {
    expect(getEventFormFieldType(createField({ renderer: "rich_text_editor" }))).toBe("rich_text");
    expect(getEventFormFieldType(createField({ renderer: "tag_input" }))).toBe("tags");
    expect(getEventFormFieldType(createField({ renderer: "radio_group" }))).toBe("radio");
  });

  it("infers rich text, radio, date, and time from label and key", () => {
    expect(getEventFormFieldType(createField({ label: "rich", renderer: "text" }))).toBe("rich_text");
    expect(getEventFormFieldType(createField({ label: "radio", renderer: "text" }))).toBe("radio");
    expect(getEventFormFieldType(createField({ label: "date", renderer: "text" }))).toBe("date");
    expect(getEventFormFieldType(createField({ label: "time", renderer: "text" }))).toBe("time");
  });
});

describe("isEventMediaRenderer", () => {
  it("returns true for media types", () => {
    expect(isEventMediaRenderer("media_upload")).toBe(true);
    expect(isEventMediaRenderer("file_upload")).toBe(true);
    expect(isEventMediaRenderer("video")).toBe(true);
  });

  it("returns false for non-media types", () => {
    expect(isEventMediaRenderer("text")).toBe(false);
    expect(isEventMediaRenderer("rich_text")).toBe(false);
    expect(isEventMediaRenderer("dropdown")).toBe(false);
  });
});

describe("getEventMediaKind and getEventMediaAccept", () => {
  it("returns correct kind and accept string", () => {
    expect(getEventMediaKind("media_upload")).toBe("image");
    expect(getEventMediaAccept("image")).toBe("image/*");

    expect(getEventMediaKind("file_upload")).toBe("document");
    expect(getEventMediaAccept("document")).toContain("application/pdf");

    expect(getEventMediaKind("video")).toBe("video");
    expect(getEventMediaAccept("video")).toBe("video/*");
  });
});
