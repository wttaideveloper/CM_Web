import { describe, expect, it } from "vitest";
import {
  validateFieldConfiguration,
  type SchemaFieldItem,
} from "./blog-form-validator";

describe("Blog Form Field Configuration Validator (DEFECT-MEDIUM-008)", () => {
  it("rejects fields with empty labels", () => {
    const field: SchemaFieldItem = {
      id: "f1",
      key: "custom_notes",
      label: "   ",
      type: "text",
      isRequired: false,
      isActive: true,
    };
    expect(validateFieldConfiguration(field)).toBe("Every field needs a label.");
  });

  it("rejects required fields that are disabled", () => {
    const field: SchemaFieldItem = {
      id: "f2",
      key: "patient_consent",
      label: "Patient Consent",
      type: "checkbox",
      isRequired: true,
      isActive: false,
    };
    expect(validateFieldConfiguration(field)).toBe(
      "Required field “Patient Consent” must be enabled.",
    );
  });

  it("validates text field length bounds and rejects min > max", () => {
    const field: SchemaFieldItem = {
      id: "f3",
      key: "summary",
      label: "Summary",
      type: "textarea",
      isRequired: false,
      isActive: true,
      validation: { min_length: 50, max_length: 20 },
    };
    expect(validateFieldConfiguration(field)).toBe(
      "Minimum length cannot exceed maximum length for “Summary”.",
    );
  });

  it("rejects negative minimum length for text fields", () => {
    const field: SchemaFieldItem = {
      id: "f4",
      key: "body",
      label: "Body",
      type: "text",
      isRequired: false,
      isActive: true,
      validation: { min_length: -5 },
    };
    expect(validateFieldConfiguration(field)).toBe(
      "Minimum length for “Body” must be 0 or a positive whole number.",
    );
  });

  it("rejects invalid regex patterns in text fields", () => {
    const field: SchemaFieldItem = {
      id: "f5",
      key: "code",
      label: "Special Code",
      type: "text",
      isRequired: false,
      isActive: true,
      validation: { pattern: "[a-z" }, // unclosed bracket
    };
    expect(validateFieldConfiguration(field)).toBe(
      "Validation pattern for “Special Code” is not valid.",
    );
  });

  it("rejects numeric fields where minimum exceeds maximum", () => {
    const field: SchemaFieldItem = {
      id: "f6",
      key: "reading_time",
      label: "Estimated Minutes",
      type: "number",
      isRequired: false,
      isActive: true,
      validation: { min: 100, max: 10 },
    };
    expect(validateFieldConfiguration(field)).toBe(
      "Minimum cannot be greater than maximum for “Estimated Minutes”.",
    );
  });

  it("rejects non-numeric min/max in numeric fields", () => {
    const field: SchemaFieldItem = {
      id: "f7",
      key: "score",
      label: "Score",
      type: "number",
      isRequired: false,
      isActive: true,
      validation: { min: "abc" },
    };
    expect(validateFieldConfiguration(field)).toBe(
      "Minimum for “Score” must be numeric.",
    );
  });

  it("rejects non-positive step values in number fields", () => {
    const field: SchemaFieldItem = {
      id: "f8",
      key: "amount",
      label: "Amount",
      type: "number",
      isRequired: false,
      isActive: true,
      validation: { step: 0 },
    };
    expect(validateFieldConfiguration(field)).toBe(
      "Step for “Amount” must be a positive number.",
    );
  });

  it("rejects select/radio fields with no options", () => {
    const field: SchemaFieldItem = {
      id: "f9",
      key: "priority",
      label: "Priority",
      type: "select",
      isRequired: false,
      isActive: true,
      validation: { options: "   " },
    };
    expect(validateFieldConfiguration(field)).toBe(
      "Add at least one option for “Priority” before saving.",
    );
  });

  it("rejects duplicate options in select/radio fields (case-insensitive)", () => {
    const field: SchemaFieldItem = {
      id: "f10",
      key: "department",
      label: "Department",
      type: "select",
      isRequired: false,
      isActive: true,
      validation: { options: "Cardiology, Neurology, CARDIOLOGY" },
    };
    expect(validateFieldConfiguration(field)).toBe(
      "Options for “Department” must be unique.",
    );
  });

  it("rejects file upload sizes greater than 100 MB or non-positive", () => {
    const field: SchemaFieldItem = {
      id: "f11",
      key: "pdf_doc",
      label: "Document",
      type: "file_upload",
      isRequired: false,
      isActive: true,
      validation: { max_file_size_mb: 250 },
    };
    expect(validateFieldConfiguration(field)).toBe(
      "Maximum file size for “Document” must be between 1 MB and 100 MB.",
    );
  });

  it("accepts completely valid configurations", () => {
    const field: SchemaFieldItem = {
      id: "f12",
      key: "study_reference",
      label: "Clinical Study Reference",
      type: "text",
      isRequired: true,
      isActive: true,
      validation: { min_length: 5, max_length: 150, pattern: "^[A-Za-z0-9 -]+$" },
    };
    expect(validateFieldConfiguration(field)).toBeNull();
  });
});
