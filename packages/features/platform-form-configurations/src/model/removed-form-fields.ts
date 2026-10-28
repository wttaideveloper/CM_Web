function normalizeKey(value: string | null | undefined): string {
  return (value ?? "").replace(/^(core_|custom_)/, "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function normalizeLabel(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/[\s-]+/g, " ");
}

/** Fields intentionally excluded from both Event and Training forms. */
export function isRemovedCreateEventField(key?: string | null, label?: string | null): boolean {
  return normalizeKey(key) === "create_event" || normalizeLabel(label) === "create event";
}
