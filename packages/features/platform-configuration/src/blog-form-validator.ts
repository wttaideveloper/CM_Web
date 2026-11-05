export interface SchemaFieldValidationConfig {
  min_length?: number | string | null;
  max_length?: number | string | null;
  pattern?: string | null;
  min?: number | string | null;
  max?: number | string | null;
  step?: number | string | null;
  options?: string | string[] | null;
  max_file_size_mb?: number | string | null;
  allowed_file_types?: string | string[] | null;
}

export interface SchemaFieldItem {
  readonly id?: string;
  readonly key?: string;
  label: string;
  readonly type: string;
  readonly sectionId?: string;
  readonly isLocked?: boolean;
  isRequired?: boolean;
  isActive?: boolean;
  description?: string;
  placeholder?: string;
  visibilityScope?: string;
  validation?: SchemaFieldValidationConfig | Record<string, string | number | boolean | null> | null;
  tags?: readonly string[];
}

/**
 * Validates a blog form field configuration before saving/publishing.
 * Returns an error string if invalid, or null if valid.
 */
export function validateFieldConfiguration(field: SchemaFieldItem): string | null {
  if (!field.label || !field.label.trim()) return "Every field needs a label.";
  if (field.isRequired && !field.isActive) return `Required field “${field.label}” must be enabled.`;

  const validation = (field.validation ?? {}) as SchemaFieldValidationConfig;

  if (["text", "textarea", "rich_text"].includes(field.type)) {
    if (validation.min_length !== null && validation.min_length !== undefined && validation.min_length !== "") {
      const minLength = Number(validation.min_length);
      if (!Number.isInteger(minLength) || minLength < 0) {
        return `Minimum length for “${field.label}” must be 0 or a positive whole number.`;
      }
    }
    if (validation.max_length !== null && validation.max_length !== undefined && validation.max_length !== "") {
      const maxLength = Number(validation.max_length);
      if (!Number.isInteger(maxLength) || maxLength < 1) {
        return `Maximum length for “${field.label}” must be a positive whole number.`;
      }
      if (validation.min_length !== null && validation.min_length !== undefined && validation.min_length !== "") {
        const minLength = Number(validation.min_length);
        if (minLength > maxLength) {
          return `Minimum length cannot exceed maximum length for “${field.label}”.`;
        }
      }
    }
    if (typeof validation.pattern === "string" && validation.pattern.trim()) {
      try {
        new RegExp(validation.pattern);
      } catch {
        return `Validation pattern for “${field.label}” is not valid.`;
      }
    }
  }

  if (["number", "date", "time"].includes(field.type)) {
    const minimum = validation.min;
    const maximum = validation.max;
    if (field.type === "number" && minimum !== null && minimum !== undefined && minimum !== "" && !Number.isFinite(Number(minimum))) {
      return `Minimum for “${field.label}” must be numeric.`;
    }
    if (field.type === "number" && maximum !== null && maximum !== undefined && maximum !== "" && !Number.isFinite(Number(maximum))) {
      return `Maximum for “${field.label}” must be numeric.`;
    }
    const hasMinimum = minimum !== null && minimum !== undefined && minimum !== "";
    const hasMaximum = maximum !== null && maximum !== undefined && maximum !== "";
    if (hasMinimum && hasMaximum) {
      const isOutOfOrder = field.type === "number"
        ? Number(minimum) > Number(maximum)
        : String(minimum) > String(maximum);
      if (isOutOfOrder) return `Minimum cannot be greater than maximum for “${field.label}”.`;
    }
    if (field.type === "number" && validation.step !== null && validation.step !== undefined && validation.step !== "") {
      const step = Number(validation.step);
      if (!Number.isFinite(step) || step <= 0) return `Step for “${field.label}” must be a positive number.`;
    }
  }

  if (["select", "radio", "multi_select", "multiselect", "checkbox"].includes(field.type)) {
    const configuredOptions = field.key === "post_type" ? "Blog, News" : validation.options;
    const options = typeof configuredOptions === "string"
      ? configuredOptions.split(",").map((option) => option.trim()).filter(Boolean)
      : Array.isArray(configuredOptions)
      ? configuredOptions.map(String).map((option) => option.trim()).filter(Boolean)
      : [];
    if (options.length === 0) return `Add at least one option for “${field.label}” before saving.`;
    if (new Set(options.map((option) => option.toLowerCase())).size !== options.length) {
      return `Options for “${field.label}” must be unique.`;
    }
  }

  if (["file_upload", "media_upload"].includes(field.type)) {
    if (validation.max_file_size_mb !== null && validation.max_file_size_mb !== undefined && validation.max_file_size_mb !== "") {
      const size = Number(validation.max_file_size_mb);
      if (!Number.isFinite(size) || size <= 0 || size > 100) {
        return `Maximum file size for “${field.label}” must be between 1 MB and 100 MB.`;
      }
    }
  }

  if (field.type === "url" && typeof validation.pattern === "string" && validation.pattern.trim()) {
    try {
      new RegExp(validation.pattern);
    } catch {
      return `URL validation pattern for “${field.label}” is not valid.`;
    }
  }

  return null;
}
