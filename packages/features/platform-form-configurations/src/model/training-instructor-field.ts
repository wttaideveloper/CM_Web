import type { ConfiguredField } from "./form-configuration.types";

/** The instructor value is selected from the active tenant's members at runtime. */
export function isTrainingInstructorField(field: Pick<ConfiguredField, "source" | "coreKey" | "stableKey" | "label">): boolean {
  if (field.source !== "core") return false;
  const key = (field.coreKey ?? field.stableKey ?? "").trim().toLowerCase().replace(/^(core_|custom_)/, "");
  return key === "instructor_name" || key.endsWith("_instructor_name");
}
